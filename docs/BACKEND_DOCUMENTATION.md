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

## 🎯 Core Principles

### 1. Event Sourcing
- **Định nghĩa**: Lưu trữ tất cả thay đổi dưới dạng sequence của events thay vì state hiện tại
- **Lợi ích**: Complete audit trail, time travel, replay capability, debugging ease

### 2. CQRS (Command Query Responsibility Segregation)
- **Commands**: Thay đổi state (Create, Update, Delete operations)
- **Queries**: Đọc data (Get operations)
- **Separation**: Commands và Queries được xử lý riêng biệt

### 3. Domain-Driven Design (DDD)
- **Aggregate**: Order là aggregate root
- **Events**: Domain events mô tả business changes
- **Value Objects**: OrderItem, OrderStatus

## 📦 Chi tiết từng layer

### 1. Entry Point (`src/index.ts`)

**Chức năng chính:**
- Application bootstrap và configuration
- Database connection management
- Middleware setup
- Graceful shutdown handling

**Key Features:**
```typescript
// Database fallback strategy
if (usePostgres) {
  eventStore = new PostgresEventStore(dbConfig);
  // Falls back to InMemoryEventStore on connection failure
} else {
  eventStore = new InMemoryEventStore();
}

// Dependency injection
const commandHandlers = new OrderCommandHandlers(eventStore);
const orderController = new OrderController(commandHandlers, eventStore);
```

**Environment Variables:**
- `PORT`: Server port (default: 3001)
- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_NAME`: Database name (default: order_management)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password

### 2. Domain Layer (`src/domain/Order.ts`)

**Order Aggregate:**
```typescript
export class Order {
  public readonly id: string;
  public readonly customerId: string;
  public readonly items: OrderItem[];
  public readonly status: OrderStatus;
  public readonly totalAmount: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
}
```

**Business Rules:**
- Order ID tự động generate bằng UUID
- Total amount tự động tính từ items
- Immutable objects (functional approach)
- Status transitions theo business logic

**Value Objects:**
```typescript
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
```

### 3. Events Layer (`src/events/types.ts`)

**Base Event Interface:**
```typescript
export interface BaseEvent {
  type: string;           // Event type identifier
  aggregateId: string;    // Order ID (aggregate root)
  version: number;        // Event version for ordering
  timestamp: Date;        // When event occurred
  data: any;             // Event payload
}
```

**Domain Events:**
- `OrderCreatedEvent`: Khi order được tạo
- `OrderStatusUpdatedEvent`: Khi status thay đổi
- `OrderItemAddedEvent`: Khi thêm item
- `OrderItemRemovedEvent`: Khi xóa item
- `OrderRolledBackEvent`: **[NEW]** Khi thực hiện rollback operation

**Event Data Structure:**
```typescript
export interface OrderCreatedEvent extends BaseEvent {
  type: 'OrderCreated';
  data: {
    orderId: string;
    customerId: string;
    items: OrderItem[];
    status: OrderStatus;
    totalAmount: number;
  };
}

// NEW: Rollback Event Structure
export interface OrderRolledBackEvent extends BaseEvent {
  type: 'OrderRolledBack';
  data: {
    orderId: string;
    rollbackPoint: string;        // "Version X" or "Timestamp Y"
    rollbackType: 'version' | 'timestamp';
    rollbackValue: number | string;
    eventsUndone: number;        // Số events bị undo
    previousState: any;          // State trước rollback
    newState: any;              // State sau rollback
  };
}
```

### 4. Command Layer (`src/commands/handlers.ts`)

**Command Interfaces:**
```typescript
export interface CreateOrderCommand {
  customerId: string;
  items: OrderItem[];
}

