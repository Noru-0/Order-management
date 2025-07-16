import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createDIContainerFromEnv, DIContainer } from './DIContainer';
import { createOrderRoutes } from '../interfaces/routes/OrderRoutes';

/**
 * Clean Architecture Application Bootstrap
 * This is the composition root where all dependencies are wired together
 */
export class Application {
  private app: Express;
  private container: DIContainer;
  private server: any;

  constructor() {
    this.app = express();
    this.container = createDIContainerFromEnv();
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    // Initialize database schema
    await this.container.initializeDatabase();

    // Setup middleware
    this.setupMiddleware();

    // Setup routes
    this.setupRoutes();

    // Setup error handling
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
  }

  /**
   * Setup application routes
   */
  private setupRoutes(): void {
    const controllers = this.container.getControllers();

    // API routes with Clean Architecture controllers
    this.app.use('/api', createOrderRoutes(
      controllers.command,
      controllers.query
    ));

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'Order Management System',
        version: '1.0.0',
        architecture: 'Clean Architecture + DDD + CQRS + Event Sourcing',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/api/health',
          stats: '/api/stats',
          orders: '/api/orders',
          events: '/api/events'
        }
      });
    });

    // API documentation endpoint
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        name: 'Order Management API',
        version: '1.0.0',
        architecture: 'Clean Architecture with CQRS',
        patterns: [
          'Domain-Driven Design (DDD)',
          'Command Query Responsibility Segregation (CQRS)',
          'Event Sourcing',
          'Clean Architecture',
          'Dependency Injection'
        ],
        endpoints: {
          commands: {
            'POST /api/orders': 'Create a new order',
            'PUT /api/orders/:id/status': 'Update order status',
            'POST /api/orders/:id/items': 'Add item to order',
            'DELETE /api/orders/:id/items/:productId': 'Remove item from order',
            'POST /api/orders/:id/rollback': 'Rollback order to previous state'
          },
          queries: {
            'GET /api/orders': 'Get all orders (paginated)',
            'GET /api/orders/search': 'Search orders by customer',
            'GET /api/orders/:id': 'Get specific order',
            'GET /api/orders/:id/summary': 'Get order summary',
            'GET /api/orders/:id/events': 'Get order event history',
            'GET /api/orders/:id/skipped-versions': 'Get skipped versions',
            'GET /api/events': 'Get all system events (paginated)'
          },
          system: {
            'GET /api/health': 'Health check',
            'GET /api/stats': 'Database statistics'
          }
        }
      });
    });

    // 404 handler for API routes
    this.app.use('/api/*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Endpoint not found',
        details: `The requested endpoint ${req.originalUrl} does not exist`,
        availableEndpoints: '/api'
      });
    });
  }

  /**
   * Setup global error handling
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Global error handler:', error);

      // Don't send error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(500).json({
        error: 'Internal server error',
        details: isDevelopment ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Don't exit in production, just log the error
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // Graceful shutdown
      this.shutdown().then(() => {
        process.exit(1);
      });
    });
  }

  /**
   * Start the application server
   */
  async start(port?: number): Promise<void> {
    const serverPort = port || parseInt(process.env.PORT || '3000');
    
    this.server = this.app.listen(serverPort, () => {
      console.log('🚀 Order Management System Started');
      console.log(`📍 Server running on port ${serverPort}`);
      console.log(`🏗️  Architecture: Clean Architecture + DDD + CQRS + Event Sourcing`);
      console.log(`🗄️  Event Store: ${process.env.EVENT_STORE_TYPE || 'memory'}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📖 API Documentation: http://localhost:${serverPort}/api`);
      console.log(`❤️  Health Check: http://localhost:${serverPort}/api/health`);
      console.log('----------------------------------------');
    });
  }

  /**
   * Gracefully shutdown the application
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down gracefully...');
    
    if (this.server) {
      this.server.close(() => {
        console.log('📡 HTTP server closed');
      });
    }

    // Cleanup container resources
    await this.container.dispose();
    console.log('🧹 Resources cleaned up');
    console.log('✅ Shutdown complete');
  }

  /**
   * Get the Express app instance
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Get the DI container
   */
  getContainer(): DIContainer {
    return this.container;
  }
}

/**
 * Create and initialize application
 */
export async function createApplication(): Promise<Application> {
  const app = new Application();
  await app.initialize();
  return app;
}

/**
 * Bootstrap function to start the application
 */
export async function bootstrap(port?: number): Promise<Application> {
  try {
    const app = await createApplication();
    await app.start(port);
    
    // Setup graceful shutdown handlers
    process.on('SIGTERM', async () => {
      console.log('📨 SIGTERM received');
      await app.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('📨 SIGINT received');
      await app.shutdown();
      process.exit(0);
    });

    return app;
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}
