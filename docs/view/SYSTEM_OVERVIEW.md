# Event Sourcing Order Management System - Tổng quan Hệ thống

## 🎯 Giới thiệu Hệ thống

**Event Sourcing Order Management System** là một hệ thống quản lý đơn hàng hiện đại được xây dựng dựa trên Event Sourcing pattern và CQRS (Command Query Responsibility Segregation). Thay vì chỉ lưu trữ trạng thái hiện tại của đơn hàng, hệ thống lưu trữ toàn bộ lịch sử thay đổi dưới dạng các events bất biến, cho phép tái tạo lại bất kỳ trạng thái nào trong quá khứ và cung cấp khả năng audit trail hoàn chỉnh.

### Đặc điểm Nổi bật
- 🔄 **Event Sourcing**: Lưu trữ toàn bộ lịch sử thay đổi
- 🎭 **CQRS Pattern**: Tách biệt operations đọc và ghi
- ⏰ **Time Travel**: Rollback về bất kỳ thời điểm nào
- 📊 **Complete Audit Trail**: Theo dõi đầy đủ mọi thay đổi
- 🔍 **Traceability**: Truy vết nguồn gốc mọi modification
- 🏗️ **Scalable Architecture**: Thiết kế hỗ trợ mở rộng

---

## 🏗️ Kiến trúc Tổng quan

### High-Level Architecture
```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐    Database    ┌─────────────────┐
│   Frontend      │ ←────────────→  │   Backend API   │ ←─────────────→ │   PostgreSQL    │
│   (Next.js)     │                 │   (Express.js)  │                │   Event Store   │
│   Port 3000     │                 │   Port 3001     │                │   Port 5432     │
└─────────────────┘                 └─────────────────┘                └─────────────────┘
```

### Technology Stack
| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, React, TypeScript | User interface và real-time updates |
| **Backend API** | Express.js, TypeScript | RESTful API và business logic |
| **Event Store** | PostgreSQL 15+ | Persistent event storage |
| **Domain** | TypeScript Classes | Business logic và domain rules |
| **Infrastructure** | Docker, Node.js 18+ | Deployment và runtime environment |

---

## 🔧 Kiến trúc Chi tiết

### 1. Frontend Layer - Web Client
**Technology**: Next.js 14 với TypeScript
**Responsibilities**:
- Interactive user interface cho order management
- Real-time display của orders và events
- Demo Event Sourcing capabilities
- Client-side state management

**Key Components**:
- `OrderManagementDemo`: Main UI component
- `ApiClient`: HTTP client cho backend communication
- Real-time updates và error handling

### 2. API Layer - Backend Services
**Technology**: Express.js với TypeScript
**Responsibilities**:
- RESTful API endpoints
- Request validation và error handling
- HTTP request/response processing
- Middleware coordination

**Key Components**:
- **API Router**: Route management và middleware
- **Order Controller**: HTTP request handling
- **Validation Middleware**: Input validation và sanitization
- **Error Handler**: Centralized error processing

### 3. Application Layer - Business Logic
**Technology**: TypeScript Classes và Interfaces
**Responsibilities**:
- Command processing (write operations)
- Query processing (read operations)
- Business rule enforcement
- Event generation và handling

**Key Components**:
- **Command Handlers**: Process write operations
  - CreateOrder, UpdateOrderStatus, AddOrderItem, RemoveOrderItem
- **Query Handlers**: Process read operations
  - GetOrder, GetAllOrders, GetOrderEvents
- **Event Processors**: Handle domain events và state reconstruction

### 4. Domain Layer - Core Business Logic
**Technology**: Pure TypeScript classes
**Responsibilities**:
- Core business entities và logic
- Domain rules enforcement
- Immutable state management
- Business invariants validation

**Key Components**:
- **Order Aggregate**: Main business entity
- **Order Item**: Value object cho order items
- **Order Status**: Enum cho order states
- **Domain Events**: Business event definitions

