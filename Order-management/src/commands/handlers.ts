import { Order, OrderItem, OrderStatus } from '../domain/Order';
import { EventStore } from '../infrastructure/event-store';
import { 
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

  private rebuildOrderFromEvents(events: any[]): Order | null {
    if (events.length === 0) return null;

    let order: Order | null = null;

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
}
