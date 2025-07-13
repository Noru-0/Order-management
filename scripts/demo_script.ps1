# Event Sourcing Demo Script
# Usage: .\demo_script.ps1

$BaseUrl = "http://localhost:3001"
$OrderId = ""

Write-Host "🚀 Event Sourcing Demo" -ForegroundColor Blue
Write-Host "=====================" -ForegroundColor Blue

function Print-Step($step, $description) {
    Write-Host "`n📍 Step $step`: $description" -ForegroundColor Cyan
    Write-Host "-----------------------------------" -ForegroundColor Gray
}

function Print-Success($message) {
    Write-Host "✅ $message" -ForegroundColor Green
}

function Wait-Input() {
    Write-Host "`nPress Enter to continue..." -ForegroundColor Yellow
    Read-Host
}

# Bước 0: Health Check
Print-Step "0" "Health Check"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    $response | ConvertTo-Json -Depth 5
    Print-Success "Server đang hoạt động"
} catch {
    Write-Host "❌ Server không phản hồi. Vui lòng chạy 'npm run dev' trước." -ForegroundColor Red
    exit 1
}
Wait-Input

# Step 1: Create Order
Print-Step "1" "Create New Order"
$orderData = @{
    customerId = "customer-001"
    items = @(
        @{
            productId = "product-001"
            productName = "Laptop Dell XPS"
            quantity = 1
            price = 1500
        },
        @{
            productId = "product-002"
            productName = "Mouse Wireless"
            quantity = 2
            price = 25
        }
    )
} | ConvertTo-Json -Depth 5

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/orders" -Method Post -Body $orderData -ContentType "application/json"
    $response | ConvertTo-Json -Depth 5
    $OrderId = $response.data.orderId
    Print-Success "Order đã được tạo với ID: $OrderId"
    Print-Info "Event 'OrderCreated' đã được lưu vào Event Store"
} catch {
    Write-Host "❌ Lỗi tạo order: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Wait-Input

# Bước 2: Kiểm tra Order (Query)
Print-Step "2" "Truy vấn Order (State Rebuilding)"
$response = Invoke-RestMethod -Uri "$BaseUrl/api/orders/$OrderId" -Method Get
$response | ConvertTo-Json -Depth 5
Print-Info "State được rebuild từ events trong Event Store"
Wait-Input

# Bước 3: Cập nhật Order Status
Print-Step "3" "Cập nhật Status (UpdateOrderStatusCommand)"
$statusData = @{ status = "CONFIRMED" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "$BaseUrl/api/orders/$OrderId/status" -Method Put -Body $statusData -ContentType "application/json"
$response | ConvertTo-Json -Depth 5
Print-Success "Status đã được cập nhật"
Print-Info "Event 'OrderStatusUpdated' đã được append vào Event Store"
Wait-Input

# Bước 4: Kiểm tra Order sau khi update
Print-Step "4" "Kiểm tra State sau Update"
$response = Invoke-RestMethod -Uri "$BaseUrl/api/orders/$OrderId" -Method Get
$response | ConvertTo-Json -Depth 5
Print-Info "State hiện tại được rebuild từ 2 events: OrderCreated + OrderStatusUpdated"
Wait-Input

# Bước 5: Thêm Item mới
Print-Step "5" "Thêm Item mới (AddOrderItemCommand)"
$itemData = @{
    item = @{
        productId = "product-003"
        productName = "Keyboard Mechanical"
        quantity = 1
        price = 120
    }
} | ConvertTo-Json -Depth 5

$response = Invoke-RestMethod -Uri "$BaseUrl/api/orders/$OrderId/items" -Method Post -Body $itemData -ContentType "application/json"
$response | ConvertTo-Json -Depth 5
Print-Success "Item đã được thêm"
Print-Info "Event 'OrderItemAdded' đã được append"
Wait-Input

# Bước 6: Xóa Item
Print-Step "6" "Xóa Item (RemoveOrderItemCommand)"
$response = Invoke-RestMethod -Uri "$BaseUrl/api/orders/$OrderId/items/product-002" -Method Delete
$response | ConvertTo-Json -Depth 5
Print-Success "Item đã được xóa"
Print-Info "Event 'OrderItemRemoved' đã được append"
Wait-Input

# Bước 7: Xem Events của Order
Print-Step "7" "Xem Event History của Order"
$response = Invoke-RestMethod -Uri "$BaseUrl/api/debug/orders/$OrderId/events" -Method Get
$response | ConvertTo-Json -Depth 5
Print-Info "Đây là tất cả events đã được lưu cho order này"
Wait-Input

# Bước 8: Final State
Print-Step "8" "Final State - Rebuild từ tất cả Events"
Write-Host "Event Sequence:" -ForegroundColor White
Write-Host "1. OrderCreated (PENDING, 3 items, total: 1550)" -ForegroundColor White
Write-Host "2. OrderStatusUpdated (PENDING → CONFIRMED)" -ForegroundColor White
Write-Host "3. OrderItemAdded (thêm Keyboard)" -ForegroundColor White
Write-Host "4. OrderItemRemoved (xóa Mouse)" -ForegroundColor White
Write-Host ""
Write-Host "Final State:" -ForegroundColor White
$response = Invoke-RestMethod -Uri "$BaseUrl/api/orders/$OrderId" -Method Get
$response | ConvertTo-Json -Depth 5
Print-Info "State cuối cùng được rebuild từ sequence of 4 events"
Wait-Input

# Bước 9: Xem tất cả Events trong hệ thống
Print-Step "9" "Xem tất cả Events trong Event Store"
$response = Invoke-RestMethod -Uri "$BaseUrl/api/debug/events" -Method Get
$response | ConvertTo-Json -Depth 5
Print-Success "Demo completed!"

Write-Host "`n🎉 Event Sourcing Demo finished!" -ForegroundColor Green
Write-Host "`nKey Concepts:" -ForegroundColor Blue
Write-Host "✅ Immutable events for all changes" -ForegroundColor White
Write-Host "✅ State rebuilt from event sequence" -ForegroundColor White
Write-Host "✅ Complete audit trail" -ForegroundColor White
Write-Host "✅ CQRS pattern separation" -ForegroundColor White
Write-Host "✅ Append-only Event Store" -ForegroundColor White
