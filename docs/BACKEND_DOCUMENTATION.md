# Backend Architecture Documentation - Event Sourcing Order Management System

## 📋 Tổng quan hệ thống

Hệ thống Order Management được xây dựng theo kiến trúc **Event Sourcing** và **CQRS (Command Query Responsibility Segregation)**, sử dụng Node.js với TypeScript và Express.js framework. Hệ thống bao gồm tính năng **Rollback Protection** tiên tiến để đảm bảo tính toàn vẹn dữ liệu trong Event Sourcing.

### 3. Query Flow (Read Operations)
```
Client Request → Controller → Event Store → Event Replay → Domain Reconstruction → Response
```

**Example - Get Order:**
1. `GET /api/### 3. Business Logic Errors
- Domain rule violations
- Concurrency conflicts
- Invalid state transitions
- **[NEW] Rollback validation errors**: Attempt to rollback to skipped version

### 4. Rollback-Specific Errors (NEW)
```typescript
// Rollback validation error example
{
  success: false,
  error: "Cannot rollback to version 6 because it was skipped by a previous rollback. Skipped versions: 5, 6, 7"
}

// Invalid rollback target
{
  success: false,
  error: "No events found for the specified rollback point"
}

// Missing rollback parameters
{
  success: false,
  error: "Either toVersion or toTimestamp must be provided"
}
```rs/:id`
2. `OrderController.getOrder()` nhận request
3. Load events từ `EventStore.getEvents(id)`
4. **[NEW]** Check for rollback events và filter accordingly
5. Replay events để rebuild Order state
6. Trả về current Order state

### 4. Rollback Flow (NEW - Event Sourcing Time Travel)
```
Client Request → Validation → Rollback Logic → Event Creation → State Reconstruction → Response
```

**Example - Rollback Order:**
1. `POST /api/debug/orders/:id/rollback` với `{toVersion: 4}`
2. `OrderController.rollbackOrder()` nhận request
3. **Validation Phase:**
   - Load tất cả events của order
   - Check skipped versions: `getSkippedVersions(events)`
   - Reject nếu `toVersion` trong skipped list
4. **Rollback Execution:**
   - Capture original state trước rollback
   - Filter events: keep events `version <= toVersion`
   - Rebuild state từ filtered events
   - Create `OrderRolledBackEvent` với metadata
5. **Event Store Update:**
   - Save rollback event với version mới
   - Event này ghi lại rollback operation
6. **Response:**
   - Return before/after states
   - Include rollback metadata
   - List undone events

**Rollback Validation Algorithm:**
```typescript
// Scenario: Order có events v1-v8, đã rollback v8→v4
// Skipped versions: [5, 6, 7]
// User cố rollback về v6 → BLOCKED

function validateRollback(events: BaseEvent[], targetVersion: number): void {
  const skippedVersions = getSkippedVersions(events);
  
  if (skippedVersions.includes(targetVersion)) {
    throw new ValidationError(
      `Cannot rollback to version ${targetVersion} - ` +
      `was skipped by previous rollback. ` +
      `Skipped versions: ${skippedVersions.join(', ')}`
    );
  }
}
```năng mới - Rollback Protection

### Enhanced Event Sourcing với Rollback Validation
- **Skipped Version Detection**: Tự động theo dõi các version bị bỏ qua do rollback
- **Rollback Validation**: Ngăn chặn rollback về các version không hợp lệ
- **Audit Trail**: Lịch sử rollback đầy đủ với timestamp và metadata
- **Data Integrity**: Đảm bảo tính nhất quán của event stream

## 🏗️ Kiến trúc tổng thể

```
Order-management/
├── src/
│   ├── index.ts                 # Entry point & application bootstrap
│   ├── api/                     # API Layer (Controllers, Routes, Middleware)
│   │   ├── controller.ts        # Business logic & request handling
│   │   ├── routes.ts           # API endpoints definition
│   │   └── middleware.ts       # Validation & error handling
│   ├── commands/               # Command Layer (CQRS)
│   │   └── handlers.ts         # Command handlers for business operations
│   ├── domain/                 # Domain Layer
│   │   └── Order.ts            # Order aggregate & business rules
│   ├── events/                 # Event Definitions
│   │   └── types.ts            # Event interfaces & types
│   └── infrastructure/         # Infrastructure Layer
│       ├── event-store.ts      # Event store interface & in-memory implementation
│       └── postgres-event-store.ts # PostgreSQL event store implementation
├── database/
│   ├── schema.sql              # Database schema definitions
│   └── setup.ps1              # Database setup script
├── package.json                # Dependencies & scripts
└── tsconfig.json              # TypeScript configuration
```

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

