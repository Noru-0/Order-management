import { IEventStore } from '../../domain/repositories/IEventStore';
import { InMemoryEventStore } from './InMemoryEventStore';
import { PostgreSQLEventStore } from './PostgreSQLEventStore';

/**
 * Factory for creating Event Store instances
 * Implements Factory Pattern for dependency injection
 */
export class EventStoreFactory {
  /**
   * Create event store based on configuration
   */
  static create(config: EventStoreConfig): IEventStore {
    switch (config.type) {
      case 'memory':
        return new InMemoryEventStore();
      
      case 'postgres':
        if (!config.connectionString) {
          throw new Error('PostgreSQL connection string is required');
        }
        return new PostgreSQLEventStore(config.connectionString);
      
      default:
        throw new Error(`Unsupported event store type: ${config.type}`);
    }
  }

  /**
   * Create event store from environment variables
   */
  static createFromEnvironment(): IEventStore {
    const storeType = process.env.EVENT_STORE_TYPE as EventStoreType || 'memory';
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING;

    const config: EventStoreConfig = {
      type: storeType,
      connectionString
    };

    return this.create(config);
  }

  /**
   * Create memory store for testing
   */
  static createMemoryStore(): InMemoryEventStore {
    return new InMemoryEventStore();
  }

  /**
   * Create PostgreSQL store for production
   */
  static createPostgreSQLStore(connectionString: string): PostgreSQLEventStore {
    return new PostgreSQLEventStore(connectionString);
  }
}

/**
 * Event Store Configuration
 */
export interface EventStoreConfig {
  type: EventStoreType;
  connectionString?: string;
}

/**
 * Supported Event Store Types
 */
export type EventStoreType = 'memory' | 'postgres';

/**
 * Default configurations for different environments
 */
export const EventStoreConfigs = {
  development: {
    type: 'memory' as EventStoreType
  },
  
  test: {
    type: 'memory' as EventStoreType
  },
  
  production: {
    type: 'postgres' as EventStoreType,
    connectionString: process.env.DATABASE_URL
  }
} as const;
