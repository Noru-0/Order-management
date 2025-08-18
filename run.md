

# How to Run and Test Event Sourcing Demo Application

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Manual Setup](#manual-setup)
5. [Testing & Demo](#testing--demo)
6. [Troubleshooting](#troubleshooting)

## 🔍 Project Overview

Event Sourcing & CQRS Order Management System:
- **Backend**: Node.js + TypeScript (Order-management)
- **Frontend**: Next.js + React + TypeScript
- **Database**: PostgreSQL (event store)

## 🛠️ Prerequisites

- **Node.js** (v18+)
- **npm** hoặc **pnpm**
- **PostgreSQL** (local hoặc Docker)

## ⚡ Quick Start (Recommended)

Chạy tất cả bằng 1 lệnh (Windows):

```cmd
quick-start.bat
```

Script này sẽ tự động cài đặt, setup database, và khởi động cả frontend/backend.

## � Manual Setup

### 1. Cài đặt dependencies

```cmd
cd scripts
setup.bat
```

Hoặc thủ công:

```cmd
cd Order-management
npm install
cd ..\frontend
pnpm install
cd ..
```

### 2. Cấu hình môi trường

```cmd
cd Order-management
copy .env.example .env
notepad .env
```
Điền thông tin kết nối PostgreSQL vào file `.env`:

```properties
DB_HOST=localhost
DB_PORT=5432
DB_NAME=order_management
DB_USER=postgres
DB_PASSWORD=your_postgresql_password_here
PORT=3001
```

### 3. Khởi tạo Database

Tự động:
```cmd
cd scripts
database-setup.bat
```
Hoặc thủ công:
1. Tạo database và user trong PostgreSQL
2. Chạy file `Order-management/database/schema.sql`

### 4. Khởi động hệ thống

**Chạy cả frontend và backend:**
```cmd
start-dev.bat
```
Hoặc từng phần:

**Backend:**
```cmd
cd Order-management
npm run dev
```
**Frontend:**
```cmd
cd frontend
pnpm dev
```

**Truy cập:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001


## 🖥️ User Interface

Sau khi khởi động hệ thống, truy cập vào địa chỉ:

- **Frontend**: http://localhost:3000

Giao diện chính cho phép:
- Tạo đơn hàng mới
- Xem danh sách đơn hàng
- Xem chi tiết và lịch sử sự kiện của từng đơn hàng
- Thực hiện các thao tác cập nhật trạng thái, thêm/xóa sản phẩm, rollback trạng thái đơn hàng

**Ảnh minh họa giao diện:**

![alt text](<Screenshot 2025-07-14 133716.png>)

---

## 🧪 Testing & Demo

### Demo Script tự động
```cmd
cd scripts
demo_script.bat
```
### Rollback Demo (Time Travel)
```cmd
cd scripts
rollback-demo.bat
```

### Test thủ công qua UI hoặc API
Truy cập http://localhost:3000 hoặc dùng Postman/cURL với các endpoint trong README.md.

## 🔧 Troubleshooting

- **Port Already in Use**
  ```cmd
  netstat -ano | findstr :3001
  netstat -ano | findstr :3000
  taskkill /PID <process-id> /F
  ```
- **Database Connection Issues**
  - Kiểm tra file `.env` và trạng thái PostgreSQL
- **Missing Dependencies**
  ```cmd
  cd Order-management && npm install
  cd ../frontend && pnpm install
  ```
- **Reset Database**
  ```cmd
  cd Order-management/database
  setup.ps1
  ```

## 🎯 Success Criteria

Ứng dụng chạy thành công khi:
- ✅ Backend chạy ở port 3001
- ✅ Frontend chạy ở port 3000
- ✅ Kết nối database thành công
- ✅ API backend trả về dữ liệu đúng
- ✅ Thao tác CRUD đơn hàng hoạt động qua UI

---

*Làm theo từng bước để chạy và kiểm thử Event Sourcing Demo thành công.*
