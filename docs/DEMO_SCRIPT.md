# Kịch Bản Demo: Event Sourcing Order Management System

## 🎯 Mục Tiêu Demo
Thể hiện rõ các khái niệm và lợi ích của Event Sourcing pattern thông qua hệ thống quản lý đơn hàng thực tế.

---

## 📋 Chuẩn Bị Demo

### 1. Khởi động hệ thống
```bash
# Terminal 1: Backend
cd Order-management
npm start

# Terminal 2: Frontend  
cd frontend
npm run dev
```

### 2. Kiểm tra kết nối
- Mở http://localhost:3000
- Click "Health Check" để đảm bảo backend hoạt động

---

## 🎬 Kịch Bản Thuyết Trình (15-20 phút)

### **PHẦN 1: GIỚI THIỆU (2 phút)**

**Người thuyết trình:**
> "Chào mọi người! Hôm nay tôi sẽ demo về Event Sourcing pattern - một kiến trúc mạnh mẽ trong việc xây dựng hệ thống phân tán. 

> Thay vì lưu trữ trạng thái hiện tại, Event Sourcing lưu trữ toàn bộ chuỗi sự kiện đã xảy ra. Điều này mang lại khả năng audit hoàn chỉnh, time-travel debugging, và phục hồi dữ liệu mạnh mẽ."

**Hiển thị:** Giao diện chính của ứng dụng

---

### **PHẦN 2: DEMO TẠO ORDER - EVENT GENERATION (4 phút)**

**Bước 1: Tạo Order đầu tiên**
```
Action: Điền thông tin tạo order
- Customer ID: customer-001
- Items: 
  * Laptop Dell XPS - Qty: 1 - $1500
  * Mouse Wireless - Qty: 2 - $25
```

**Người thuyết trình:**
> "Đầu tiên, tôi sẽ tạo một order mới. Trong Event Sourcing, việc tạo order không chỉ lưu thông tin order mà sẽ tạo ra một EVENT."

**Action:** Click "Tạo Order"

**Giải thích:**
> "Quan sát phần Last Response - hệ thống đã tạo ra OrderCreated event với đầy đủ thông tin. Order ID được generate tự động và đã fill vào các trường tương ứng."

**Bước 2: Lấy thông tin Order**
**Action:** Click "Get Order"

**Người thuyết trình:**
> "Bây giờ tôi sẽ lấy thông tin order. Thoạt nhìn, Last Response có vẻ giống CRUD truyền thống - chỉ trả về object order cuối cùng.

> **Điểm quan trọng:** Response này KHÔNG PHẢI đọc từ bảng orders! Đây là kết quả của việc rebuild từ events. Để chứng minh điều này, chúng ta cần xem event history.

> **Cơ chế thực tế diễn ra behind-the-scenes:**
> 1. Backend nhận request GET /orders/{id}
> 2. System query event store: SELECT * FROM events WHERE aggregateId = '{id}' ORDER BY version
> 3. Rebuild order object bằng cách replay events
> 4. Trả về object đã rebuild (giống CRUD về format nhưng source khác hoàn toàn)

> Quan sát Current Order section - order này sẽ được build lại từ events mà chúng ta sẽ xem ngay sau đây."

---

### **PHẦN 3: DEMO EVENT SOURCING CORE CONCEPTS (5 phút)**

**Bước 3: Chứng minh rebuild từ events**
**Action:** Click "Get Events"

**Người thuyết trình:**
> "Đây chính là bằng chứng! So sánh Current Order với Event Data:

> **Current Order cho thấy:**
> - ID: bf58fdf4-d6a4-405e-a8ad-93cfa8a638d6
> - Customer: customer-100  
> - Items: Laptop Dell XPS + tablet
> - Status: PENDING
> - Total: 12,001,500

> **Event OrderCreated (Version 1) chứa:**
> - Chính xác customerId: 'customer-100'
> - Chính xác items: Laptop + tablet với price tương ứng
> - Chính xác status: 'PENDING'

> **Đây chính là bằng chứng rebuild!** 
> - Event lưu trữ RAW DATA tại thời điểm tạo
> - Current Order là kết quả của việc apply event này
> - Không có bảng 'orders' nào cả - chỉ có event store!

