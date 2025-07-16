import { BaseDomainEvent } from '../../domain/events/types';
import { IEventStore } from '../../domain/repositories/IEventStore';

/**
 * In-Memory Event Store Implementation
 * Suitable for development and testing
 */
export class InMemoryEventStore implements IEventStore {
  private events: BaseDomainEvent[] = [];
  private nextEventId = 1;

  /**
   * Save an event to the in-memory store
   */
  async saveEvent(event: BaseDomainEvent): Promise<void> {
    const eventWithId = {
      ...event,
      id: this.nextEventId++
    };
    
    this.events.push(eventWithId);
  }

  /**
   * Save multiple events atomically
   */
  async saveEvents(events: BaseDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.saveEvent(event);
    }
  }

  /**
   * Get all events for a specific aggregate
   */
  async getEvents(aggregateId: string): Promise<BaseDomainEvent[]> {
    return this.events
      .filter(event => event.aggregateId === aggregateId)
      .sort((a, b) => a.version - b.version);
  }

  /**
   * Get all events in the store
   */
  async getAllEvents(): Promise<BaseDomainEvent[]> {
    return [...this.events].sort((a, b) => {
      // Sort by timestamp desc, then by version asc for same aggregate
      const timeComparison = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (timeComparison !== 0) return timeComparison;
      
      if (a.aggregateId === b.aggregateId) {
        return a.version - b.version;
      }
      
      return timeComparison;
    });
  }

  /**
   * Get events for a specific aggregate up to a certain version
   */
  async getEventsUntilVersion(aggregateId: string, version: number): Promise<BaseDomainEvent[]> {
    return this.events
      .filter(event => event.aggregateId === aggregateId && event.version <= version)
      .sort((a, b) => a.version - b.version);
  }

  /**
   * Check if an event exists
   */
  async eventExists(aggregateId: string, version: number): Promise<boolean> {
    return this.events.some(event => 
      event.aggregateId === aggregateId && event.version === version
    );
  }

  /**
   * Get the latest version number for an aggregate
   */
  async getLatestVersion(aggregateId: string): Promise<number> {
    const events = this.events.filter(event => event.aggregateId === aggregateId);
    if (events.length === 0) return 0;
    
    return Math.max(...events.map(event => event.version));
  }

  /**
   * Delete all events for an aggregate (for testing purposes)
   */
  async deleteAggregate(aggregateId: string): Promise<void> {
    this.events = this.events.filter(event => event.aggregateId !== aggregateId);
  }

  /**
   * Clear all events (for testing purposes)
   */
  async clear(): Promise<void> {
    this.events = [];
    this.nextEventId = 1;
  }

  /**
   * Get event count
   */
  async getEventCount(): Promise<number> {
    return this.events.length;
  }

  /**
   * Get unique aggregate count
   */
  async getAggregateCount(): Promise<number> {
    const uniqueAggregates = new Set(this.events.map(event => event.aggregateId));
    return uniqueAggregates.size;
  }

  /**
   * Get events by type
   */
  async getEventsByType(eventType: string): Promise<BaseDomainEvent[]> {
    return this.events.filter(event => event.type === eventType);
  }

  /**
   * Get events in a date range
   */
  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<BaseDomainEvent[]> {
    return this.events.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  /**
   * Check store health
   */
  async isHealthy(): Promise<boolean> {
    return true; // In-memory store is always healthy
  }

  /**
   * Get store statistics
   */
  async getStats(): Promise<{
    totalEvents: number;
    totalAggregates: number;
    eventTypes: { type: string; count: number }[];
  }> {
    const totalEvents = this.events.length;
    const uniqueAggregates = new Set(this.events.map(event => event.aggregateId));
    const totalAggregates = uniqueAggregates.size;
    
    const eventTypeCounts: { [key: string]: number } = {};
    this.events.forEach(event => {
      eventTypeCounts[event.type] = (eventTypeCounts[event.type] || 0) + 1;
    });
    
    const eventTypes = Object.entries(eventTypeCounts).map(([type, count]) => ({
      type,
      count
    }));

    return {
      totalEvents,
      totalAggregates,
      eventTypes
    };
  }

  /**
   * Export all events (for backup/debugging)
   */
  async exportEvents(): Promise<BaseDomainEvent[]> {
    return [...this.events];
  }

  /**
   * Import events (for restore/testing)
   */
  async importEvents(events: BaseDomainEvent[]): Promise<void> {
    this.clear();
    
    for (const event of events) {
      await this.saveEvent(event);
    }
  }
}
