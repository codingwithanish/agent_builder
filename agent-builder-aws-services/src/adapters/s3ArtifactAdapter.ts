import { 
  S3Client, 
  PutObjectCommand, 
  HeadObjectCommand, 
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ArtifactStoragePort } from '@/domain/interfaces';
import { AWSCredentials, ArtifactMetadata, ArtifactType } from '@/domain/types';
import { AWSServiceError, ArtifactError } from '@/observability/errors';
import { logger } from '@/observability/logger';
import { config } from '@/config/config';
import mimeTypes from 'mime-types';

export class S3ArtifactAdapter implements ArtifactStoragePort {
  private createS3Client(credentials: AWSCredentials): S3Client {
    return new S3Client({
      region: credentials.region || config.DEFAULT_AWS_REGION,
      ...(credentials.accessKeyId && {
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          ...(credentials.sessionToken && { sessionToken: credentials.sessionToken })
        }
      })
    });
  }

  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
    type: ArtifactType,
    credentials: AWSCredentials
  ): Promise<ArtifactMetadata> {
    try {
      const s3Client = this.createS3Client(credentials);
      const bucket = config.S3_ARTIFACT_BUCKET;

      // Validate file size
      const maxSizeBytes = config.ARTIFACT_MAX_MB * 1024 * 1024;
      if (file.length > maxSizeBytes) {
        throw new ArtifactError(`File size ${file.length} bytes exceeds maximum allowed size of ${maxSizeBytes} bytes`);
      }

      // Ensure bucket exists
      await this.ensureBucketExists(s3Client, bucket);

      // Use multipart upload for large files (>5MB)
      const useMultipart = file.length > 5 * 1024 * 1024;

      let result;
      if (useMultipart) {
        logger.debug('Using multipart upload for large file', { size: file.length, key });
        
        const upload = new Upload({
          client: s3Client,
          params: {
            Bucket: bucket,
            Key: key,
            Body: file,
            ContentType: contentType,
            Metadata: {
              artifactType: type,
              uploadedAt: new Date().toISOString(),
            },
            ServerSideEncryption: 'AES256',
          },
          partSize: 5 * 1024 * 1024, // 5MB parts
          queueSize: 4,
        });

        upload.on('httpUploadProgress', (progress) => {
          logger.debug('Upload progress', {
            key,
            loaded: progress.loaded,
            total: progress.total,
            percentage: progress.total ? Math.round((progress.loaded! / progress.total) * 100) : 0
          });
        });

        result = await upload.done();
      } else {
        logger.debug('Using standard upload for small file', { size: file.length, key });
        
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file,
          ContentType: contentType,
          Metadata: {
            artifactType: type,
            uploadedAt: new Date().toISOString(),
          },
          ServerSideEncryption: 'AES256',
        });

        result = await s3Client.send(command);
      }

      const metadata: ArtifactMetadata = {
        key,
        bucket,
        size: file.length,
        contentType,
        type,
        uploadedAt: new Date().toISOString(),
        etag: result.ETag,
        url: `s3://${bucket}/${key}`
      };

      logger.info('File uploaded successfully', { 
        key, 
        bucket, 
        size: file.length, 
        type, 
        useMultipart 
      });

      return metadata;
    } catch (error) {
      logger.error('Failed to upload file to S3', { key, error });
      
      if (error instanceof ArtifactError) {
        throw error;
      }
      
      throw new AWSServiceError(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async getFileMetadata(key: string, credentials: AWSCredentials): Promise<ArtifactMetadata | null> {
    try {
      const s3Client = this.createS3Client(credentials);
      const bucket = config.S3_ARTIFACT_BUCKET;

      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const result = await s3Client.send(command);

      const metadata: ArtifactMetadata = {
        key,
        bucket,
        size: result.ContentLength || 0,
        contentType: result.ContentType || 'application/octet-stream',
        type: (result.Metadata?.artifactType as ArtifactType) || 'other',
        uploadedAt: result.Metadata?.uploadedAt || result.LastModified?.toISOString() || new Date().toISOString(),
        etag: result.ETag,
        url: `s3://${bucket}/${key}`
      };

      logger.debug('Retrieved file metadata', { key, bucket, size: metadata.size });
      return metadata;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        logger.debug('File not found', { key, bucket: config.S3_ARTIFACT_BUCKET });
        return null;
      }

      logger.error('Failed to get file metadata from S3', { key, error });
      throw new AWSServiceError(`Failed to get file metadata: ${error.message}`, error);
    }
  }

  async generateSignedUrl(key: string, expiresIn: number, credentials: AWSCredentials): Promise<string> {
    try {
      const s3Client = this.createS3Client(credentials);
      const bucket = config.S3_ARTIFACT_BUCKET;

      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });

      logger.debug('Generated signed URL', { key, bucket, expiresIn });
      return url;
    } catch (error) {
      logger.error('Failed to generate signed URL', { key, error });
      throw new AWSServiceError(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  async deleteFile(key: string, credentials: AWSCredentials): Promise<void> {
    try {
      const s3Client = this.createS3Client(credentials);
      const bucket = config.S3_ARTIFACT_BUCKET;

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await s3Client.send(command);

      logger.info('File deleted successfully', { key, bucket });
    } catch (error) {
      logger.error('Failed to delete file from S3', { key, error });
      throw new AWSServiceError(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  private async ensureBucketExists(s3Client: S3Client, bucket: string): Promise<void> {
    try {
      // Check if bucket exists
      await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
      logger.debug('Bucket exists', { bucket });
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        logger.info('Bucket does not exist, creating it', { bucket });
        
        try {
          await s3Client.send(new CreateBucketCommand({
            Bucket: bucket,
            CreateBucketConfiguration: config.DEFAULT_AWS_REGION !== 'us-east-1' ? {
              LocationConstraint: config.DEFAULT_AWS_REGION as any
            } : undefined
          }));
          
          logger.info('Bucket created successfully', { bucket });
        } catch (createError) {
          logger.error('Failed to create bucket', { bucket, error: createError });
          throw new AWSServiceError(`Failed to create bucket ${bucket}`, createError);
        }
      } else {
        logger.error('Failed to check bucket existence', { bucket, error });
        throw new AWSServiceError(`Failed to access bucket ${bucket}`, error);
      }
    }
  }

  static validateContentType(filename: string, contentType?: string): string {
    if (contentType && contentType !== 'application/octet-stream') {
      return contentType;
    }

    const mimeType = mimeTypes.lookup(filename);
    return mimeType || 'application/octet-stream';
  }

  static generateArtifactKey(filename: string, type: ArtifactType): string {
    const timestamp = Date.now();
    const extension = filename.split('.').pop();
    const baseName = filename.replace(/\.[^/.]+$/, '');
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '-');
    
    return `${type}/${timestamp}-${sanitizedName}.${extension}`;
  }
}