### 5. Infrastructure Layer - Event Store
**Technology**: PostgreSQL với custom implementations
**Responsibilities**:
- Event persistence và retrieval
- Transaction management
- Concurrency control
- Storage abstraction

**Key Components**:
- **Event Store Interface**: Abstract contract
- **PostgreSQL Event Store**: Production implementation
- **In-Memory Event Store**: Development/testing implementation
- **Database Schema**: Event storage structure

### 6. Database Layer - Persistent Storage
**Technology**: PostgreSQL 15+ với JSONB support
**Responsibilities**:
- Durable event storage
- ACID transaction guarantees
- Query performance optimization
- Data integrity enforcement

**Key Components**:
- **Events Table**: Core event storage
- **Snapshots Table**: Performance optimization (future)
- **Database Functions**: Stored procedures cho event operations
- **Indexes**: Performance optimization

---

## 📊 Event Sourcing Pattern Implementation

### Event Flow
```
1. Command Received → 2. Business Logic → 3. Event Generated → 4. Event Stored → 5. State Updated
     ↑                                                                                    ↓
     └─────────────────────── Response Sent ←───────────────────────────────────────────┘
```

### Key Event Types
| Event Type | Purpose | Data Stored |
|------------|---------|-------------|
| `OrderCreated` | New order creation | Customer ID, items, initial status |
| `OrderStatusUpdated` | Status changes | Old status, new status, reason |
| `OrderItemAdded` | Item additions | Product details, quantity, price |
| `OrderItemRemoved` | Item removals | Product ID, removal reason |
| `OrderRolledBack` | State rollbacks | Target version/timestamp, affected events |

### State Reconstruction Process
1. **Load Events**: Retrieve all events cho specific aggregate
2. **Sort Events**: Order by version/timestamp
3. **Apply Events**: Replay events sequentially
4. **Handle Rollbacks**: Skip rolled-back events
5. **Build State**: Construct current object state

---

## 🎭 CQRS Implementation

### Command Side (Write Operations)
- **Purpose**: Handle state-changing operations
- **Components**: Command Handlers, Domain Logic, Event Store
- **Operations**: Create, Update, Delete operations
- **Focus**: Consistency, business rules, event generation

### Query Side (Read Operations)  
- **Purpose**: Handle data retrieval operations
- **Components**: Query Handlers, Event Replay, State Reconstruction
- **Operations**: Get, List, Search operations
- **Focus**: Performance, user experience, data presentation

### Benefits
- **Scalability**: Independent scaling của read/write operations
- **Performance**: Optimized cho specific use cases
- **Complexity Separation**: Clear separation of concerns
- **Flexibility**: Different data models cho read/write

---

## 🔄 Rollback Capabilities

### Rollback Types
1. **Version-based Rollback**: Rollback to specific event version
2. **Timestamp-based Rollback**: Rollback to specific point in time
3. **Nested Rollback**: Handle cascading rollback scenarios

### Rollback Process
1. **Identify Target**: Determine rollback point (version/timestamp)
2. **Validate Request**: Check permissions và business rules
3. **Generate Rollback Event**: Create OrderRolledBack event
4. **Update State**: Mark affected events as "undone"
5. **Reconstruct State**: Rebuild current state excluding rolled-back events

### Rollback Constraints
- Cannot rollback to future versions
- Requires appropriate permissions
- Must maintain data consistency
- Preserves complete audit trail

---

## 📈 API Endpoints Overview

### Order Management Endpoints
| Method | Endpoint | Purpose | Request Body |
|--------|----------|---------|--------------|
| `POST` | `/api/orders` | Create new order | `{customerId, items[]}` |
| `GET` | `/api/orders/:id` | Get order by ID | - |
| `GET` | `/api/orders` | Get all orders | - |
| `PUT` | `/api/orders/:id/status` | Update order status | `{status, reason?}` |
| `POST` | `/api/orders/:id/items` | Add item to order | `{item}` |
| `DELETE` | `/api/orders/:id/items/:productId` | Remove item from order | - |

