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
      
      // Validation
      if (!customerId || typeof customerId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'customerId is required and must be a string'
        });
        return;
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          error: 'items is required and must be a non-empty array'
        });
        return;
      }

      // Validate each item
      for (const item of items) {
        if (!item.productId || !item.productName || !item.quantity || !item.price) {
          res.status(400).json({
            success: false,
            error: 'Each item must have productId, productName, quantity, and price'
          });
          return;
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          res.status(400).json({
            success: false,
            error: 'Item quantity must be a positive number'
          });
          return;
        }
        if (typeof item.price !== 'number' || item.price <= 0) {
          res.status(400).json({
            success: false,
            error: 'Item price must be a positive number'
          });
          return;
        }
      }
      
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
      
      // Validation
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Order ID is required and must be a string'
        });
        return;
      }

      const events = await this.eventStore.getEvents(id);
      
      if (events.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      const order = this.rebuildOrderFromEvents(events);
      
      if (!order) {
        res.status(500).json({
          success: false,
          error: 'Failed to rebuild order from events'
        });
        return;
      }
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error(`[ERROR] Failed to get order ${req.params.id}:`, error);
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

      // Validation
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Order ID is required and must be a string'
        });
        return;
      }

      if (!status || typeof status !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Status is required and must be a string'
        });
        return;
      }

      // Validate status enum
      if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Valid values are: ${Object.values(OrderStatus).join(', ')}`
        });
        return;
      }

      // Check if order exists
      const events = await this.eventStore.getEvents(id);
      if (events.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

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

      // Validation
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Order ID is required and must be a string'
        });
        return;
      }

      if (!item || typeof item !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Item is required and must be an object'
        });
        return;
      }

      // Validate item structure
      if (!item.productId || !item.productName || !item.quantity || !item.price) {
        res.status(400).json({
          success: false,
          error: 'Item must have productId, productName, quantity, and price'
        });
        return;
      }

      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        res.status(400).json({
          success: false,
          error: 'Item quantity must be a positive number'
        });
        return;
      }

      if (typeof item.price !== 'number' || item.price <= 0) {
        res.status(400).json({
          success: false,
          error: 'Item price must be a positive number'
        });
        return;
      }

      // Check if order exists
      const events = await this.eventStore.getEvents(id);
      if (events.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

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

      // Validation
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Order ID is required and must be a string'
        });
        return;
      }

      if (!productId || typeof productId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Product ID is required and must be a string'
        });
        return;
      }

      // Check if order exists
      const events = await this.eventStore.getEvents(id);
      if (events.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      // Check if product exists in order
      const order = this.rebuildOrderFromEvents(events);
      if (!order) {
        res.status(400).json({
          success: false,
          error: 'Cannot rebuild order state'
        });
        return;
      }

      const productExists = order.items.some(item => item.productId === productId);
      if (!productExists) {
        res.status(404).json({
          success: false,
          error: 'Product not found in order'
        });
        return;
      }

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
      // Add pagination support
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100); // Max 100 items per page
      const offset = (page - 1) * limit;

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
      const allOrders: Order[] = [];
      let processedCount = 0;
      
      for (const [aggregateId, events] of orderMap) {
        try {
          const order = this.rebuildOrderFromEvents(events);
          if (order) {
            allOrders.push(order);
          }
        } catch (error) {
          // Continue processing other orders instead of failing completely
        }
        processedCount++;
      }

      // Apply pagination
      const totalOrders = allOrders.length;
      const paginatedOrders = allOrders.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          orders: paginatedOrders,
          pagination: {
            page,
            limit,
            total: totalOrders,
            totalPages: Math.ceil(totalOrders / limit),
            hasNext: page * limit < totalOrders,
            hasPrev: page > 1
          }
        }
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

    // Sắp xếp theo version tăng dần
    const sortedEvents = [...events].sort((a, b) => a.version - b.version);

    // Tìm rollback mới nhất (nếu có)
    const rollbackEvents = sortedEvents.filter(e => e.type === 'OrderRolledBack');
    const latestRollback = rollbackEvents.length > 0
      ? rollbackEvents.reduce((latest, current) =>
          current.version > latest.version ? current : latest)
      : null;

    // Lọc ra danh sách event cần xử lý
    let eventsToProcess = sortedEvents;

    if (latestRollback) {
      const rollbackData = latestRollback.data;
      const nonRollbackEvents = sortedEvents.filter(e => e.type !== 'OrderRolledBack');

      if (rollbackData.rollbackType === 'version') {
        const finalVersion = this.resolveNestedRollbackVersion(sortedEvents, rollbackData.rollbackValue);
        
        // Lấy events trước rollback point + events sau rollback event
        const eventsBeforeRollback = nonRollbackEvents.filter(e => e.version <= finalVersion);
        const eventsAfterRollback = nonRollbackEvents.filter(e => e.version > latestRollback.version);
        
        // Combine và sắp xếp lại theo version
        eventsToProcess = [...eventsBeforeRollback, ...eventsAfterRollback].sort((a, b) => a.version - b.version);
      } else if (rollbackData.rollbackType === 'timestamp') {
        const rollbackDate = new Date(rollbackData.rollbackValue);
        
        // Lấy events trước rollback timestamp + events sau rollback event
        const eventsBeforeRollback = nonRollbackEvents.filter(e => new Date(e.timestamp) <= rollbackDate);
        const eventsAfterRollback = nonRollbackEvents.filter(e => e.version > latestRollback.version);
        
        // Combine và sắp xếp lại theo version
        eventsToProcess = [...eventsBeforeRollback, ...eventsAfterRollback].sort((a, b) => a.version - b.version);
      }
    }

    // Tái dựng trạng thái Order từ các sự kiện
    let order: Order | null = null;

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
          // đã xử lý ở trên, bỏ qua tại đây
          break;

        default:
          console.warn(`[WARN] Unrecognized event type: ${event.type}`);
          break;
      }
    }

    return order;
  }

  private resolveNestedRollbackVersion(events: BaseEvent[], rollbackVersion: number): number {
    const versionMap = new Map(events.map(e => [e.version, e]));

    let currentVersion = rollbackVersion;

    while (true) {
      const event = versionMap.get(currentVersion);
      if (!event || event.type !== 'OrderRolledBack') {
        break;
      }

      const nestedRollbackValue = event.data.rollbackValue;
      if (typeof nestedRollbackValue === 'number') {
        currentVersion = nestedRollbackValue;
      } else {
        break;
      }
    }

    return currentVersion;
  }

  // Debug methods for demo
  async getAllEvents(req: Request, res: Response): Promise<void> {
    try {
      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 4, 20); // Default 4, max 20 items per page
      const offset = (page - 1) * limit;

      const allEvents = await this.eventStore.getAllEvents();
      
      // Sort events by timestamp (newest first) for better UX
      const sortedEvents = allEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Apply pagination
      const totalEvents = sortedEvents.length;
      const paginatedEvents = sortedEvents.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          totalEvents,
          events: paginatedEvents,
          pagination: {
            page,
            limit,
            total: totalEvents,
            totalPages: Math.ceil(totalEvents / limit),
            hasNext: page * limit < totalEvents,
            hasPrev: page > 1
          }
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

      // Validate order ID
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Order ID is required and must be a string'
        });
        return;
      }

      // Validate input
      if (!toVersion && !toTimestamp) {
        res.status(400).json({
          success: false,
          error: 'Either toVersion or toTimestamp must be provided'
        });
        return;
      }

      if (toVersion && toTimestamp) {
        res.status(400).json({
          success: false,
          error: 'Only one of toVersion or toTimestamp should be provided'
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
        // Validate version number
        if (typeof toVersion !== 'number' || toVersion < 1) {
          res.status(400).json({
            success: false,
            error: 'toVersion must be a positive number'
          });
          return;
        }

        eventsToKeep = allEvents.filter(event => event.version <= toVersion);
      } else {
        // Validate timestamp
        const rollbackDate = new Date(toTimestamp);
        if (isNaN(rollbackDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'toTimestamp must be a valid date'
          });
          return;
        }

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
      
      // Get the events that will be "undone" - FIXED: correct calculation
      const undoneEvents = allEvents.filter(event => 
        toVersion ? event.version > toVersion : new Date(event.timestamp) > new Date(toTimestamp)
      );

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

  async getSkippedVersions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Order ID is required and must be a string'
        });
        return;
      }

      const events = await this.eventStore.getEvents(id);
      
      if (events.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      const skippedVersions = this.getSkippedVersionsForOrder(events);

      res.json({
        success: true,
        data: skippedVersions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get skipped versions'
      });
    }
  }

  private getSkippedVersionsForOrder(events: BaseEvent[]): number[] {
    // Sắp xếp theo version tăng dần
    const sortedEvents = [...events].sort((a, b) => a.version - b.version);
    
    // Tìm tất cả rollback events
    const rollbackEvents = sortedEvents.filter(e => e.type === 'OrderRolledBack');
    
    if (rollbackEvents.length === 0) {
      return []; // Không có rollback, không có version nào bị skip
    }

    const skippedVersions = new Set<number>();
    
    // Với mỗi rollback event, tìm ra các version bị skip
    for (const rollbackEvent of rollbackEvents) {
      const rollbackData = rollbackEvent.data;
      const nonRollbackEvents = sortedEvents.filter(e => e.type !== 'OrderRolledBack');
      
      if (rollbackData.rollbackType === 'version') {
        const targetVersion = rollbackData.rollbackValue;
        
        // Tìm các events có version > targetVersion và < rollbackEvent.version
        const skippedEvents = nonRollbackEvents.filter(e => 
          e.version > targetVersion && e.version < rollbackEvent.version
        );
        
        skippedEvents.forEach(event => skippedVersions.add(event.version));
      } else if (rollbackData.rollbackType === 'timestamp') {
        const rollbackDate = new Date(rollbackData.rollbackValue);
        
        // Tìm các events có timestamp > rollbackDate và version < rollbackEvent.version
        const skippedEvents = nonRollbackEvents.filter(e => 
          new Date(e.timestamp) > rollbackDate && e.version < rollbackEvent.version
        );
        
        skippedEvents.forEach(event => skippedVersions.add(event.version));
      }
    }
    
    return Array.from(skippedVersions).sort((a, b) => a - b);
  }

  async debugSkippedVersions(req: Request, res: Response): Promise<void> {
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

      const sortedEvents = [...events].sort((a, b) => a.version - b.version);
      const rollbackEvents = sortedEvents.filter(e => e.type === 'OrderRolledBack');
      const nonRollbackEvents = sortedEvents.filter(e => e.type !== 'OrderRolledBack');
      
      const debugInfo = {
        totalEvents: events.length,
        rollbackEvents: rollbackEvents.map(e => ({
          version: e.version,
          rollbackType: e.data.rollbackType,
          rollbackValue: e.data.rollbackValue,
          timestamp: e.timestamp
        })),
        nonRollbackEvents: nonRollbackEvents.map(e => ({
          type: e.type,
          version: e.version,
          timestamp: e.timestamp
        })),
        skippedVersions: this.getSkippedVersionsForOrder(events)
      };

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
