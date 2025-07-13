# Order Management System - Event Sourcing & CQRS

A complete order management system demonstrating **Event Sourcing** and **CQRS** patterns with PostgreSQL database.

## 🏗️ Architecture

```
Frontend (Next.js)  ←→  Backend (Express.js)  ←→  PostgreSQL
   Port 3000              Port 3001             Port 5432
                              ↓
                      Event Store & CQRS
```

## ⚡ Quick Start

**Easy Launcher (Recommended):**
```batch
quick-start.bat
```

**Manual Setup:**
```batch
REM 1. Setup (install dependencies + optional database)
cd scripts
setup.bat

REM 2. Start system
cd ..
npm run dev

REM 3. Access
REM Frontend: http://localhost:3000
REM Backend:  http://localhost:3001
```

**Alternative with PowerShell:**
```powershell
# 1. Setup
cd scripts
.\setup.ps1

# 2. Start system
cd ..
npm run dev
```

## 🎮 Demo

```batch
REM Run automated demo
cd scripts
demo_script.bat
```

**Alternative with PowerShell:**
```powershell
# Run automated demo
cd Order-management
.\demo_script.ps1
```

## 📊 Key Features

- **Event Sourcing**: All state changes stored as immutable events
- **CQRS**: Separate read/write models  
- **Real Database**: PostgreSQL with proper schema
- **Modern UI**: Next.js with real-time API integration
- **TypeScript**: Full type safety

## � API Endpoints

### Commands (Write)
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update status
- `POST /api/orders/:id/items` - Add item
- `DELETE /api/orders/:id/items/:productId` - Remove item

### Queries (Read)  
- `GET /api/orders/:id` - Get order
- `GET /api/orders` - Get all orders
- `GET /api/debug/orders/:id/events` - Get events
- `GET /api/debug/stats` - Database stats

## 🗄️ Database Schema

```sql
-- Events table (PostgreSQL)
CREATE TABLE events (
    id UUID PRIMARY KEY,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    version INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(aggregate_id, version)
);
```

## 💡 Event Sourcing Flow

```
Command → Event → Store → Rebuild State → Response
   ↓        ↓       ↓         ↓           ↓
CreateOrder → OrderCreated → PostgreSQL → Current State → API Response
```

## 🧪 Example Usage

```bash
# Create order
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-001",
    "items": [{
      "productId": "product-001", 
      "productName": "Laptop",
      "quantity": 1,
      "price": 1500
    }]
  }'

# View events
curl http://localhost:3001/api/debug/orders/{orderId}/events
```

## 🛠️ Scripts

All scripts are located in the `scripts/` folder:

**Batch Scripts (CMD):**
- `scripts\setup.bat` - Complete project setup
- `scripts\start-dev.bat` - Start in separate terminals
- `scripts\demo_script.bat` - Demo script
- `scripts\database-setup.bat` - Database setup

**PowerShell Scripts:**
- `scripts\setup.ps1` - Complete project setup (PowerShell)
- `scripts\start-dev.ps1` - Start in separate terminals (PowerShell)
- `scripts\demo_script.ps1` - Demo script (PowerShell)

**NPM Scripts:**
- `npm run dev` - Start both services
- `npm run install:all` - Install all dependencies  
- `npm run build` - Build both projects

## 🔍 Troubleshooting

**PostgreSQL Issues:**
```powershell
# Check service
Get-Service postgresql*

# Reset database  
cd Order-management/database
.\setup.ps1
```

**Port Conflicts:**
- Backend: Change `PORT` in `Order-management/.env`
- Frontend: Change port in `frontend/next.config.mjs`

## � Project Structure

```
lab1/
├── Order-management/         # Backend (Express + TypeScript)
│   ├── src/                 # Source code
│   ├── database/            # SQL schema & setup
│   └── demo_script.ps1      # Demo script
├── frontend/                # Frontend (Next.js)
│   ├── app/                 # Pages
│   ├── components/          # UI components  
│   └── lib/                 # API client
├── setup.ps1               # Setup script
├── start-dev.ps1           # Dev starter
└── package.json            # Root config
```

---
**Built with Event Sourcing & CQRS patterns**