export interface UpdateOrderStatusCommand {
  orderId: string;
  status: OrderStatus;
}
```

**Command Handlers:**
- `handleCreateOrder()`: Tạo order mới
- `handleUpdateOrderStatus()`: Cập nhật status
- `handleAddOrderItem()`: Thêm item
- `handleRemoveOrderItem()`: Xóa item

**Event Publishing Pattern:**
```typescript
async handleCreateOrder(command: CreateOrderCommand): Promise<string> {
  const order = new Order(command.customerId, command.items);
  
  const event: OrderCreatedEvent = {
    type: 'OrderCreated',
    aggregateId: order.id,
    version: 1,
    timestamp: new Date(),
    data: { /* order data */ }
  };

  await this.eventStore.saveEvent(event);
  return order.id;
}
```

### 5. Infrastructure Layer (`src/infrastructure/`)

#### Event Store Interface
```typescript
export interface EventStore {
  saveEvent(event: BaseEvent): Promise<void>;
  getEvents(aggregateId: string): Promise<BaseEvent[]>;
  getAllEvents(): Promise<BaseEvent[]>;
}
```

#### In-Memory Implementation
- Development/testing usage
- Simple array-based storage
- No persistence across restarts

#### PostgreSQL Implementation
**Features:**
- Production-ready persistence
- Database functions for event appending
- Connection pooling với pg library
- Transaction support
- Health checks & statistics

**Database Schema:**
```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    version INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE FUNCTION append_event(
    p_aggregate_id VARCHAR(255),
    p_event_type VARCHAR(255),
    p_event_data JSONB,
    p_expected_version INTEGER DEFAULT NULL
) RETURNS TABLE(event_id INTEGER, version INTEGER);
```

### 6. API Layer (`src/api/`)

#### Controller (`controller.ts`)
**Responsibilities:**
- Request/Response handling
- Event sourcing query logic
- Order reconstruction from events
- Error handling & response formatting

**Key Methods:**
- `createOrder()`: Create new order
- `getOrder()`: Rebuild order from events
- `updateOrderStatus()`: Update order status
- `addOrderItem()`/`removeOrderItem()`: Manage order items
- `getAllOrders()`: Get all orders (reconstructed)
- `getAllEvents()`/`getOrderEvents()`: Debug endpoints
- `getDatabaseStats()`: System statistics
- `rollbackOrder()`: **[NEW]** Rollback order to specific version/timestamp
- `debugSkippedVersions()`: **[NEW]** Get skipped versions information

**Enhanced Order Reconstruction with Rollback Support:**
```typescript
private rebuildOrderFromEvents(events: BaseEvent[]): Order {
  const sortedEvents = [...events].sort((a, b) => a.version - b.version);
  
  // Find latest rollback event
  const rollbackEvents = sortedEvents.filter(e => e.type === 'OrderRolledBack');
  const latestRollback = rollbackEvents.length > 0
    ? rollbackEvents.reduce((latest, current) =>
        current.version > latest.version ? current : latest)
    : null;

  // Process events considering rollback
  let eventsToProcess = sortedEvents;
  
  if (latestRollback) {
    const rollbackData = latestRollback.data;
    const nonRollbackEvents = sortedEvents.filter(e => e.type !== 'OrderRolledBack');

    if (rollbackData.rollbackType === 'version') {
      const finalVersion = this.resolveNestedRollbackVersion(sortedEvents, rollbackData.rollbackValue);
      eventsToProcess = nonRollbackEvents.filter(e => e.version <= finalVersion);
    } else if (rollbackData.rollbackType === 'timestamp') {
      const rollbackDate = new Date(rollbackData.rollbackValue);
      eventsToProcess = nonRollbackEvents.filter(e =>
        new Date(e.timestamp) <= rollbackDate
      );
    }
  }
  
  // Apply events to rebuild order state
  let order: Order | null = null;
  for (const event of eventsToProcess) {
    order = applyEvent(order, event);
  }
  
  return order;
}
```

**Rollback Protection Logic:**
```typescript
// Validate against skipped versions
private getSkippedVersions(events: BaseEvent[]): number[] {
  const skippedVersions: number[] = [];
  const rollbackEvents = events.filter(e => e.type === 'OrderRolledBack');
  
  for (const rollbackEvent of rollbackEvents) {
    const rollbackData = rollbackEvent.data;
    
    if (rollbackData.rollbackType === 'version') {
      const rollbackToVersion = rollbackData.rollbackValue;
      const rollbackFromVersion = rollbackEvent.version - 1;
      
      // Mark versions between rollbackTo and rollbackFrom as skipped
      for (let v = rollbackToVersion + 1; v <= rollbackFromVersion; v++) {
        if (!skippedVersions.includes(v)) {
          skippedVersions.push(v);
        }
      }
    }
  }
  
  return skippedVersions.sort((a, b) => a - b);
}

