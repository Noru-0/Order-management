import { Pool, PoolClient } from 'pg';
import { BaseDomainEvent } from '../../domain/events/types';
import { IEventStore } from '../../domain/repositories/IEventStore';

/**
 * PostgreSQL Event Store Implementation
 * Production-ready implementation with proper transaction handling
 */
export class PostgreSQLEventStore implements IEventStore {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          aggregate_id VARCHAR(255) NOT NULL,
          aggregate_type VARCHAR(100) NOT NULL,
          event_type VARCHAR(100) NOT NULL,
          version INTEGER NOT NULL,
          event_data JSONB NOT NULL,
          metadata JSONB,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(aggregate_id, version)
        );
        
        CREATE INDEX IF NOT EXISTS idx_events_aggregate_id ON events(aggregate_id);
        CREATE INDEX IF NOT EXISTS idx_events_aggregate_type ON events(aggregate_type);
        CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_events_version ON events(aggregate_id, version);
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Save a single event
   */
  async saveEvent(event: BaseDomainEvent): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(
        `INSERT INTO events 
         (aggregate_id, aggregate_type, event_type, version, event_data, metadata, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          event.aggregateId,
          event.aggregateType,
          event.type,
          event.version,
          JSON.stringify(event.data),
          JSON.stringify(event.metadata || {}),
          event.timestamp
        ]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Save multiple events atomically
   */
  async saveEvents(events: BaseDomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const event of events) {
        await client.query(
          `INSERT INTO events 
           (aggregate_id, aggregate_type, event_type, version, event_data, metadata, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            event.aggregateId,
            event.aggregateType,
            event.type,
            event.version,
            JSON.stringify(event.data),
            JSON.stringify(event.metadata || {}),
            event.timestamp
          ]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all events for a specific aggregate
   */
  async getEvents(aggregateId: string): Promise<BaseDomainEvent[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM events 
         WHERE aggregate_id = $1 
         ORDER BY version ASC`,
        [aggregateId]
      );

      return result.rows.map(this.mapRowToEvent);
    } finally {
      client.release();
    }
  }

  /**
   * Get all events in the store
   */
  async getAllEvents(): Promise<BaseDomainEvent[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM events 
         ORDER BY timestamp DESC, version ASC`
      );

      return result.rows.map(this.mapRowToEvent);
    } finally {
      client.release();
    }
  }

  /**
   * Get events for a specific aggregate up to a certain version
   */
  async getEventsUntilVersion(aggregateId: string, version: number): Promise<BaseDomainEvent[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM events 
         WHERE aggregate_id = $1 AND version <= $2 
         ORDER BY version ASC`,
        [aggregateId, version]
      );

      return result.rows.map(this.mapRowToEvent);
    } finally {
      client.release();
    }
  }

  /**
   * Check if an event exists
   */
  async eventExists(aggregateId: string, version: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT 1 FROM events 
         WHERE aggregate_id = $1 AND version = $2 
         LIMIT 1`,
        [aggregateId, version]
      );

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get the latest version number for an aggregate
   */
  async getLatestVersion(aggregateId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT MAX(version) as max_version 
         FROM events 
         WHERE aggregate_id = $1`,
        [aggregateId]
      );

      return result.rows[0]?.max_version || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Delete all events for an aggregate (for testing purposes)
   */
  async deleteAggregate(aggregateId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(
        `DELETE FROM events WHERE aggregate_id = $1`,
        [aggregateId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Clear all events (for testing purposes)
   */
  async clear(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM events');
      await client.query('ALTER SEQUENCE events_id_seq RESTART WITH 1');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get event count
   */
  async getEventCount(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM events');
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  /**
   * Get unique aggregate count
   */
  async getAggregateCount(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT COUNT(DISTINCT aggregate_id) as count FROM events'
      );
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(eventType: string): Promise<BaseDomainEvent[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM events 
         WHERE event_type = $1 
         ORDER BY timestamp DESC`,
        [eventType]
      );

      return result.rows.map(this.mapRowToEvent);
    } finally {
      client.release();
    }
  }

  /**
   * Get events in a date range
   */
  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<BaseDomainEvent[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM events 
         WHERE timestamp >= $1 AND timestamp <= $2 
         ORDER BY timestamp DESC`,
        [startDate.toISOString(), endDate.toISOString()]
      );

      return result.rows.map(this.mapRowToEvent);
    } finally {
      client.release();
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalEvents: number;
    totalAggregates: number;
    eventTypes: { type: string; count: number }[];
  }> {
    const client = await this.pool.connect();
    try {
      const [eventsResult, aggregatesResult, typesResult] = await Promise.all([
        client.query('SELECT COUNT(*) as count FROM events'),
        client.query('SELECT COUNT(DISTINCT aggregate_id) as count FROM events'),
        client.query(`
          SELECT event_type as type, COUNT(*) as count 
          FROM events 
          GROUP BY event_type 
          ORDER BY count DESC
        `)
      ]);

      return {
        totalEvents: parseInt(eventsResult.rows[0].count),
        totalAggregates: parseInt(aggregatesResult.rows[0].count),
        eventTypes: typesResult.rows.map(row => ({
          type: row.type,
          count: parseInt(row.count)
        }))
      };
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Map database row to domain event
   */
  private mapRowToEvent(row: any): BaseDomainEvent {
    return {
      id: row.id,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      type: row.event_type,
      version: row.version,
      data: row.event_data,
      metadata: row.metadata || {},
      timestamp: row.timestamp.toISOString()
    };
  }

  /**
   * Check if store is healthy
   */
  async isHealthy(): Promise<boolean> {
    return await this.healthCheck();
  }
}
