import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from '@/config/config';
import { logger } from '@/observability/logger';
import { createRoutes } from './routes';
import { createErrorResponse } from '@/observability/errors';

// Import services and adapters
import { CredentialResolver } from '@/config/credentialResolver';
import { S3ArtifactAdapter } from '@/adapters/s3ArtifactAdapter';
import { BedrockAgentAdapter } from '@/adapters/bedrockAgentAdapter';
import { BedrockInvokeAdapter } from '@/adapters/bedrockInvokeAdapter';
import { McpDeployAdapter } from '@/adapters/mcpDeployAdapter';
import { WebSocketEventEmitter } from '@/events/websocketEventEmitter';

// Import services
import { ArtifactService } from '@/services/artifactService';
import { DeploymentService } from '@/services/deploymentService';

// Import controllers
import { ArtifactController } from './controllers/artifactController';
import { BedrockController } from './controllers/bedrockController';
import { McpController } from './controllers/mcpController';

export class Server {
  private app: express.Application;
  private server: any;
  private wsEventEmitter: WebSocketEventEmitter;

  constructor() {
    this.app = express();
    this.wsEventEmitter = new WebSocketEventEmitter();
    this.setupMiddleware();
    this.setupDependencies();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for API server
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    }));
    
    // CORS configuration
    this.app.use(cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'x-aws-access-key-id',
        'x-aws-secret-access-key',
        'x-aws-session-token',
        'x-aws-region'
      ]
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW,
      max: config.RATE_LIMIT_REQUESTS,
      message: {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      // Log request
      logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        hasAwsCredentials: !!(req.headers['x-aws-access-key-id']),
        region: req.headers['x-aws-region'] || config.DEFAULT_AWS_REGION
      });

      // Log response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('Request completed', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('Content-Length')
        });
      });

      next();
    });
  }

  private setupDependencies(): void {
    // Initialize core dependencies
    const credentialResolver = new CredentialResolver();
    
    // Initialize adapters
    const s3ArtifactAdapter = new S3ArtifactAdapter();
    const bedrockAgentAdapter = new BedrockAgentAdapter();
    const bedrockInvokeAdapter = new BedrockInvokeAdapter();
    const mcpDeployAdapter = new McpDeployAdapter();

    // Initialize services
    const artifactService = new ArtifactService(s3ArtifactAdapter, this.wsEventEmitter);
    const deploymentService = new DeploymentService(
      bedrockAgentAdapter,
      mcpDeployAdapter,
      this.wsEventEmitter
    );

    // Initialize controllers
    const artifactController = new ArtifactController(artifactService, credentialResolver);
    const bedrockController = new BedrockController(
      deploymentService,
      credentialResolver,
      bedrockInvokeAdapter
    );
    const mcpController = new McpController(deploymentService, credentialResolver);

    // Setup routes
    const routes = createRoutes({
      artifactController,
      bedrockController,
      mcpController
    });

    this.app.use('/', routes);

    // Global error handling middleware
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.url,
        ip: req.ip
      });

      const errorResponse = createErrorResponse(error);
      res.status(errorResponse.statusCode).json(errorResponse);
    });
  }

  async start(): Promise<void> {
    try {
      // Create HTTP server
      this.server = createServer(this.app);

      // Initialize WebSocket if enabled
      if (config.WS_ENABLED) {
        this.wsEventEmitter.initialize(this.server);
        logger.info('WebSocket server initialized');
      }

      // Start server
      this.server.listen(config.PORT, config.HOST, () => {
        logger.info('AWS Services server started', {
          port: config.PORT,
          host: config.HOST,
          environment: config.NODE_ENV,
          websockets: config.WS_ENABLED,
          region: config.DEFAULT_AWS_REGION,
          s3Bucket: config.S3_ARTIFACT_BUCKET,
          deployTarget: config.DEPLOY_TARGET,
          maxArtifactSize: `${config.ARTIFACT_MAX_MB}MB`
        });
      });

      // Graceful shutdown handlers
      process.on('SIGTERM', () => this.shutdown('SIGTERM'));
      process.on('SIGINT', () => this.shutdown('SIGINT'));

    } catch (error) {
      logger.error('Failed to start server', { error });
      process.exit(1);
    }
  }

  private async shutdown(signal: string): Promise<void> {
    logger.info('Shutdown initiated', { signal });

    try {
      // Close server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Close WebSocket connections
      if (config.WS_ENABLED) {
        this.wsEventEmitter.close();
      }

      logger.info('Shutdown completed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      // Perform basic health checks
      // In a real implementation, you might check AWS connectivity
      return true;
    } catch (error) {
      logger.error('Health check failed', { error });
      return false;
    }
  }

  // Getters for monitoring
  getWebSocketStats() {
    if (!config.WS_ENABLED) {
      return { enabled: false };
    }

    return {
      enabled: true,
      clientCount: this.wsEventEmitter.getClientCount(),
      deploymentSubscriptions: this.wsEventEmitter.getDeploymentSubscriptions()
    };
  }
}