// Validation in rollbackOrder method
if (toVersion) {
  const skippedVersions = this.getSkippedVersions(allEvents);
  if (skippedVersions.includes(toVersion)) {
    throw new Error(`Cannot rollback to version ${toVersion} - was skipped by previous rollback`);
  }
}
```

#### Routes (`routes.ts`)
**API Endpoints:**

**Order Management:**
- `POST /api/orders` - Tạo order mới
- `GET /api/orders/:id` - Lấy order theo ID
- `GET /api/orders` - Lấy tất cả orders
- `PUT /api/orders/:id/status` - Cập nhật status
- `POST /api/orders/:id/items` - Thêm item
- `DELETE /api/orders/:id/items/:productId` - Xóa item

**Event Sourcing & Rollback (NEW):**
- `POST /api/debug/orders/:id/rollback` - **[NEW]** Rollback order to version/timestamp
- `GET /api/debug/orders/:id/skipped-versions` - **[NEW]** Get skipped versions info

**Debug/Development:**
- `GET /api/debug/events` - Tất cả events trong system
- `GET /api/debug/orders/:id/events` - Events của order cụ thể
- `GET /api/debug/orders/:id/rebuild` - Debug order reconstruction
- `GET /api/debug/stats` - Database statistics

**System:**
- `GET /health` - Health check endpoint

#### Middleware (`middleware.ts`)
**Validation Middleware:**
- `validateCreateOrder()`: Validate order creation
- `validateUpdateOrderStatus()`: Validate status updates
- Input sanitization và type checking

**Cross-cutting Concerns:**
- `corsMiddleware`: CORS handling
- `requestLogger`: Request logging
- `errorHandler`: Global error handling

**Error Response Format:**
```typescript
{
  success: false,
  error: "Error message",
  details?: ValidationError[]
}
```

## 🔄 Data Flow

### 1. Command Flow (Write Operations)
```
Client Request → Controller → Command Handler → Domain Logic → Event Store → Response
```

**Example - Create Order:**
1. `POST /api/orders` với order data
2. `OrderController.createOrder()` nhận request
3. Validate input via middleware
4. Gọi `OrderCommandHandlers.handleCreateOrder()`
5. Tạo `Order` domain object
6. Generate `OrderCreatedEvent`
7. Lưu event vào `EventStore`
8. Trả về order ID

### 2. Query Flow (Read Operations)
```
Client Request → Controller → Event Store → Event Replay → Domain Reconstruction → Response
```

**Example - Get Order:**
1. `GET /api/orders/:id`
2. `OrderController.getOrder()` nhận request
3. Load events từ `EventStore.getEvents(id)`
4. Replay events để rebuild Order state
5. Trả về current Order state

## 📊 Event Store Operations

### 1. Event Persistence
**PostgreSQL:**
- Events stored in `events` table
- JSONB for flexible event data
- Atomic operations với transactions
- Version-based concurrency control

**In-Memory:**
- Simple array storage
- Immediate consistency
- No persistence (development only)

### 2. Event Retrieval
- **By Aggregate ID**: Get all events for specific order
- **All Events**: Get entire event log (debugging)
- **By Type**: Filter events by type
- **Ordered by**: Timestamp và version

### 3. Event Replay
```typescript
const events = await eventStore.getEvents(orderId);

