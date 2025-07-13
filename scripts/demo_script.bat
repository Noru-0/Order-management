@echo off
setlocal enabledelayedexpansion

REM Event Sourcing Demo Script
REM Usage: demo_script.bat

set "BaseUrl=http://localhost:3001"
set "OrderId="

echo ========================
echo  Event Sourcing Demo
echo ========================
echo.

echo Step 0: Health Check
echo -----------------------------------
curl -s %BaseUrl%/health
if errorlevel 1 (
    echo Server not responding. Please run 'npm run dev' first.
    pause
    exit /b 1
)
echo Server is running
echo.
echo Press Enter to continue...
pause >nul

echo.
echo Step 1: Create New Order
echo -----------------------------------
set "orderData={\"customerId\": \"customer-001\", \"items\": [{\"productId\": \"product-001\", \"productName\": \"Laptop Dell XPS\", \"quantity\": 1, \"price\": 1500}, {\"productId\": \"product-002\", \"productName\": \"Mouse Wireless\", \"quantity\": 2, \"price\": 25}]}"

curl -s -X POST %BaseUrl%/api/orders -H "Content-Type: application/json" -d "%orderData%" > temp_response.json
if errorlevel 1 (
    echo Failed to create order
    pause
    exit /b 1
)

REM Extract orderId from response (simple parsing)
for /f "tokens=*" %%i in (temp_response.json) do set "response=%%i"
echo !response!

REM Set OrderId for next steps (you may need to manually extract this)
set "OrderId=order-001"
echo Order created successfully
echo.
echo Press Enter to continue...
pause >nul

echo.
echo Step 2: Query Order (State Rebuilding)
echo -----------------------------------
curl -s %BaseUrl%/api/orders/%OrderId%
echo.
echo State rebuilt from events in Event Store
echo.
echo Press Enter to continue...
pause >nul

echo.
echo Step 3: Update Order Status
echo -----------------------------------
set "statusData={\"status\": \"CONFIRMED\"}"
curl -s -X PUT %BaseUrl%/api/orders/%OrderId%/status -H "Content-Type: application/json" -d "%statusData%"
echo.
echo Status updated successfully
echo Event 'OrderStatusUpdated' appended to Event Store
echo.
echo Press Enter to continue...
pause >nul

echo.
echo Step 4: Check Order After Update
echo -----------------------------------
curl -s %BaseUrl%/api/orders/%OrderId%
echo.
echo Current state rebuilt from 2 events: OrderCreated + OrderStatusUpdated
echo.
echo Press Enter to continue...
pause >nul

echo.
echo Step 5: Add New Item
echo -----------------------------------
set "itemData={\"item\": {\"productId\": \"product-003\", \"productName\": \"Keyboard Mechanical\", \"quantity\": 1, \"price\": 120}}"
curl -s -X POST %BaseUrl%/api/orders/%OrderId%/items -H "Content-Type: application/json" -d "%itemData%"
echo.
echo Item added successfully
echo Event 'OrderItemAdded' appended
echo.
echo Press Enter to continue...
pause >nul

echo.
echo Step 6: Remove Item
echo -----------------------------------
curl -s -X DELETE %BaseUrl%/api/orders/%OrderId%/items/product-002
echo.
echo Item removed successfully
echo Event 'OrderItemRemoved' appended
echo.
echo Press Enter to continue...
pause >nul

echo.
echo Step 7: View Event History
echo -----------------------------------
curl -s %BaseUrl%/api/debug/orders/%OrderId%/events
echo.
echo These are all events stored for this order
echo.
echo Press Enter to continue...
pause >nul

echo.
echo Step 8: Final State
echo -----------------------------------
echo Event Sequence:
echo 1. OrderCreated (PENDING, 3 items, total: 1550)
echo 2. OrderStatusUpdated (PENDING to CONFIRMED)
echo 3. OrderItemAdded (add Keyboard)
echo 4. OrderItemRemoved (remove Mouse)
echo.
echo Final State:
curl -s %BaseUrl%/api/orders/%OrderId%
echo.
echo Final state rebuilt from sequence of 4 events
echo.
echo Press Enter to continue...
pause >nul

echo.
echo Step 9: View All Events
echo -----------------------------------
curl -s %BaseUrl%/api/debug/events
echo.
echo Demo completed!

echo.
echo ================================
echo  Event Sourcing Demo finished!
echo ================================
echo.
echo Key Concepts:
echo - Immutable events for all changes
echo - State rebuilt from event sequence  
echo - Complete audit trail
echo - CQRS pattern separation
echo - Append-only Event Store
echo.

REM Cleanup
del temp_response.json 2>nul

echo Press any key to exit...
pause >nul