> **Công thức chứng minh:**
> ```
> Current Order.customerId = Event.data.customerId ✓
> Current Order.items = Event.data.items ✓  
> Current Order.status = Event.data.status ✓
> Current Order.totalAmount = sum(items.price * quantity) ✓
> ```"

**Bước 4: Thay đổi trạng thái Order**
```
Action: Update Order Status
- Order ID: (đã có sẵn)
- Status: CONFIRMED → SHIPPED
```

**Action:** Click "Update Status"

**Người thuyết trình:**
> "Bây giờ tôi sẽ chuyển trạng thái order từ PENDING sang SHIPPED. Quan trọng: hệ thống TẠO THÊM EVENT mới thay vì update database!"

**Action:** Click "Get Order" lại để xem thay đổi

**Người thuyết trình:**
> "Quan sát Last Response - status đã thành 'SHIPPED'! Nhưng điều này đến từ đâu? Không phải từ UPDATE statement!"

**Action:** Click "Get Events" lại

**Giải thích cơ chế rebuild từ multiple events:**
> "Đây mới là điểm thần kỳ! Bây giờ có 2 events:

> **Event 1 - OrderCreated (Version 1):**
> - Status = 'PENDING' (immutable, không đổi!)
> - Items, customer... (data gốc)

> **Event 2 - OrderStatusUpdated (Version 2):**  
> - Status = 'SHIPPED' (event mới)
> - Previous status = 'PENDING'

> **Quá trình rebuild khi gọi GET Order:**
> ```
> Step 1: Khởi tạo empty order
> Step 2: Apply Event 1 → Order{status: 'PENDING', ...}
> Step 3: Apply Event 2 → Order{status: 'SHIPPED', ...}
> Result: Last Response status = 'SHIPPED' 
> ```

> **Key insight:** Event 1 vẫn giữ nguyên 'PENDING' (immutable), nhưng current state là 'SHIPPED' từ việc replay cả 2 events!"

---

### **PHẦN 4: DEMO BUSINESS OPERATIONS (4 phút)**

**Bước 5: Thêm Item vào Order**
```
Action: Add Item
- Product ID: product-003
- Product Name: Keyboard Mechanical
- Quantity: 1
- Price: 150
```

**Action:** Click "Add Item to Order"

**Người thuyết trình:**
> "Tôi sẽ thêm một sản phẩm mới vào order. Hành động này tạo ra OrderItemAdded event."

**Bước 6: Xóa Item khỏi Order**
**Action:** Click nút xóa (trash icon) ở một item trong Current Order

**Người thuyết trình:**
> "Và khi xóa item, hệ thống tạo OrderItemRemoved event. Dữ liệu không bao giờ bị mất!"

**Bước 7: Xem lại Event History**
**Action:** Click "Get Events"

**Giải thích:**
> "Bây giờ chúng ta có hoàn chỉnh event history:
> 1. OrderCreated
> 2. OrderStatusUpdated  
> 3. OrderItemAdded
> 4. OrderItemRemoved
>
> Mỗi thay đổi business đều được ghi lại như một event immutable!"

---

### **PHẦN 5: DEMO SYSTEM-WIDE VIEW (3 phút)**

**Bước 8: Tạo thêm Orders**
**Action:** Tạo 2-3 orders khác với dữ liệu khác nhau

**Bước 9: Xem tất cả Orders**
**Action:** Click "All Orders"

**Người thuyết trình:**
> "All Orders section hiển thị tất cả orders được rebuild từ events. Mỗi order là kết quả của việc replay các events tương ứng."

**Bước 10: Xem System-wide Events**
**Action:** Click "All Events"

**Giải thích:**
> "All Events section cho thấy TOÀN BỘ event stream của hệ thống. Đây là:
> - Complete audit trail
> - Immutable history
> - Source of truth cho mọi thay đổi
>
> Từ event stream này, chúng ta có thể:
> - Rebuild bất kỳ trạng thái nào tại bất kỳ thời điểm nào
> - Phân tích business patterns
> - Debug issues một cách chi tiết"

---

### **PHẦN 6: HIGHLIGHT EVENT SOURCING BENEFITS (2 phút)**