// NEW: Enhanced replay with rollback support
const sortedEvents = [...events].sort((a, b) => a.version - b.version);
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
    eventsToProcess = nonRollbackEvents.filter(e => e.version <= rollbackData.rollbackValue);
  } else if (rollbackData.rollbackType === 'timestamp') {
    const rollbackDate = new Date(rollbackData.rollbackValue);
    eventsToProcess = nonRollbackEvents.filter(e =>
      new Date(e.timestamp) <= rollbackDate
    );
  }
}

let order = null;
for (const event of eventsToProcess) {
  order = applyEvent(order, event);
}

return order; // Current state (after considering rollbacks)
```

### 4. Rollback Operations (NEW)
**Rollback Types:**
- **Version-based**: Rollback về specific event version
- **Timestamp-based**: Rollback về specific point in time

**Rollback Metadata:**
```typescript
{
  rollbackPoint: "Version 4",
  rollbackType: "version",
  rollbackValue: 4,
  eventsUndone: 4,           // v5, v6, v7, v8 bị undo
  previousState: {           // State trước rollback
    status: "DELIVERED",
    totalAmount: 2500,
    itemCount: 5
  },
  newState: {               // State sau rollback
    status: "CONFIRMED", 
    totalAmount: 1500,
    itemCount: 3
  }
}
```

**Skipped Version Tracking:**
```typescript
// Sau khi rollback v8→v4, versions [5,6,7] bị "skip"
// Không thể rollback về các version này nữa
function getSkippedVersions(events: BaseEvent[]): number[] {
  const skippedVersions: number[] = [];
  const rollbackEvents = events.filter(e => e.type === 'OrderRolledBack');
  
  for (const rollback of rollbackEvents) {
    if (rollback.data.rollbackType === 'version') {
      const from = rollback.version - 1;  // Version trước rollback
      const to = rollback.data.rollbackValue;
      
      // Versions từ (to+1) đến from bị skip
      for (let v = to + 1; v <= from; v++) {
        if (!skippedVersions.includes(v)) {
          skippedVersions.push(v);
        }
      }
    }
  }
  
  return skippedVersions.sort();
}
```

## 🛡️ Error Handling

### 1. Validation Errors
- Input validation tại middleware layer
- Structured error responses
- Field-level validation messages

### 2. Business Logic Errors
- Domain rule violations
- Concurrency conflicts
- Invalid state transitions

### 3. Infrastructure Errors
- Database connection issues
- Event store failures
- Network timeouts

### 4. Global Error Handling
```typescript
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});
```

## 🔧 Configuration & Deployment

### 1. Environment Configuration
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=order_management
DB_USER=postgres
DB_PASSWORD=password

# Application
PORT=3001
NODE_ENV=production
```

### 2. Database Setup
```bash
# Run setup script
./database/setup.ps1

# Or manual setup
psql -U postgres -f ./database/schema.sql
```

### 3. Application Startup
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 🎯 Patterns & Best Practices

### 1. Event Sourcing Patterns
- **Event Store**: Central event persistence
- **Aggregate Rebuilding**: Replay events to reconstruct state
- **Event Versioning**: Handle schema evolution
- **[NEW] Rollback Protection**: Prevent invalid rollback operations
- **[NEW] Skipped Version Tracking**: Maintain rollback history integrity
- **Snapshots**: (Future enhancement for performance)

### 2. CQRS Patterns
- **Command Handlers**: Separate write operations
- **Query Handlers**: Separate read operations
- **[NEW] Rollback Commands**: Special operations for time travel
- **Read Models**: (Future enhancement)

### 3. Rollback Patterns (NEW)
- **Time Travel**: Navigate to any valid point in event history
- **Version Protection**: Prevent rollback to invalidated states
- **Audit Trail**: Complete record of rollback operations
- **State Snapshots**: Capture before/after rollback states

**Rollback Pattern Example:**
```typescript
// Valid rollback scenario
Events: [v1: Created, v2: Item+, v3: Status+, v4: Item+, v5: Status+]
Current state: Built from v1-v5

Rollback v5 → v3:
- Keep: [v1, v2, v3]
- Skip: [v4, v5] 
- Create: v6: RolledBack{to: v3, skipped: [4,5]}
- Result: State from v1-v3, versions 4,5 become invalid

Future rollback attempts to v4 or v5: BLOCKED
```

