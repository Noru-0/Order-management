import { OrderItem, OrderStatus } from '../models/Order';

// Base interface for all domain events
export interface BaseDomainEvent {
  id?: number; // Optional for database storage
  type: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: string; // Changed to string for better serialization
  data: Record<string, any>;
  metadata?: Record<string, any>; // Optional metadata
}

// Order domain events
export interface OrderCreatedEvent extends BaseDomainEvent {
  type: 'OrderCreated';
  data: {
    orderId: string;
    customerId: string;
    items: OrderItem[];
    status: OrderStatus;
    totalAmount: number;
  };
}

export interface OrderStatusUpdatedEvent extends BaseDomainEvent {
  type: 'OrderStatusUpdated';
  data: {
    orderId: string;
    oldStatus: OrderStatus;
    newStatus: OrderStatus;
  };
}

export interface OrderItemAddedEvent extends BaseDomainEvent {
  type: 'OrderItemAdded';
  data: {
    orderId: string;
    item: OrderItem;
  };
}

export interface OrderItemRemovedEvent extends BaseDomainEvent {
  type: 'OrderItemRemoved';
  data: {
    orderId: string;
    productId: string;
  };
}

export interface OrderRolledBackEvent extends BaseDomainEvent {
  type: 'OrderRolledBack';
  data: {
    orderId: string;
    rollbackPoint: string;
    rollbackType: 'version' | 'timestamp';
    rollbackValue: number | string;
    eventsUndone: number;
    previousState?: {
      status: OrderStatus;
      totalAmount: number;
      itemCount: number;
    };
    newState?: {
      status: OrderStatus;
      totalAmount: number;
      itemCount: number;
    };
    rollbackReason?: string;
  };
}

// Union type for all order events
export type OrderDomainEvent = 
  | OrderCreatedEvent 
  | OrderStatusUpdatedEvent 
  | OrderItemAddedEvent 
  | OrderItemRemovedEvent 
  | OrderRolledBackEvent;

// For backward compatibility with existing code
export type BaseEvent = BaseDomainEvent;
export type EventResponse = BaseDomainEvent;
