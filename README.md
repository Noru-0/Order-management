# Order Management System - Clean Architecture + DDD + CQRS + Event Sourcing

A modern order management system built with **Clean Architecture**, **Domain-Driven Design (DDD)**, **CQRS**, and **Event Sourcing** patterns, featuring a reactive web interface and comprehensive API.

## 🏗️ Architecture Overview

```
Frontend (Next.js)  ←→  Backend (Clean Architecture)  ←→  Event Store
   Port 3000                    Port 3000                  (Memory/PostgreSQL)
                                     ↓
                    ┌─────────────────────────────────────┐
                    │          Clean Architecture        │
                    ├─────────────────────────────────────┤
                    │ 📱 Interfaces (Controllers/Routes) │
                    │ 🎯 Application (Commands/Queries)  │
                    │ 🏢 Domain (Entities/Services)      │
                    │ 🔧 Infrastructure (Persistence)    │
                    │ 🚀 Bootstrap (DI Container)        │
                    └─────────────────────────────────────┘
```

### 🎯 Architecture Patterns:
- **Clean Architecture**: 4-layer separation with dependency inversion
- **Domain-Driven Design (DDD)**: Rich domain models with business logic
- **CQRS**: Separate Command (write) and Query (read) operations
- **Event Sourcing**: Immutable event store with event replay capability
- **Dependency Injection**: IoC container for loose coupling
- **TypeScript**: Complete type safety across all layers

## ⚡ Quick Start

### Option 1: One-Click Launcher (Recommended)
```batch
quick-start.bat
```

### Option 2: Manual Setup

#### Step 1: Prerequisites
```batch
REM Install dependencies for both frontend and backend
cd scripts
setup.bat
```

#### Step 2: Start PostgreSQL Service
```batch
REM Start PostgreSQL service (Windows)
net start postgresql-x64-15

REM Or check Windows Services manually
services.msc
```

#### Step 3: Environment Configuration
```batch
REM Copy environment template
cd Order-management
copy .env.example .env

REM Edit configuration
notepad .env
```

**Update your .env file:**
```properties
# Event Store Configuration (Choose one)
EVENT_STORE_TYPE=memory              # For development/testing
# EVENT_STORE_TYPE=postgres          # For production

# Database Configuration (if using PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/order_management
# OR separate values:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=order_management
DB_USER=postgres
DB_PASSWORD=your_postgresql_password_here

# Application Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001
```

#### Step 4: Database Setup (Optional - for PostgreSQL)
```batch
REM Setup database schema (only if using PostgreSQL)
cd database
setup.ps1
```

#### Step 5: Start Application
```batch
REM Start Clean Architecture backend
cd Order-management
npm run dev

REM In another terminal, start frontend
cd ../frontend  
npm run dev
```

#### Step 6: Access Application
- **Frontend UI**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health

### PowerShell Alternative
```powershell
# 1. Setup dependencies
cd scripts
.\setup.ps1

# 2. Start PostgreSQL (if needed)
Start-Service postgresql-x64-15

# 3. Configure environment
cd ..\Order-management
Copy-Item .env.example .env
# Edit .env with your database credentials

# 4. Setup database
cd database
.\setup.ps1

# 5. Start application
cd ..
npm run dev
```

## 🎮 Demo & Testing

### Automated Demo Script
```batch
REM Run complete demo with sample data
cd scripts
demo_script.bat
```

```powershell
# PowerShell version
cd scripts
.\demo_script.ps1
```

### Rollback Demo (Event Sourcing Time Travel)
```batch
REM Demonstrate rollback feature
cd scripts
rollback-demo.bat
```

```powershell
# PowerShell version
cd scripts
.\rollback-demo.ps1
```

### Manual Testing via UI
1. Open http://localhost:3000
2. Create orders using the form
3. View order events in real-time
4. Test order status updates
5. Add/remove items from orders
6. **Try rollback feature** - Input Order ID and version/timestamp to see time travel

## 📊 System Features

### Core Event Sourcing Features
- ✅ **Complete Event Log**: Every order change recorded as events
- ✅ **Event Replay**: Rebuild order state from event history
- ✅ **Audit Trail**: Full history of all order modifications
- ✅ **Time Travel**: View order state at any point in time
- ✅ **Rollback Demo**: Demonstrate order state at specific version or timestamp
- ✅ **Concurrent Updates**: Version-based conflict resolution

