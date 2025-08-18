# Phân tích Event Sourcing Demo - Câu hỏi 10-13

## Câu hỏi 10: Đặc tính chất lượng và sơ đồ lưu trữ

### Các đặc tính chất lượng mong muốn đạt được với Event Sourcing:

#### 1. **Auditability (Khả năng kiểm toán)**
- **Mô tả**: Lưu trữ toàn bộ lịch sử thay đổi dưới dạng sự kiện bất biến
- **Code minh họa**: `PostgresEventStore.saveEvent()` trong `postgres-event-store.ts`
```typescript
async saveEvent(event: BaseEvent): Promise<void> {
  // Lưu sự kiện với timestamp và version
  const result = await client.query(
    'SELECT * FROM append_event($1, $2, $3, $4)',
    [event.aggregateId, event.type, JSON.stringify(event.data), null]
  );
}
```

#### 2. **Recoverability (Khả năng phục hồi)**
- **Mô tả**: Có thể tái tạo lại trạng thái hệ thống từ event stream
- **Code minh họa**: `rebuildOrderFromEvents()` trong `controller.ts`
```typescript
private rebuildOrderFromEvents(events: BaseEvent[]): Order | null {
  // Replay events để tái tạo trạng thái Order
  for (const event of eventsToProcess) {
    switch (event.type) {
      case 'OrderCreated': // ...
      case 'OrderStatusUpdated': // ...
    }
  }
}
```

#### 3. **Consistency (Tính nhất quán)**
- **Mô tả**: Đảm bảo version-based concurrency control
- **Code minh họa**: `appendEvent()` với expected version check
```typescript
if (expectedVersion !== undefined) {
  const currentVersion = parseInt(versionResult.rows[0].current_version);
  if (currentVersion !== expectedVersion) {
    throw new Error(`Concurrency conflict`);
  }
}
```

#### 4. **Time Travel (Du hành thời gian)**
- **Mô tả**: Xem trạng thái hệ thống tại bất kỳ thời điểm nào
- **Code minh họa**: `rollbackOrder()` trong `controller.ts`
```typescript
if (toVersion) {
  eventsToKeep = allEvents.filter(event => event.version <= toVersion);
} else {
  const rollbackDate = new Date(toTimestamp);
  eventsToKeep = allEvents.filter(event => new Date(event.timestamp) <= rollbackDate);
}
```

### Công cụ kiểm tra chất lượng:

1. **Database integrity checks**: PostgreSQL constraints và indexes
2. **Unit testing**: Kiểm tra logic replay events
3. **API testing**: Postman/cURL cho endpoints
4. **Performance monitoring**: Database query performance
5. **Consistency validation**: Version conflict detection

