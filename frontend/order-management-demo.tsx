"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle, XCircle, Package, CreditCard, Search, Clock, Plus, Trash2 } from "lucide-react"
import { orderApi, type OrderResponse, type EventResponse, type OrderItem } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

// Types
interface ApiResponse {
  success: boolean
  data?: any
  error?: string
}

// Fake API functions
const fakeApi = {
  createOrder: async (data: { orderId: string; userId: string }): Promise<ApiResponse> => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return {
      success: true,
      data: { orderId: data.orderId, userId: data.userId, status: "created" },
    }
  },

  addItem: async (
    orderId: string,
    data: { productId: string; quantity: number; price: number },
  ): Promise<ApiResponse> => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    return {
      success: true,
      data: { orderId, ...data, addedAt: new Date().toISOString() },
    }
  },

  payOrder: async (orderId: string, data: { paymentId: string; amount: number }): Promise<ApiResponse> => {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    return {
      success: true,
      data: { orderId, ...data, paidAt: new Date().toISOString() },
    }
  },

  getEvents: async (orderId: string): Promise<ApiResponse> => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    const events: OrderEvent[] = [
      {
        id: "1",
        type: "OrderCreated",
        payload: { orderId, userId: "user123" },
        timestamp: "2024-01-15T10:00:00Z",
      },
      {
        id: "2",
        type: "ItemAdded",
        payload: { productId: "prod456", quantity: 2, price: 29.99 },
        timestamp: "2024-01-15T10:05:00Z",
      },
      {
        id: "3",
        type: "PaymentConfirmed",
        payload: { paymentId: "pay789", amount: 59.98 },
        timestamp: "2024-01-15T10:10:00Z",
      },
    ]
    return { success: true, data: events }
  },

  getState: async (orderId: string): Promise<ApiResponse> => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const state: OrderState = {
      id: orderId,
      userId: "user123",
      status: "paid",
      items: [{ productId: "prod456", quantity: 2, price: 29.99 }],
      totalAmount: 59.98,
      paymentId: "pay789",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:10:00Z",
    }
    return { success: true, data: state }
  },
}