### Event Sourcing Endpoints
| Method | Endpoint | Purpose | Description |
|--------|----------|---------|-------------|
| `GET` | `/api/debug/events` | Get all events | Paginated event list |
| `GET` | `/api/debug/orders/:id/events` | Get order events | Events for specific order |
| `POST` | `/api/debug/orders/:id/rollback` | Rollback order | Version/timestamp rollback |
| `GET` | `/api/debug/orders/:id/rebuild` | Debug rebuild | State reconstruction debug |

### System Endpoints
| Method | Endpoint | Purpose | Returns |
|--------|----------|---------|---------|
| `GET` | `/health` | Health check | System status, DB health |
| `GET` | `/api/debug/stats` | Database statistics | Event counts, performance metrics |

---

## 📊 Database Schema

### Events Table
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL DEFAULT 'Order',
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    version INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(aggregate_id, version)
);
```

### Key Indexes
- `idx_events_aggregate_id`: Fast lookup by aggregate
- `idx_events_event_type`: Filter by event type
- `idx_events_timestamp`: Temporal queries
- `idx_events_version`: Version-based sorting

### Event Data Structure
```json
{
  "id": "uuid-v4",
  "aggregateId": "order-uuid",
  "eventType": "OrderCreated",
  "eventData": {
    "orderId": "order-uuid",
    "customerId": "customer-001",
    "items": [...],
    "status": "PENDING",
    "totalAmount": 1525.98
  },
  "version": 1,
  "timestamp": "2025-08-16T10:30:00Z"
}
```

---

## 🚀 Deployment Architecture

### Development Environment
```
Developer Machine
├── Frontend (localhost:3000) - Next.js dev server
├── Backend (localhost:3001) - Express.js với nodemon
└── Database (localhost:5432) - PostgreSQL local instance
```

### Production Environment
```
Load Balancer
├── Frontend Cluster (Multiple Next.js instances)
├── Backend Cluster (Multiple Express.js instances)
└── Database Cluster (PostgreSQL với read replicas)
```

### Container Deployment
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]
    
  backend:
    build: ./Order-management
    ports: ["3001:3001"]
    depends_on: [postgres]
    environment:
      - DB_HOST=postgres
      
  postgres:
    image: postgres:15
    ports: ["5432:5432"]
    volumes: ["./data:/var/lib/postgresql/data"]
    environment:
      - POSTGRES_DB=order_management
```

---

## 🔍 Quality Attributes

### 1. Traceability (Khả năng Truy vết)
- **Complete Audit Trail**: Mọi thay đổi được ghi lại với timestamp và user info
- **Correlation Tracking**: Theo dõi related events across system
- **Business Process Tracing**: Trace complete order lifecycle

### 2. Auditability (Khả năng Kiểm toán)
- **Immutable Events**: Events không thể thay đổi sau khi tạo
- **Compliance Ready**: Support cho regulatory requirements
- **Audit Reports**: Generate compliance reports tự động

### 3. Data Integrity (Tính Toàn vẹn Dữ liệu)
- **Event Immutability**: Đảm bảo events không bị corruption
- **Version Consistency**: Maintain proper event ordering
- **Concurrency Control**: Handle concurrent operations safely

### 4. Recoverability (Khả năng Phục hồi)
- **Point-in-time Recovery**: Rollback về bất kỳ thời điểm nào
- **State Reconstruction**: Rebuild state từ events
- **Disaster Recovery**: Full system recovery from event store

### 5. Scalability (Khả năng Mở rộng)
- **Read/Write Separation**: Independent scaling
- **Stateless Design**: Horizontal scaling support
- **Database Optimization**: Efficient event storage và retrieval

### 6. Performance
- **Event Store Optimization**: Indexed queries và connection pooling
- **Caching Strategy**: Future implementation cho read models
- **Pagination**: Handle large event streams efficiently

---

## 🧪 Testing Strategy