### Sơ đồ lưu trữ:

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                      │
├─────────────────────────────────────────────────────────────┤
│  Events Table:                                              │
│  ┌─────────────┬──────────────┬─────────────┬─────────────┐ │
│  │ id (UUID)   │ aggregate_id │ event_type  │ event_data  │ │
│  │ version     │ timestamp    │ aggregate_  │ (JSONB)     │ │
│  │             │              │ type        │             │ │
│  └─────────────┴──────────────┴─────────────┴─────────────┘ │
│                                                             │
│  Indexes:                                                   │
│  - idx_events_aggregate_id                                  │
│  - idx_events_timestamp                                     │
│  - idx_events_event_type                                    │
│                                                             │
│  Functions:                                                 │
│  - append_event() - Atomic event appending                  │
│  - get_next_version() - Version management                  │
└─────────────────────────────────────────────────────────────┘
```

### Công cụ và bước cài đặt sơ đồ lưu trữ:

1. **PostgreSQL Setup**:
   ```bash
   # Install PostgreSQL
   # Run schema.sql
   psql -U postgres -d order_management -f schema.sql
   ```

2. **Node.js Connection Pool**:
   ```typescript
   this.pool = new Pool({
     host: config.host,
     port: config.port,
     database: config.database,
     user: config.user,
     password: config.password,
     max: 20,
     idleTimeoutMillis: 30000
   });
   ```

### Mã nguồn ghi và đọc sự kiện:

#### Ghi sự kiện:
```typescript
// File: postgres-event-store.ts
async saveEvent(event: BaseEvent): Promise<void> {
  const client = await this.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'SELECT * FROM append_event($1, $2, $3, $4)',
      [event.aggregateId, event.type, JSON.stringify(event.data), null]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

#### Đọc sự kiện:
```typescript
// File: postgres-event-store.ts
async getEvents(aggregateId: string): Promise<BaseEvent[]> {
  const client = await this.pool.connect();
  try {
    const result = await client.query(
      `SELECT aggregate_id, event_type as type, event_data as data, version, timestamp 
       FROM events 
       WHERE aggregate_id = $1 
       ORDER BY version ASC`,
      [aggregateId]
    );
    return result.rows.map(row => ({
      type: row.type,
      aggregateId: row.aggregate_id,
      data: row.data,
      timestamp: new Date(row.timestamp),
      version: row.version
    }));
  } finally {
    client.release();
  }
}
```

---

## Câu hỏi 11: Góc nhìn logic và process

### Góc nhìn Logic (Logical View):

```
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Order Aggregate:                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Order     │  │ OrderItem   │  │   OrderStatus       │  │
│  │             │  │             │  │   (Enum)            │  │
│  │ - id        │  │ - productId │  │ - PENDING           │  │
│  │ - customerId│  │ - name      │  │ - CONFIRMED         │  │
│  │ - items[]   │  │ - quantity  │  │ - SHIPPED           │  │
│  │ - status    │  │ - price     │  │ - DELIVERED         │  │
│  │ - total     │  └─────────────┘  │ - CANCELLED         │  │
│  └─────────────┘                   └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Command Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Commands:                                                  │
│  - CreateOrderCommand                                       │
│  - UpdateOrderStatusCommand                                 │
│  - AddOrderItemCommand                                      │
│  - RemoveOrderItemCommand                                   │
│                                                             │
│  Command Handlers:                                          │
│  - OrderCommandHandlers                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Event Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Events:                                                    │
│  - OrderCreatedEvent                                        │
│  - OrderStatusUpdatedEvent                                  │
│  - OrderItemAddedEvent                                      │
│  - OrderItemRemovedEvent                                    │
│  - OrderRolledBackEvent                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Event Store Interface:                                     │
│  - saveEvent()                                              │
│  - getEvents()                                              │
│  - getAllEvents()                                           │
│                                                             │
│  Implementations:                                           │
│  - PostgresEventStore                                       │
│  - InMemoryEventStore                                       │
└─────────────────────────────────────────────────────────────┘
```

### Góc nhìn Process (Process View):

```
Write Process (Command Flow):
┌─────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│ Client  │───▶│ API Layer   │───▶│ Command      │───▶│ Domain      │───▶│ Event Store │
│ Request │    │ (Express)   │    │ Handler      │    │ Logic       │    │(PostgreSQL) │
└─────────┘    └─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
                      │                  │                    │                │
                      ▼                  ▼                    ▼                ▼
                 Validation        Execute Command     Generate Event    Persist Event

Read Process (Query Flow):
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Client  │───▶│ API Layer   │───▶│ Event Store │───▶│ Event Replay │───▶│ Current     │
│ Query   │    │ (Express)   │    │(PostgreSQL) │    │ Logic        │    │ State       │
└─────────┘    └─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘
                      │                  │                    │                │
                      ▼                  ▼                    ▼                ▼
                 Route Request      Fetch Events      Rebuild State     Return Response
```

### Công cụ và bước thực hiện:

#### Cho tính năng ghi dữ liệu:
```typescript
// 1. API Layer (routes.ts)
router.post('/orders', async (req, res) => {
  await orderController.createOrder(req, res);
});

// 2. Controller (controller.ts)
async createOrder(req: Request, res: Response): Promise<void> {
  const { customerId, items } = req.body;
  const orderId = await this.commandHandlers.handleCreateOrder({
    customerId, items
  });
}

// 3. Command Handler (handlers.ts)
async handleCreateOrder(command: CreateOrderCommand): Promise<string> {
  const order = new Order(command.customerId, command.items);
  const event: OrderCreatedEvent = {
    type: 'OrderCreated',
    aggregateId: order.id,
    data: { /* order data */ }
  };
  await this.eventStore.saveEvent(event);
}

// 4. Event Store (postgres-event-store.ts)
async saveEvent(event: BaseEvent): Promise<void> {
  await client.query('SELECT * FROM append_event($1, $2, $3, $4)', [...]);
}
```

#### Cho tính năng xuất báo cáo:
```typescript
// 1. API Layer
router.get('/orders', async (req, res) => {
  await orderController.getAllOrders(req, res);
});

// 2. Controller
async getAllOrders(req: Request, res: Response): Promise<void> {
  const allEvents = await this.eventStore.getAllEvents();
  const orderMap = new Map<string, BaseEvent[]>();
  // Group events by aggregate ID
  allEvents.forEach(event => {
    if (!orderMap.has(event.aggregateId)) {
      orderMap.set(event.aggregateId, []);
    }
    orderMap.get(event.aggregateId)!.push(event);
  });
  // Rebuild orders from events
  const allOrders: Order[] = [];
  for (const [aggregateId, events] of orderMap) {
    const order = this.rebuildOrderFromEvents(events);
    if (order) allOrders.push(order);
  }
}

// 3. Event Replay
private rebuildOrderFromEvents(events: BaseEvent[]): Order | null {
  let order: Order | null = null;
  for (const event of eventsToProcess) {
    switch (event.type) {
      case 'OrderCreated':
        order = new Order(event.data.customerId, event.data.items);
        break;
      case 'OrderStatusUpdated':
        if (order) order = order.updateStatus(event.data.newStatus);
        break;
    }
  }
  return order;
}
```

---

## Câu hỏi 12: Góc nhìn triển khai (Deployment View)

### Sơ đồ triển khai:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              Production Environment                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────────────────┐  │
│  │   Web Browser   │    │   Load Balancer │    │      Application Server      │  │
│  │   (Client)      │───▶│   (nginx/HAProxy│───▶│                             │  │
│  │                 │    │    Port 80/443) │    │  ┌─────────────────────────┐ │  │
│  │ - Next.js UI    │    └─────────────────┘    │  │   Frontend (Next.js)    │ │  │
│  │ - Port 3000     │                           │  │   Port 3000             │ │  │
│  └─────────────────┘                           │  └─────────────────────────┘ │  │
│                                                │                              │  │
│                                                │  ┌─────────────────────────┐ │  │
│                                                │  │   Backend (Node.js)     │ │  │
│                                                │  │   Port 3001             │ │  │
│                                                │  │                         │ │  │
│                                                │  │ - Express.js            │ │  │
│                                                │  │ - Event Sourcing        │ │  │
│                                                │  │ - CQRS Pattern          │ │  │
│                                                │  └─────────────────────────┘ │  │
│                                                └─────────────────────────────┘   │
│                                                               │                  │
│                                                               ▼                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                        Database Server                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │  │
│  │  │                     PostgreSQL                                      │   │  │
│  │  │                     Port 5432                                       │   │  │
│  │  │                                                                     │   │  │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │  │
│  │  │  │  Events Table   │  │ Snapshots Table │  │    Indexes      │      │   │  │
│  │  │  │                 │  │   (Optional)    │  │                 │      │   │  │
│  │  │  │ - id (UUID)     │  │ - aggregate_id  │  │ - aggregate_id  │      │   │  │
│  │  │  │ - aggregate_id  │  │ - version       │  │ - timestamp     │      │   │  │
│  │  │  │ - event_type    │  │ - snapshot_data │  │ - event_type    │      │   │  │
│  │  │  │ - event_data    │  │ - timestamp     │  └─────────────────┘      │   │  │
│  │  │  │ - version       │  └─────────────────┘                           │   │  │
│  │  │  │ - timestamp     │                                                │   │  │
│  │  │  └─────────────────┘                                                │   │  │
│  │  └─────────────────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Công cụ triển khai:

1. **Container hóa**:
   ```dockerfile
   # Dockerfile cho Backend
   FROM node:18
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 3001
   CMD ["npm", "start"]
   ```

2. **Docker Compose**:
   ```yaml
   version: '3.8'
   services:
     database:
       image: postgres:15
       environment:
         POSTGRES_DB: order_management
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: password
       ports:
         - "5432:5432"
     
     backend:
       build: ./Order-management
       ports:
         - "3001:3001"
       depends_on:
         - database
     
     frontend:
       build: ./frontend
       ports:
         - "3000:3000"
       depends_on:
         - backend
   ```

3. **Kubernetes Deployment**:
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: order-management-backend
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: order-management-backend
     template:
       metadata:
         labels:
           app: order-management-backend
       spec:
         containers:
         - name: backend
           image: order-management:latest
           ports:
           - containerPort: 3001
   ```

### Bước triển khai:

1. **Local Development**:
   ```bash
   # Setup database
   scripts/database-setup.bat
   
   # Start backend
   cd Order-management && npm run dev
   
   # Start frontend
   cd frontend && pnpm dev
   ```

2. **Production Deployment**:
   ```bash
   # Build và deploy với Docker
   docker-compose up -d
   
   # Hoặc deploy lên Kubernetes
   kubectl apply -f k8s/
   ```

3. **CI/CD Pipeline**:
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Build and Deploy
           run: |
             docker build -t order-management .
             docker push registry/order-management
             kubectl apply -f k8s/
   ```

---

## Câu hỏi 13: Cơ chế tái tạo trạng thái và luồng dữ liệu

### Sơ đồ tái tạo trạng thái:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Event Replay Mechanism                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐  │
│  │   Event Store   │──▶│ Event Retrieval │───▶│      Event Sorting          │  │
│  │                 │    │                 │    │                             │  │
│  │ - OrderCreated  │    │ getEvents(id)   │    │ Sort by version ASC         │  │
│  │ - StatusUpdated │    │                 │    │ Handle rollback events      │  │
│  │ - ItemAdded     │    │                 │    │                             │  │
│  │ - ItemRemoved   │    │                 │    │                             │  │
│  │ - RolledBack    │    │                 │    │                             │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────────┘  │
│                                                              │                  │
│                                                              ▼                  │
│  ┌───────────────────────────────────────────────────────────────────────────── │
│  │                         Event Processing Logic                             │ │
│  │                                                                            │ │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │ │
│  │  │ Rollback Check  │──▶│  Filter Events  │───▶│    Apply Events         │ │ │
│  │  │                 │    │                 │    │                         │ │ │
│  │  │ Find latest     │    │ Remove skipped  │    │ switch(event.type) {    │ │ │
│  │  │ rollback event  │    │ versions based  │    │   case 'OrderCreated':  │ │ │
│  │  │                 │    │ on rollback     │    │   case 'StatusUpdated': │ │ │
│  │  │                 │    │ criteria        │    │   case 'ItemAdded':     │ │ │
│  │  │                 │    │                 │    │   case 'ItemRemoved':   │ │ │
│  │  │                 │    │                 │    │ }                       │ │ │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                              │                  │
│                                                              ▼                  │
│  ┌─────────────────┐                                         │
│  │ Current State   │◀───────────────────────────────────────┘                  │
│  │                 │                                                            │
│  │ Order {         │                                                            │
│  │   id: string    │                                                            │
│  │   customerId    │                                                            │
│  │   items[]       │                                                            │
│  │   status        │                                                            │
│  │   totalAmount   │                                                            │
│  │ }               │                                                            │
│  └─────────────────┘                                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Luồng dữ liệu từ sự kiện ban đầu đến trạng thái cuối cùng:

```
Event Stream Timeline:
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│  Version 1: OrderCreated                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ {                                                                       │   │
│  │   type: "OrderCreated",                                                 │   │
│  │   data: {                                                               │   │
│  │     orderId: "order-123",                                               │   │
│  │     customerId: "customer-001",                                         │   │
│  │     items: [{ productId: "laptop", quantity: 1, price: 1500 }],         │   │
│  │     status: "PENDING"                                                   │   │
│  │   }                                                                     │   │
│  │ }                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                           │
│                                    ▼                                           │
│                          Initial State: Order(PENDING)                         │
│                                    │                                           │
│                                    ▼                                           │
│  Version 2: OrderStatusUpdated                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ {                                                                       │   │
│  │   type: "OrderStatusUpdated",                                           │   │
│  │   data: {                                                               │   │
│  │     orderId: "order-123",                                               │   │
│  │     oldStatus: "PENDING",                                               │   │
│  │     newStatus: "CONFIRMED"                                              │   │
│  │   }                                                                     │   │
│  │ }                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                           │
│                                    ▼                                           │
│                          Updated State: Order(CONFIRMED)                       │
│                                    │                                           │
│                                    ▼                                           │
│  Version 3: OrderItemAdded                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ {                                                                       │   │
│  │   type: "OrderItemAdded",                                               │   │
│  │   data: {                                                               │   │
│  │     orderId: "order-123",                                               │   │
│  │     item: { productId: "mouse", quantity: 1, price: 25 }                │   │
│  │   }                                                                     │   │
│  │ }                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                           │
│                                    ▼                                           │
│                    Updated State: Order(CONFIRMED, 2 items)                    │
│                                    │                                           │
│                                    ▼                                           │
│  Version 4: OrderRolledBack (to Version 2)                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ {                                                                       │   │
│  │   type: "OrderRolledBack",                                              │   │
│  │   data: {                                                               │   │
│  │     rollbackType: "version",                                            │   │
│  │     rollbackValue: 2,                                                   │   │
│  │     eventsUndone: 1                                                     │   │
│  │   }                                                                     │   │
│  │ }                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                           │
│                                    ▼                                           │
│              Final State: Order(CONFIRMED, 1 item) - Rolled back               │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Công cụ và bước thực hiện tái tạo trạng thái:

#### 1. **Event Retrieval**:
```typescript
// Lấy tất cả events cho một aggregate
const events = await eventStore.getEvents(orderId);
```

#### 2. **Event Processing**:
```typescript
private rebuildOrderFromEvents(events: BaseEvent[]): Order | null {
  // Bước 1: Sắp xếp events theo version
  const sortedEvents = [...events].sort((a, b) => a.version - b.version);
  
  // Bước 2: Xử lý rollback events
  const rollbackEvents = sortedEvents.filter(e => e.type === 'OrderRolledBack');
  const latestRollback = rollbackEvents.length > 0
    ? rollbackEvents.reduce((latest, current) =>
        current.version > latest.version ? current : latest)
    : null;

  // Bước 3: Lọc events cần xử lý
  let eventsToProcess = sortedEvents;
  if (latestRollback) {
    const rollbackData = latestRollback.data;
    const nonRollbackEvents = sortedEvents.filter(e => e.type !== 'OrderRolledBack');
    
    if (rollbackData.rollbackType === 'version') {
      const finalVersion = this.resolveNestedRollbackVersion(sortedEvents, rollbackData.rollbackValue);
      const eventsBeforeRollback = nonRollbackEvents.filter(e => e.version <= finalVersion);
      const eventsAfterRollback = nonRollbackEvents.filter(e => e.version > latestRollback.version);
      eventsToProcess = [...eventsBeforeRollback, ...eventsAfterRollback].sort((a, b) => a.version - b.version);
    }
  }

  // Bước 4: Apply events để tái tạo state
  let order: Order | null = null;
  for (const event of eventsToProcess) {
    switch (event.type) {
      case 'OrderCreated':
        order = new Order(event.data.customerId, event.data.items, event.data.status, event.data.orderId);
        break;
      case 'OrderStatusUpdated':
        if (order) order = order.updateStatus(event.data.newStatus);
        break;
      case 'OrderItemAdded':
        if (order) order = order.addItem(event.data.item);
        break;
      case 'OrderItemRemoved':
        if (order) order = order.removeItem(event.data.productId);
        break;
    }
  }
  
  return order;
}
```

#### 3. **Rollback Handling**:
```typescript
private resolveNestedRollbackVersion(events: BaseEvent[], rollbackVersion: number): number {
  const versionMap = new Map(events.map(e => [e.version, e]));
  let currentVersion = rollbackVersion;

  // Xử lý nested rollbacks
  while (true) {
    const event = versionMap.get(currentVersion);
    if (!event || event.type !== 'OrderRolledBack') break;
    
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

#### 4. **Performance Optimization Tools**:

1. **Database Indexes**: 
   - `idx_events_aggregate_id` cho truy vấn nhanh theo Order ID
   - `idx_events_timestamp` cho time-based queries

2. **Connection Pooling**:
   ```typescript
   this.pool = new Pool({
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

3. **Caching Strategy** (future enhancement):
   - Snapshot mechanism để giảm số events cần replay
   - Redis cache cho frequent queries

4. **Monitoring Tools**:
   - Health check endpoint: `/health`
   - Database stats: `/api/debug/stats`
   - Event inspection: `/api/debug/events`

#### 5. **Testing Tools**:
```bash
# Test event replay
curl http://localhost:3001/api/orders/order-123

# Test rollback mechanism  
curl -X POST http://localhost:3001/api/debug/orders/order-123/rollback \
  -H "Content-Type: application/json" \
  -d '{"toVersion": 2}'

# Inspect events
curl http://localhost:3001/api/debug/orders/order-123/events
```

Toàn bộ cơ chế này đảm bảo rằng trạng thái hiện tại của hệ thống có thể được tái tạo một cách chính xác từ event stream, đồng thời hỗ trợ các tính năng nâng cao như rollback và time travel.