### 3. Domain-Driven Design
- **Aggregates**: Order as aggregate root
- **Value Objects**: Immutable data structures
- **Domain Events**: Express business occurrences

### 4. API Design
- **RESTful endpoints**: Clear resource-based URLs
- **Consistent responses**: Standardized success/error format
- **Validation**: Input validation at API boundary
- **Error handling**: Proper HTTP status codes

## 🚀 Performance Considerations

### 1. Event Store Performance
- **Indexing**: Aggregate ID và timestamp indexes
- **Connection Pooling**: Efficient database connections
- **Batch Operations**: (Future enhancement)

### 2. Query Performance
- **Event Replay Optimization**: Version-based sorting
- **Caching**: (Future enhancement for read models)
- **Pagination**: For large event streams

### 3. Scalability
- **Horizontal Scaling**: Stateless application design
- **Event Store Sharding**: (Future enhancement)
- **Read Replicas**: Database read scaling

## 🔍 Monitoring & Debugging

### 1. Logging
- Request/response logging
- Error tracking
- Event store operations
- Performance metrics

### 2. Debug Endpoints
- `/debug/events`: Inspect all events
- `/debug/orders/:id/events`: Order-specific events
- `/debug/orders/:id/rebuild`: Debug order reconstruction  
- `/debug/orders/:id/skipped-versions`: **[NEW]** Rollback analysis
- `/debug/stats`: System statistics
- `/health`: Health monitoring

**Enhanced Debug Response Example:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-123",
    "totalEvents": 9,
    "totalRollbacks": 2,
    "skippedVersions": [5, 6, 7],
    "availableVersions": [1, 2, 3, 4, 8, 9],
    "rollbackHistory": [
      {
        "version": 8,
        "rollbackType": "version", 
        "rollbackValue": 4,
        "timestamp": "2025-07-15T10:30:00Z"
      }
    ]
  }
}
```

### 3. Development Tools
- TypeScript type checking
- Console logging for development
- Error stack traces
- Event inspection utilities

## 🔄 Future Enhancements

### 1. Performance Optimizations
- **Snapshots**: Periodic state snapshots to avoid full replay
- **Read Models**: Optimized query databases
- **Caching Layer**: Redis/Memcached integration
- **[NEW] Rollback Optimization**: Cache skipped versions calculation

### 2. Advanced Features
- **Event Versioning**: Schema migration support
- **Saga Pattern**: Complex workflow orchestration
- **Event Projections**: Materialized views
- **[NEW] Advanced Rollback**: Branching/merging rollback operations
- **[NEW] Rollback Policies**: Configurable rollback restrictions

### 3. Operational Improvements
- **Metrics**: Prometheus/Grafana monitoring
- **Tracing**: Distributed tracing
- **Circuit Breakers**: Resilience patterns
- **[NEW] Rollback Analytics**: Usage patterns and performance metrics

### 4. Event Sourcing Enhancements (NEW)
- **Rollback Workflows**: Complex multi-step rollback operations
- **Version Branching**: Support for parallel timelines
- **Rollback Permissions**: Role-based rollback access control
- **Automatic Rollback**: Triggered rollbacks on error conditions

## 📚 Dependencies

### Core Dependencies
- **express**: Web framework
- **pg**: PostgreSQL client
- **uuid**: ID generation
- **dotenv**: Environment configuration

### Development Dependencies  
- **typescript**: Type checking
- **@types/express**: Express types
- **@types/pg**: PostgreSQL types
- **@types/uuid**: UUID types

## 🏃‍♂️ Getting Started

1. **Install dependencies**: `npm install`
2. **Setup database**: Run `./database/setup.ps1`
3. **Configure environment**: Copy `.env.example` to `.env`
4. **Start development**: `npm run dev`
5. **Test API**: Use demo scripts hoặc frontend UI

---

## 🎯 Rollback Protection - Technical Deep Dive

### Scenario Analysis

**Initial State:**
```
Events: [v1:Created, v2:Item+, v3:Status+, v4:Item+, v5:Status+, v6:Item+, v7:Status+, v8:Item+]
Current Order: Built from all events (v1-v8)
```

**Rollback Operation: v8 → v4**
```typescript
POST /api/debug/orders/order-123/rollback
{
  "toVersion": 4
}

