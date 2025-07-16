import { OrderItem, OrderStatus } from '../../domain/models/Order';

// Base command interface
export interface ICommand {
  readonly type: string;
}

// Order Commands
export interface CreateOrderCommand extends ICommand {
  readonly type: 'CreateOrder';
  readonly customerId: string;
  readonly items: OrderItem[];
}

export interface UpdateOrderStatusCommand extends ICommand {
  readonly type: 'UpdateOrderStatus';
  readonly orderId: string;
  readonly status: OrderStatus;
}

export interface AddOrderItemCommand extends ICommand {
  readonly type: 'AddOrderItem';
  readonly orderId: string;
  readonly item: OrderItem;
}

export interface RemoveOrderItemCommand extends ICommand {
  readonly type: 'RemoveOrderItem';
  readonly orderId: string;
  readonly productId: string;
}

export interface RollbackOrderCommand extends ICommand {
  readonly type: 'RollbackOrder';
  readonly orderId: string;
  readonly toVersion?: number;
  readonly toTimestamp?: string;
}

// Union type for all commands
export type OrderCommand = 
  | CreateOrderCommand 
  | UpdateOrderStatusCommand 
  | AddOrderItemCommand 
  | RemoveOrderItemCommand 
  | RollbackOrderCommand;