**Người thuyết trình:**
> "Qua demo này, Event Sourcing mang lại những lợi ích quan trọng:

> **1. Complete Audit Trail:** Mọi thay đổi đều được ghi lại với timestamp chính xác

> **2. Time Travel:** Có thể xem trạng thái hệ thống tại bất kỳ thời điểm nào

> **3. Immutable Data:** Events không bao giờ bị sửa hoặc xóa

> **4. Business Intelligence:** Phân tích patterns và trends từ event history

> **5. Debugging Power:** Reproduce exact conditions khi có bug

> **6. Scalability:** Events có thể được replicated và processed parallel"

**Demo cuối:**
**Action:** Scroll qua các events một lần nữa

> "Để kết thúc, hãy so sánh Event Sourcing vs Traditional Database:

> **Traditional CRUD:**
> ```sql
> UPDATE orders SET status = 'SHIPPED' WHERE id = 'order-123'
> -- Mất mát thông tin: không biết status trước đó là gì
> -- Không biết ai thay đổi, khi nào thay đổi
> ```

> **Event Sourcing:**
> ```
> Event Stream: [OrderCreated, OrderStatusUpdated, OrderItemAdded...]
> → Giữ lại TOÀN BỘ lịch sử thay đổi
> → Có thể rebuild trạng thái bất kỳ lúc nào
> → Complete audit trail
> ```

> Mỗi event là một fact business đã xảy ra và KHÔNG BAO GIỜ thay đổi. Tập hợp các facts này tạo nên complete picture của business operations."

---

## 🎯 Kết Luận Demo

**Người thuyết trình:**
> "Event Sourcing không chỉ là một pattern kỹ thuật mà còn là cách tiếp cận business-centric, giúp chúng ta hiểu rõ 'điều gì đã xảy ra' thay vì chỉ 'trạng thái hiện tại là gì'.

> Điều này đặc biệt quan trọng trong các hệ thống tài chính, e-commerce, và bất kỳ domain nào cần transparency và traceability cao."

---

## 📝 Q&A Preparation

### Câu hỏi thường gặp:

**Q: Event store có performance tốt không?**
A: Events thường append-only, rất nhanh. Query rebuild có thể cache snapshots cho performance.

**Q: Làm sao handle schema evolution?**
A: Event versioning và backward compatibility strategies. Events cũ vẫn readable.

**Q: Storage space có vấn đề không?**
A: Events compress tốt, có thể archive events cũ. Trade-off giữa storage và business value.

**Q: Eventual consistency được handle như thế nào?**
A: Event ordering và timestamp đảm bảo consistency. CQRS pattern giúp separate read/write concerns.

---

## 🔧 Technical Notes

### Cách nhận biết Event Sourcing (vs CRUD)

**⚠️ Lưu ý quan trọng:** Response format của Event Sourcing thường giống CRUD, nhưng:

**Cách chứng minh hệ thống dùng Event Sourcing:**
1. **Event History tồn tại** - có thể xem được tất cả events  
2. **Immutable Events** - events cũ không thay đổi khi có update
3. **Version Ordering** - events có thứ tự tuần tự (1, 2, 3...)
4. **Rebuild Consistency** - current state = apply all events
5. **No Direct Table** - không có bảng orders trực tiếp

**Điểm khác biệt chính:**
```
CRUD: GET /orders/123 → SELECT * FROM orders WHERE id = 123
Event Sourcing: GET /orders/123 → Query events → Rebuild → Return object
```

**Trong demo, chứng minh bằng:**
- Event data trước = Current state sau khi rebuild
- Thay đổi tạo event mới, không update event cũ
- Multiple events → single current state

### Troubleshooting
- Nếu backend không response: Check terminal logs
- Nếu events không hiển thị: Verify API endpoint connectivity
- Nếu UI lag: Reduce event payload size trong demo

### Demo Tips
- Chuẩn bị dữ liệu mẫu trước
- Practice transition giữa các bước
- Highlight key concepts trong mỗi action
- Prepare backup scenarios nếu có technical issues

---

*Thời gian demo: 15-20 phút*  
*Audience: Technical team, stakeholders quan tâm đến architecture decisions*