// Result:
// - Events kept: [v1, v2, v3, v4]
// - Events undone: [v5, v6, v7, v8] 
// - New event: v9:RolledBack{to:v4, undone:[5,6,7,8]}
// - Skipped versions: [5, 6, 7, 8]
// - Current state: Rebuilt from [v1, v2, v3, v4]
```

**Protected Rollback Attempts:**
```typescript
// ❌ BLOCKED - Version 6 was skipped
POST /api/debug/orders/order-123/rollback
{
  "toVersion": 6
}
// Response: 400 Bad Request
// "Cannot rollback to version 6 because it was skipped by a previous rollback"

// ✅ ALLOWED - Version 3 is still valid
POST /api/debug/orders/order-123/rollback  
{
  "toVersion": 3
}
// Result: Creates v10:RolledBack{to:v3, undone:[4]}
// Additional skipped version: [4]
```

### Algorithm Implementation

**Skipped Version Calculation:**
```typescript
function getSkippedVersions(events: BaseEvent[]): number[] {
  const skippedVersions: number[] = [];
  const rollbackEvents = events.filter(e => e.type === 'OrderRolledBack');
  
  for (const rollbackEvent of rollbackEvents) {
    const rollbackData = rollbackEvent.data;
    
    if (rollbackData.rollbackType === 'version') {
      const rollbackToVersion = rollbackData.rollbackValue;      // Target version
      const rollbackFromVersion = rollbackEvent.version - 1;     // Version before rollback
      
      // All versions between target and source (exclusive) are skipped
      for (let v = rollbackToVersion + 1; v <= rollbackFromVersion; v++) {
        if (!skippedVersions.includes(v)) {
          skippedVersions.push(v);
        }
      }
    } else if (rollbackData.rollbackType === 'timestamp') {
      // For timestamp rollbacks, calculate equivalent version range
      const rollbackTimestamp = new Date(rollbackData.rollbackValue);
      const rollbackFromVersion = rollbackEvent.version - 1;
      
      const eventsBeforeTimestamp = events.filter(e => 
        e.type !== 'OrderRolledBack' && 
        new Date(e.timestamp) <= rollbackTimestamp
      );
      
      const highestValidVersion = eventsBeforeTimestamp.length > 0 
        ? Math.max(...eventsBeforeTimestamp.map(e => e.version))
        : 0;
      
      for (let v = highestValidVersion + 1; v <= rollbackFromVersion; v++) {
        if (!skippedVersions.includes(v)) {
          skippedVersions.push(v);
        }
      }
    }
  }
  
  return skippedVersions.sort((a, b) => a - b);
}
```

**Nested Rollback Resolution:**
```typescript
function resolveNestedRollbackVersion(events: BaseEvent[], rollbackVersion: number): number {
  const versionMap = new Map(events.map(e => [e.version, e]));
  let currentVersion = rollbackVersion;

  // Follow rollback chain to find final target
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
```

### Data Integrity Guarantees

1. **Immutability**: Original events never modified, rollback creates new events
2. **Auditability**: Complete rollback history preserved in event stream  
3. **Consistency**: Skipped versions consistently blocked across all operations
4. **Determinism**: Same event sequence always produces same result
5. **Reversibility**: Rollback operations themselves can be rolled back

*Hệ thống này demonstrate các best practices của Event Sourcing và CQRS architecture với enhanced rollback protection, cung cấp foundation vững chắc cho việc mở rộng và maintenance trong các enterprise applications.*
