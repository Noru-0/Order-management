import { Request, Response } from 'express';
import { OrderCommandHandlers } from '../commands/handlers';
import { EventStore } from '../infrastructure/event-store';
import { Order, OrderStatus } from '../domain/Order';
import { BaseEvent, OrderRolledBackEvent } from '../events/types';

export class OrderController {
  constructor(
    private commandHandlers: OrderCommandHandlers,
    private eventStore: EventStore
  ) {}

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { customerId, items } = req.body;
      
      const orderId = await this.commandHandlers.handleCreateOrder({
        customerId,
        items
      });

      res.status(201).json({
        success: true,
        data: { orderId },
        message: 'Order created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const events = await this.eventStore.getEvents(id);
      
      if (events.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      const order = this.rebuildOrderFromEvents(events);
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      await this.commandHandlers.handleUpdateOrderStatus({
        orderId: id,
        status: status as OrderStatus
      });

      res.json({
        success: true,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async addOrderItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { item } = req.body;

      await this.commandHandlers.handleAddOrderItem({
        orderId: id,
        item
      });

      res.json({
        success: true,
        message: 'Item added to order successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async removeOrderItem(req: Request, res: Response): Promise<void> {
    try {
      const { id, productId } = req.params;

      await this.commandHandlers.handleRemoveOrderItem({
        orderId: id,
        productId
      });

      res.json({
        success: true,
        message: 'Item removed from order successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      const allEvents = await this.eventStore.getAllEvents();
      const orderMap = new Map<string, BaseEvent[]>();

      // Group events by aggregate ID
      allEvents.forEach(event => {
        if (!orderMap.has(event.aggregateId)) {
          orderMap.set(event.aggregateId, []);
        }
        orderMap.get(event.aggregateId)!.push(event);
      });

      // Rebuild orders from events
      const orders: Order[] = [];
      orderMap.forEach(events => {
        const order = this.rebuildOrderFromEvents(events);
        if (order) {
          orders.push(order);
        }
      });

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private rebuildOrderFromEvents(events: BaseEvent[]): Order | null {
    if (events.length === 0) return null;

    let order: Order | null = null;
    events.sort((a, b) => a.version - b.version);

    // Check if there's a rollback event and find the latest one
    const rollbackEvents = events.filter(e => e.type === 'OrderRolledBack');
    
    const latestRollback = rollbackEvents.length > 0 ? 
      rollbackEvents.reduce((latest, current) => current.version > latest.version ? current : latest) : null;

    // If there's a rollback, filter events to only include those up to the rollback point
    let eventsToProcess = events;
    if (latestRollback) {
      const rollbackData = latestRollback.data;
      
      // Exclude all rollback events first
      const nonRollbackEvents = events.filter(event => event.type !== 'OrderRolledBack');
      
      if (rollbackData.rollbackType === 'version') {
        eventsToProcess = nonRollbackEvents.filter(event => 
          event.version <= rollbackData.rollbackValue
        );
      } else if (rollbackData.rollbackType === 'timestamp') {
        const rollbackDate = new Date(rollbackData.rollbackValue);
        eventsToProcess = nonRollbackEvents.filter(event => 
          new Date(event.timestamp) <= rollbackDate
        );
      }
      
      console.log(`[DEBUG] Rollback detected: ${rollbackData.rollbackPoint}, processing ${eventsToProcess.length} events out of ${nonRollbackEvents.length} non-rollback events (${rollbackData.eventsUndone} events undone)`);
      console.log('[DEBUG] Events to process:', eventsToProcess.map(e => `${e.type} v${e.version}`).join(', '));
    } else {
      console.log(`[DEBUG] No rollback events found, processing all ${events.length} events`);
    }

    for (const event of eventsToProcess) {
      switch (event.type) {
        case 'OrderCreated':
          order = new Order(
            event.data.customerId,
            event.data.items,
            event.data.status,
            event.data.orderId
          );
          break;
        case 'OrderStatusUpdated':
          if (order) {
            order = order.updateStatus(event.data.newStatus);
          }
          break;
        case 'OrderItemAdded':
          if (order) {
            order = order.addItem(event.data.item);
          }
          break;
        case 'OrderItemRemoved':
          if (order) {
            order = order.removeItem(event.data.productId);
          }
          break;
        case 'OrderRolledBack':
          // Should not reach here due to filtering above, but keep for safety
          break;
      }
    }

    return order;
  }

  // Debug methods for demo
  async getAllEvents(req: Request, res: Response): Promise<void> {
    try {
      const allEvents = await this.eventStore.getAllEvents();
      
      res.json({
        success: true,
        data: {
          totalEvents: allEvents.length,
          events: allEvents
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getOrderEvents(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const events = await this.eventStore.getEvents(id);
      
      res.json({
        success: true,
        data: {
          orderId: id,
          eventCount: events.length,
          events: events
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getDatabaseStats(req: Request, res: Response): Promise<void> {
    try {
      // Check if eventStore has stats method (PostgreSQL only)
      if (typeof (this.eventStore as any).getStats === 'function') {
        const stats = await (this.eventStore as any).getStats();
        
        res.json({
          success: true,
          data: {
            ...stats,
            databaseType: 'PostgreSQL',
            timestamp: new Date().toISOString()
          }
        });
      } else {
        // For in-memory store
        const allEvents = await this.eventStore.getAllEvents();
        const aggregateIds = new Set(allEvents.map(e => e.aggregateId));
        const eventTypes: { [key: string]: number } = {};
        
        allEvents.forEach(event => {
          eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
        });

        res.json({
          success: true,
          data: {
            totalEvents: allEvents.length,
            totalAggregates: aggregateIds.size,
            eventTypes: Object.entries(eventTypes).map(([type, count]) => ({ type, count })),
            databaseType: 'In-Memory',
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get database stats'
      });
    }
  }

  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
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

      res.json({
        success: true,
        data: {
          status: 'OK',
          timestamp: new Date().toISOString(),
          database: {
            type: dbType,
            healthy: dbHealth
          },
          uptime: process.uptime(),
          version: '1.0.0'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      });
    }
  }

  async rollbackOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { toVersion, toTimestamp } = req.body;

      // Validate input
      if (!toVersion && !toTimestamp) {
        res.status(400).json({
          success: false,
          error: 'Either toVersion or toTimestamp must be provided'
        });
        return;
      }

      // Get all events for the order
      const allEvents = await this.eventStore.getEvents(id);
      
      if (allEvents.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      // Store the original state before rollback
      const originalOrder = this.rebuildOrderFromEvents(allEvents);
      
      if (!originalOrder) {
        res.status(400).json({
          success: false,
          error: 'Cannot rebuild original order state'
        });
        return;
      }

      // Filter events based on rollback criteria
      let eventsToKeep: BaseEvent[];
      
      if (toVersion) {
        eventsToKeep = allEvents.filter(event => event.version <= toVersion);
      } else {
        const rollbackDate = new Date(toTimestamp);
        eventsToKeep = allEvents.filter(event => new Date(event.timestamp) <= rollbackDate);
      }

      if (eventsToKeep.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No events found for the specified rollback point'
        });
        return;
      }

      // Rebuild order state from filtered events
      const rolledBackOrder = this.rebuildOrderFromEvents(eventsToKeep);
      
      if (!rolledBackOrder) {
        res.status(400).json({
          success: false,
          error: 'Cannot rebuild rolled back order state'
        });
        return;
      }
      
      // Get the events that will be "undone"
      const undoneEvents = allEvents.slice(eventsToKeep.length);

      // Create rollback event and save it to event store
      const rollbackEvent: OrderRolledBackEvent = {
        type: 'OrderRolledBack',
        aggregateId: id,
        version: allEvents.length + 1, // Next version number
        timestamp: new Date(),
        data: {
          orderId: id,
          rollbackPoint: toVersion ? `Version ${toVersion}` : `Timestamp ${toTimestamp}`,
          rollbackType: toVersion ? 'version' : 'timestamp',
          rollbackValue: toVersion || toTimestamp,
          eventsUndone: undoneEvents.length,
          previousState: {
            status: originalOrder.status,
            totalAmount: originalOrder.totalAmount,
            itemCount: originalOrder.items.length
          },
          newState: {
            status: rolledBackOrder.status,
            totalAmount: rolledBackOrder.totalAmount,
            itemCount: rolledBackOrder.items.length
          }
        }
      };

      // Save the rollback event
      await this.eventStore.saveEvent(rollbackEvent);

      res.json({
        success: true,
        data: {
          originalOrder: originalOrder,
          rolledBackOrder: rolledBackOrder,
          rollbackPoint: toVersion ? `Version ${toVersion}` : `Timestamp ${toTimestamp}`,
          eventsKept: eventsToKeep.length,
          eventsUndone: undoneEvents.length,
          rollbackEvent: {
            id: rollbackEvent.aggregateId,
            type: rollbackEvent.type,
            version: rollbackEvent.version,
            timestamp: rollbackEvent.timestamp
          },
          undoneEvents: undoneEvents.map(event => ({
            type: event.type,
            version: event.version,
            timestamp: event.timestamp,
            data: event.data
          }))
        },
        message: `Order rolled back to ${toVersion ? `version ${toVersion}` : `timestamp ${toTimestamp}`}. Rollback event recorded as version ${rollbackEvent.version}.`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Rollback failed'
      });
    }
  }

  async debugRebuildOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const events = await this.eventStore.getEvents(id);
      
      if (events.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      // Capture debug info
      const debugInfo = {
        totalEvents: events.length,
        events: events.map(e => ({ type: e.type, version: e.version, timestamp: e.timestamp })),
        rollbackEvents: events.filter(e => e.type === 'OrderRolledBack'),
        rebuildResult: null as any
      };

      // Test rebuild with detailed logging
      const order = this.rebuildOrderFromEvents(events);
      debugInfo.rebuildResult = order ? {
        id: order.id,
        status: order.status,
        itemCount: order.items.length,
        totalAmount: order.totalAmount
      } : null;

      res.json({
        success: true,
        data: debugInfo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Debug failed'
      });
    }
  }
}
