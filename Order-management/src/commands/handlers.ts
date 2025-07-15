import { Order, OrderItem, OrderStatus } from '../domain/Order';
import { EventStore } from '../infrastructure/event-store';
import { 
  BaseEvent,
  OrderCreatedEvent, 
  OrderStatusUpdatedEvent, 
  OrderItemAddedEvent, 
  OrderItemRemovedEvent 
} from '../events/types';

export interface CreateOrderCommand {
  customerId: string;
  items: OrderItem[];
}

export interface UpdateOrderStatusCommand {
  orderId: string;
  status: OrderStatus;
}

export interface AddOrderItemCommand {
  orderId: string;
  item: OrderItem;
}

export interface RemoveOrderItemCommand {
  orderId: string;
  productId: string;
}

export class OrderCommandHandlers {
  constructor(private eventStore: EventStore) {}

  async handleCreateOrder(command: CreateOrderCommand): Promise<string> {
    const order = new Order(command.customerId, command.items);
    
    const event: OrderCreatedEvent = {
      type: 'OrderCreated',
      aggregateId: order.id,
      version: 1,
      timestamp: new Date(),
      data: {
        orderId: order.id,
        customerId: order.customerId,
        items: order.items,
        status: order.status,
        totalAmount: order.totalAmount
      }
    };

    await this.eventStore.saveEvent(event);
    return order.id;
  }

  async handleUpdateOrderStatus(command: UpdateOrderStatusCommand): Promise<void> {
    const events = await this.eventStore.getEvents(command.orderId);
    const order = this.rebuildOrderFromEvents(events);
    
    if (!order) {
      throw new Error(`Order with id ${command.orderId} not found`);
    }

    const event: OrderStatusUpdatedEvent = {
      type: 'OrderStatusUpdated',
      aggregateId: command.orderId,
      version: events.length + 1,
      timestamp: new Date(),
      data: {
        orderId: command.orderId,
        oldStatus: order.status,
        newStatus: command.status
      }
    };

    await this.eventStore.saveEvent(event);
  }

  async handleAddOrderItem(command: AddOrderItemCommand): Promise<void> {
    const events = await this.eventStore.getEvents(command.orderId);
    const order = this.rebuildOrderFromEvents(events);
    
    if (!order) {
      throw new Error(`Order with id ${command.orderId} not found`);
    }

    const event: OrderItemAddedEvent = {
      type: 'OrderItemAdded',
      aggregateId: command.orderId,
      version: events.length + 1,
      timestamp: new Date(),
      data: {
        orderId: command.orderId,
        item: command.item
      }
    };

    await this.eventStore.saveEvent(event);
  }

  async handleRemoveOrderItem(command: RemoveOrderItemCommand): Promise<void> {
    const events = await this.eventStore.getEvents(command.orderId);
    const order = this.rebuildOrderFromEvents(events);
    
    if (!order) {
      throw new Error(`Order with id ${command.orderId} not found`);
    }

    const event: OrderItemRemovedEvent = {
      type: 'OrderItemRemoved',
      aggregateId: command.orderId,
      version: events.length + 1,
      timestamp: new Date(),
      data: {
        orderId: command.orderId,
        productId: command.productId
      }
    };

    await this.eventStore.saveEvent(event);
  }

  private rebuildOrderFromEvents(events: BaseEvent[]): Order | null {
    if (events.length === 0) return null;

    const sortedEvents = [...events].sort((a, b) => a.version - b.version);

    // Tìm rollback mới nhất (nếu có)
    const rollbackEvents = sortedEvents.filter(e => e.type === 'OrderRolledBack');
    const latestRollback = rollbackEvents.length > 0
      ? rollbackEvents.reduce((latest, current) =>
          current.version > latest.version ? current : latest)
      : null;

    let eventsToProcess = sortedEvents;

    if (latestRollback) {
      const rollbackData = latestRollback.data;
      const nonRollbackEvents = sortedEvents.filter(e => e.type !== 'OrderRolledBack');

      if (rollbackData.rollbackType === 'version') {
        const finalVersion = this.resolveNestedRollbackVersion(sortedEvents, rollbackData.rollbackValue);
        const eventsBeforeRollback = nonRollbackEvents.filter(e => e.version <= finalVersion);
        const eventsAfterRollback = nonRollbackEvents.filter(e => e.version > latestRollback.version);
        eventsToProcess = [...eventsBeforeRollback, ...eventsAfterRollback].sort((a, b) => a.version - b.version);
      } else if (rollbackData.rollbackType === 'timestamp') {
        const rollbackDate = new Date(rollbackData.rollbackValue);
        const eventsBeforeRollback = nonRollbackEvents.filter(e => new Date(e.timestamp) <= rollbackDate);
        const eventsAfterRollback = nonRollbackEvents.filter(e => e.version > latestRollback.version);
        eventsToProcess = [...eventsBeforeRollback, ...eventsAfterRollback].sort((a, b) => a.version - b.version);
      }
    }

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
          // Đã xử lý ở trên
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
}
