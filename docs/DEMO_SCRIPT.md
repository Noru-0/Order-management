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

### **PHẦN 7: DEMO EVENT SOURCING TIME TRAVEL - ROLLBACK (4 phút)**

**Bước 11: Setup cho Rollback Demo**
**Người thuyết trình:**
> "Bây giờ đến phần thú vị nhất - khả năng Time Travel của Event Sourcing! Tôi sẽ đưa order trở lại trạng thái ở quá khứ mà không mất dữ liệu."

**Action:** Chọn một order đã có nhiều events (từ demo trước)

**Bước 12: Hiển thị trạng thái hiện tại**
**Action:** Click "Get Order" và "Get Events" để xem trạng thái hiện tại

**Người thuyết trình:**
> "Quan sát order hiện tại:
> - Có thể 4-5 events: OrderCreated → StatusUpdated → ItemAdded → ItemRemoved...
> - Status: SHIPPED 
> - Items: Đã có modifications
> - Total Amount: Đã thay đổi nhiều lần
>
> Bây giờ tôi sẽ đưa order này về trạng thái version 1 - như lúc vừa tạo!"

**Bước 13: Thực hiện Rollback**
```
Action: Rollback Demo Section
- Order ID: (copy từ current order)
- Version: 1 (hoặc 2)
- Leave Timestamp empty
```

**Action:** Click "🔄 Rollback"

**Người thuyết trình:**
> "🔄 Rollback đang thực hiện Time Travel...
>
> **Điều gì đang xảy ra behind-the-scenes:**
> 1. System query ALL events của order
> 2. Tạo OrderRolledBack event mới (không xóa events cũ!)
> 3. Rebuild order từ events ≤ version 1
> 4. Auto-refresh UI để hiển thị kết quả
>
> **Quan trọng:** Rollback KHÔNG XÓA dữ liệu - chỉ thêm metadata!"

**Bước 14: Phân tích Rollback Result**
**Người thuyết trình:**
> "Quan sát Rollback Result section - đây là summary của phép Time Travel:

**Current Order State (Before Rollback):**
> - Status: SHIPPED
> - Items: Multiple items với modifications
> - Total: $X,XXX

**⏮️ Rolled Back State (After Rollback):**
> - Status: PENDING (trạng thái gốc!)
> - Items: Chỉ items ban đầu
> - Total: Giá trị gốc

**📊 Rollback Summary:**
> - Events Kept: 1-2 (chỉ events trước rollback point)
> - Events Undone: 3-4 (events sau rollback point)
> - Rollback Point: Version 1

**Key Insight:** Order đã 'time travel' về quá khứ!"

**Bước 15: Chứng minh Data Integrity**
**Action:** Click "Get Events" sau rollback

**Người thuyết trình:**
> "Đây là điểm thần kỳ của Event Sourcing! 

**Event History sau Rollback:**
> 1. OrderCreated (v1) ✓ - vẫn còn
> 2. OrderStatusUpdated (v2) ✓ - vẫn còn  
> 3. OrderItemAdded (v3) ✓ - vẫn còn
> 4. OrderItemRemoved (v4) ✓ - vẫn còn
> 5. **OrderRolledBack (v5)** 🆕 - event mới!

**KHÔNG MỘT EVENT NÀO BỊ XÓA!**

**OrderRolledBack Event chứa:**
> - rollbackPoint: 'Version 1'
> - eventsUndone: 3 events
> - previousState vs newState comparison
> - Complete audit trail của rollback action

**Rebuild Logic sau Rollback:**
> ```
> When GET /orders/{id}:
> 1. Query all events [v1, v2, v3, v4, v5]
> 2. Detect OrderRolledBack event (v5)
> 3. Filter: only process events ≤ rollback point (v1)
> 4. Apply only: [OrderCreated(v1)]
> 5. Result: Order in original state
> ```"

**Bước 16: Time Travel Verification**
**Action:** Click "Get Order" và compare với Current Order section

**Người thuyết trình:**
> "Verification hoàn tất! So sánh:

**Current Order (Post-Rollback):**
> - Status: PENDING ✓
> - Items: Original items only ✓
> - Total: Original amount ✓
> - Last updated timestamp: Recent ✓

**Event OrderCreated (v1) data:**
> - Status: PENDING ✓ (match!)
> - Items: Same original items ✓ (match!)
> - Customer: Same ✓ (match!)

