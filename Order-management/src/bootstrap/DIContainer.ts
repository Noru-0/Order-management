import { IEventStore } from '../domain/repositories/IEventStore';
import { EventStoreFactory, EventStoreConfig } from '../infrastructure/persistence/EventStoreFactory';
import { PostgreSQLEventStore } from '../infrastructure/persistence/PostgreSQLEventStore';

// Command Handlers
import {
  CreateOrderHandler,
  UpdateOrderStatusHandler,
  AddOrderItemHandler,
  RemoveOrderItemHandler,
  RollbackOrderHandler
} from '../application/commands/handlers/OrderCommandHandlers';

// Query Handlers
import {
  GetOrderHandler,
  GetAllOrdersHandler,
  GetOrderEventsHandler,
  GetAllEventsHandler,
  GetSkippedVersionsHandler,
  HealthCheckHandler,
  GetDatabaseStatsHandler
} from '../application/queries/handlers/OrderQueryHandlers';

// Controllers
import { OrderCommandController } from '../interfaces/controllers/OrderCommandController';
import { OrderQueryController } from '../interfaces/controllers/OrderQueryController';

/**
 * Dependency Injection Container
 * Implements the Composition Root pattern for Clean Architecture
 */
export class DIContainer {
  private eventStore: IEventStore;
  
  // Command Handlers
  private createOrderHandler!: CreateOrderHandler;
  private updateStatusHandler!: UpdateOrderStatusHandler;
  private addItemHandler!: AddOrderItemHandler;
  private removeItemHandler!: RemoveOrderItemHandler;
  private rollbackHandler!: RollbackOrderHandler;
  
  // Query Handlers
  private getOrderHandler!: GetOrderHandler;
  private getAllOrdersHandler!: GetAllOrdersHandler;
  private getOrderEventsHandler!: GetOrderEventsHandler;
  private getAllEventsHandler!: GetAllEventsHandler;
  private getSkippedVersionsHandler!: GetSkippedVersionsHandler;
  private healthCheckHandler!: HealthCheckHandler;
  private getDatabaseStatsHandler!: GetDatabaseStatsHandler;
  
  // Controllers
  private orderCommandController!: OrderCommandController;
  private orderQueryController!: OrderQueryController;

  constructor(config: DIConfig) {
    // Initialize infrastructure layer
    this.eventStore = this.createEventStore(config.eventStore);
    
    // Initialize application layer
    this.initializeCommandHandlers();
    this.initializeQueryHandlers();
    
    // Initialize interface layer
    this.initializeControllers();
  }

  /**
   * Create event store based on configuration
   */
  private createEventStore(config: EventStoreConfig): IEventStore {
    return EventStoreFactory.create(config);
  }

  /**
   * Initialize command handlers with dependencies
   */
  private initializeCommandHandlers(): void {
    this.createOrderHandler = new CreateOrderHandler(this.eventStore);
    this.updateStatusHandler = new UpdateOrderStatusHandler(this.eventStore);
    this.addItemHandler = new AddOrderItemHandler(this.eventStore);
    this.removeItemHandler = new RemoveOrderItemHandler(this.eventStore);
    this.rollbackHandler = new RollbackOrderHandler(this.eventStore);
  }

  /**
   * Initialize query handlers with dependencies
   */
  private initializeQueryHandlers(): void {
    this.getOrderHandler = new GetOrderHandler(this.eventStore);
    this.getAllOrdersHandler = new GetAllOrdersHandler(this.eventStore);
    this.getOrderEventsHandler = new GetOrderEventsHandler(this.eventStore);
    this.getAllEventsHandler = new GetAllEventsHandler(this.eventStore);
    this.getSkippedVersionsHandler = new GetSkippedVersionsHandler(this.eventStore);
    this.healthCheckHandler = new HealthCheckHandler(this.eventStore);
    this.getDatabaseStatsHandler = new GetDatabaseStatsHandler(this.eventStore);
  }

  /**
   * Initialize controllers with handlers
   */
  private initializeControllers(): void {
    this.orderCommandController = new OrderCommandController(
      this.createOrderHandler,
      this.updateStatusHandler,
      this.addItemHandler,
      this.removeItemHandler,
      this.rollbackHandler
    );

    this.orderQueryController = new OrderQueryController(
      this.getOrderHandler,
      this.getAllOrdersHandler,
      this.getOrderEventsHandler,
      this.getAllEventsHandler,
      this.getSkippedVersionsHandler,
      this.healthCheckHandler,
      this.getDatabaseStatsHandler
    );
  }

  /**
   * Initialize database schema (for PostgreSQL)
   */
  async initializeDatabase(): Promise<void> {
    if (this.eventStore instanceof PostgreSQLEventStore) {
      await this.eventStore.initialize();
    }
  }

  /**
   * Get event store instance
   */
  getEventStore(): IEventStore {
    return this.eventStore;
  }

  /**
   * Get command handlers
   */
  getCommandHandlers() {
    return {
      createOrder: this.createOrderHandler,
      updateStatus: this.updateStatusHandler,
      addItem: this.addItemHandler,
      removeItem: this.removeItemHandler,
      rollback: this.rollbackHandler
    };
  }

  /**
   * Get query handlers
   */
  getQueryHandlers() {
    return {
      getOrder: this.getOrderHandler,
      getAllOrders: this.getAllOrdersHandler,
      getOrderEvents: this.getOrderEventsHandler,
      getAllEvents: this.getAllEventsHandler,
      getSkippedVersions: this.getSkippedVersionsHandler,
      healthCheck: this.healthCheckHandler,
      getDatabaseStats: this.getDatabaseStatsHandler
    };
  }

  /**
   * Get controllers
   */
  getControllers() {
    return {
      command: this.orderCommandController,
      query: this.orderQueryController
    };
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.eventStore instanceof PostgreSQLEventStore) {
      await this.eventStore.close();
    }
  }
}

/**
 * Dependency Injection Configuration
 */
export interface DIConfig {
  eventStore: EventStoreConfig;
}

/**
 * Environment-specific configurations
 */
export const DIConfigurations = {
  development: {
    eventStore: {
      type: 'memory' as const
    }
  },
  
  test: {
    eventStore: {
      type: 'memory' as const
    }
  },
  
  production: {
    eventStore: {
      type: 'postgres' as const,
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/orderdb'
    }
  }
} as const;

/**
 * Factory function to create DI container based on environment
 */
export function createDIContainer(environment: string = 'development'): DIContainer {
  const config = DIConfigurations[environment as keyof typeof DIConfigurations] || DIConfigurations.development;
  return new DIContainer(config);
}

/**
 * Factory function to create DI container from environment variables
 */
export function createDIContainerFromEnv(): DIContainer {
  const environment = process.env.NODE_ENV || 'development';
  const config: DIConfig = {
    eventStore: {
      type: (process.env.EVENT_STORE_TYPE as any) || 'memory',
      connectionString: process.env.DATABASE_URL
    }
  };
  
  return new DIContainer(config);
}
