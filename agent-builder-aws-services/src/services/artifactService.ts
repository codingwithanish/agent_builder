import { ArtifactStoragePort, EventEmitterPort } from '@/domain/interfaces';
import { AWSCredentials, ArtifactMetadata, ArtifactType } from '@/domain/types';
import { ArtifactError, ValidationError } from '@/observability/errors';
import { logger } from '@/observability/logger';
import { S3ArtifactAdapter } from '@/adapters/s3ArtifactAdapter';

export class ArtifactService {
  constructor(
    private artifactStorage: ArtifactStoragePort,
    private eventEmitter: EventEmitterPort
  ) {}

  async uploadArtifact(
    file: Buffer,
    originalName: string,
    contentType: string,
    type: ArtifactType,
    credentials: AWSCredentials
  ): Promise<ArtifactMetadata> {
    try {
      this.validateUploadRequest(file, originalName, type);

      // Validate and normalize content type
      const validatedContentType = S3ArtifactAdapter.validateContentType(originalName, contentType);
      
      // Generate unique key
      const key = S3ArtifactAdapter.generateArtifactKey(originalName, type);

      logger.info('Starting artifact upload', {
        originalName,
        type,
        size: file.length,
        key,
        contentType: validatedContentType
      });

      // Emit upload started event
      this.eventEmitter.emit({
        type: 'artifact:upload:started',
        id: key,
        data: {
          key,
          originalName,
          type,
          size: file.length
        },
        timestamp: new Date().toISOString()
      });

      const metadata = await this.artifactStorage.uploadFile(
        file,
        key,
        validatedContentType,
        type,
        credentials
      );

      // Emit upload completed event
      this.eventEmitter.emit({
        type: 'artifact:upload:completed',
        id: key,
        data: {
          metadata,
          originalName
        },
        timestamp: new Date().toISOString()
      });

      logger.info('Artifact upload completed successfully', {
        key,
        originalName,
        type,
        size: metadata.size
      });

      return metadata;
    } catch (error) {
      logger.error('Artifact upload failed', {
        originalName,
        type,
        error
      });

      // Emit upload failed event
      this.eventEmitter.emit({
        type: 'artifact:upload:failed',
        id: originalName,
        data: {
          originalName,
          type,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  async getArtifactMetadata(key: string, credentials: AWSCredentials): Promise<ArtifactMetadata | null> {
    try {
      const metadata = await this.artifactStorage.getFileMetadata(key, credentials);
      
      if (metadata) {
        logger.debug('Retrieved artifact metadata', { key, size: metadata.size, type: metadata.type });
      } else {
        logger.debug('Artifact not found', { key });
      }

      return metadata;
    } catch (error) {
      logger.error('Failed to get artifact metadata', { key, error });
      throw error;
    }
  }

  async generateDownloadUrl(
    key: string, 
    expiresIn: number = 3600, 
    credentials: AWSCredentials
  ): Promise<string> {
    try {
      // Validate expiration time
      if (expiresIn <= 0 || expiresIn > 604800) { // Max 7 days
        throw new ValidationError('Expiration time must be between 1 second and 7 days');
      }

      const url = await this.artifactStorage.generateSignedUrl(key, expiresIn, credentials);
      
      logger.info('Generated download URL', { 
        key, 
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      });

      // Emit URL generation event
      this.eventEmitter.emit({
        type: 'artifact:url:generated',
        id: key,
        data: {
          key,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
        },
        timestamp: new Date().toISOString()
      });

      return url;
    } catch (error) {
      logger.error('Failed to generate download URL', { key, error });
      throw error;
    }
  }

  async deleteArtifact(key: string, credentials: AWSCredentials): Promise<void> {
    try {
      // Get metadata before deletion for logging
      const metadata = await this.artifactStorage.getFileMetadata(key, credentials);
      
      await this.artifactStorage.deleteFile(key, credentials);

      logger.info('Artifact deleted successfully', { 
        key,
        size: metadata?.size,
        type: metadata?.type
      });

      // Emit deletion event
      this.eventEmitter.emit({
        type: 'artifact:deleted',
        id: key,
        data: {
          key,
          metadata
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to delete artifact', { key, error });
      throw error;
    }
  }

  async listArtifactsByType(type: ArtifactType, credentials: AWSCredentials): Promise<ArtifactMetadata[]> {
    // Note: This would require implementing list functionality in S3ArtifactAdapter
    // For now, return empty array as this is a limitation of the current implementation
    logger.warn('List artifacts by type not yet implemented', { type });
    return [];
  }

  private validateUploadRequest(file: Buffer, originalName: string, type: ArtifactType): void {
    if (!file || file.length === 0) {
      throw new ValidationError('File content is required');
    }

    if (!originalName || originalName.trim().length === 0) {
      throw new ValidationError('Original filename is required');
    }

    // Validate filename
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(originalName)) {
      throw new ValidationError('Filename contains invalid characters');
    }

    // Validate file extension based on type
    const extension = originalName.split('.').pop()?.toLowerCase();
    if (!extension) {
      throw new ValidationError('File must have an extension');
    }

    this.validateFileExtensionForType(extension, type);
  }

  private validateFileExtensionForType(extension: string, type: ArtifactType): void {
    const allowedExtensions: Record<ArtifactType, string[]> = {
      'mcp-tool': ['zip', 'tar', 'tar.gz', 'js', 'py', 'json'],
      'agent-core': ['zip', 'tar', 'tar.gz', 'json'],
      'knowledge-base': ['pdf', 'txt', 'md', 'doc', 'docx', 'json', 'csv'],
      'other': ['zip', 'tar', 'json', 'yaml', 'yml', 'txt', 'md']
    };

    const allowed = allowedExtensions[type] || allowedExtensions.other;
    
    if (!allowed.includes(extension)) {
      throw new ArtifactError(
        `File extension '${extension}' is not allowed for artifact type '${type}'. ` +
        `Allowed extensions: ${allowed.join(', ')}`
      );
    }
  }

  // Utility method to determine artifact type from filename
  static inferArtifactType(filename: string): ArtifactType {
    const name = filename.toLowerCase();
    
    if (name.includes('mcp') || name.includes('tool')) {
      return 'mcp-tool';
    }
    
    if (name.includes('agent') || name.includes('core')) {
      return 'agent-core';
    }
    
    if (name.includes('kb') || name.includes('knowledge')) {
      return 'knowledge-base';
    }
    
    return 'other';
  }
}