### Testing Framework Overview
Hệ thống bao gồm comprehensive testing framework để verify quality attributes:

### 1. API Testing (Postman/Newman)
- **Functional Tests**: CRUD operations testing
- **Traceability Tests**: Correlation ID tracking
- **Rollback Tests**: State reconstruction validation
- **Performance Tests**: Response time và throughput

### 2. Load Testing (k6)
- **Concurrent Users**: 100-500 user simulation
- **Throughput Testing**: >1000 requests/second
- **Stress Testing**: System breaking point identification
- **Performance Thresholds**: <2s response time, <5% error rate

### 3. Database Testing (SQL Queries)
- **Data Integrity**: Event immutability verification
- **Audit Trail**: Complete correlation chain validation
- **Business Rules**: Constraint checking
- **Performance**: Query optimization validation

---

## 📚 Documentation Structure

### Technical Documentation
- `README.md`: Project overview và setup instructions
- `docs/BACKEND_DOCUMENTATION.md`: Comprehensive backend documentation
- `docs/component-diagram-specification.md`: Architecture specification
- `docs/class-diagram-specification.md`: Class structure documentation

### API Documentation
- RESTful endpoint specifications
- Request/response examples
- Error handling guidelines
- Authentication requirements (future)

### Deployment Documentation
- Environment setup instructions
- Container deployment guides
- Production deployment checklist
- Monitoring và logging setup

---

## 🎯 Business Benefits

### 1. Complete Transparency
- **Full Audit Trail**: Mọi thay đổi được track với complete context
- **Regulatory Compliance**: Meet audit requirements tự động
- **Business Intelligence**: Rich data cho analytics

### 2. Risk Mitigation
- **Error Recovery**: Ability to rollback problematic changes
- **Data Protection**: Immutable audit trail protects against tampering
- **System Reliability**: Event-driven architecture increases fault tolerance

### 3. Business Agility
- **Rapid Development**: Clean separation of concerns
- **Easy Integration**: Well-defined API interfaces
- **Scalable Growth**: Architecture supports business expansion

### 4. Decision Support
- **Historical Analysis**: Analyze business patterns over time
- **State Reconstruction**: View system state at any point
- **Trend Analysis**: Understand business evolution

---

## 🚀 Future Enhancements

### Short-term Roadmap
- **Read Models**: Implement CQRS read models cho performance
- **Event Versioning**: Handle schema evolution
- **Snapshots**: Performance optimization cho large aggregates
- **Authentication**: User management và authorization

### Long-term Vision
- **Microservices**: Split into specialized services
- **Event Streaming**: Real-time event processing
- **Machine Learning**: Predictive analytics trên event data
- **Multi-tenant**: Support multiple organizations

### Technology Evolution
- **Cloud Native**: Kubernetes deployment
- **Event Store Scaling**: Distributed event storage
- **Advanced Monitoring**: Observability và tracing
- **API Gateway**: Centralized API management

---

## 🔧 Getting Started

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 15+ running
- Git for version control
- Basic understanding of Event Sourcing concepts

### Quick Setup
```bash
# 1. Clone repository
git clone https://github.com/Noru-0/Event-Sourcing-Demo.git
cd Event-Sourcing-Demo

# 2. Setup database
cd Order-management/database
psql -U postgres -f schema.sql

# 3. Install và start backend
cd ../
npm install
npm run dev

# 4. Install và start frontend
cd ../frontend
npm install
npm run dev

# 5. Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
```

### Quick Demo
1. Open browser tới `http://localhost:3000`
2. Create new order using form
3. Update order status và add/remove items
4. View real-time event stream
5. Try rollback functionality
6. Explore audit trail và state reconstruction

---

**Event Sourcing Order Management System** đại diện cho một implementation hiện đại của Event Sourcing pattern, cung cấp foundation mạnh mẽ cho applications yêu cầu complete auditability, traceability, và state management flexibility. Hệ thống được thiết kế để scale và evolve theo business requirements trong khi maintaining data integrity và system reliability.
