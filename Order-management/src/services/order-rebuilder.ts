import { Order } from '../domain/Order';
import { BaseEvent } from '../events/types';

/**
 * Service để tái dựng Order từ Event Stream
 * Centralizes order rebuilding logic to avoid duplication between handlers and controller
 */
export class OrderRebuilderService {
  
  /**
   * Tái dựng Order từ danh sách events, xử lý rollback logic
   */
  rebuildOrderFromEvents(events: BaseEvent[]): Order | null {
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
        default:
          console.warn(`[WARN] Unrecognized event type: ${(event as any).type}`);
          break;
      }
    }

    return order;
  }

  /**
   * Giải quyết nested rollback versions để tránh rollback vòng lặp
   */
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
