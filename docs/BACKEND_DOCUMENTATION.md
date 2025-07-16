# Backend Architecture Documentation - Clean Architecture + DDD + CQRS + Event Sourcing

## 📋 Tổng quan hệ thống

Hệ thống Order Management được xây dựng theo kiến trúc **Clean Architecture** kết hợp với **Domain-Driven Design (DDD)**, **CQRS (Command Query Responsibility Segregation)**, và **Event Sourcing**. Hệ thống được phát triển với Node.js, TypeScript và Express.js, tuân theo các nguyên tắc SOLID và Dependency Inversion.

## 🏗️ Clean Architecture Layers

### 1. Domain Layer (🏢 Lớp nghiệp vụ cốt lõi)
- **Entities & Aggregates**: Order.ts - Aggregate Root chứa business logic
- **Domain Events**: Định nghĩa các sự kiện nghiệp vụ
- **Repository Interfaces**: Abstractions cho data access (DIP)
- **Domain Services**: Business logic không thuộc về entity cụ thể
- **Value Objects**: Immutable objects đại diện cho concepts

### 2. Application Layer (🎯 Lớp use cases)
- **Command Handlers**: Xử lý write operations (CQRS)
- **Query Handlers**: Xử lý read operations (CQRS)
- **DTOs**: Data Transfer Objects cho commands và queries
- **Use Cases**: Orchestrate domain objects và infrastructure services

### 3. Infrastructure Layer (🔧 Lớp technical concerns)
- **Event Stores**: InMemoryEventStore, PostgreSQLEventStore
- **Database Access**: Repository implementations
- **External Services**: Third-party integrations
- **Configuration**: Environment và dependency setup

### 4. Interface Layer (📱 Lớp presentation)
- **Controllers**: OrderCommandController, OrderQueryController
- **Routes**: API endpoint definitions
- **DTOs**: Request/Response models
- **Middleware**: Authentication, validation, error handling

### 5. Bootstrap Layer (🚀 Composition Root)
- **DI Container**: Dependency injection setup
- **Application**: App bootstrap và startup
- **Configuration**: Environment-specific setup

### 3. Query Flow (Read Operations)
```
Client Request → Controller → Event Store → Event Replay → Domain Reconstruction → Response
```

**Example - Get Order:**
1. `GET /api/orders/:id`
2. `OrderController.getOrder()` nhận request
3. Load events từ `EventStore.getEvents(id)`
4. **[NEW]** Check for rollback events và filter accordingly
5. Replay events để rebuild Order state
6. Trả về current Order state

### 4. Rollback Flow (NEW - Event Sourcing Time Travel)
```
Client Request → Validation → Rollback Logic → Event Creation → State Reconstruction → Response
## 🔄 Application Flow với Clean Architecture

### 1. Command Flow (Write Operations)
```
Interface → Application → Domain → Infrastructure

Client Request → OrderCommandController → Command Handler → Domain Service → Event Store
```

**Example - Create Order:**
1. `POST /api/orders` nhận request
2. `OrderCommandController.createOrder()` validate input
3. Create `CreateOrderCommand` DTO
4. `CreateOrderHandler.handle()` process command
5. `Order.create()` apply business rules (Domain)
6. Generate `OrderCreatedEvent` (Domain Event)
7. `EventStore.saveEvent()` persist event (Infrastructure)
8. Return success response

### 2. Query Flow (Read Operations)
```
Interface → Application → Infrastructure → Domain → Response

Client Request → OrderQueryController → Query Handler → Event Store → Domain Reconstruction
```

**Example - Get Order:**
1. `GET /api/orders/:id` nhận request
2. `OrderQueryController.getOrder()` create query
3. `GetOrderHandler.handle()` process query
4. `EventStore.getEvents(id)` load events
5. `OrderDomainService.rebuildFromEvents()` reconstruct state
6. Return Order aggregate state

### 3. Event Sourcing Rollback Flow
```
Interface → Application → Domain → Infrastructure → Domain

