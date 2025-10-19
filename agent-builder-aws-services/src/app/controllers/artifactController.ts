import { Request, Response } from 'express';
import { ArtifactService } from '@/services/artifactService';
import { CredentialResolver } from '@/config/credentialResolver';
import { createErrorResponse, ValidationError, ArtifactError } from '@/observability/errors';
import { logger } from '@/observability/logger';
import { ArtifactType } from '@/domain/types';

export class ArtifactController {
  constructor(
    private artifactService: ArtifactService,
    private credentialResolver: CredentialResolver
  ) {}

  async uploadArtifact(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json(createErrorResponse(new ValidationError('No file provided')));
        return;
      }

      const { name, type } = req.body;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      // Validate credentials
      const isValid = await this.credentialResolver.validateCredentials(credentials);
      if (!isValid) {
        res.status(401).json(createErrorResponse(new ValidationError('Invalid AWS credentials')));
        return;
      }

      const artifactType: ArtifactType = type || ArtifactService.inferArtifactType(req.file.originalname);

      const metadata = await this.artifactService.uploadArtifact(
        req.file.buffer,
        name || req.file.originalname,
        req.file.mimetype,
        artifactType,
        credentials
      );

      logger.info('Artifact uploaded successfully via API', {
        key: metadata.key,
        originalName: req.file.originalname,
        type: artifactType,
        size: metadata.size
      });

      res.status(201).json({
        success: true,
        message: 'Artifact uploaded successfully',
        data: metadata
      });
    } catch (error) {
      logger.error('Artifact upload failed via API', { error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async getArtifact(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const { download } = req.query;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      if (!key) {
        res.status(400).json(createErrorResponse(new ValidationError('Artifact key is required')));
        return;
      }

      const metadata = await this.artifactService.getArtifactMetadata(key, credentials);

      if (!metadata) {
        res.status(404).json({
          error: 'Artifact not found',
          code: 'ARTIFACT_NOT_FOUND',
          message: `Artifact with key '${key}' does not exist`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // If download=true, generate a signed URL
      if (download === 'true') {
        const expiresIn = parseInt(req.query.expires as string) || 3600; // Default 1 hour
        const downloadUrl = await this.artifactService.generateDownloadUrl(key, expiresIn, credentials);
        
        res.json({
          success: true,
          data: {
            ...metadata,
            downloadUrl,
            expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
          }
        });
      } else {
        res.json({
          success: true,
          data: metadata
        });
      }
    } catch (error) {
      logger.error('Failed to get artifact', { key: req.params.key, error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async generateDownloadUrl(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const expiresIn = parseInt(req.query.expires as string) || 3600;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      if (!key) {
        res.status(400).json(createErrorResponse(new ValidationError('Artifact key is required')));
        return;
      }

      const downloadUrl = await this.artifactService.generateDownloadUrl(key, expiresIn, credentials);

      res.json({
        success: true,
        data: {
          downloadUrl,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to generate download URL', { key: req.params.key, error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async deleteArtifact(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      if (!key) {
        res.status(400).json(createErrorResponse(new ValidationError('Artifact key is required')));
        return;
      }

      await this.artifactService.deleteArtifact(key, credentials);

      logger.info('Artifact deleted successfully via API', { key });

      res.json({
        success: true,
        message: 'Artifact deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete artifact', { key: req.params.key, error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async listArtifacts(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.query;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      if (type && !['mcp-tool', 'agent-core', 'knowledge-base', 'other'].includes(type as string)) {
        res.status(400).json(createErrorResponse(
          new ValidationError('Invalid artifact type. Must be one of: mcp-tool, agent-core, knowledge-base, other')
        ));
        return;
      }

      const artifacts = type 
        ? await this.artifactService.listArtifactsByType(type as ArtifactType, credentials)
        : []; // For now, return empty array as list functionality is not fully implemented

      res.json({
        success: true,
        data: {
          artifacts,
          total: artifacts.length,
          type: type || 'all'
        }
      });
    } catch (error) {
      logger.error('Failed to list artifacts', { error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
}