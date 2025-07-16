import { Order } from '../models/Order';
import { BaseDomainEvent, OrderDomainEvent } from '../events/types';

/**
 * Domain service for Order business rules and event sourcing logic
 * Contains pure business logic that doesn't belong to any specific entity
 */
export class OrderDomainService {
  
  /**
   * Rebuild Order aggregate from event stream
   * This is pure domain logic for event sourcing
   */
  static rebuildFromEvents(events: BaseDomainEvent[]): Order | null {
    if (events.length === 0) return null;

    const sortedEvents = [...events].sort((a, b) => a.version - b.version);

    // Handle rollback logic
    const processedEvents = this.applyRollbackLogic(sortedEvents);

    let order: Order | null = null;

    for (const event of processedEvents) {
      order = this.applyEvent(order, event as OrderDomainEvent);
    }

    return order;
  }

  /**
   * Apply rollback logic to filter events
   */
  private static applyRollbackLogic(events: BaseDomainEvent[]): BaseDomainEvent[] {
    // Find the latest rollback event
    const rollbackEvents = events.filter(e => e.type === 'OrderRolledBack');
    const latestRollback = rollbackEvents.length > 0
      ? rollbackEvents.reduce((latest, current) =>
          current.version > latest.version ? current : latest)
      : null;

    if (!latestRollback) {
      return events;
    }

    const rollbackData = latestRollback.data;
    const nonRollbackEvents = events.filter(e => e.type !== 'OrderRolledBack');

    if (rollbackData.rollbackType === 'version') {
      const finalVersion = this.resolveNestedRollbackVersion(events, rollbackData.rollbackValue);
      const eventsBeforeRollback = nonRollbackEvents.filter(e => e.version <= finalVersion);
      const eventsAfterRollback = nonRollbackEvents.filter(e => e.version > latestRollback.version);
      return [...eventsBeforeRollback, ...eventsAfterRollback].sort((a, b) => a.version - b.version);
    } else if (rollbackData.rollbackType === 'timestamp') {
      const rollbackDate = new Date(rollbackData.rollbackValue);
      const eventsBeforeRollback = nonRollbackEvents.filter(e => new Date(e.timestamp) <= rollbackDate);
      const eventsAfterRollback = nonRollbackEvents.filter(e => e.version > latestRollback.version);
      return [...eventsBeforeRollback, ...eventsAfterRollback].sort((a, b) => a.version - b.version);
    }

    return events;
  }

  /**
   * Resolve nested rollback versions to prevent infinite loops
   */
  private static resolveNestedRollbackVersion(events: BaseDomainEvent[], rollbackVersion: number): number {
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

  /**
   * Apply a single event to rebuild order state
   */
  private static applyEvent(order: Order | null, event: OrderDomainEvent): Order | null {
    switch (event.type) {
      case 'OrderCreated':
        return new Order(
          event.data.customerId,
          event.data.items,
          event.data.status,
          event.data.orderId
        );

      case 'OrderStatusUpdated':
        if (order) {
          return order.updateStatus(event.data.newStatus);
        }
        break;

      case 'OrderItemAdded':
        if (order) {
          return order.addItem(event.data.item);
        }
        break;

      case 'OrderItemRemoved':
        if (order) {
          return order.removeItem(event.data.productId);
        }
        break;

      case 'OrderRolledBack':
        // Rollback events are handled in applyRollbackLogic
        break;

      default:
        console.warn(`[WARN] Unrecognized event type: ${(event as any).type}`);
        break;
    }

    return order;
  }

  /**
   * Calculate skipped versions for rollback analysis
   */
  static getSkippedVersions(events: BaseDomainEvent[]): number[] {
    const sortedEvents = [...events].sort((a, b) => a.version - b.version);
    const rollbackEvents = sortedEvents.filter(e => e.type === 'OrderRolledBack');
    
    if (rollbackEvents.length === 0) {
      return [];
    }

    const skippedVersions = new Set<number>();
    
    for (const rollbackEvent of rollbackEvents) {
      const rollbackData = rollbackEvent.data;
      const nonRollbackEvents = sortedEvents.filter(e => e.type !== 'OrderRolledBack');
      
      if (rollbackData.rollbackType === 'version') {
        const targetVersion = rollbackData.rollbackValue;
        const skippedEvents = nonRollbackEvents.filter(e => 
          e.version > targetVersion && e.version < rollbackEvent.version
        );
        skippedEvents.forEach(event => skippedVersions.add(event.version));
      } else if (rollbackData.rollbackType === 'timestamp') {
        const rollbackDate = new Date(rollbackData.rollbackValue);
        const skippedEvents = nonRollbackEvents.filter(e => 
          new Date(e.timestamp) > rollbackDate && e.version < rollbackEvent.version
        );
        skippedEvents.forEach(event => skippedVersions.add(event.version));
      }
    }
    
    return Array.from(skippedVersions).sort((a, b) => a - b);
  }

  /**
   * Validate business rules for order operations
   */
  static validateOrderOperation(order: Order, operation: 'addItem' | 'removeItem' | 'updateStatus'): void {
    switch (operation) {
      case 'addItem':
        if (!order.canAddItems()) {
          throw new Error(`Cannot add items to order in ${order.status} status`);
        }
        break;
      case 'removeItem':
        if (!order.canRemoveItems()) {
          throw new Error(`Cannot remove items from order in ${order.status} status`);
        }
        break;
      case 'updateStatus':
        if (!order.canUpdateStatus()) {
          throw new Error(`Cannot update status for order in ${order.status} status`);
        }
        break;
    }
  }
}