Client Request → Command Controller → Rollback Handler → Validation → Event Creation → State Rebuild
```

**Example - Rollback Order:**
1. `POST /api/orders/:id/rollback` với `{toVersion: 4}`
2. `OrderCommandController.rollbackOrder()` validate
3. `RollbackOrderHandler.handle()` process command
4. **Domain Validation:**
   - Load events từ Event Store
   - `OrderDomainService.getSkippedVersions()` check validity
   - Reject nếu target version đã bị skip
5. **Domain Logic:**
   - Filter events: keep version <= toVersion
   - `OrderDomainService.rebuildFromEvents()` get state
   - Create `OrderRolledBackEvent` với metadata
6. **Persistence:**
   - Save rollback event to Event Store
7. **Response:**
   - Return before/after states với rollback metadata

### 4. Dependency Injection Flow
```
Bootstrap → Infrastructure → Application → Interface

DIContainer → Event Store → Handlers → Controllers → Routes
```

**Clean Architecture Benefits:**
- **Testability**: Mỗi layer test độc lập
- **Independence**: Business logic không phụ thuộc framework
- **Flexibility**: Dễ thay đổi database/framework
- **Maintainability**: Clear separation of concerns

## 🎯 Core Principles & Read/Write Mechanisms

### 1. Event Sourcing - Write Model (Ghi dữ liệu)

**Khái niệm cơ bản:**
- **Định nghĩa**: Thay vì lưu trữ state hiện tại, Event Sourcing lưu trữ tất cả thay đổi dưới dạng sequence of immutable events
- **Nguyên tắc**: "Events are facts" - Events là những sự kiện đã xảy ra và không thể thay đổi
- **Write Pattern**: Mọi thay đổi business logic được biểu diễn thành events và append vào event stream

**Cơ chế Write (Ghi dữ liệu):**
```typescript
// WRITE FLOW: State Change → Event Creation → Event Persistence
async handleCreateOrder(command: CreateOrderCommand): Promise<string> {
  // 1. Business Logic Validation
  const order = new Order(command.customerId, command.items);
  
  // 2. Event Creation (Write Operation)
  const event: OrderCreatedEvent = {
    type: 'OrderCreated',
    aggregateId: order.id,      // Entity identifier
    version: 1,                 // Event sequence number
    timestamp: new Date(),      // When event occurred
    data: {                     // Event payload (immutable)
      orderId: order.id,
      customerId: order.customerId,
      items: order.items,
      status: order.status,
      totalAmount: order.totalAmount
    }
  };

  // 3. Event Persistence (Append-only)
  await this.eventStore.saveEvent(event);
  
  // 4. Return result (no state storage)
  return order.id;
}
```

**Event Store Write Characteristics:**
- **Append-Only**: Events chỉ được thêm vào, không update/delete
- **Immutable**: Event data không bao giờ thay đổi sau khi persist
- **Ordered**: Events có version number để đảm bảo thứ tự
- **Atomic**: Mỗi event write là một atomic operation

**Write Model Benefits:**
- **Complete Audit Trail**: Mọi thay đổi đều được ghi lại
- **Natural Versioning**: Mỗi event có version riêng
- **Conflict Resolution**: Version-based optimistic concurrency control
- **Temporal Queries**: Có thể query state tại bất kỳ thời điểm nào

### 2. Event Sourcing - Read Model (Đọc dữ liệu)

**Cơ chế Read (Đọc dữ liệu):**
```typescript
// READ FLOW: Event Retrieval → Event Replay → State Reconstruction
async getOrder(orderId: string): Promise<Order> {
  // 1. Event Retrieval (Read from Event Store)
  const events = await this.eventStore.getEvents(orderId);
  
  // 2. Event Filtering & Sorting
  const validEvents = this.filterValidEvents(events);
  const sortedEvents = validEvents.sort((a, b) => a.version - b.version);
  
  // 3. State Reconstruction (Event Replay)
  let currentState: Order | null = null;
  
  for (const event of sortedEvents) {
    currentState = this.applyEvent(currentState, event);
  }
  
  // 4. Return reconstructed state
  return currentState;
}

