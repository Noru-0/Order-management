import { IEventStore } from '../../../domain/repositories/IEventStore';
import { Order } from '../../../domain/models/Order';
import { OrderDomainService } from '../../../domain/services/OrderDomainService';
import {
  CreateOrderCommand,
  UpdateOrderStatusCommand,
  AddOrderItemCommand,
  RemoveOrderItemCommand,
  RollbackOrderCommand
} from '../OrderCommands';
import {
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
  OrderItemAddedEvent,
  OrderItemRemovedEvent,
  OrderRolledBackEvent
} from '../../../domain/events/types';

/**
 * Command Handler for Create Order
 */
export class CreateOrderHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(command: CreateOrderCommand): Promise<string> {
    // Create order using domain logic
    const order = Order.create(command.customerId, command.items);
    
    // Create domain event
    const event: OrderCreatedEvent = {
      type: 'OrderCreated',
      aggregateId: order.id,
      aggregateType: 'Order',
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        orderId: order.id,
        customerId: order.customerId,
        items: order.items,
        status: order.status,
        totalAmount: order.totalAmount
      }
    };

    // Persist event
    await this.eventStore.saveEvent(event);
    return order.id;
  }
}

/**
 * Command Handler for Update Order Status
 */
export class UpdateOrderStatusHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(command: UpdateOrderStatusCommand): Promise<void> {
    // Load aggregate from events
    const events = await this.eventStore.getEvents(command.orderId);
    const order = OrderDomainService.rebuildFromEvents(events);
    
    if (!order) {
      throw new Error(`Order with id ${command.orderId} not found`);
    }

    // Apply business rules
    OrderDomainService.validateOrderOperation(order, 'updateStatus');

    // Create domain event
    const event: OrderStatusUpdatedEvent = {
      type: 'OrderStatusUpdated',
      aggregateId: command.orderId,
      aggregateType: 'Order',
      version: events.length + 1,
      timestamp: new Date().toISOString(),
      data: {
        orderId: command.orderId,
        oldStatus: order.status,
        newStatus: command.status
      }
    };

    // Persist event
    await this.eventStore.saveEvent(event);
  }
}

/**
 * Command Handler for Add Order Item
 */
export class AddOrderItemHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(command: AddOrderItemCommand): Promise<void> {
    // Load aggregate from events
    const events = await this.eventStore.getEvents(command.orderId);
    const order = OrderDomainService.rebuildFromEvents(events);
    
    if (!order) {
      throw new Error(`Order with id ${command.orderId} not found`);
    }

    // Apply business rules
    OrderDomainService.validateOrderOperation(order, 'addItem');

    // Validate using domain logic
    order.addItem(command.item); // This validates the item

    // Create domain event
    const event: OrderItemAddedEvent = {
      type: 'OrderItemAdded',
      aggregateId: command.orderId,
      aggregateType: 'Order',
      version: events.length + 1,
      timestamp: new Date().toISOString(),
      data: {
        orderId: command.orderId,
        item: command.item
      }
    };

    // Persist event
    await this.eventStore.saveEvent(event);
  }
}

/**
 * Command Handler for Remove Order Item
 */
export class RemoveOrderItemHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(command: RemoveOrderItemCommand): Promise<void> {
    // Load aggregate from events
    const events = await this.eventStore.getEvents(command.orderId);
    const order = OrderDomainService.rebuildFromEvents(events);
    
    if (!order) {
      throw new Error(`Order with id ${command.orderId} not found`);
    }

    // Apply business rules
    OrderDomainService.validateOrderOperation(order, 'removeItem');

    // Validate using domain logic
    order.removeItem(command.productId); // This validates the removal

    // Create domain event
    const event: OrderItemRemovedEvent = {
      type: 'OrderItemRemoved',
      aggregateId: command.orderId,
      aggregateType: 'Order',
      version: events.length + 1,
      timestamp: new Date().toISOString(),
      data: {
        orderId: command.orderId,
        productId: command.productId
      }
    };

    // Persist event
    await this.eventStore.saveEvent(event);
  }
}

/**
 * Command Handler for Rollback Order
 */
export class RollbackOrderHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(command: RollbackOrderCommand): Promise<{
    originalOrder: Order;
    rolledBackOrder: Order;
    rollbackEvent: OrderRolledBackEvent;
    eventsUndone: number;
  }> {
    // Validate input
    if (!command.toVersion && !command.toTimestamp) {
      throw new Error('Either toVersion or toTimestamp must be provided');
    }

    if (command.toVersion && command.toTimestamp) {
      throw new Error('Only one of toVersion or toTimestamp should be provided');
    }

    // Get all events for the order
    const allEvents = await this.eventStore.getEvents(command.orderId);
    
    if (allEvents.length === 0) {
      throw new Error(`Order with id ${command.orderId} not found`);
    }

    // Get original state
    const originalOrder = OrderDomainService.rebuildFromEvents(allEvents);
    
    if (!originalOrder) {
      throw new Error('Cannot rebuild original order state');
    }

    // Filter events based on rollback criteria
    let eventsToKeep;
    
    if (command.toVersion) {
      if (command.toVersion < 1) {
        throw new Error('toVersion must be a positive number');
      }
      eventsToKeep = allEvents.filter(event => event.version <= command.toVersion!);
    } else {
      const rollbackDate = new Date(command.toTimestamp!);
      if (isNaN(rollbackDate.getTime())) {
        throw new Error('toTimestamp must be a valid date');
      }
      eventsToKeep = allEvents.filter(event => new Date(event.timestamp) <= rollbackDate);
    }

    if (eventsToKeep.length === 0) {
      throw new Error('No events found for the specified rollback point');
    }

    // Rebuild rolled back state
    const rolledBackOrder = OrderDomainService.rebuildFromEvents(eventsToKeep);
    
    if (!rolledBackOrder) {
      throw new Error('Cannot rebuild rolled back order state');
    }

    // Calculate undone events
    const undoneEvents = allEvents.filter(event => 
      command.toVersion 
        ? event.version > command.toVersion 
        : new Date(event.timestamp) > new Date(command.toTimestamp!)
    );

    // Create rollback event
    const rollbackEvent: OrderRolledBackEvent = {
      type: 'OrderRolledBack',
      aggregateId: command.orderId,
      aggregateType: 'Order',
      version: allEvents.length + 1,
      timestamp: new Date().toISOString(),
      data: {
        orderId: command.orderId,
        rollbackPoint: command.toVersion 
          ? `Version ${command.toVersion}` 
          : `Timestamp ${command.toTimestamp}`,
        rollbackType: command.toVersion ? 'version' : 'timestamp',
        rollbackValue: command.toVersion || command.toTimestamp!,
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

    // Persist rollback event
    await this.eventStore.saveEvent(rollbackEvent);

    return {
      originalOrder,
      rolledBackOrder,
      rollbackEvent,
      eventsUndone: undoneEvents.length
    };
  }
}
