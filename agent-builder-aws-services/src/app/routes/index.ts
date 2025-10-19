import { Router } from 'express';
import multer from 'multer';
import { ArtifactController } from '../controllers/artifactController';
import { BedrockController } from '../controllers/bedrockController';
import { McpController } from '../controllers/mcpController';
import { config } from '@/config/config';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.ARTIFACT_MAX_MB * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now, validation happens in the service
    cb(null, true);
  }
});

export function createRoutes(dependencies: {
  artifactController: ArtifactController;
  bedrockController: BedrockController;
  mcpController: McpController;
}): Router {
  const router = Router();

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: config.SERVICE_NAME,
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      region: config.DEFAULT_AWS_REGION,
      features: {
        artifacts: true,
        bedrock: true,
        mcp: true,
        websockets: config.WS_ENABLED
      }
    });
  });

  // Service status endpoint
  router.get('/status', (req, res) => {
    res.json({
      service: config.SERVICE_NAME,
      version: '1.0.0',
      environment: config.NODE_ENV,
      aws: {
        region: config.DEFAULT_AWS_REGION,
        s3_bucket: config.S3_ARTIFACT_BUCKET,
        allow_header_creds: config.ALLOW_HEADER_CREDS
      },
      limits: {
        max_artifact_size_mb: config.ARTIFACT_MAX_MB,
        deploy_target: config.DEPLOY_TARGET
      },
      features: {
        supported_targets: ['ecs', 'lambda'],
        supported_artifact_types: ['mcp-tool', 'agent-core', 'knowledge-base', 'other'],
        websocket_events: ['deploy:progress', 'deploy:complete', 'deploy:error', 'invoke:result']
      }
    });
  });

  // Artifact Management Routes
  router.post('/artifacts/upload', 
    upload.single('file'),
    dependencies.artifactController.uploadArtifact.bind(dependencies.artifactController)
  );

  router.get('/artifacts/:key',
    dependencies.artifactController.getArtifact.bind(dependencies.artifactController)
  );

  router.get('/artifacts/:key/download',
    dependencies.artifactController.generateDownloadUrl.bind(dependencies.artifactController)
  );

  router.delete('/artifacts/:key',
    dependencies.artifactController.deleteArtifact.bind(dependencies.artifactController)
  );

  router.get('/artifacts',
    dependencies.artifactController.listArtifacts.bind(dependencies.artifactController)
  );

  // Bedrock Agent Routes
  router.post('/bedrock/deploy',
    dependencies.bedrockController.deployAgent.bind(dependencies.bedrockController)
  );

  router.get('/bedrock/status/:agentId',
    dependencies.bedrockController.getAgentStatus.bind(dependencies.bedrockController)
  );

  router.post('/bedrock/invoke',
    dependencies.bedrockController.invokeAgent.bind(dependencies.bedrockController)
  );

  router.post('/bedrock/invoke/stream',
    dependencies.bedrockController.streamAgentInvocation.bind(dependencies.bedrockController)
  );

  router.post('/bedrock/model/invoke',
    dependencies.bedrockController.invokeModel.bind(dependencies.bedrockController)
  );

  // Knowledge Base Routes (placeholders)
  router.post('/bedrock/kb',
    dependencies.bedrockController.createKnowledgeBase.bind(dependencies.bedrockController)
  );

  router.post('/bedrock/kb/ingest',
    dependencies.bedrockController.startIngestion.bind(dependencies.bedrockController)
  );

  // MCP Deployment Routes
  router.post('/mcp/deploy',
    dependencies.mcpController.deployMcpServer.bind(dependencies.mcpController)
  );

  router.get('/mcp/status/:serviceName',
    dependencies.mcpController.getMcpServerStatus.bind(dependencies.mcpController)
  );

  router.put('/mcp/:serviceName',
    dependencies.mcpController.updateMcpServer.bind(dependencies.mcpController)
  );

  router.delete('/mcp/:serviceName',
    dependencies.mcpController.deleteMcpServer.bind(dependencies.mcpController)
  );

  router.get('/mcp',
    dependencies.mcpController.listMcpServers.bind(dependencies.mcpController)
  );

  router.get('/mcp/:serviceName/logs',
    dependencies.mcpController.getMcpServerLogs.bind(dependencies.mcpController)
  );

  // Error handling middleware
  router.use((error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large',
          code: 'FILE_SIZE_EXCEEDED',
          message: `File size exceeds maximum allowed size of ${config.ARTIFACT_MAX_MB}MB`,
          maxSize: config.ARTIFACT_MAX_MB * 1024 * 1024
        });
      }
      
      return res.status(400).json({
        error: 'Upload error',
        code: 'UPLOAD_ERROR',
        message: error.message
      });
    }

    next(error);
  });

  // 404 handler
  router.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      availableRoutes: {
        artifacts: [
          'POST /artifacts/upload',
          'GET /artifacts/:key',
          'GET /artifacts/:key/download',
          'DELETE /artifacts/:key',
          'GET /artifacts'
        ],
        bedrock: [
          'POST /bedrock/deploy',
          'GET /bedrock/status/:agentId',
          'POST /bedrock/invoke',
          'POST /bedrock/invoke/stream',
          'POST /bedrock/model/invoke'
        ],
        mcp: [
          'POST /mcp/deploy',
          'GET /mcp/status/:serviceName',
          'PUT /mcp/:serviceName',
          'DELETE /mcp/:serviceName',
          'GET /mcp',
          'GET /mcp/:serviceName/logs'
        ]
      }
    });
  });

  return router;
}