import { BaseDomainEvent } from '../events/types';

/**
 * Domain repository interface for Event Store
 * This is the contract that infrastructure layer must implement
 */
export interface IEventStore {
  /**
   * Save a single event to the store
   */
  saveEvent(event: BaseDomainEvent): Promise<void>;

  /**
   * Get all events for a specific aggregate
   */
  getEvents(aggregateId: string): Promise<BaseDomainEvent[]>;

  /**
   * Get all events across all aggregates
   */
  getAllEvents(): Promise<BaseDomainEvent[]>;

  /**
   * Health check for the store
   */
  healthCheck?(): Promise<boolean>;

  /**
   * Get store statistics (optional)
   */
  getStats?(): Promise<{
    totalEvents: number;
    totalAggregates: number;
    eventTypes: { type: string; count: number }[];
  }>;
}