### Business Operations
- ✅ **Order Creation**: Create orders with multiple items
- ✅ **Status Management**: Update order status (Pending → Confirmed → Shipped → Delivered)
- ✅ **Item Management**: Add/remove items from existing orders
- ✅ **Order Queries**: Get current order state and full event history

### Technical Features
- ✅ **PostgreSQL Integration**: Production-ready database with JSONB events
- ✅ **Fallback Storage**: In-memory store when database unavailable
- ✅ **Type Safety**: Full TypeScript implementation
- ✅ **Modern UI**: React/Next.js with real-time updates
- ✅ **API Documentation**: RESTful endpoints with clear responses

## 🔌 API Endpoints

### Command Operations (Write Side - CQRS)
```http
POST   /api/orders                          # Create new order
PUT    /api/orders/:id/status               # Update order status  
POST   /api/orders/:id/items                # Add item to order
DELETE /api/orders/:id/items/:productId     # Remove item from order
POST   /api/orders/:id/rollback             # Rollback order (Event Sourcing)
```

### Query Operations (Read Side - CQRS)  
```http
GET    /api/orders                          # Get all orders (paginated)
GET    /api/orders/search?customerId=:id    # Search orders by customer
GET    /api/orders/:id                      # Get order by ID
GET    /api/orders/:id/summary              # Get order summary (lightweight)
GET    /api/orders/:id/events               # Get order event history
GET    /api/orders/:id/skipped-versions     # Get skipped versions
GET    /api/events                          # Get all system events (paginated)
```

### System Operations
```http
GET    /api/health                          # Health check with database status
GET    /api/stats                           # Database statistics
GET    /api                                 # API documentation
```

### Example Requests

**Create Order:**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "items": [
      {
        "productId": "product-1", 
        "productName": "Laptop",
        "quantity": 1,
        "price": 999.99
      }
    ]
  }'
```

**Event Sourcing Rollback:**
```bash
curl -X POST http://localhost:3000/api/orders/order-123/rollback \
  -H "Content-Type: application/json" \
  -d '{"toVersion": 2}'
```

## 🗄️ Database Schema

### Events Table (PostgreSQL)
```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    version INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(aggregate_id, version)
);

-- Indexes for performance
CREATE INDEX idx_events_aggregate_id ON events(aggregate_id);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_type ON events(event_type);
```

### Database Functions
```sql
-- Atomic event appending with version control
CREATE OR REPLACE FUNCTION append_event(
    p_aggregate_id VARCHAR(255),
    p_event_type VARCHAR(255),
    p_event_data JSONB,
    p_expected_version INTEGER DEFAULT NULL
) RETURNS TABLE(event_id INTEGER, version INTEGER);
```

## 💡 Event Sourcing Flow

### Command Flow (Write Operations)
```
1. Client Request → 2. Controller → 3. Command Handler → 4. Domain Logic → 5. Event Store → 6. Response

Example:
POST /api/orders → OrderController.createOrder() → CreateOrderCommand → Order.new() → OrderCreatedEvent → PostgreSQL
```

### Query Flow (Read Operations)
```
1. Client Request → 2. Controller → 3. Event Store → 4. Event Replay → 5. Rebuild State → 6. Response

## 💡 Clean Architecture Flow

### Command Flow (Write Operations)
```
Client Request → Interface Layer → Application Layer → Domain Layer → Infrastructure Layer

Example:
POST /api/orders → OrderCommandController → CreateOrderHandler → Order.create() → EventStore.saveEvent()
                  (Interface)              (Application)        (Domain)        (Infrastructure)
```

### Query Flow (Read Operations)
```
Client Request → Interface Layer → Application Layer → Infrastructure Layer → Domain Layer → Response

Example:
GET /api/orders/123 → OrderQueryController → GetOrderHandler → EventStore.getEvents() → OrderDomainService.rebuildFromEvents()
                     (Interface)            (Application)       (Infrastructure)       (Domain)
```

### Dependency Flow (Clean Architecture Rule)
```
🚫 Domain ← Application ← Infrastructure ← Interface
✅ Domain → Application → Infrastructure → Interface

Dependencies point inward, with abstractions at domain boundaries
```