// Event Application Logic
private applyEvent(currentState: Order | null, event: BaseEvent): Order {
  switch (event.type) {
    case 'OrderCreated':
      return new Order(
        event.data.customerId,
        event.data.items,
        event.data.status,
        event.aggregateId,
        event.timestamp
      );
      
    case 'OrderStatusUpdated':
      if (!currentState) throw new Error('Invalid event sequence');
      return currentState.updateStatus(event.data.newStatus, event.timestamp);
      
    case 'OrderItemAdded':
      if (!currentState) throw new Error('Invalid event sequence');
      return currentState.addItem(event.data.item, event.timestamp);
      
    case 'OrderItemRemoved':
      if (!currentState) throw new Error('Invalid event sequence');
      return currentState.removeItem(event.data.productId, event.timestamp);
      
    default:
      return currentState; // Unknown events are ignored
  }
}
```

**Read Model Characteristics:**
- **Event Replay**: State được tái tạo bằng cách replay events
- **Deterministic**: Cùng sequence events luôn tạo ra cùng state
- **Point-in-Time**: Có thể xem state tại bất kỳ version nào
- **Eventually Consistent**: Read model có thể lag sau write model

**Read Performance Optimizations:**
```typescript
// Snapshot Pattern (Future Enhancement)
async getOrderWithSnapshot(orderId: string): Promise<Order> {
  // 1. Load latest snapshot (if exists)
  const snapshot = await this.snapshotStore.getLatestSnapshot(orderId);
  
  // 2. Load events after snapshot
  const eventsAfterSnapshot = await this.eventStore.getEventsAfterVersion(
    orderId, 
    snapshot?.version || 0
  );
  
  // 3. Replay only recent events
  let state = snapshot?.state || null;
  for (const event of eventsAfterSnapshot) {
    state = this.applyEvent(state, event);
  }
  
  return state;
}
```

### 3. CQRS (Command Query Responsibility Segregation)

**Nguyên tắc cơ bản:**
- **Separation of Concerns**: Tách biệt hoàn toàn operations đọc và ghi
- **Different Models**: Write model và read model có thể có structure khác nhau
- **Optimized for Purpose**: Mỗi model được tối ưu cho use case riêng

### Command Side (Write Operations)

**Commands** represent intent to change state:

```typescript
// Command DTOs
interface CreateOrderCommand {
  type: 'CreateOrder';
  customerId: string;
  items: OrderItem[];
}

interface UpdateOrderStatusCommand {
  type: 'UpdateOrderStatus';
  orderId: string;
  status: OrderStatus;
}
```

**Command Handlers** process business operations:

```typescript
export class CreateOrderHandler {
  constructor(private eventStore: IEventStore) {}
  
  async handle(command: CreateOrderCommand): Promise<string> {
    // 1. Domain logic
    const order = Order.create(command.customerId, command.items);
    
    // 2. Create domain event
    const event: OrderCreatedEvent = {
      type: 'OrderCreated',
      aggregateId: order.id,
      aggregateType: 'Order',
      version: 1,
      timestamp: new Date().toISOString(),
      data: { /* order data */ }
    };
    
    // 3. Persist event
    await this.eventStore.saveEvent(event);
    
    return order.id;
  }
}
```

**Command Controller** handles HTTP requests:

```typescript
export class OrderCommandController {
  async createOrder(req: Request, res: Response): Promise<void> {
    // 1. Validate input
    const { customerId, items } = req.body;
    
    // 2. Create command
    const command: CreateOrderCommand = {
      type: 'CreateOrder',
      customerId,
      items
    };
    
    // 3. Execute command
    const orderId = await this.createOrderHandler.handle(command);
    
    // 4. Return response
    res.status(201).json({ orderId });
  }
}
```

### Query Side (Read Operations)

**Queries** represent data retrieval requests:

```typescript
// Query DTOs
interface GetOrderQuery {
  type: 'GetOrder';
  orderId: string;
}