export default function OrderManagementDemo() {
  // Form states
  const [createOrderForm, setCreateOrderForm] = useState({ orderId: "", userId: "" })
  const [addItemForm, setAddItemForm] = useState({ orderId: "", productId: "", quantity: 1, price: 0 })
  const [payOrderForm, setPayOrderForm] = useState({ orderId: "", paymentId: "", amount: 0 })
  const [searchOrderId, setSearchOrderId] = useState("")

  // Loading states
  const [loading, setLoading] = useState({
    createOrder: false,
    addItem: false,
    payOrder: false,
    getEvents: false,
    getState: false,
  })

  // Response states
  const [responses, setResponses] = useState({
    createOrder: null as ApiResponse | null,
    addItem: null as ApiResponse | null,
    payOrder: null as ApiResponse | null,
    events: null as OrderEvent[] | null,
    state: null as OrderState | null,
  })

  const setLoadingState = (key: keyof typeof loading, value: boolean) => {
    setLoading((prev) => ({ ...prev, [key]: value }))
  }

  const resetForm = (formType: "createOrder" | "addItem" | "payOrder") => {
    switch (formType) {
      case "createOrder":
        setCreateOrderForm({ orderId: "", userId: "" })
        break
      case "addItem":
        setAddItemForm({ orderId: "", productId: "", quantity: 1, price: 0 })
        break
      case "payOrder":
        setPayOrderForm({ orderId: "", paymentId: "", amount: 0 })
        break
    }
  }

  const handleCreateOrder = async () => {
    setLoadingState("createOrder", true)
    try {
      const response = await fakeApi.createOrder(createOrderForm)
      setResponses((prev) => ({ ...prev, createOrder: response }))
      if (response.success) {
        resetForm("createOrder")
      }
    } catch (error) {
      setResponses((prev) => ({ ...prev, createOrder: { success: false, error: "Network error" } }))
    }
    setLoadingState("createOrder", false)
  }

  const handleAddItem = async () => {
    setLoadingState("addItem", true)
    try {
      const response = await fakeApi.addItem(addItemForm.orderId, {
        productId: addItemForm.productId,
        quantity: addItemForm.quantity,
        price: addItemForm.price,
      })
      setResponses((prev) => ({ ...prev, addItem: response }))
      if (response.success) {
        resetForm("addItem")
      }
    } catch (error) {
      setResponses((prev) => ({ ...prev, addItem: { success: false, error: "Network error" } }))
    }
    setLoadingState("addItem", false)
  }

  const handlePayOrder = async () => {
    setLoadingState("payOrder", true)
    try {
      const response = await fakeApi.payOrder(payOrderForm.orderId, {
        paymentId: payOrderForm.paymentId,
        amount: payOrderForm.amount,
      })
      setResponses((prev) => ({ ...prev, payOrder: response }))
      if (response.success) {
        resetForm("payOrder")
      }
    } catch (error) {
      setResponses((prev) => ({ ...prev, payOrder: { success: false, error: "Network error" } }))
    }
    setLoadingState("payOrder", false)
  }

  const handleGetEvents = async () => {
    if (!searchOrderId) return
    setLoadingState("getEvents", true)
    try {
      const response = await fakeApi.getEvents(searchOrderId)
      if (response.success) {
        setResponses((prev) => ({ ...prev, events: response.data }))
      }
    } catch (error) {
      setResponses((prev) => ({ ...prev, events: null }))
    }
    setLoadingState("getEvents", false)
  }

  const handleGetState = async () => {
    if (!searchOrderId) return
    setLoadingState("getState", true)
    try {
      const response = await fakeApi.getState(searchOrderId)
      if (response.success) {
        setResponses((prev) => ({ ...prev, state: response.data }))
      }
    } catch (error) {
      setResponses((prev) => ({ ...prev, state: null }))
    }
    setLoadingState("getState", false)
  }

  const ResponseMessage = ({ response }: { response: ApiResponse | null }) => {
    if (!response) return null

    return (
      <div
        className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
          response.success
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}
      >
        {response.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        <span className="text-sm font-medium">{response.success ? "Thành công!" : `Lỗi: ${response.error}`}</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Demo Hệ Thống Quản Lý Đơn Hàng</h1>
        <p className="text-gray-600">Event Sourcing Pattern Demo với React & Tailwind CSS</p>
      </div>

      <Tabs defaultValue="operations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="operations">Thao Tác Đơn Hàng</TabsTrigger>
          <TabsTrigger value="query">Truy Vấn & Xem Kết Quả</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tạo đơn hàng mới */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Tạo Đơn Hàng Mới
                </CardTitle>
                <CardDescription>Tạo một đơn hàng mới trong hệ thống</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-order-id">Order ID</Label>
                  <Input
                    id="create-order-id"
                    placeholder="Nhập Order ID"
                    value={createOrderForm.orderId}
                    onChange={(e) => setCreateOrderForm((prev) => ({ ...prev, orderId: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-user-id">User ID</Label>
                  <Input
                    id="create-user-id"
                    placeholder="Nhập User ID"
                    value={createOrderForm.userId}
                    onChange={(e) => setCreateOrderForm((prev) => ({ ...prev, userId: e.target.value }))}
                  />
                </div>
                <Button
                  onClick={handleCreateOrder}
                  disabled={loading.createOrder || !createOrderForm.orderId || !createOrderForm.userId}
                  className="w-full"
                >
                  {loading.createOrder ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    "Tạo Đơn Hàng"
                  )}
                </Button>
                <ResponseMessage response={responses.createOrder} />
              </CardContent>
            </Card>

            {/* Thêm sản phẩm */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Thêm Sản Phẩm
                </CardTitle>
                <CardDescription>Thêm sản phẩm vào đơn hàng</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="add-order-id">Order ID</Label>
                  <Input
                    id="add-order-id"
                    placeholder="Nhập Order ID"
                    value={addItemForm.orderId}
                    onChange={(e) => setAddItemForm((prev) => ({ ...prev, orderId: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-id">Product ID</Label>
                  <Input
                    id="product-id"
                    placeholder="Nhập Product ID"
                    value={addItemForm.productId}
                    onChange={(e) => setAddItemForm((prev) => ({ ...prev, productId: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Số lượng</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={addItemForm.quantity}
                      onChange={(e) =>
                        setAddItemForm((prev) => ({ ...prev, quantity: Number.parseInt(e.target.value) || 1 }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Giá</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={addItemForm.price}
                      onChange={(e) =>
                        setAddItemForm((prev) => ({ ...prev, price: Number.parseFloat(e.target.value) || 0 }))
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddItem}
                  disabled={loading.addItem || !addItemForm.orderId || !addItemForm.productId}
                  className="w-full"
                >
                  {loading.addItem ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang thêm...
                    </>
                  ) : (
                    "Thêm Sản Phẩm"
                  )}
                </Button>
                <ResponseMessage response={responses.addItem} />
              </CardContent>
            </Card>

            {/* Xác nhận thanh toán */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Xác Nhận Thanh Toán
                </CardTitle>
                <CardDescription>Xác nhận thanh toán cho đơn hàng</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pay-order-id">Order ID</Label>
                  <Input
                    id="pay-order-id"
                    placeholder="Nhập Order ID"
                    value={payOrderForm.orderId}
                    onChange={(e) => setPayOrderForm((prev) => ({ ...prev, orderId: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-id">Payment ID</Label>
                  <Input
                    id="payment-id"
                    placeholder="Nhập Payment ID"
                    value={payOrderForm.paymentId}
                    onChange={(e) => setPayOrderForm((prev) => ({ ...prev, paymentId: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Số tiền</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={payOrderForm.amount}
                    onChange={(e) =>
                      setPayOrderForm((prev) => ({ ...prev, amount: Number.parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
                <Button
                  onClick={handlePayOrder}
                  disabled={loading.payOrder || !payOrderForm.orderId || !payOrderForm.paymentId}
                  className="w-full"
                >
                  {loading.payOrder ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    "Xác Nhận Thanh Toán"
                  )}
                </Button>
                <ResponseMessage response={responses.payOrder} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="query" className="space-y-6">
          {/* Search Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Tìm Kiếm Đơn Hàng
              </CardTitle>
              <CardDescription>Nhập Order ID để xem lịch sử sự kiện và trạng thái hiện tại</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="search-order-id">Order ID</Label>
                  <Input
                    id="search-order-id"
                    placeholder="Nhập Order ID để tìm kiếm"
                    value={searchOrderId}
                    onChange={(e) => setSearchOrderId(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleGetEvents} disabled={loading.getEvents || !searchOrderId} variant="outline">
                    {loading.getEvents ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Clock className="mr-2 h-4 w-4" />
                    )}
                    Xem Event History
                  </Button>
                  <Button onClick={handleGetState} disabled={loading.getState || !searchOrderId}>
                    {loading.getState ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Xem Trạng Thái
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event History */}
            <Card>
              <CardHeader>
                <CardTitle>Event History</CardTitle>
                <CardDescription>Lịch sử các sự kiện của đơn hàng</CardDescription>
              </CardHeader>
              <CardContent>
                {responses.events ? (
                  <div className="space-y-4">
                    {responses.events.map((event, index) => (
                      <div key={event.id} className="border-l-4 border-blue-500 pl-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">{event.type}</Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                        {index < responses.events.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có dữ liệu event history</p>
                    <p className="text-sm">Nhập Order ID và nhấn "Xem Event History"</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current State */}
            <Card>
              <CardHeader>
                <CardTitle>Trạng Thái Hiện Tại</CardTitle>
                <CardDescription>Trạng thái tổng hợp của đơn hàng</CardDescription>
              </CardHeader>
              <CardContent>
                {responses.state ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Trạng thái:</span>
                      <Badge variant={responses.state.status === "paid" ? "default" : "secondary"}>
                        {responses.state.status}
                      </Badge>
                    </div>
                    <Separator />
                    <Textarea
                      value={JSON.stringify(responses.state, null, 2)}
                      readOnly
                      className="min-h-[300px] font-mono text-xs"
                    />
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có dữ liệu trạng thái</p>
                    <p className="text-sm">Nhập Order ID và nhấn "Xem Trạng Thái"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
