import { Request, Response } from 'express';
import { OrderCommandHandlers } from '../commands/handlers';
import { EventStore } from '../infrastructure/event-store';
import { Order, OrderStatus } from '../domain/Order';
import { BaseEvent } from '../events/types';

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

    for (const event of events) {
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
}