interface GetAllOrdersQuery {
  type: 'GetAllOrders';
  page?: number;
  limit?: number;
}
```

**Query Handlers** process data retrieval:

```typescript
export class GetOrderHandler {
  constructor(private eventStore: IEventStore) {}
  
  async handle(query: GetOrderQuery): Promise<Order | null> {
    // 1. Load events
    const events = await this.eventStore.getEvents(query.orderId);
    
    // 2. Rebuild from events (Event Sourcing)
    return OrderDomainService.rebuildFromEvents(events);
  }
}
```

**Query Controller** handles read requests:

```typescript
export class OrderQueryController {
  async getOrder(req: Request, res: Response): Promise<void> {
    // 1. Create query
    const query: GetOrderQuery = {
      type: 'GetOrder',
      orderId: req.params.orderId
    };
    
    // 2. Execute query
    const order = await this.getOrderHandler.handle(query);
    
    // 3. Return data
    res.json({ data: order?.toJSON() });
  }
}
```

### CQRS Benefits in Clean Architecture

- **Separation of Concerns**: Write và read có logic riêng biệt
- **Scalability**: Có thể scale read và write độc lập
- **Optimization**: Read model có thể optimize cho specific queries
- **Flexibility**: Write model focus vào business rules, read model focus vào data presentation
- **Event Sourcing Compatibility**: Perfect fit với Event Sourcing pattern

### 4. Read/Write Synchronization Patterns

**Write-then-Read Pattern:**
```typescript
// Pattern 1: Immediate Read After Write (Strong Consistency)
async createOrderAndReturn(command: CreateOrderCommand): Promise<Order> {
  // 1. Write Operation
  const orderId = await this.commandHandlers.handleCreateOrder(command);
  
  // 2. Immediate Read (from same event store)
  const order = await this.queryHandlers.handleGetOrder({ orderId });
  
  return order; // Guaranteed to include the write
}

// Pattern 2: Async Read Model Update (Eventually Consistent)
async createOrderAsync(command: CreateOrderCommand): Promise<string> {
  // 1. Write to Event Store
  const orderId = await this.commandHandlers.handleCreateOrder(command);
  
  // 2. Async Read Model Update (via event subscription)
  this.eventBus.publish('OrderCreated', { orderId });
  
  return orderId; // Read model will be updated asynchronously
}
```

**Event-Driven Read Model Updates:**
```typescript
// Read Model Projections (Event Handlers)
class OrderReadModelProjection {
  constructor(private readModelStore: ReadModelStore) {}

  // Event Handler - Updates Read Model
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const orderReadModel = {
      id: event.aggregateId,
      customerId: event.data.customerId,
      status: event.data.status,
      totalAmount: event.data.totalAmount,
      itemCount: event.data.items.length,
      createdAt: event.timestamp,
      updatedAt: event.timestamp
    };

    await this.readModelStore.insertOrder(orderReadModel);
  }

  async handleOrderStatusUpdated(event: OrderStatusUpdatedEvent): Promise<void> {
    await this.readModelStore.updateOrderStatus(
      event.aggregateId,
      event.data.newStatus,
      event.timestamp
    );
  }
}
```

### 5. Consistency Patterns & Transaction Management

**Event Sourcing Consistency Guarantees:**
```typescript
// Strong Consistency within Aggregate Boundary
class OrderAggregate {
  // All changes within single aggregate are ACID
  async processComplexUpdate(command: ComplexOrderUpdateCommand): Promise<void> {
    // Atomic operation - all events succeed or all fail
    const events: Event[] = [];
    
    // Business logic generates multiple related events
    if (command.removeItems.length > 0) {
      events.push(...this.generateRemoveItemEvents(command.removeItems));
    }
    
    if (command.addItems.length > 0) {
      events.push(...this.generateAddItemEvents(command.addItems));
    }
    
    if (command.newStatus) {
      events.push(this.generateStatusUpdateEvent(command.newStatus));
    }
    
    // All events saved atomically
    await this.eventStore.saveEvents(this.id, events, this.version);
  }
}
```

**Cross-Aggregate Consistency (Eventually Consistent):**
```typescript
// Saga Pattern for Cross-Aggregate Transactions
class OrderProcessingSaga {
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      // Step 1: Reserve inventory
      await this.inventoryService.reserveItems(event.data.items);
      
