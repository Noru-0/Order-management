# Backend Architecture Documentation - Event Sourcing Order Management System

## 📋 Tổng quan hệ thống

Hệ thống Order Management được xây dựng theo kiến trúc **Event Sourcing** và **CQRS (Command Query Responsibility Segregation)**, sử dụng Node.js với TypeScript và Express.js framework.

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

**Order Reconstruction Logic:**
```typescript
private rebuildOrderFromEvents(events: BaseEvent[]): Order {
  let order: Order | null = null;
  
  for (const event of events) {
    switch (event.type) {
      case 'OrderCreated':
        order = new Order(/* from event data */);
        break;
      case 'OrderStatusUpdated':
        order = order.updateStatus(event.data.newStatus);
        break;
      // Handle other events...
    }
  }
  
  return order;
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

**Debug/Development:**
- `GET /api/debug/events` - Tất cả events trong system
- `GET /api/debug/orders/:id/events` - Events của order cụ thể
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
let order = null;

for (const event of events.sort((a, b) => a.version - b.version)) {
  order = applyEvent(order, event);
}

return order; // Current state
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
- **Snapshots**: (Future enhancement for performance)

### 2. CQRS Patterns
- **Command Handlers**: Separate write operations
- **Query Handlers**: Separate read operations
- **Read Models**: (Future enhancement)

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
- `/debug/stats`: System statistics
- `/health`: Health monitoring

### 3. Development Tools
- TypeScript type checking
- Console logging for development
- Error stack traces
- Event inspection utilities

## 🔄 Future Enhancements

### 1. Performance Optimizations
- **Snapshots**: Periodic state snapshots
- **Read Models**: Optimized query databases
- **Caching Layer**: Redis/Memcached integration

### 2. Advanced Features
- **Event Versioning**: Schema migration support
- **Saga Pattern**: Complex workflow orchestration
- **Event Projections**: Materialized views

### 3. Operational Improvements
- **Metrics**: Prometheus/Grafana monitoring
- **Tracing**: Distributed tracing
- **Circuit Breakers**: Resilience patterns

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

*Hệ thống này demonstrate các best practices của Event Sourcing và CQRS architecture trong một Order Management context, cung cấp foundation vững chắc cho việc mở rộng và maintenance.*
