import { v4 as uuidv4 } from 'uuid';

// Value Objects
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

// Order Aggregate Root
export class Order {
  public readonly id: string;
  public readonly customerId: string;
  public readonly items: OrderItem[];
  public readonly status: OrderStatus;
  public readonly totalAmount: number;

  constructor(
    customerId: string,
    items: OrderItem[],
    status: OrderStatus = OrderStatus.PENDING,
    id?: string
  ) {
    // Business invariants validation
    if (!customerId?.trim()) {
      throw new Error('Customer ID is required');
    }

    if (!items || items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    // Validate each item
    items.forEach((item, index) => {
      if (!item.productId?.trim()) {
        throw new Error(`Item ${index + 1}: Product ID is required`);
      }
      if (!item.productName?.trim()) {
        throw new Error(`Item ${index + 1}: Product name is required`);
      }
      if (item.quantity <= 0) {
        throw new Error(`Item ${index + 1}: Quantity must be positive`);
      }
      if (item.price <= 0) {
        throw new Error(`Item ${index + 1}: Price must be positive`);
      }
    });

    this.id = id || uuidv4();
    this.customerId = customerId;
    this.items = [...items]; // Immutable copy
    this.status = status;
    this.totalAmount = this.calculateTotalAmount(items);
  }

  // Factory method for creating new order
  static create(customerId: string, items: OrderItem[]): Order {
    return new Order(customerId, items);
  }

  // Domain methods (pure functions)
  updateStatus(newStatus: OrderStatus): Order {
    if (this.status === newStatus) {
      return this; // No change needed
    }

    // Business rules for status transitions
    if (!this.isValidStatusTransition(this.status, newStatus)) {
      throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
    }

    return new Order(this.customerId, this.items, newStatus, this.id);
  }

  addItem(item: OrderItem): Order {
    // Validate item
    if (!item.productId?.trim()) {
      throw new Error('Product ID is required');
    }
    if (!item.productName?.trim()) {
      throw new Error('Product name is required');
    }
    if (item.quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    if (item.price <= 0) {
      throw new Error('Price must be positive');
    }

    // Check for duplicate product
    if (this.items.some(existingItem => existingItem.productId === item.productId)) {
      throw new Error(`Product ${item.productId} already exists in order`);
    }

    const newItems = [...this.items, item];
    return new Order(this.customerId, newItems, this.status, this.id);
  }

  removeItem(productId: string): Order {
    if (!productId?.trim()) {
      throw new Error('Product ID is required');
    }

    const itemExists = this.items.some(item => item.productId === productId);
    if (!itemExists) {
      throw new Error(`Product ${productId} not found in order`);
    }

    const newItems = this.items.filter(item => item.productId !== productId);
    
    if (newItems.length === 0) {
      throw new Error('Cannot remove last item from order');
    }

    return new Order(this.customerId, newItems, this.status, this.id);
  }

  // Domain business rules
  private isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [], // Terminal state
      [OrderStatus.CANCELLED]: []  // Terminal state
    };

    return validTransitions[from]?.includes(to) || false;
  }

  private calculateTotalAmount(items: OrderItem[]): number {
    return items.reduce((total, item) => total + (item.quantity * item.price), 0);
  }

  // Domain queries
  hasItem(productId: string): boolean {
    return this.items.some(item => item.productId === productId);
  }

  getItem(productId: string): OrderItem | undefined {
    return this.items.find(item => item.productId === productId);
  }

  canAddItems(): boolean {
    return this.status === OrderStatus.PENDING || this.status === OrderStatus.CONFIRMED;
  }

  canRemoveItems(): boolean {
    return this.status === OrderStatus.PENDING || this.status === OrderStatus.CONFIRMED;
  }

  canUpdateStatus(): boolean {
    return this.status !== OrderStatus.DELIVERED && this.status !== OrderStatus.CANCELLED;
  }

  // Equality and serialization
  equals(other: Order): boolean {
    return this.id === other.id;
  }

  toJSON() {
    return {
      id: this.id,
      customerId: this.customerId,
      items: this.items,
      status: this.status,
      totalAmount: this.totalAmount
    };
  }
}
