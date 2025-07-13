"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Package, Plus, Trash2, Search } from "lucide-react"
import { orderApi, type OrderResponse, type EventResponse, type OrderItem, type OrderEventsResponse, type AllEventsResponse } from "@/lib/api-client"

export default function OrderManagementDemo() {
  // Hydration fix
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Form states
  const [createOrderForm, setCreateOrderForm] = useState({
    customerId: "customer-001",
    items: [
      { productId: "product-001", productName: "Laptop Dell XPS", quantity: 1, price: 1500 },
      { productId: "product-002", productName: "Mouse Wireless", quantity: 2, price: 25 }
    ] as OrderItem[]
  })

  const [newItem, setNewItem] = useState({
    productId: "",
    productName: "",
    quantity: 1,
    price: 0
  })

  const [orderId, setOrderId] = useState("")
  const [newStatus, setNewStatus] = useState("CONFIRMED")
  const [searchOrderId, setSearchOrderId] = useState("")

  // Loading states
  const [loading, setLoading] = useState({
    createOrder: false,
    updateStatus: false,
    addItem: false,
    removeItem: false,
    getOrder: false,
    getEvents: false,
    getAllOrders: false,
    getAllEvents: false,
  })

  // Response states
  const [currentOrder, setCurrentOrder] = useState<OrderResponse | null>(null)
  const [orderEvents, setOrderEvents] = useState<EventResponse[]>([])
  const [allOrders, setAllOrders] = useState<OrderResponse[]>([])
  const [allEvents, setAllEvents] = useState<EventResponse[]>([])
  const [lastResponse, setLastResponse] = useState<string>("")

  // Helper functions
  const setLoadingState = (key: keyof typeof loading, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }))
  }

  const showResponse = (response: any, action: string) => {
    setLastResponse(`${action}: ${JSON.stringify(response, null, 2)}`)
  }

  const showError = (error: string, action: string) => {
    setLastResponse(`${action} Error: ${error}`)
  }

  // API handlers
  const handleCreateOrder = async () => {
    setLoadingState("createOrder", true)
    try {
      console.log("Creating order with data:", createOrderForm)
      const response = await orderApi.createOrder(createOrderForm)
      console.log("Create Order Response:", response)
      showResponse(response, "Create Order")
      if (response.success && response.data) {
        console.log("Order created successfully:", response.data)
        setOrderId(response.data.orderId)
        setSearchOrderId(response.data.orderId)
      }
    } catch (error) {
      console.error("Create Order Error:", error)
      showError("Network error", "Create Order")
    }
    setLoadingState("createOrder", false)
  }

  const handleGetOrder = async () => {
    if (!searchOrderId) return
    setLoadingState("getOrder", true)
    try {
      const response = await orderApi.getOrder(searchOrderId)
      showResponse(response, "Get Order")
      if (response.success && response.data) {
        setCurrentOrder(response.data)
      }
    } catch (error) {
      showError("Network error", "Get Order")
    }
    setLoadingState("getOrder", false)
  }

  const handleUpdateStatus = async () => {
    if (!orderId) return
    setLoadingState("updateStatus", true)
    try {
      const response = await orderApi.updateOrderStatus(orderId, { status: newStatus })
      showResponse(response, "Update Status")
    } catch (error) {
      showError("Network error", "Update Status")
    }
    setLoadingState("updateStatus", false)
  }

  const handleAddItem = async () => {
    if (!orderId || !newItem.productId) return
    setLoadingState("addItem", true)
    try {
      const response = await orderApi.addOrderItem(orderId, { item: newItem })
      showResponse(response, "Add Item")
      if (response.success) {
        setNewItem({ productId: "", productName: "", quantity: 1, price: 0 })
      }
    } catch (error) {
      showError("Network error", "Add Item")
    }
    setLoadingState("addItem", false)
  }

  const handleRemoveItem = async (productId: string) => {
    if (!orderId) return
    setLoadingState("removeItem", true)
    try {
      const response = await orderApi.removeOrderItem(orderId, productId)
      showResponse(response, "Remove Item")
    } catch (error) {
      showError("Network error", "Remove Item")
    }
    setLoadingState("removeItem", false)
  }

  const handleGetOrderEvents = async () => {
    if (!searchOrderId) {
      showError("Vui lòng nhập Order ID để tìm kiếm events", "Get Order Events")
      return
    }
    setLoadingState("getEvents", true)
    try {
      console.log("Getting events for order:", searchOrderId)
      const response = await orderApi.getOrderEvents(searchOrderId)
      console.log("Get Order Events Response:", response)
      showResponse(response, "Get Order Events")
      if (response.success && response.data && response.data.events) {
        console.log("Setting order events:", response.data.events)
        setOrderEvents(response.data.events)
      } else {
        console.log("No events data or failed response:", response)
        setOrderEvents([])
      }
    } catch (error) {
      console.error("Get Order Events Error:", error)
      showError("Network error", "Get Order Events")
    }
    setLoadingState("getEvents", false)
  }

  const handleGetAllOrders = async () => {
    setLoadingState("getAllOrders", true)
    try {
      const response = await orderApi.getAllOrders()
      showResponse(response, "Get All Orders")
      if (response.success && response.data) {
        setAllOrders(response.data)
      }
    } catch (error) {
      showError("Network error", "Get All Orders")
    }
    setLoadingState("getAllOrders", false)
  }

  const handleGetAllEvents = async () => {
    setLoadingState("getAllEvents", true)
    try {
      console.log("Getting all events...")
      const response = await orderApi.getAllEvents()
      console.log("Get All Events Response:", response)
      showResponse(response, "Get All Events")
      if (response.success && response.data && response.data.events) {
        console.log("Setting all events:", response.data.events)
        setAllEvents(response.data.events)
      } else {
        console.log("No events data or failed response:", response)
        setAllEvents([])
      }
    } catch (error) {
      console.error("Get All Events Error:", error)
      showError("Network error", "Get All Events")
    }
    setLoadingState("getAllEvents", false)
  }

  const handleHealthCheck = async () => {
    try {
      console.log("Checking backend health...")
      const response = await orderApi.healthCheck()
      console.log("Health check response:", response)
      showResponse(response, "Health Check")
    } catch (error) {
      console.error("Health check error:", error)
      showError("Backend không hoạt động", "Health Check")
    }
  }

  const addItemToForm = () => {
    if (!newItem.productId) return
    setCreateOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { ...newItem }]
    }))
    setNewItem({ productId: "", productName: "", quantity: 1, price: 0 })
  }

  const removeItemFromForm = (index: number) => {
    setCreateOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusColor = (status: string) => {
      switch (status.toUpperCase()) {
        case "PENDING": return "bg-yellow-100 text-yellow-800"
        case "CONFIRMED": return "bg-blue-100 text-blue-800"
        case "SHIPPED": return "bg-purple-100 text-purple-800"
        case "DELIVERED": return "bg-green-100 text-green-800"
        case "CANCELLED": return "bg-red-100 text-red-800"
        default: return "bg-gray-100 text-gray-800"
      }
    }

    return (
      <Badge className={getStatusColor(status)}>
        {status}
      </Badge>
    )
  }

  // Prevent hydration mismatch
  if (!isClient) {
    return (
      <div className="h-screen overflow-hidden px-24 pb-4">
        <div className="h-full flex flex-col">
          <div className="py-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Event Sourcing Order Management</h1>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
            <div className="flex flex-col space-y-4 min-h-0">
              <Card className="flex-shrink-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Tạo Order Mới
                  </CardTitle>
                  <CardDescription>Tạo order với command CreateOrder</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-col space-y-4 min-h-0">
              <Card className="flex-shrink-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Query Operations
                  </CardTitle>
                  <CardDescription>Truy vấn thông tin order và events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-col space-y-4 min-h-0">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden" style={{ padding: "0 6rem 1rem 6rem" }}>
      <div className="h-full flex flex-col p-2">
        <div className="py-2 text-center">
          <h1 className="text-xl font-bold text-gray-900">Event Sourcing Order Management</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 flex-1 min-h-0 p-2">
        {/* Column 1 - Create Order & Order Operations - 2 fractions */}
        <div className="lg:col-span-2 flex flex-col space-y-3 min-h-0">
          {/* Create Order */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Tạo Order Mới
              </CardTitle>
              <CardDescription className="text-sm">Tạo order với command CreateOrder</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <Label>Customer ID</Label>
                <Input
                  value={createOrderForm.customerId}
                  onChange={(e) => setCreateOrderForm(prev => ({ ...prev, customerId: e.target.value }))}
                  placeholder="customer-001"
                />
              </div>

              <div>
                <Label>Items</Label>
                <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                  {createOrderForm.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.productName}</div>
                        <div className="text-xs text-gray-500">
                          {item.productId} - Qty: {item.quantity} - ${item.price}
                        </div>
                      </div>
                      <Button
                        className="h-8 w-8 p-0"
                        onClick={() => removeItemFromForm(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      placeholder="Product ID"
                      value={newItem.productId}
                      onChange={(e) => setNewItem(prev => ({ ...prev, productId: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Product Name"
                      value={newItem.productName}
                      onChange={(e) => setNewItem(prev => ({ ...prev, productName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={newItem.price}
                      onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <Button onClick={addItemToForm} className="mt-2 w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <Button 
                onClick={handleCreateOrder} 
                disabled={loading.createOrder}
                className="w-full"
              >
                {loading.createOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tạo Order
              </Button>
            </CardContent>
          </Card>

          {/* Order Operations */}
          <Card className="flex-1 min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Operations</CardTitle>
              <CardDescription className="text-sm">Các thao tác với order đã tạo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto h-full pt-0 max-h-96">
              <div>
                <Label>Order ID</Label>
                <Input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Order ID để thao tác"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Status</Label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="SHIPPED">SHIPPED</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleUpdateStatus} 
                    disabled={loading.updateStatus}
                    className="w-full"
                  >
                    {loading.updateStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Status
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Add New Item</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Input
                    placeholder="Product ID"
                    value={newItem.productId}
                    onChange={(e) => setNewItem(prev => ({ ...prev, productId: e.target.value }))}
                  />
                  <Input
                    placeholder="Product Name"
                    value={newItem.productName}
                    onChange={(e) => setNewItem(prev => ({ ...prev, productName: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={newItem.price}
                    onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <Button 
                  onClick={handleAddItem} 
                  disabled={loading.addItem}
                  className="w-full mt-2"
                >
                  {loading.addItem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Item to Order
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2 - Query Operations & Last Response - 2 fractions */}
        <div className="lg:col-span-2 flex flex-col space-y-3 min-h-0">
          {/* Query Operations */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4" />
                Query Operations
              </CardTitle>
              <CardDescription className="text-sm">Truy vấn thông tin order và events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <Label>Search Order ID</Label>
                <Input
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  placeholder="Order ID để tìm kiếm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleGetOrder} 
                  disabled={loading.getOrder}
                  className="w-full"
                >
                  {loading.getOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Get Order
                </Button>
                <Button 
                  onClick={handleGetOrderEvents} 
                  disabled={loading.getEvents}
                  className="w-full"
                >
                  {loading.getEvents && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Get Events
                </Button>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleGetAllOrders} 
                  disabled={loading.getAllOrders}
                  className="w-full"
                >
                  {loading.getAllOrders && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  All Orders
                </Button>
                <Button 
                  onClick={handleGetAllEvents} 
                  disabled={loading.getAllEvents}
                  className="w-full"
                >
                  {loading.getAllEvents && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  All Events
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Response Display */}
          <Card className="flex-1 min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Last Response</CardTitle>
              <CardDescription className="text-sm">Phản hồi từ API gần nhất</CardDescription>
            </CardHeader>
            <CardContent className="h-full pt-0 p-3">
              {lastResponse ? (
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto h-full max-h-[36rem] m-4">
                  {lastResponse}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 m-2">
                  <p>Chưa có response nào</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Column 3 - Current Order & All Orders & Events - 3 fractions */}
        <div className="lg:col-span-3 flex flex-col space-y-3 min-h-0">
          {/* Current Order */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Current Order</CardTitle>
              <CardDescription className="text-sm">Thông tin order hiện tại</CardDescription>
            </CardHeader>
            <CardContent className="p-3 max-h-52 overflow-y-auto">
              {currentOrder ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>ID:</span>
                    <span className="font-mono text-sm">{currentOrder.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{currentOrder.customerId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <StatusBadge status={currentOrder.status} />
                  </div>
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-bold">${currentOrder.totalAmount}</span>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div>
                    <div className="font-medium mb-2">Items:</div>
                    {currentOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm py-1">
                        <div>
                          <div>{item.productName}</div>
                          <div className="text-gray-500 text-xs">{item.productId}</div>
                        </div>
                        <div className="text-right">
                          <div>{item.quantity} x ${item.price}</div>
                          <div className="text-gray-500 text-xs">${(item.quantity * item.price).toFixed(2)}</div>
                        </div>
                        <Button
                          className="h-6 w-6 p-0 ml-2"
                          onClick={() => handleRemoveItem(item.productId)}
                          disabled={loading.removeItem}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-4">
                  <p>Chưa có order nào được chọn</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grid layout for All Orders and Order Events */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 flex-1 min-h-0">
            {/* All Orders */}
            <Card className="flex flex-col min-h-0">
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="text-base">All Orders</CardTitle>
                <CardDescription className="text-sm">Danh sách tất cả orders</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-3">
                {allOrders.length > 0 ? (
                  <div className="space-y-2">
                    {allOrders.map((order) => (
                      <div key={order.id} className="border rounded p-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">{order.id}</div>
                            <div className="text-xs text-gray-500">{order.customerId}</div>
                          </div>
                          <div className="text-right">
                            <StatusBadge status={order.status} />
                            <div className="text-sm font-bold">${order.totalAmount}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    <p>Chưa có orders nào</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Events */}
            <Card className="flex flex-col min-h-0">
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="text-base">Order Events</CardTitle>
                <CardDescription className="text-sm">Event history của order</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-3">
                {(orderEvents.length > 0 || allEvents.length > 0) ? (
                  <div className="space-y-2">
                    {/* Show specific order events first if they exist */}
                    {orderEvents.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-blue-600 mb-2">Specific Order Events:</div>
                        {orderEvents.map((event, index) => (
                          <div key={`order-${event.id || index}`} className="border rounded p-2 bg-blue-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">{event.type}</div>
                                <div className="text-xs text-gray-500">V: {event.version}</div>
                                <div className="text-xs text-blue-600">{event.aggregateId.substring(0, 8)}...</div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="mt-1 text-xs bg-white p-1 rounded font-mono overflow-auto max-h-16">
                              {JSON.stringify(event.data, null, 2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Show all events if they exist */}
                    {allEvents.length > 0 && (
                      <div>
                        {orderEvents.length > 0 && <div className="my-2 border-t"></div>}
                        <div className="text-xs font-semibold text-green-600 mb-2">All System Events:</div>
                        {allEvents.map((event, index) => (
                          <div key={`all-${event.id || index}`} className="border rounded p-2 bg-green-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">{event.type}</div>
                                <div className="text-xs text-gray-500">V: {event.version}</div>
                                <div className="text-xs text-green-600">{event.aggregateId.substring(0, 8)}...</div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="mt-1 text-xs bg-white p-1 rounded font-mono overflow-auto max-h-16">
                              {JSON.stringify(event.data, null, 2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    <p>Chưa có events nào</p>
                    <p className="text-xs mt-1">Sử dụng "Get Events" hoặc "All Events"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
