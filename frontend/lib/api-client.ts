// API client for Order Management System
const API_BASE_URL = 'http://localhost:3001';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  customerId: string;
  items: OrderItem[];
}

export interface AddItemRequest {
  item: OrderItem;
}

export interface UpdateStatusRequest {
  status: string;
}

export interface OrderResponse {
  id: string;
  customerId: string;
  status: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventResponse {
  id: string;
  aggregateId: string;
  type: string;
  data: any;
  timestamp: string;
  version: number;
}

export interface OrderEventsResponse {
  orderId: string;
  eventCount: number;
  events: EventResponse[];
}

export interface AllEventsResponse {
  totalEvents: number;
  events: EventResponse[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AllOrdersResponse {
  orders: OrderResponse[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class OrderApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}/api${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    try {
      const url = `${API_BASE_URL}/health`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Create a new order
  async createOrder(orderData: CreateOrderRequest): Promise<ApiResponse<{ orderId: string }>> {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  // Get order by ID
  async getOrder(orderId: string): Promise<ApiResponse<OrderResponse>> {
    return this.request(`/orders/${orderId}`);
  }

  // Get all orders
  async getAllOrders(page: number = 1, limit: number = 10): Promise<ApiResponse<AllOrdersResponse | OrderResponse[]>> {
    return this.request(`/orders?page=${page}&limit=${limit}`);
  }

  // Update order status
  async updateOrderStatus(
    orderId: string,
    statusData: UpdateStatusRequest
  ): Promise<ApiResponse> {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  // Add item to order
  async addOrderItem(
    orderId: string,
    itemData: AddItemRequest
  ): Promise<ApiResponse> {
    return this.request(`/orders/${orderId}/items`, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  // Remove item from order
  async removeOrderItem(
    orderId: string,
    productId: string
  ): Promise<ApiResponse> {
    return this.request(`/orders/${orderId}/items/${productId}`, {
      method: 'DELETE',
    });
  }

  // Get order events (debug)
  async getOrderEvents(orderId: string): Promise<ApiResponse<OrderEventsResponse>> {
    return this.request(`/debug/orders/${orderId}/events`);
  }

  // Get all events (debug)
  async getAllEvents(page: number = 1, limit: number = 4): Promise<ApiResponse<AllEventsResponse>> {
    return this.request(`/debug/events?page=${page}&limit=${limit}`);
  }

  // Rollback order (debug/demo)
  async rollbackOrder(orderId: string, toVersion?: number, toTimestamp?: string): Promise<ApiResponse<any>> {
    const body: any = {};
    if (toVersion !== undefined && toVersion > 0) {
      body.toVersion = toVersion;
    }
    if (toTimestamp && toTimestamp.trim() !== '') {
      // Convert datetime-local format to ISO string
      const date = new Date(toTimestamp);
      if (!isNaN(date.getTime())) {
        body.toTimestamp = date.toISOString();
      } else {
        throw new Error('Invalid timestamp format');
      }
    }
    
    if (Object.keys(body).length === 0) {
      throw new Error('Either toVersion or toTimestamp must be provided');
    }
    
    return this.request(`/debug/orders/${orderId}/rollback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  }
}

export const orderApi = new OrderApiClient();
