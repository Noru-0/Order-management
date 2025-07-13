import express from 'express';
import dotenv from 'dotenv';
import { InMemoryEventStore } from './infrastructure/event-store';
import { PostgresEventStore } from './infrastructure/postgres-event-store';
import { OrderCommandHandlers } from './commands/handlers';
import { OrderController } from './api/controller';
import { createOrderRoutes } from './api/routes';
import { errorHandler, requestLogger, corsMiddleware } from './api/middleware';

// Load environment variables
dotenv.config();

async function main() {
  const app = express();
  const port = process.env.PORT || 3001;

  // Middleware
  app.use(express.json());
  app.use(corsMiddleware);
  app.use(requestLogger);

  // Initialize event store
  let eventStore;
  
  // Always try to use PostgreSQL first if environment variables are available
  const usePostgres = process.env.DB_HOST || process.env.DATABASE_URL;
  
  if (usePostgres) {
    // Use PostgreSQL event store
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'order_management',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    };
    
    try {
      eventStore = new PostgresEventStore(dbConfig);
      await eventStore.initialize();
      console.log('✅ Connected to PostgreSQL event store');
      console.log(`📊 Database: ${dbConfig.database} at ${dbConfig.host}:${dbConfig.port}`);
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL, falling back to in-memory store');
      console.error('Error:', error);
      eventStore = new InMemoryEventStore();
      console.log('⚠️  Using in-memory event store as fallback');
    }
  } else {
    // Use in-memory event store for development
    eventStore = new InMemoryEventStore();
    console.log('💾 Using in-memory event store (no database configured)');
  }

  // Initialize command handlers and controller
  const commandHandlers = new OrderCommandHandlers(eventStore);
  const orderController = new OrderController(commandHandlers, eventStore);

  // Routes
  app.use('/api', createOrderRoutes(orderController));

  // Health check endpoint
  app.get('/health', async (req, res) => {
    await orderController.healthCheck(req, res);
  });

  // Error handling middleware
  app.use(errorHandler);

  // Start server
  app.listen(port, () => {
    console.log(`Order Management API running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`API endpoints: http://localhost:${port}/api`);
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

// Start the application
main().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