      // Step 2: Process payment
      await this.paymentService.processPayment(event.data.totalAmount);
      
      // Step 3: Confirm order
      await this.orderService.confirmOrder(event.aggregateId);
      
    } catch (error) {
      // Compensating actions for rollback
      await this.compensateOrderCreation(event);
    }
  }
  
  async compensateOrderCreation(event: OrderCreatedEvent): Promise<void> {
    // Compensating transactions
    await this.inventoryService.releaseReservation(event.data.items);
    await this.orderService.cancelOrder(event.aggregateId, 'Payment failed');
  }
}
```

**Optimistic Concurrency Control:**
```typescript
// Version-based Concurrency Control
async updateOrderWithConcurrencyCheck(
  orderId: string,
  command: UpdateOrderCommand,
  expectedVersion: number
): Promise<void> {
  
  try {
    // Load current state
    const currentOrder = await this.getOrder(orderId);
    
    // Check version
    if (currentOrder.version !== expectedVersion) {
      throw new ConcurrencyError(
        `Order was modified. Expected version: ${expectedVersion}, ` +
        `Current version: ${currentOrder.version}`
      );
    }
    
    // Apply command
    const events = currentOrder.applyCommand(command);
    
    // Save with version check
    await this.eventStore.saveEvents(orderId, events, expectedVersion);
    
  } catch (error) {
    if (error instanceof ConcurrencyError) {
      // Retry strategy
      await this.retryWithBackoff(orderId, command);
    }
    throw error;
  }
}

