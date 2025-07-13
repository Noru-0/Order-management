import { v4 as uuidv4 } from 'uuid';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export class Order {
  public readonly id: string;
  public readonly customerId: string;
  public readonly items: OrderItem[];
  public readonly status: OrderStatus;
  public readonly totalAmount: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(
    customerId: string,
    items: OrderItem[],
    status: OrderStatus = OrderStatus.PENDING,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.id = id || uuidv4();
    this.customerId = customerId;
    this.items = items;
    this.status = status;
    this.totalAmount = this.calculateTotal();
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  private calculateTotal(): number {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  public updateStatus(newStatus: OrderStatus): Order {
    return new Order(
      this.customerId,
      this.items,
      newStatus,
      this.id,
      this.createdAt,
      new Date()
    );
  }

  public addItem(item: OrderItem): Order {
    const updatedItems = [...this.items, item];
    return new Order(
      this.customerId,
      updatedItems,
      this.status,
      this.id,
      this.createdAt,
      new Date()
    );
  }

  public removeItem(productId: string): Order {
    const updatedItems = this.items.filter(item => item.productId !== productId);
    return new Order(
      this.customerId,
      updatedItems,
      this.status,
      this.id,
      this.createdAt,
      new Date()
    );
  }
}
