import { Order, OrderItem, OrderStatus } from '../domain/Order';
import { EventStore } from '../infrastructure/event-store';
import { OrderRebuilderService } from '../services/order-rebuilder';
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
  private orderRebuilder: OrderRebuilderService;

  constructor(private eventStore: EventStore) {
    this.orderRebuilder = new OrderRebuilderService();
  }

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
    const order = this.orderRebuilder.rebuildOrderFromEvents(events);
    
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
    const order = this.orderRebuilder.rebuildOrderFromEvents(events);
    
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
    const order = this.orderRebuilder.rebuildOrderFromEvents(events);
    
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
}
