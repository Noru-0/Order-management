"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle, XCircle, Package, Plus, Trash2, Search } from "lucide-react"
import { orderApi, type OrderResponse, type EventResponse, type OrderItem } from "@/lib/api-client"

export default function OrderManagementDemo() {
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
    healthCheck: false,
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
  const handleHealthCheck = async () => {
    setLoadingState("healthCheck", true)
    try {
      const response = await orderApi.healthCheck()
      showResponse(response, "Health Check")
    } catch (error) {
      showError("Network error", "Health Check")
    }
    setLoadingState("healthCheck", false)
  }

  const handleCreateOrder = async () => {
    setLoadingState("createOrder", true)
    try {
      const response = await orderApi.createOrder(createOrderForm)
      showResponse(response, "Create Order")
      if (response.success && response.data) {
        setOrderId(response.data.orderId)
        setSearchOrderId(response.data.orderId)
      }
    } catch (error) {
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
    if (!searchOrderId) return
    setLoadingState("getEvents", true)
    try {
      const response = await orderApi.getOrderEvents(searchOrderId)
      showResponse(response, "Get Order Events")
      if (response.success && response.data) {
        setOrderEvents(response.data)
      }
    } catch (error) {
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
    setLoadingState("getEvents", true)
    try {
      const response = await orderApi.getAllEvents()
      showResponse(response, "Get All Events")
      if (response.success && response.data) {
        setAllEvents(response.data)
      }
    } catch (error) {
      showError("Network error", "Get All Events")
    }
    setLoadingState("getEvents", false)
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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Sourcing Order Management</h1>
        <p className="text-gray-600">
          Demo tích hợp frontend với backend Order Management System sử dụng Event Sourcing và CQRS
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Controls */}
        <div className="space-y-6">
          {/* Health Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Health Check
              </CardTitle>
              <CardDescription>Kiểm tra kết nối với backend</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleHealthCheck} 
                disabled={loading.healthCheck}
                className="w-full"
              >
                {loading.healthCheck && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kiểm tra Server
              </Button>
            </CardContent>
          </Card>

          {/* Create Order */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Tạo Order Mới
              </CardTitle>
              <CardDescription>Tạo order với command CreateOrder</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="space-y-2 mt-2">
                  {createOrderForm.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.productName}</div>
                        <div className="text-xs text-gray-500">
                          {item.productId} - Qty: {item.quantity} - ${item.price}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
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
                <Button onClick={addItemToForm} size="sm" className="mt-2">
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
          <Card>
            <CardHeader>
              <CardTitle>Order Operations</CardTitle>
              <CardDescription>Các thao tác với order đã tạo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

          {/* Query Operations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Query Operations
              </CardTitle>
              <CardDescription>Truy vấn thông tin order và events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  variant="outline"
                >
                  {loading.getOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Get Order
                </Button>
                <Button 
                  onClick={handleGetOrderEvents} 
                  disabled={loading.getEvents}
                  variant="outline"
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
                  variant="outline"
                >
                  {loading.getAllOrders && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  All Orders
                </Button>
                <Button 
                  onClick={handleGetAllEvents} 
                  disabled={loading.getEvents}
                  variant="outline"
                >
                  {loading.getEvents && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  All Events
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Data Display */}
        <div className="space-y-6">
          {/* Current Order */}
          {currentOrder && (
            <Card>
              <CardHeader>
                <CardTitle>Current Order</CardTitle>
                <CardDescription>Thông tin order hiện tại</CardDescription>
              </CardHeader>
              <CardContent>
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
                  
                  <Separator className="my-3" />
                  
                  <div>
                    <div className="font-medium mb-2">Items:</div>
                    {currentOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm py-1">
                        <div>
                          <div>{item.productName}</div>
                          <div className="text-gray-500 text-xs">{item.productId}</div>
                        </div>
                        <div className="text-right">
                          <div>{item.quantity} x ${item.price}</div>
                          <div className="text-gray-500 text-xs">${(item.quantity * item.price).toFixed(2)}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveItem(item.productId)}
                          disabled={loading.removeItem}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Events */}
          {orderEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Events</CardTitle>
                <CardDescription>Event history của order</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {orderEvents.map((event, index) => (
                    <div key={event.id} className="border rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{event.type}</div>
                          <div className="text-sm text-gray-500">Version: {event.version}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="mt-2 text-xs bg-gray-50 p-2 rounded font-mono">
                        {JSON.stringify(event.data, null, 2)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Orders */}
          {allOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>Danh sách tất cả orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {allOrders.map((order) => (
                    <div key={order.id} className="border rounded p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{order.id}</div>
                          <div className="text-sm text-gray-500">{order.customerId}</div>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={order.status} />
                          <div className="text-sm font-bold">${order.totalAmount}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Response Display */}
          {lastResponse && (
            <Card>
              <CardHeader>
                <CardTitle>Last Response</CardTitle>
                <CardDescription>Phản hồi từ API gần nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-96">
                  {lastResponse}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