// Retry Strategy for Concurrency Conflicts
async retryWithBackoff(
  orderId: string, 
  command: UpdateOrderCommand,
  maxRetries: number = 3
): Promise<void> {
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get fresh state
      const order = await this.getOrder(orderId);
      
      // Retry command with current version
      await this.updateOrderWithConcurrencyCheck(
        orderId, 
        command, 
        order.version
      );
      
      return; // Success
      
    } catch (error) {
      if (error instanceof ConcurrencyError && attempt < maxRetries) {
        // Exponential backoff
        await this.delay(Math.pow(2, attempt) * 100);
        continue;
      }
      throw error;
    }
  }
}
```

### 6. Error Handling & Recovery Patterns

**Command Validation & Business Rule Enforcement:**
```typescript
// Multi-level Validation Strategy
class OrderCommandValidator {
  async validateCreateOrder(command: CreateOrderCommand): Promise<void> {
    // 1. Input Validation (Syntax)
    if (!command.customerId || command.customerId.trim() === '') {
      throw new ValidationError('Customer ID is required');
    }
    
    if (!command.items || command.items.length === 0) {
      throw new ValidationError('Order must contain at least one item');
    }
    
    // 2. Business Rule Validation (Semantics)
    const customer = await this.customerService.getCustomer(command.customerId);
    if (!customer.isActive) {
      throw new BusinessRuleError('Cannot create order for inactive customer');
    }
    
    // 3. Cross-Aggregate Validation (Eventually Consistent)
    for (const item of command.items) {
      const product = await this.productService.getProduct(item.productId);
      if (!product.isAvailable) {
        throw new BusinessRuleError(`Product ${item.productId} is not available`);
      }
      
      if (item.quantity > product.stockLevel) {
        throw new BusinessRuleError(
          `Insufficient stock for ${item.productId}. ` +
          `Requested: ${item.quantity}, Available: ${product.stockLevel}`
        );
      }
    }
  }
}
```

**Event Store Error Handling:**
```typescript
// Robust Event Persistence with Error Recovery
class ResilientEventStore {
  async saveEvents(
    aggregateId: string, 
    events: Event[], 
    expectedVersion: number
  ): Promise<void> {
    
    const maxRetries = 3;
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.attemptSaveEvents(aggregateId, events, expectedVersion);
        return; // Success
        
      } catch (error) {
        lastError = error;
        
        if (error instanceof ConcurrencyError) {
          // Don't retry concurrency errors
          throw error;
        }
        
        if (error instanceof ConnectionError && attempt < maxRetries) {
          // Wait and retry for connection issues
          await this.waitWithJitter(attempt * 1000);
          continue;
        }
        
        if (error instanceof TransactionError && attempt < maxRetries) {
          // Retry transaction errors
          await this.waitWithJitter(attempt * 500);
          continue;
        }
        
        // Non-retryable error
        throw error;
      }
    }
    
    throw new EventStoreError(
      `Failed to save events after ${maxRetries} attempts`, 
      lastError
    );
  }
  
  private async attemptSaveEvents(
    aggregateId: string, 
    events: Event[], 
    expectedVersion: number
  ): Promise<void> {
    
    const connection = await this.getConnection();
    
    try {
      await connection.query('BEGIN');
      
      // Verify expected version
      const currentVersion = await this.getCurrentVersion(connection, aggregateId);
      if (currentVersion !== expectedVersion) {
        throw new ConcurrencyError(
          `Version mismatch. Expected: ${expectedVersion}, Current: ${currentVersion}`
        );
      }
      
      // Insert events atomically
      for (const event of events) {
        await this.insertEvent(connection, event);
      }
      
      await connection.query('COMMIT');
      
    } catch (error) {
      await connection.query('ROLLBACK');
      
      // Classify error types
      if (error.constraint === 'unique_violation') {
        throw new ConcurrencyError('Duplicate event version detected');
      }
      
      if (error.code === 'ECONNRESET') {
        throw new ConnectionError('Database connection lost');
      }
      
      throw new TransactionError('Event save transaction failed', error);
      
    } finally {
      connection.release();
    }
  }
}
```

**Event Replay Error Handling:**
```typescript
// Resilient Event Replay with Error Recovery
class ResilientEventReplayer {
  async rebuildOrderFromEvents(events: Event[]): Promise<Order> {
    let currentState: Order | null = null;
    let processedEvents = 0;
    
    try {
      for (const event of events) {
        try {
          currentState = await this.applyEvent(currentState, event);
          processedEvents++;
          
        } catch (eventError) {
          // Event-specific error handling
          if (eventError instanceof UnknownEventTypeError) {
            // Skip unknown events (forward compatibility)
            console.warn(`Skipping unknown event type: ${event.type}`, event);
            continue;
          }
          
          if (eventError instanceof InvalidEventDataError) {
            // Attempt data migration
            const migratedEvent = await this.migrateEventData(event);
            currentState = await this.applyEvent(currentState, migratedEvent);
            processedEvents++;
            continue;
          }
          
          // Wrap and re-throw with context
          throw new EventReplayError(
            `Failed to apply event ${event.type} (version ${event.version})`,
            eventError,
            { processedEvents, event }
          );
        }
      }
      
      if (!currentState) {
        throw new EmptyEventStreamError(
          `No valid events found for reconstruction. Total events: ${events.length}`
        );
      }
      
      return currentState;
      
    } catch (error) {
      // Add reconstruction context
      throw new StateReconstructionError(
        `Failed to reconstruct order state. Processed ${processedEvents}/${events.length} events`,
        error
      );
    }
  }
  
