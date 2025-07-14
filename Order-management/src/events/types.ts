import { OrderItem, OrderStatus } from '../domain/Order';

export interface BaseEvent {
  type: string;
  aggregateId: string;
  version: number;
  timestamp: Date;
  data: any;
}

export interface OrderCreatedEvent extends BaseEvent {
  type: 'OrderCreated';
  data: {
    orderId: string;
    customerId: string;
    items: OrderItem[];
    status: OrderStatus;
    totalAmount: number;
  };
}

export interface OrderStatusUpdatedEvent extends BaseEvent {
  type: 'OrderStatusUpdated';
  data: {
    orderId: string;
    oldStatus: OrderStatus;
    newStatus: OrderStatus;
  };
}

export interface OrderItemAddedEvent extends BaseEvent {
  type: 'OrderItemAdded';
  data: {
    orderId: string;
    item: OrderItem;
  };
}

export interface OrderItemRemovedEvent extends BaseEvent {
  type: 'OrderItemRemoved';
  data: {
    orderId: string;
    productId: string;
  };
}

export interface OrderRolledBackEvent extends BaseEvent {
  type: 'OrderRolledBack';
  data: {
    orderId: string;
    rollbackPoint: string; // version or timestamp
    rollbackType: 'version' | 'timestamp';
    rollbackValue: number | string;
    eventsUndone: number;
    previousState: any; // snapshot of state before rollback
    newState: any; // snapshot of state after rollback
  };
}

export type OrderEvent = 
  | OrderCreatedEvent 
  | OrderStatusUpdatedEvent 
  | OrderItemAddedEvent 
  | OrderItemRemovedEvent
  | OrderRolledBackEvent;