**Proof of Time Travel:** Current state = State at Version 1!

**But we can still 'travel forward' nếu cần - vì ALL EVENTS vẫn tồn tại!"

**Bước 17: Demonstrate Rollback Auditability**
**Người thuyết trình:**
> "Event Sourcing Rollback khác hoàn toàn Database Rollback:

**Traditional Database Rollback:**
> ```sql
> BEGIN TRANSACTION;
> DELETE FROM order_items WHERE order_id = 'xxx' AND created_after = '2024-01-01';
> UPDATE orders SET status = 'PENDING' WHERE id = 'xxx';
> COMMIT;
> ```
> ❌ **Data Loss:** Không biết items nào đã bị xóa
> ❌ **No Audit:** Không biết ai rollback, tại sao
> ❌ **Irreversible:** Không thể undo rollback

**Event Sourcing Rollback:**
> ```
> Append: OrderRolledBack Event {
>   rollbackPoint: 'Version 1',
>   triggeredBy: 'user-123',
>   reason: 'Customer request',
>   undoneEvents: [v2, v3, v4],
>   timestamp: '2024-01-15T10:30:00Z'
> }
> ```
> ✅ **Zero Data Loss:** All events preserved
> ✅ **Complete Audit:** Who, when, why, what was undone
> ✅ **Reversible:** Can rollback the rollback!

**Business Value:**
> - Compliance: Complete audit trail for regulatory
> - Recovery: Can undo accidental rollbacks
> - Analysis: Understand patterns of rollback requests
> - Debugging: Exact reproduction of any historical state"

---

## 🎯 Kết Luận Demo

**Người thuyết trình:**
> "Event Sourcing không chỉ là một pattern kỹ thuật mà còn là cách tiếp cận business-centric, giúp chúng ta hiểu rõ 'điều gì đã xảy ra' thay vì chỉ 'trạng thái hiện tại là gì'.

> **Những gì chúng ta đã demo:**
> 1. **Event Generation:** Mọi business action tạo events
> 2. **State Rebuild:** Current state = replay events  
> 3. **Immutable History:** Events không bao giờ bị mất
> 4. **Time Travel:** Rollback về bất kỳ thời điểm nào
> 5. **Perfect Auditability:** Complete trail của mọi thay đổi
> 6. **Zero Data Loss:** Rollback không phá hủy dữ liệu

> **Use Cases lý tưởng:**
> - **Financial Systems:** Audit trail cho compliance
> - **E-commerce:** Rollback orders, analyze customer behavior  
> - **Healthcare:** Patient history không được phép mất
> - **Legal Systems:** Evidence trail immutable
> - **IoT/Monitoring:** Time-series data analysis

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

**Q: Rollback có thể bị abuse không?**
A: Rollback tạo audit trail, có thể restrict permissions. Business rules có thể limit rollback scope.

**Q: Performance của rollback với nhiều events?**
A: Snapshot patterns giúp optimize. Rollback về snapshot gần nhất thay vì replay từ đầu.

**Q: Làm sao handle concurrent rollbacks?**
A: Event versioning và optimistic locking. Rollback conflicts tạo events riêng để audit.

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
- **Rollback tạo event mới, không xóa events cũ**
- **Time travel hoàn toàn reversible**

### Rollback Demo Key Points
- **Chọn order có ít nhất 3-4 events** để rollback effect rõ ràng
- **Highlight data preservation** - events cũ không bị xóa
- **Show audit trail** của rollback action
- **Demonstrate reversibility** - có thể rollback cái rollback
- **Compare với traditional database rollback** để thấy difference

### Troubleshooting
- Nếu backend không response: Check terminal logs
- Nếu events không hiển thị: Verify API endpoint connectivity
- Nếu UI lag: Reduce event payload size trong demo
- **Nếu rollback không hoạt động: Check orderId chính xác và có events để rollback**
- **Nếu rollback result không hiển thị: Refresh browser hoặc check network tab**

### Demo Tips
- Chuẩn bị dữ liệu mẫu trước
- Practice transition giữa các bước
- Highlight key concepts trong mỗi action
- Prepare backup scenarios nếu có technical issues
- **Practice rollback demo với different scenarios (version vs timestamp)**
- **Prepare explanation cho business value của rollback capability**

---

*Thời gian demo: 20-25 phút (thêm 4-5 phút cho phần rollback)*  
*Audience: Technical team, stakeholders quan tâm đến architecture decisions*
