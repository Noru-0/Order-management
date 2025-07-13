import { BaseEvent } from '../events/types';

export interface EventStore {
  saveEvent(event: BaseEvent): Promise<void>;
  getEvents(aggregateId: string): Promise<BaseEvent[]>;
  getAllEvents(): Promise<BaseEvent[]>;
}

export class InMemoryEventStore implements EventStore {
  private events: BaseEvent[] = [];

  async saveEvent(event: BaseEvent): Promise<void> {
    this.events.push(event);
  }

  async getEvents(aggregateId: string): Promise<BaseEvent[]> {
    return this.events.filter(event => event.aggregateId === aggregateId);
  }

  async getAllEvents(): Promise<BaseEvent[]> {
    return [...this.events];
  }

  async getEventsByType(eventType: string): Promise<BaseEvent[]> {
    return this.events.filter(event => event.type === eventType);
  }

  async clear(): Promise<void> {
    this.events = [];
  }
}
