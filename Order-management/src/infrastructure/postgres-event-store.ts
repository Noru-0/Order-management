import { Pool, Client } from 'pg';
import { BaseEvent } from '../events/types';
import { EventStore } from './event-store';

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export class PostgresEventStore implements EventStore {
  private pool: Pool;

  constructor(config: PostgresConfig) {
    this.pool = new Pool({
      ...config,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Test connection
      await client.query('SELECT NOW()');
      console.log('✅ PostgreSQL Event Store initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize PostgreSQL Event Store:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async saveEvent(event: BaseEvent): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Use the database function to append event
      const result = await client.query(
        'SELECT * FROM append_event($1, $2, $3, $4)',
        [event.aggregateId, event.type, JSON.stringify(event.data), null]
      );

      await client.query('COMMIT');
      
      const { event_id, version } = result.rows[0];
      console.log(`📝 Event saved: ${event.type} for ${event.aggregateId} (version ${version})`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Failed to save event:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async appendEvent(aggregateId: string, event: BaseEvent, expectedVersion?: number): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check current version if expectedVersion is provided
      if (expectedVersion !== undefined) {
        const versionResult = await client.query(
          'SELECT COALESCE(MAX(version), 0) as current_version FROM events WHERE aggregate_id = $1',
          [aggregateId]
        );
        
        const currentVersion = parseInt(versionResult.rows[0].current_version);
        if (currentVersion !== expectedVersion) {
          throw new Error(`Concurrency conflict: expected version ${expectedVersion}, current version ${currentVersion}`);
        }
      }

      // Use the database function to append event
      const result = await client.query(
        'SELECT * FROM append_event($1, $2, $3, $4)',
        [aggregateId, event.type, JSON.stringify(event.data), expectedVersion]
      );

      await client.query('COMMIT');
      
      const { event_id, version } = result.rows[0];
      console.log(`📝 Event appended: ${event.type} for ${aggregateId} (version ${version})`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Failed to append event:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getEvents(aggregateId: string): Promise<BaseEvent[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT id, aggregate_id, event_type as type, event_data as data, version, timestamp 
         FROM events 
         WHERE aggregate_id = $1 
         ORDER BY version ASC`,
        [aggregateId]
      );

      return result.rows.map(row => ({
        type: row.type,
        aggregateId: row.aggregate_id,
        data: row.data,
        timestamp: new Date(row.timestamp),
        version: row.version
      }));
    } catch (error) {
      console.error('❌ Failed to get events:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllEvents(): Promise<BaseEvent[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT id, aggregate_id, event_type as type, event_data as data, version, timestamp 
         FROM events 
         ORDER BY timestamp ASC, version ASC`
      );

      return result.rows.map(row => ({
        type: row.type,
        aggregateId: row.aggregate_id,
        data: row.data,
        version: row.version,
        timestamp: new Date(row.timestamp)
      }));
    } catch (error) {
      console.error('❌ Failed to get all events:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getEventsByType(eventType: string): Promise<BaseEvent[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT id, aggregate_id, event_type as type, event_data as data, version, timestamp 
         FROM events 
         WHERE event_type = $1
         ORDER BY timestamp ASC`,
        [eventType]
      );

      return result.rows.map(row => ({
        type: row.type,
        aggregateId: row.aggregate_id,
        data: row.data,
        version: row.version,
        timestamp: new Date(row.timestamp)
      }));
    } catch (error) {
      console.error('❌ Failed to get events by type:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    console.log('🔌 PostgreSQL Event Store connection closed');
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('❌ PostgreSQL health check failed:', error);
      return false;
    } finally {
      client.release();
    }
  }

  // Get database statistics
  async getStats(): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      const eventCount = await client.query('SELECT COUNT(*) as count FROM events');
      const aggregateCount = await client.query('SELECT COUNT(DISTINCT aggregate_id) as count FROM events');
      const eventTypes = await client.query('SELECT event_type, COUNT(*) as count FROM events GROUP BY event_type ORDER BY count DESC');
      
      return {
        totalEvents: parseInt(eventCount.rows[0].count),
        totalAggregates: parseInt(aggregateCount.rows[0].count),
        eventTypes: eventTypes.rows.map(row => ({
          type: row.event_type,
          count: parseInt(row.count)
        }))
      };
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
