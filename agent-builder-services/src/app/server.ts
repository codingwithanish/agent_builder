import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from '@/config/config';
import { logger } from '@/infrastructure/logger';
import { createRoutes } from '@/presentation/routes';
import { WebSocketDispatcher } from '@/infrastructure/events/websocketDispatcher';

// Repositories
import { PostgresFlowRepository } from '@/infrastructure/db/repositories/flowRepository.postgres';
import { PostgresLlmRepository } from '@/infrastructure/db/repositories/llmRepository.postgres';
import { postgresClient } from '@/infrastructure/db/postgresClient';

// Adapters
import { LlmServiceAdapter } from '@/infrastructure/adapters/llmServiceAdapter';
import { AWSServiceAdapter } from '@/infrastructure/adapters/awsServiceAdapter';

// Services
import { FlowService } from '@/application/services/flowService';
import { LlmService } from '@/application/services/llmService';
import { DeploymentService } from '@/application/services/deploymentService';

// Controllers
import { FlowController } from '@/presentation/controllers/flowController';
import { LlmController } from '@/presentation/controllers/llmController';

export class Server {
  private app: express.Application;
  private server: any;
  private wsDispatcher: WebSocketDispatcher;

  constructor() {
    this.app = express();
    this.wsDispatcher = new WebSocketDispatcher();
    this.setupMiddleware();
    this.setupDependencies();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: config.CORS_ORIGIN,
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW,
      max: config.RATE_LIMIT_REQUESTS,
      message: {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.'
      }
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  private setupDependencies(): void {
    // Repositories
    const flowRepository = new PostgresFlowRepository(postgresClient);
    const llmRepository = new PostgresLlmRepository(postgresClient);

    // Adapters
    const llmClient = new LlmServiceAdapter();
    const deploymentClient = new AWSServiceAdapter();

    // Services
    const flowService = new FlowService(flowRepository, llmRepository);
    const llmService = new LlmService(llmRepository, llmClient);
    const deploymentService = new DeploymentService(
      flowRepository,
      deploymentClient,
      this.wsDispatcher
    );

    // Controllers
    const flowController = new FlowController(flowService, deploymentService);
    const llmController = new LlmController(llmService);

    // Routes
    const routes = createRoutes({
      flowController,
      llmController
    });

    this.app.use('/', routes);

    // Error handling middleware
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.url
      });

      res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.app.use('*', (req: express.Request, res: express.Response) => {
      res.status(404).json({
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  async start(): Promise<void> {
    try {
      // Test database connection
      const dbHealthy = await postgresClient.healthCheck();
      if (dbHealthy) {
        logger.info('Database connection established');
      } else {
        logger.warn('Starting without database connection - some features may not work');
      }

      // Create HTTP server
      this.server = createServer(this.app);

      // Initialize WebSocket if enabled
      if (config.ENABLE_WEBSOCKETS) {
        this.wsDispatcher.initialize(this.server);
        logger.info('WebSocket server initialized');
      }

      // Start server
      this.server.listen(config.PORT, config.HOST, () => {
        logger.info('Server started', {
          port: config.PORT,
          host: config.HOST,
          environment: config.NODE_ENV,
          websockets: config.ENABLE_WEBSOCKETS
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
      if (config.ENABLE_WEBSOCKETS) {
        this.wsDispatcher.close();
      }

      // Close database connections
      await postgresClient.close();

      logger.info('Shutdown completed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  }
}