import { IEventStore } from '../../../domain/repositories/IEventStore';
import { Order } from '../../../domain/models/Order';
import { OrderDomainService } from '../../../domain/services/OrderDomainService';
import { BaseDomainEvent } from '../../../domain/events/types';
import {
  GetOrderQuery,
  GetAllOrdersQuery,
  GetOrderEventsQuery,
  GetAllEventsQuery,
  GetSkippedVersionsQuery,
  HealthCheckQuery,
  GetDatabaseStatsQuery
} from '../OrderQueries';

/**
 * Query Handler for Get Order
 */
export class GetOrderHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(query: GetOrderQuery): Promise<Order | null> {
    const events = await this.eventStore.getEvents(query.orderId);
    return OrderDomainService.rebuildFromEvents(events);
  }
}

/**
 * Query Handler for Get All Orders
 */
export class GetAllOrdersHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(query: GetAllOrdersQuery): Promise<{
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const offset = (page - 1) * limit;

    const allEvents = await this.eventStore.getAllEvents();
    const orderMap = new Map<string, BaseDomainEvent[]>();

    // Group events by aggregate ID
    allEvents.forEach(event => {
      if (!orderMap.has(event.aggregateId)) {
        orderMap.set(event.aggregateId, []);
      }
      orderMap.get(event.aggregateId)!.push(event);
    });

    // Rebuild orders from events
    const allOrders: Order[] = [];
    
    for (const [aggregateId, events] of orderMap) {
      try {
        const order = OrderDomainService.rebuildFromEvents(events);
        if (order) {
          allOrders.push(order);
        }
      } catch (error) {
        // Continue processing other orders
        console.warn(`Failed to rebuild order ${aggregateId}:`, error);
      }
    }

    // Apply pagination
    const totalOrders = allOrders.length;
    const paginatedOrders = allOrders.slice(offset, offset + limit);

    return {
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total: totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        hasNext: page * limit < totalOrders,
        hasPrev: page > 1
      }
    };
  }
}

/**
 * Query Handler for Get Order Events
 */
export class GetOrderEventsHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(query: GetOrderEventsQuery): Promise<{
    orderId: string;
    eventCount: number;
    events: BaseDomainEvent[];
  }> {
    const events = await this.eventStore.getEvents(query.orderId);
    
    return {
      orderId: query.orderId,
      eventCount: events.length,
      events: events
    };
  }
}

/**
 * Query Handler for Get All Events
 */
export class GetAllEventsHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(query: GetAllEventsQuery): Promise<{
    events: BaseDomainEvent[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 4, 20);
    const offset = (page - 1) * limit;

    const allEvents = await this.eventStore.getAllEvents();
    
    // Sort events by timestamp (newest first)
    const sortedEvents = allEvents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    const totalEvents = sortedEvents.length;
    const paginatedEvents = sortedEvents.slice(offset, offset + limit);

    return {
      events: paginatedEvents,
      pagination: {
        page,
        limit,
        total: totalEvents,
        totalPages: Math.ceil(totalEvents / limit),
        hasNext: page * limit < totalEvents,
        hasPrev: page > 1
      }
    };
  }
}

/**
 * Query Handler for Get Skipped Versions
 */
export class GetSkippedVersionsHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(query: GetSkippedVersionsQuery): Promise<number[]> {
    const events = await this.eventStore.getEvents(query.orderId);
    return OrderDomainService.getSkippedVersions(events);
  }
}

/**
 * Query Handler for Health Check
 */
export class HealthCheckHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(query: HealthCheckQuery): Promise<{
    status: string;
    timestamp: string;
    database: { type: string; healthy: boolean };
    uptime: number;
    version: string;
  }> {
    let dbHealth = false;
    let dbType = 'Unknown';
    
    // Check if eventStore has healthCheck method (PostgreSQL only)
    if (typeof (this.eventStore as any).healthCheck === 'function') {
      dbHealth = await (this.eventStore as any).healthCheck();
      dbType = 'PostgreSQL';
    } else {
      // For in-memory store, always healthy
      dbHealth = true;
      dbType = 'In-Memory';
    }

    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        type: dbType,
        healthy: dbHealth
      },
      uptime: process.uptime(),
      version: '1.0.0'
    };
  }
}

/**
 * Query Handler for Database Stats
 */
export class GetDatabaseStatsHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(query: GetDatabaseStatsQuery): Promise<{
    totalEvents: number;
    totalAggregates: number;
    eventTypes: { type: string; count: number }[];
    databaseType: string;
    timestamp: string;
  }> {
    // Check if eventStore has stats method (PostgreSQL only)
    if (typeof (this.eventStore as any).getStats === 'function') {
      const stats = await (this.eventStore as any).getStats();
      
      return {
        ...stats,
        databaseType: 'PostgreSQL',
        timestamp: new Date().toISOString()
      };
    } else {
      // For in-memory store
      const allEvents = await this.eventStore.getAllEvents();
      const aggregateIds = new Set(allEvents.map(e => e.aggregateId));
      const eventTypes: { [key: string]: number } = {};
      
      allEvents.forEach(event => {
        eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
      });

      return {
        totalEvents: allEvents.length,
        totalAggregates: aggregateIds.size,
        eventTypes: Object.entries(eventTypes).map(([type, count]) => ({ type, count })),
        databaseType: 'In-Memory',
        timestamp: new Date().toISOString()
      };
    }
  }
}