  // Event Data Migration for Schema Evolution
  private async migrateEventData(event: Event): Promise<Event> {
    // Example: Migrate old OrderCreated events to new schema
    if (event.type === 'OrderCreated' && !event.data.version) {
      return {
        ...event,
        data: {
          ...event.data,
          version: '1.0', // Add missing version field
          totalAmount: this.calculateTotalFromItems(event.data.items)
        }
      };
    }
    
    return event;
  }
}
```

**API Error Responses:**
```typescript
// Standardized Error Response Format
class ErrorResponseHandler {
  handleError(error: Error, req: Request, res: Response): void {
    const errorResponse = this.formatError(error);
    
    // Log error with context
    this.logger.error('API Error', {
      error: error.message,
      stack: error.stack,
      requestId: req.id,
      endpoint: `${req.method} ${req.path}`,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    res.status(errorResponse.statusCode).json(errorResponse);
  }
  
  private formatError(error: Error): ErrorResponse {
    // Business/Validation Errors
    if (error instanceof ValidationError) {
      return {
        success: false,
        error: 'Validation Error',
        message: error.message,
        details: error.validationErrors,
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR'
      };
    }
    
    if (error instanceof BusinessRuleError) {
      return {
        success: false,
        error: 'Business Rule Violation',
        message: error.message,
        statusCode: 422,
        errorCode: 'BUSINESS_RULE_ERROR'
      };
    }
    
    // Concurrency Errors
    if (error instanceof ConcurrencyError) {
      return {
        success: false,
        error: 'Concurrency Conflict',
        message: 'The resource was modified by another process. Please refresh and try again.',
        statusCode: 409,
        errorCode: 'CONCURRENCY_ERROR',
        retryable: true
      };
    }
    
    // Infrastructure Errors
    if (error instanceof EventStoreError) {
      return {
        success: false,
        error: 'Event Store Error',
        message: 'Unable to persist changes. Please try again.',
        statusCode: 503,
        errorCode: 'EVENT_STORE_ERROR',
        retryable: true
      };
    }
    
    // Default Internal Server Error
    return {
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again later.',
      statusCode: 500,
      errorCode: 'INTERNAL_ERROR',
      retryable: true
    };
  }
}
```

### 7. Performance Optimization Patterns

**Event Caching Strategy:**
```typescript
// Multi-Level Caching for Event Retrieval
class CachedEventStore {
  constructor(
    private eventStore: EventStore,
    private l1Cache: MemoryCache,     // Fast in-memory cache
    private l2Cache: RedisCache       // Distributed cache
  ) {}
  
  async getEvents(aggregateId: string): Promise<Event[]> {
    // L1 Cache Check (Memory)
    const l1CacheKey = `events:${aggregateId}`;
    let events = await this.l1Cache.get(l1CacheKey);
    
    if (events) {
      this.metrics.incrementCounter('cache.l1.hit');
      return events;
    }
    
    // L2 Cache Check (Redis)
    const l2CacheKey = `events:${aggregateId}:v2`;
    events = await this.l2Cache.get(l2CacheKey);
    
    if (events) {
      this.metrics.incrementCounter('cache.l2.hit');
      // Populate L1 cache
      await this.l1Cache.set(l1CacheKey, events, { ttl: 300 }); // 5 min
      return events;
    }
    
    // Cache Miss - Load from Event Store
    this.metrics.incrementCounter('cache.miss');
    events = await this.eventStore.getEvents(aggregateId);
    
    // Populate both cache levels
    await Promise.all([
      this.l1Cache.set(l1CacheKey, events, { ttl: 300 }),
      this.l2Cache.set(l2CacheKey, events, { ttl: 3600 }) // 1 hour
    ]);
    
    return events;
  }
  
  // Cache Invalidation on Writes
  async saveEvents(aggregateId: string, events: Event[], expectedVersion: number): Promise<void> {
    // Save to store
    await this.eventStore.saveEvents(aggregateId, events, expectedVersion);
    
    // Invalidate caches
    await Promise.all([
      this.l1Cache.delete(`events:${aggregateId}`),
      this.l2Cache.delete(`events:${aggregateId}:v2`)
    ]);
  }
}
```

**Snapshot Pattern Implementation:**
```typescript
// Snapshot Store for Performance Optimization
class SnapshotStore {
  async saveSnapshot(aggregateId: string, snapshot: AggregateSnapshot): Promise<void> {
    await this.repository.upsert({
      aggregateId,
      version: snapshot.version,
      data: JSON.stringify(snapshot.state),
      timestamp: new Date()
    });
  }
  
  async getLatestSnapshot(aggregateId: string): Promise<AggregateSnapshot | null> {
    const record = await this.repository.findOne({
      where: { aggregateId },
      orderBy: { version: 'DESC' }
    });
    
    if (!record) return null;
    
    return {
      aggregateId,
      version: record.version,
      state: JSON.parse(record.data),
      timestamp: record.timestamp
    };
  }
}

// Snapshot-Optimized Order Reconstruction
class OptimizedOrderQueryHandler {
  async getOrder(orderId: string): Promise<Order> {
    // 1. Load latest snapshot
    const snapshot = await this.snapshotStore.getLatestSnapshot(orderId);
    
    // 2. Load events after snapshot
    const eventsAfterSnapshot = await this.eventStore.getEventsAfterVersion(
      orderId,
      snapshot?.version || 0
    );
    
    // 3. Reconstruct from snapshot + recent events
    let order = snapshot ? Order.fromSnapshot(snapshot.state) : null;
    
    for (const event of eventsAfterSnapshot) {
      order = await this.applyEvent(order, event);
    }
    
    // 4. Create new snapshot if many events processed
    if (eventsAfterSnapshot.length > 50) {
      await this.snapshotStore.saveSnapshot(orderId, {
        aggregateId: orderId,
        version: order.version,
        state: order.toSnapshot(),
        timestamp: new Date()
      });
    }
    
    return order;
  }
}
```

## 🏗️ Clean Architecture Project Structure

```
Order-management/src/
├── main.ts                      # 🚀 Application Entry Point
├── domain/                      # 🏢 Domain Layer (Core Business Logic)
│   ├── models/
│   │   └── Order.ts            # Order Aggregate Root với business rules
│   ├── events/
│   │   └── types.ts            # Domain Events definitions
│   ├── repositories/
│   │   └── IEventStore.ts      # Repository interface (DIP)
│   └── services/
│       └── OrderDomainService.ts # Pure domain logic
├── application/                 # 🎯 Application Layer (Use Cases)
│   ├── commands/               # Write Side (CQRS)
│   │   ├── OrderCommands.ts    # Command DTOs
│   │   └── handlers/
│   │       └── OrderCommandHandlers.ts # Command processing
│   └── queries/                # Read Side (CQRS)
│       ├── OrderQueries.ts     # Query DTOs
│       └── handlers/
│           └── OrderQueryHandlers.ts # Query processing
├── infrastructure/             # 🔧 Infrastructure Layer (Technical)
│   └── persistence/
│       ├── InMemoryEventStore.ts    # Development implementation
│       ├── PostgreSQLEventStore.ts  # Production implementation
│       └── EventStoreFactory.ts     # Factory pattern
├── interfaces/                 # 📱 Interface Layer (Controllers)
│   ├── controllers/
│   │   ├── OrderCommandController.ts # Write API endpoints
│   │   └── OrderQueryController.ts   # Read API endpoints
│   └── routes/
│       └── OrderRoutes.ts      # Route definitions
└── bootstrap/                  # 🚀 Composition Root
    ├── DIContainer.ts          # Dependency Injection setup
    └── Application.ts          # App bootstrap và startup
```

### 🎯 Layer Dependencies (Clean Architecture Rule)

```
┌─────────────────────────────────────────────────────────┐
│                    DEPENDENCY RULE                     │
│                                                         │
│  🚫 Outer layers CANNOT depend on inner layers         │
│  ✅ Inner layers define interfaces for outer layers    │
│                                                         │
│  Dependencies point INWARD only:                       │
│  Interface → Application → Domain ← Infrastructure     │
└─────────────────────────────────────────────────────────┘
```

**Layer Responsibilities:**

| Layer | Nhiệm vụ | Phụ thuộc |
|-------|----------|-----------|
| 🏢 **Domain** | Business logic, entities, rules | Không phụ thuộc gì |
| 🎯 **Application** | Use cases, orchestration | Chỉ Domain |
| 🔧 **Infrastructure** | Database, external services | Application + Domain |
| 📱 **Interface** | Controllers, APIs, UI | Application + Domain |
| 🚀 **Bootstrap** | DI, configuration, startup | Tất cả layers |