### Event Types (Domain Events)
- **OrderCreatedEvent**: New order with initial items
- **OrderStatusUpdatedEvent**: Status change (Pending → Confirmed → etc.)
- **OrderItemAddedEvent**: Item added to existing order
- **OrderItemRemovedEvent**: Item removed from order
- **OrderRolledBackEvent**: Event sourcing rollback operation

## 🧪 Example Usage

### Create Order
```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-001",
    "items": [{
      "productId": "laptop-001",
      "productName": "Gaming Laptop",
      "quantity": 1,
      "price": 1500.00
    }]
  }'
```

### Update Order Status
```bash
curl -X PUT http://localhost:3001/api/orders/{orderId}/status \
  -H "Content-Type: application/json" \
  -d '{"status": "CONFIRMED"}'
```

### View Order Events
```bash
curl http://localhost:3001/api/debug/orders/{orderId}/events
```

### Rollback Order (Demo Feature)
```bash
# Rollback to specific version
curl -X POST http://localhost:3001/api/debug/orders/{orderId}/rollback \
  -H "Content-Type: application/json" \
  -d '{"toVersion": 2}'

# Rollback to specific timestamp
curl -X POST http://localhost:3001/api/debug/orders/{orderId}/rollback \
  -H "Content-Type: application/json" \
  -d '{"toTimestamp": "2025-07-14T10:30:00.000Z"}'
```

### Response Format
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid",
    "events": [
      {
        "type": "OrderCreated",
        "aggregateId": "order-uuid",
        "version": 1,
        "timestamp": "2025-07-14T10:30:00.000Z",
        "data": {
          "orderId": "order-uuid",
          "customerId": "customer-001",
          "items": [...],
          "status": "PENDING",
          "totalAmount": 1500.00
        }
      }
    ]
  }
}
```

## 🛠️ Development Scripts

### Root Level Scripts
```json
{
  "dev": "Start both frontend and backend",
  "install:all": "Install dependencies for all projects",
  "build": "Build both frontend and backend",
  "start": "Start production builds"
}
```

### Utility Scripts (scripts/ folder)
**Batch Scripts (Windows CMD):**
- `setup.bat` - Complete project setup
- `start-dev.bat` - Start in separate terminals
- `demo_script.bat` - Automated demo
- `database-setup.bat` - Database setup only

**PowerShell Scripts:**
- `setup.ps1` - Complete setup (PowerShell)
- `start-dev.ps1` - Start development servers
- `demo_script.ps1` - Automated demo (PowerShell)

## 📁 Project Structure

```
Order-management/
├── Order-management/              # Backend (Clean Architecture + TypeScript)
│   ├── src/
│   │   ├── main.ts              # Application entry point
│   │   ├── domain/              # 🏢 Domain Layer (Business Logic)
│   │   │   ├── models/          # Entities & Aggregates
│   │   │   │   └── Order.ts     # Order Aggregate Root
│   │   │   ├── events/          # Domain Events
│   │   │   │   └── types.ts     # Event definitions
│   │   │   ├── repositories/    # Repository Interfaces (DIP)
│   │   │   │   └── IEventStore.ts
│   │   │   └── services/        # Domain Services
│   │   │       └── OrderDomainService.ts
│   │   ├── application/         # 🎯 Application Layer (Use Cases)
│   │   │   ├── commands/        # CQRS Commands (Write)
│   │   │   │   ├── OrderCommands.ts
│   │   │   │   └── handlers/
│   │   │   │       └── OrderCommandHandlers.ts
│   │   │   └── queries/         # CQRS Queries (Read)
│   │   │       ├── OrderQueries.ts
│   │   │       └── handlers/
│   │   │           └── OrderQueryHandlers.ts
│   │   ├── infrastructure/      # 🔧 Infrastructure Layer
│   │   │   └── persistence/     # Data Access
│   │   │       ├── InMemoryEventStore.ts
│   │   │       ├── PostgreSQLEventStore.ts
│   │   │       └── EventStoreFactory.ts
│   │   ├── interfaces/          # 📱 Interface Layer (Controllers)
│   │   │   ├── controllers/     # API Controllers
│   │   │   │   ├── OrderCommandController.ts  # Write operations
│   │   │   │   └── OrderQueryController.ts    # Read operations
│   │   │   └── routes/
│   │   │       └── OrderRoutes.ts
│   │   └── bootstrap/           # 🚀 Composition Root
│   │       ├── DIContainer.ts   # Dependency Injection
│   │       └── Application.ts   # App Bootstrap
│   ├── database/
│   │   ├── schema.sql           # Database schema
│   │   └── setup.ps1            # Database setup script
│   ├── .env.example             # Environment template
│   └── package.json             # Backend dependencies
├── frontend/                      # Frontend (Next.js + React)
│   ├── app/                     # Next.js app router
│   ├── components/              # React components
│   ├── lib/                     # API client and utilities
│   └── package.json             # Frontend dependencies
├── scripts/                       # Setup and demo scripts
│   ├── setup.bat/.ps1           # Project setup
│   ├── demo_script.bat/.ps1     # Demo automation
│   └── README.md                # Scripts documentation
├── docs/                          # Documentation
│   ├── BACKEND_DOCUMENTATION.md  # Architecture details
│   └── DEMO_SCRIPT.md            # Demo guide
├── quick-start.bat               # One-click launcher
└── README.md                     # This file
```

### 🏗️ Clean Architecture Layers

| Layer | Responsibility | Dependencies |
|-------|---------------|--------------|
| **🏢 Domain** | Business logic, entities, rules | None (Pure) |
| **🎯 Application** | Use cases, orchestration | Domain only |
| **🔧 Infrastructure** | Data access, external services | Application, Domain |
| **📱 Interfaces** | Controllers, routes, APIs | Application, Domain |
| **🚀 Bootstrap** | DI container, app startup | All layers |

## 🔍 Troubleshooting

### PostgreSQL Issues

**Service Not Running:**
```powershell
# Check service status
Get-Service postgresql*