**Command Side (Write Operations):**
```typescript
// COMMAND PATTERN - Handles Write Operations
interface Command {
  aggregateId: string;
  version?: number;  // For optimistic concurrency control
}

interface CreateOrderCommand extends Command {
  customerId: string;
  items: OrderItem[];
}

interface UpdateOrderStatusCommand extends Command {
  status: OrderStatus;
}

// Command Handler - Business Logic Layer
class OrderCommandHandlers {
  constructor(private eventStore: EventStore) {}

  // Write Operation Handler
  async handleCreateOrder(command: CreateOrderCommand): Promise<void> {
    // 1. Validation
    this.validateCreateOrderCommand(command);
    
    // 2. Business Logic
    const order = Order.create(command.customerId, command.items);
    
    // 3. Event Generation
    const event = order.getUncommittedEvents()[0]; // OrderCreatedEvent
    
    // 4. Persistence (Write to Event Store)
    await this.eventStore.saveEvent(event);
    
    // 5. Side Effects (if any)
    await this.publishDomainEvents(order.getUncommittedEvents());
  }

  async handleUpdateOrderStatus(command: UpdateOrderStatusCommand): Promise<void> {
    // 1. Load current state (Read for Write)
    const currentOrder = await this.getOrderFromEvents(command.aggregateId);
    
    // 2. Optimistic Concurrency Check
    if (command.version && currentOrder.version !== command.version) {
      throw new ConcurrencyError('Order was modified by another process');
    }
    
    // 3. Apply business rule
    const updatedOrder = currentOrder.updateStatus(command.status);
    
    // 4. Generate event
    const event = updatedOrder.getUncommittedEvents()[0]; // OrderStatusUpdatedEvent
    
    // 5. Persist event
    await this.eventStore.saveEvent(event);
  }
}
```

**Query Side (Read Operations):**
```typescript
// QUERY PATTERN - Handles Read Operations  
interface Query {
  filters?: any;
  pagination?: PaginationOptions;
  projection?: string[];
}

interface GetOrderQuery extends Query {
  orderId: string;
  asOfVersion?: number;    // Point-in-time query
  asOfTimestamp?: Date;    // Historical query
}

interface GetOrdersQuery extends Query {
  customerId?: string;
  status?: OrderStatus;
  dateRange?: DateRange;
}

// Query Handler - Read Optimized
class OrderQueryHandlers {
  constructor(
    private eventStore: EventStore,
    private readModelStore?: ReadModelStore  // Optional read model
  ) {}

  // Single Order Query
  async handleGetOrder(query: GetOrderQuery): Promise<Order> {
    let events = await this.eventStore.getEvents(query.orderId);
    
    // Point-in-time filtering
    if (query.asOfVersion) {
      events = events.filter(e => e.version <= query.asOfVersion);
    }
    
    if (query.asOfTimestamp) {
      events = events.filter(e => e.timestamp <= query.asOfTimestamp);
    }
    
    // State reconstruction
    return this.rebuildOrderFromEvents(events);
  }

  // Multiple Orders Query (Eventually Consistent Read Model)
  async handleGetOrders(query: GetOrdersQuery): Promise<Order[]> {
    // Option 1: Real-time reconstruction (slow but consistent)
    if (this.requiresRealTimeConsistency(query)) {
      const allEvents = await this.eventStore.getAllEvents();
      const orderEvents = this.groupEventsByAggregate(allEvents);
      
      return Promise.all(
        Object.values(orderEvents).map(events => 
          this.rebuildOrderFromEvents(events)
        )
      );
    }
    
    // Option 2: Read from optimized read model (fast but eventually consistent)
    if (this.readModelStore) {
      return this.readModelStore.queryOrders(query);
    }
    
    // Fallback to event reconstruction
    return this.reconstructOrdersFromEvents(query);
  }
}
```

**CQRS Benefits:**
- **Scalability**: Read và write có thể scale independently
- **Performance**: Mỗi side được tối ưu cho use case riêng
- **Flexibility**: Read model có thể denormalized cho performance
- **Security**: Có thể implement khác nhau access control cho read/write

**CQRS Trade-offs:**
- **Complexity**: Phải maintain 2 models riêng biệt
- **Eventually Consistency**: Read model có thể lag
- **Data Duplication**: Read model có thể duplicate data từ events

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
