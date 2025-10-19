import { Request, Response } from 'express';
import { DeploymentService } from '@/services/deploymentService';
import { CredentialResolver } from '@/config/credentialResolver';
import { createErrorResponse, ValidationError } from '@/observability/errors';
import { logger } from '@/observability/logger';
import { McpServerConfig, DeploymentTarget } from '@/domain/types';

export class McpController {
  constructor(
    private deploymentService: DeploymentService,
    private credentialResolver: CredentialResolver
  ) {}

  async deployMcpServer(req: Request, res: Response): Promise<void> {
    try {
      const config: McpServerConfig = req.body;
      const target: DeploymentTarget = req.body.target || 'ecs';
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      // Validate credentials
      const isValid = await this.credentialResolver.validateCredentials(credentials);
      if (!isValid) {
        res.status(401).json(createErrorResponse(new ValidationError('Invalid AWS credentials')));
        return;
      }

      // Validate required fields
      if (!config.name || !config.image || !config.port) {
        res.status(400).json(createErrorResponse(
          new ValidationError('Missing required fields: name, image, port')
        ));
        return;
      }

      // Validate target
      if (!['ecs', 'lambda'].includes(target)) {
        res.status(400).json(createErrorResponse(
          new ValidationError('Target must be either "ecs" or "lambda"')
        ));
        return;
      }

      logger.info('Starting MCP server deployment via API', {
        name: config.name,
        image: config.image,
        target,
        port: config.port
      });

      const result = await this.deploymentService.deployMcpServer(config, target, credentials);

      res.status(202).json({
        success: true,
        message: `MCP server deployment to ${target.toUpperCase()} initiated`,
        data: result
      });
    } catch (error) {
      logger.error('MCP server deployment failed via API', { error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async getMcpServerStatus(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName } = req.params;
      const { target } = req.query;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      if (!serviceName) {
        res.status(400).json(createErrorResponse(new ValidationError('Service name is required')));
        return;
      }

      if (!target || !['ecs', 'lambda'].includes(target as string)) {
        res.status(400).json(createErrorResponse(
          new ValidationError('Target query parameter is required and must be either "ecs" or "lambda"')
        ));
        return;
      }

      logger.info('Getting MCP server status via API', {
        serviceName,
        target
      });

      const status = await this.deploymentService.getDeploymentStatus(
        serviceName,
        target as DeploymentTarget,
        credentials
      );

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Failed to get MCP server status', { 
        serviceName: req.params.serviceName, 
        target: req.query.target,
        error 
      });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async updateMcpServer(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName } = req.params;
      const config = req.body;
      const target: DeploymentTarget = req.body.target || 'ecs';
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      if (!serviceName) {
        res.status(400).json(createErrorResponse(new ValidationError('Service name is required')));
        return;
      }

      if (!['ecs', 'lambda'].includes(target)) {
        res.status(400).json(createErrorResponse(
          new ValidationError('Target must be either "ecs" or "lambda"')
        ));
        return;
      }

      logger.info('Updating MCP server via API', {
        serviceName,
        target,
        updateFields: Object.keys(config)
      });

      const result = await this.deploymentService.updateDeployment(
        serviceName,
        config,
        target,
        credentials
      );

      res.json({
        success: true,
        message: 'MCP server update initiated',
        data: result
      });
    } catch (error) {
      logger.error('MCP server update failed via API', { 
        serviceName: req.params.serviceName,
        error 
      });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async deleteMcpServer(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName } = req.params;
      const { target } = req.query;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      if (!serviceName) {
        res.status(400).json(createErrorResponse(new ValidationError('Service name is required')));
        return;
      }

      if (!target || !['ecs', 'lambda'].includes(target as string)) {
        res.status(400).json(createErrorResponse(
          new ValidationError('Target query parameter is required and must be either "ecs" or "lambda"')
        ));
        return;
      }

      logger.info('Deleting MCP server via API', {
        serviceName,
        target
      });

      await this.deploymentService.deleteDeployment(
        serviceName,
        target as DeploymentTarget,
        credentials
      );

      res.json({
        success: true,
        message: `MCP server '${serviceName}' deleted successfully from ${target}`
      });
    } catch (error) {
      logger.error('MCP server deletion failed via API', { 
        serviceName: req.params.serviceName,
        target: req.query.target,
        error 
      });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async listMcpServers(req: Request, res: Response): Promise<void> {
    try {
      const { target } = req.query;
      const credentials = await this.credentialResolver.resolveCredentials(req.headers as Record<string, string>);

      if (target && !['ecs', 'lambda'].includes(target as string)) {
        res.status(400).json(createErrorResponse(
          new ValidationError('Target must be either "ecs" or "lambda"')
        ));
        return;
      }

      // Note: This would require implementing list functionality in the MCP deploy adapter
      // For now, return a placeholder response
      logger.info('Listing MCP servers via API', { target });

      res.json({
        success: true,
        data: {
          services: [],
          total: 0,
          target: target || 'all',
          message: 'MCP server listing not yet fully implemented'
        }
      });
    } catch (error) {
      logger.error('Failed to list MCP servers', { error });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async getMcpServerLogs(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName } = req.params;
      const { target, lines, follow } = req.query;

      if (!serviceName) {
        res.status(400).json(createErrorResponse(new ValidationError('Service name is required')));
        return;
      }

      if (!target || !['ecs', 'lambda'].includes(target as string)) {
        res.status(400).json(createErrorResponse(
          new ValidationError('Target query parameter is required and must be either "ecs" or "lambda"')
        ));
        return;
      }

      // This would require implementing log retrieval from CloudWatch
      // For now, return a placeholder response
      logger.info('Getting MCP server logs via API', {
        serviceName,
        target,
        lines: lines || 100,
        follow: follow === 'true'
      });

      if (follow === 'true') {
        // Set up Server-Sent Events for log streaming
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        res.write(`data: ${JSON.stringify({ 
          type: 'log', 
          message: 'Log streaming not yet implemented',
          timestamp: new Date().toISOString()
        })}\n\n`);

        // Keep connection alive for demonstration
        const keepAlive = setInterval(() => {
          res.write(`data: ${JSON.stringify({ 
            type: 'heartbeat', 
            timestamp: new Date().toISOString() 
          })}\n\n`);
        }, 30000);

        req.on('close', () => {
          clearInterval(keepAlive);
          res.end();
        });
      } else {
        res.json({
          success: true,
          data: {
            logs: [
              {
                timestamp: new Date().toISOString(),
                level: 'info',
                message: 'Log retrieval not yet implemented',
                source: serviceName
              }
            ],
            total: 1,
            serviceName,
            target
          }
        });
      }
    } catch (error) {
      logger.error('Failed to get MCP server logs', { 
        serviceName: req.params.serviceName,
        error 
      });
      const errorResponse = createErrorResponse(error as Error);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
}