# Start service
Start-Service postgresql-x64-15

# Alternative (Command Prompt)
net start postgresql-x64-15
```

**Connection Issues:**
```bash
# Test connection
psql -U postgres -h localhost -p 5432

# Check if port is open
netstat -an | findstr :5432

# Reset database
cd Order-management/database
.\setup.ps1
```

### Environment Configuration

**Missing .env file:**
```bash
# Copy from template
cp Order-management/.env.example Order-management/.env

# Edit with your credentials
notepad Order-management/.env
```

**Database Authentication:**
```properties
# Common PostgreSQL credentials
DB_USER=postgres
DB_PASSWORD=admin        # or 'postgres' or your custom password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=order_management
```

### Application Issues

**Port Conflicts:**
- Backend: Change `PORT` in `Order-management/.env`
- Frontend: Modify `next.config.mjs` or use different port

**Dependencies Issues:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or reinstall all
npm run install:all
```

**Database Connection Fallback:**
- System automatically falls back to in-memory storage if PostgreSQL unavailable
- Check console logs for connection status
- Events will be lost on restart without PostgreSQL

## 📚 Learning Resources

### Event Sourcing Concepts
- **Events**: Immutable facts about what happened
- **Aggregate**: Business entity (Order) that generates events
- **Event Store**: Database for persisting events
- **Projection**: Read model built from events

### CQRS Pattern
- **Commands**: Operations that change state
- **Queries**: Operations that read state
- **Handlers**: Process commands and queries separately

### Implementation Details
- See `BACKEND_DOCUMENTATION.md` for detailed architecture
- Check source code comments for implementation notes
- Use debug endpoints to inspect event flows

## 🚀 Production Considerations

### Performance
- Database indexing on aggregate_id and timestamp
- Connection pooling for PostgreSQL
- Event batching for high-throughput scenarios

### Monitoring
- Health check endpoint: `/health`
- Database statistics: `/api/debug/stats`
- Application logging and error tracking

### Scalability
- Stateless application design enables horizontal scaling
- Event store can be sharded by aggregate_id
- Read models can be cached or replicated

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with demo scripts
5. Submit a pull request

## 📄 License

This project is for educational purposes demonstrating Event Sourcing and CQRS patterns.

---

**Built with Event Sourcing & CQRS patterns for learning and demonstration purposes.**
