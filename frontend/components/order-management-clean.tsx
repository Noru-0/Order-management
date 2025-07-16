"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Package, Plus, Trash2, Search } from "lucide-react"
import { orderApi, type OrderResponse, type EventResponse, type OrderItem, type OrderEventsResponse, type AllEventsResponse, type AllOrdersResponse } from "@/lib/api-client"

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
    rollback: false,
  })

  // Pagination states
  const [allEventsPagination, setAllEventsPagination] = useState({
    page: 1,
    limit: 4, // Tối đa 4 events per page
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  const [allOrdersPagination, setAllOrdersPagination] = useState({
    page: 1,
    limit: 8, // Tối đa 4 orders per page
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  const [orderEventsPagination, setOrderEventsPagination] = useState({
    page: 1,
    limit: 4, // Tối đa 4 events per page
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  // Input states
  const [rollbackOrderId, setRollbackOrderId] = useState("")
  const [rollbackVersion, setRollbackVersion] = useState("")
  const [rollbackTimestamp, setRollbackTimestamp] = useState("")

  // Response states
  const [currentOrder, setCurrentOrder] = useState<OrderResponse | null>(null)
  const [currentOrderLastUpdated, setCurrentOrderLastUpdated] = useState<Date | null>(null)
  const [orderEvents, setOrderEvents] = useState<EventResponse[]>([])
  const [allOrders, setAllOrders] = useState<OrderResponse[]>([])
  const [allEvents, setAllEvents] = useState<EventResponse[]>([])
  const [lastResponse, setLastResponse] = useState<string>("")
  const [rollbackResult, setRollbackResult] = useState<any>(null)
  const [skippedVersionsInfo, setSkippedVersionsInfo] = useState<string>("")

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

  const handleApiError = (error: any, action: string) => {
    console.error(`${action} Error:`, error)
    let errorMessage = "Network error"
    
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    
    showError(errorMessage, action)
  }

  // API handlers
  const handleCreateOrder = async () => {
    // Client-side validation
    if (!createOrderForm.customerId.trim()) {
      showError("Vui lòng nhập Customer ID", "Create Order")
      return
    }
    if (createOrderForm.items.length === 0) {
      showError("Vui lòng thêm ít nhất một item", "Create Order")
      return
    }

    setLoadingState("createOrder", true)
    try {
      const response = await orderApi.createOrder(createOrderForm)
      showResponse(response, "Create Order")
      if (response.success && response.data) {
        setOrderId(response.data.orderId)
        setSearchOrderId(response.data.orderId)
      } else if (response.error) {
        showError(response.error, "Create Order")
      }
    } catch (error) {
      handleApiError(error, "Create Order")
    }
    setLoadingState("createOrder", false)
  }

  const handleGetOrder = async () => {
    if (!searchOrderId.trim()) {
      showError("Vui lòng nhập Order ID để tìm kiếm", "Get Order")
      return
    }
    setLoadingState("getOrder", true)
    try {
      const response = await orderApi.getOrder(searchOrderId)
      showResponse(response, "Get Order")
      if (response.success && response.data) {
        setCurrentOrder(response.data)
        setCurrentOrderLastUpdated(new Date())
        // Set orderId to enable other operations (add item, remove item, update status)
        setOrderId(searchOrderId)
      } else if (response.error) {
        showError(response.error, "Get Order")
      }
    } catch (error) {
      handleApiError(error, "Get Order")
    }
    setLoadingState("getOrder", false)
  }

  const handleUpdateStatus = async () => {
    if (!orderId.trim()) {
      showError("Vui lòng chọn Order ID trước", "Update Status")
      return
    }
    setLoadingState("updateStatus", true)
    try {
      const response = await orderApi.updateOrderStatus(orderId, { status: newStatus })
      showResponse(response, "Update Status")
      if (response.success) {
        // Auto-refresh current order after successful update
        try {
          const orderResponse = await orderApi.getOrder(orderId)
          if (orderResponse.success && orderResponse.data) {
            setCurrentOrder(orderResponse.data)
            setCurrentOrderLastUpdated(new Date())
          }
        } catch (error) {
          console.error("Error refreshing order after status update:", error)
        }
      } else if (response.error) {
        showError(response.error, "Update Status")
      }
    } catch (error) {
      handleApiError(error, "Update Status")
    }
    setLoadingState("updateStatus", false)
  }

  const handleAddItem = async () => {
    if (!orderId.trim()) {
      showError("Vui lòng chọn Order ID trước", "Add Item")
      return
    }
    if (!newItem.productId.trim()) {
      showError("Vui lòng nhập Product ID", "Add Item")
      return
    }
    if (!newItem.productName.trim()) {
      showError("Vui lòng nhập Product Name", "Add Item")
      return
    }
    if (newItem.quantity <= 0) {
      showError("Quantity phải lớn hơn 0", "Add Item")
      return
    }
    if (newItem.price <= 0) {
      showError("Price phải lớn hơn 0", "Add Item")
      return
    }
    
    setLoadingState("addItem", true)
    try {
      const response = await orderApi.addOrderItem(orderId, { item: newItem })
      showResponse(response, "Add Item")
      if (response.success) {
        setNewItem({ productId: "", productName: "", quantity: 1, price: 0 })
        
        // Auto-refresh current order after successful add item
        try {
          const orderResponse = await orderApi.getOrder(orderId)
          if (orderResponse.success && orderResponse.data) {
            setCurrentOrder(orderResponse.data)
            setCurrentOrderLastUpdated(new Date())
          }
        } catch (error) {
          console.error("Error refreshing order after add item:", error)
        }
      } else if (response.error) {
        showError(response.error, "Add Item")
      }
    } catch (error) {
      handleApiError(error, "Add Item")
    }
    setLoadingState("addItem", false)
  }

  const handleRemoveItem = async (productId: string) => {
    if (!orderId.trim()) {
      showError("Vui lòng chọn Order ID trước", "Remove Item")
      return
    }
    setLoadingState("removeItem", true)
    try {
      const response = await orderApi.removeOrderItem(orderId, productId)
      showResponse(response, "Remove Item")
      if (response.success) {
        // Auto-refresh current order after successful remove item
        try {
          const orderResponse = await orderApi.getOrder(orderId)
          if (orderResponse.success && orderResponse.data) {
            setCurrentOrder(orderResponse.data)
            setCurrentOrderLastUpdated(new Date())
          }
        } catch (error) {
          console.error("Error refreshing order after remove item:", error)
        }
      } else if (response.error) {
        showError(response.error, "Remove Item")
      }
    } catch (error) {
      handleApiError(error, "Remove Item")
    }
    setLoadingState("removeItem", false)
  }

  const handleGetOrderEvents = async (page: number = 1) => {
    if (!searchOrderId) {
      showError("Vui lòng nhập Order ID để tìm kiếm events", "Get Order Events")
      return
    }
    setLoadingState("getEvents", true)
    try {
      const response = await orderApi.getOrderEvents(searchOrderId)
      showResponse(response, "Get Order Events")
      if (response.success && response.data && response.data.events) {
        // Simulate pagination for order events (since API doesn't support it yet)
        const allOrderEvents = response.data.events
        const startIndex = (page - 1) * orderEventsPagination.limit
        const endIndex = startIndex + orderEventsPagination.limit
        const paginatedEvents = allOrderEvents.slice(startIndex, endIndex)
        
        setOrderEvents(paginatedEvents)
        
        // Update pagination info
        setOrderEventsPagination({
          page: page,
          limit: orderEventsPagination.limit,
          total: allOrderEvents.length,
          totalPages: Math.ceil(allOrderEvents.length / orderEventsPagination.limit),
          hasNext: endIndex < allOrderEvents.length,
          hasPrev: page > 1
        })
        
        // Clear all events when showing specific order events
        setAllEvents([])
        setAllEventsPagination(prev => ({
          ...prev,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }))
      } else {
        setOrderEvents([])
        setOrderEventsPagination(prev => ({
          ...prev,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }))
      }
    } catch (error) {
      console.error("Get Order Events Error:", error)
      showError("Network error", "Get Order Events")
    }
    setLoadingState("getEvents", false)
  }

  const handleGetAllOrders = async (page: number = 1) => {
    setLoadingState("getAllOrders", true)
    try {
      const response = await orderApi.getAllOrders()
      showResponse(response, "Get All Orders")
      if (response.success && response.data) {
        let orders: OrderResponse[] = []
        
        // Handle both old format (direct array) and new format (with pagination)
        if (Array.isArray(response.data)) {
          orders = response.data
        } else if ((response.data as AllOrdersResponse).orders && Array.isArray((response.data as AllOrdersResponse).orders)) {
          orders = (response.data as AllOrdersResponse).orders
        } else {
          orders = []
          console.warn("Unexpected response format for getAllOrders:", response.data)
        }
        
        // Simulate pagination for all orders (since API doesn't support it yet)
        const startIndex = (page - 1) * allOrdersPagination.limit
        const endIndex = startIndex + allOrdersPagination.limit
        const paginatedOrders = orders.slice(startIndex, endIndex)
        
        setAllOrders(paginatedOrders)
        
        // Update pagination info
        setAllOrdersPagination({
          page: page,
          limit: allOrdersPagination.limit,
          total: orders.length,
          totalPages: Math.ceil(orders.length / allOrdersPagination.limit),
          hasNext: endIndex < orders.length,
          hasPrev: page > 1
        })
      }
    } catch (error) {
      console.error("Get All Orders Error:", error)
      showError("Network error", "Get All Orders")
    }
    setLoadingState("getAllOrders", false)
  }

  const handleGetAllEvents = async (page: number = 1) => {
    setLoadingState("getAllEvents", true)
    try {
      const response = await orderApi.getAllEvents(page, allEventsPagination.limit)
      showResponse(response, "Get All Events")
      if (response.success && response.data && response.data.events) {
        setAllEvents(response.data.events)
        // Clear specific order events when showing all events
        setOrderEvents([])
        
        // Update pagination info
        if (response.data.pagination) {
          setAllEventsPagination({
            page: response.data.pagination.page,
            limit: response.data.pagination.limit,
            total: response.data.pagination.total,
            totalPages: response.data.pagination.totalPages,
            hasNext: response.data.pagination.hasNext,
            hasPrev: response.data.pagination.hasPrev
          })
        } else {
          // Fallback for non-paginated response
          setAllEventsPagination(prev => ({
            ...prev,
            page: 1,
            total: response.data?.events?.length || 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }))
        }
      } else {
        setAllEvents([])
        setAllEventsPagination(prev => ({
          ...prev,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }))
      }
    } catch (error) {
      console.error("Get All Events Error:", error)
      showError("Network error", "Get All Events")
    }
    setLoadingState("getAllEvents", false)
  }

  const handleGetAllEventsClick = () => {
    handleGetAllEvents(1)
  }

  const handleGetOrderEventsClick = () => {
    handleGetOrderEvents(1)
  }

  const handleGetAllOrdersClick = () => {
    handleGetAllOrders(1)
  }

  const handleNextEventsPage = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (allEventsPagination.hasNext) {
      handleGetAllEvents(allEventsPagination.page + 1)
    }
  }

  const handlePrevEventsPage = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (allEventsPagination.hasPrev) {
      handleGetAllEvents(allEventsPagination.page - 1)
    }
  }

  const handleGoToEventsPage = (page: number, e?: React.MouseEvent) => {
    e?.preventDefault()
    if (page >= 1 && page <= allEventsPagination.totalPages && page !== allEventsPagination.page) {
      handleGetAllEvents(page)
    }
  }

  // Order Events pagination handlers
  const handleNextOrderEventsPage = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (orderEventsPagination.hasNext) {
      handleGetOrderEvents(orderEventsPagination.page + 1)
    }
  }

  const handlePrevOrderEventsPage = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (orderEventsPagination.hasPrev) {
      handleGetOrderEvents(orderEventsPagination.page - 1)
    }
  }

  const handleGoToOrderEventsPage = (page: number, e?: React.MouseEvent) => {
    e?.preventDefault()
    if (page >= 1 && page <= orderEventsPagination.totalPages && page !== orderEventsPagination.page) {
      handleGetOrderEvents(page)
    }
  }

  // All Orders pagination handlers
  const handleNextOrdersPage = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (allOrdersPagination.hasNext) {
      handleGetAllOrders(allOrdersPagination.page + 1)
    }
  }

  const handlePrevOrdersPage = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (allOrdersPagination.hasPrev) {
      handleGetAllOrders(allOrdersPagination.page - 1)
    }
  }

  const handleGoToOrdersPage = (page: number, e?: React.MouseEvent) => {
    e?.preventDefault()
    if (page >= 1 && page <= allOrdersPagination.totalPages && page !== allOrdersPagination.page) {
      handleGetAllOrders(page)
    }
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const { page, totalPages } = allEventsPagination
    const pageNumbers: number[] = []
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Show smart pagination
      if (page <= 4) {
        // Show first 5 pages + ... + last page
        for (let i = 1; i <= 5; i++) pageNumbers.push(i)
        if (totalPages > 6) pageNumbers.push(-1) // -1 represents "..."
        pageNumbers.push(totalPages)
      } else if (page >= totalPages - 3) {
        // Show first page + ... + last 5 pages
        pageNumbers.push(1)
        if (totalPages > 6) pageNumbers.push(-1)
        for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i)
      } else {
        // Show first + ... + current-1, current, current+1 + ... + last
        pageNumbers.push(1)
        pageNumbers.push(-1)
        for (let i = page - 1; i <= page + 1; i++) pageNumbers.push(i)
        pageNumbers.push(-1)
        pageNumbers.push(totalPages)
      }
    }
    
    return pageNumbers
  }

  const getOrderEventsPageNumbers = () => {
    const { page, totalPages } = orderEventsPagination
    const pageNumbers: number[] = []
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      if (page <= 4) {
        for (let i = 1; i <= 5; i++) pageNumbers.push(i)
        if (totalPages > 6) pageNumbers.push(-1)
        pageNumbers.push(totalPages)
      } else if (page >= totalPages - 3) {
        pageNumbers.push(1)
        if (totalPages > 6) pageNumbers.push(-1)
        for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i)
      } else {
        pageNumbers.push(1)
        pageNumbers.push(-1)
        for (let i = page - 1; i <= page + 1; i++) pageNumbers.push(i)
        pageNumbers.push(-1)
        pageNumbers.push(totalPages)
      }
    }
    
    return pageNumbers
  }

  const getOrdersPageNumbers = () => {
    const { page, totalPages } = allOrdersPagination
    const pageNumbers: number[] = []
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      if (page <= 4) {
        for (let i = 1; i <= 5; i++) pageNumbers.push(i)
        if (totalPages > 6) pageNumbers.push(-1)
        pageNumbers.push(totalPages)
      } else if (page >= totalPages - 3) {
        pageNumbers.push(1)
        if (totalPages > 6) pageNumbers.push(-1)
        for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i)
      } else {
        pageNumbers.push(1)
        pageNumbers.push(-1)
        for (let i = page - 1; i <= page + 1; i++) pageNumbers.push(i)
        pageNumbers.push(-1)
        pageNumbers.push(totalPages)
      }
    }
    
    return pageNumbers
  }

  const handleRollback = async () => {
    // Validate inputs
    if (!rollbackOrderId.trim()) {
      showError("Vui lòng nhập Order ID để rollback", "Rollback")
      return
    }

    const hasVersion = rollbackVersion.trim() !== ''
    const hasTimestamp = rollbackTimestamp.trim() !== ''

    if (!hasVersion && !hasTimestamp) {
      showError("Vui lòng nhập Version hoặc Timestamp để rollback", "Rollback")
      return
    }

    if (hasVersion && hasTimestamp) {
      showError("Chỉ được nhập Version HOẶC Timestamp, không được nhập cả hai", "Rollback")
      return
    }

    // Validate version number
    if (hasVersion) {
      const versionNum = parseInt(rollbackVersion)
      if (isNaN(versionNum) || versionNum < 1) {
        showError("Version phải là số nguyên dương", "Rollback")
        return
      }
    }

    // Validate timestamp
    if (hasTimestamp) {
      const date = new Date(rollbackTimestamp)
      if (isNaN(date.getTime())) {
        showError("Timestamp không hợp lệ", "Rollback")
        return
      }
    }

    setLoadingState("rollback", true)
    try {
      const version = hasVersion ? parseInt(rollbackVersion) : undefined
      const timestamp = hasTimestamp ? rollbackTimestamp : undefined
      
      const response = await orderApi.rollbackOrder(rollbackOrderId, version, timestamp)
      showResponse(response, "Rollback")
      
      if (response.success && response.data) {
        setRollbackResult(response.data)
        
        // Fetch and set skipped versions info
        try {
          const skippedVersionsResponse = await orderApi.getSkippedVersions(rollbackOrderId)
          if (skippedVersionsResponse.success && skippedVersionsResponse.data) {
            if (skippedVersionsResponse.data.length > 0) {
              const versionsText = skippedVersionsResponse.data.join(', ')
              setSkippedVersionsInfo(`Skipped versions: ${versionsText}`)
            } else {
              setSkippedVersionsInfo("No skipped versions")
            }
          }
        } catch (error) {
          console.error("Error fetching skipped versions:", error)
          setSkippedVersionsInfo("Error loading skipped versions")
        }
        
        // Clear rollback form after successful rollback
        setRollbackVersion('')
        setRollbackTimestamp('')
        
        // Auto-refresh data after successful rollback with a small delay to ensure consistency
        setTimeout(async () => {
          try {
            // Refresh functions without changing loading states
            const refreshPromises = []
            
            // Refresh current order
            const refreshCurrentOrder = async () => {
              try {
                const orderResponse = await orderApi.getOrder(rollbackOrderId)
                if (orderResponse.success && orderResponse.data) {
                  setCurrentOrder(orderResponse.data)
                  setCurrentOrderLastUpdated(new Date())
                  setOrderId(rollbackOrderId)
                  setSearchOrderId(rollbackOrderId)
                }
              } catch (error) {
                console.error("Error refreshing current order:", error)
              }
            }
            
            // Refresh all orders
            const refreshAllOrders = async () => {
              try {
                await handleGetAllOrders(allOrdersPagination.page)
              } catch (error) {
                console.error("Error refreshing all orders:", error)
              }
            }
            
            // Refresh order events
            const refreshOrderEvents = async () => {
              try {
                await handleGetOrderEvents(orderEventsPagination.page)
              } catch (error) {
                console.error("Error refreshing order events:", error)
              }
            }

            // Refresh all events (maintain current page)
            const refreshAllEvents = async () => {
              try {
                await handleGetAllEvents(allEventsPagination.page)
              } catch (error) {
                console.error("Error refreshing all events:", error)
              }
            }
            
            // Execute refreshes in parallel
            refreshPromises.push(refreshCurrentOrder(), refreshAllOrders(), refreshOrderEvents(), refreshAllEvents())
            await Promise.all(refreshPromises)
            
          } catch (error) {
            console.error("Error during auto-refresh:", error)
          }
        }, 500) // 500ms delay to ensure backend consistency
        
      } else {
        setRollbackResult(null)
        setSkippedVersionsInfo("")
        if (response.error) {
          showError(response.error, "Rollback")
        }
      }
    } catch (error) {
      console.error("Rollback Error:", error)
      const errorMessage = error instanceof Error ? error.message : "Network error"
      showError(errorMessage, "Rollback")
      setRollbackResult(null)
      setSkippedVersionsInfo("")
    }
    setLoadingState("rollback", false)
  }

  const handleHealthCheck = async () => {
    try {
      const response = await orderApi.healthCheck()
      showResponse(response, "Health Check")
      if (!response.success && response.error) {
        showError(response.error, "Health Check")
      }
    } catch (error) {
      handleApiError(error, "Health Check")
    }
  }

  const addItemToForm = () => {
    // Validation
    if (!newItem.productId.trim()) {
      showError("Vui lòng nhập Product ID", "Add Item to Form")
      return
    }
    if (!newItem.productName.trim()) {
      showError("Vui lòng nhập Product Name", "Add Item to Form")
      return
    }
    if (newItem.quantity <= 0) {
      showError("Quantity phải lớn hơn 0", "Add Item to Form")
      return
    }
    if (newItem.price <= 0) {
      showError("Price phải lớn hơn 0", "Add Item to Form")
      return
    }

    // Check for duplicate product ID
    const existingItem = createOrderForm.items.find(item => item.productId === newItem.productId)
    if (existingItem) {
      showError("Product ID đã tồn tại trong order", "Add Item to Form")
      return
    }

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

  // Event Visualizer Component for better event display
  const EventVisualizer = ({ event }: { event: any }) => {
    // Kiểm tra event có tồn tại không
    if (!event) {
      return (
        <div className="border rounded p-2 bg-gray-50 flex-shrink-0">
          <div className="text-xs text-gray-500 italic">Invalid event data</div>
        </div>
      )
    }

    const getEventIcon = (type: string) => {
      switch (type) {
        case 'OrderCreated': return '🆕'
        case 'OrderStatusUpdated': return '🔄'
        case 'OrderItemAdded': return '➕'
        case 'OrderItemRemoved': return '➖'
        case 'OrderRolledBack': return '⏮️'
        default: return '📝'
      }
    }

    const getEventColor = (type: string) => {
      switch (type) {
        case 'OrderCreated': return 'border-l-green-400 bg-green-50'
        case 'OrderStatusUpdated': return 'border-l-blue-400 bg-blue-50'
        case 'OrderItemAdded': return 'border-l-purple-400 bg-purple-50'
        case 'OrderItemRemoved': return 'border-l-red-400 bg-red-50'
        case 'OrderRolledBack': return 'border-l-orange-400 bg-orange-50'
        default: return 'border-l-gray-400 bg-gray-50'
      }
    }

    const renderEventData = (eventType: string, data: any) => {
      // Kiểm tra data có tồn tại không
      if (!data) {
        return (
          <div className="text-xs text-gray-500 italic">
            No event data available
          </div>
        )
      }

      switch (eventType) {
        case 'OrderCreated':
          return (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-xs font-medium">Customer:</span>
                <span className="text-xs">{data.customerId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-medium">Items:</span>
                <span className="text-xs">{data.items?.length || 0} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-medium">Total:</span>
                <span className="text-xs font-semibold">${data.totalAmount || 0}</span>
              </div>
              {data.items && data.items.length > 0 && (
                <div className="mt-2 pt-1 border-t border-gray-200">
                  <div className="text-xs font-medium mb-1">Items:</div>
                  {data.items.slice(0, 2).map((item: any, index: number) => (
                    <div key={index} className="text-xs text-gray-600 flex justify-between">
                      <span>{item?.productName || 'Unknown'}</span>
                      <span>{item?.quantity || 0}x ${item?.price || 0}</span>
                    </div>
                  ))}
                  {data.items.length > 2 && (
                    <div className="text-xs text-gray-500">... and {data.items.length - 2} more</div>
                  )}
                </div>
              )}
            </div>
          )

        case 'OrderStatusUpdated':
          return (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-xs font-medium">From:</span>
                <Badge className="text-xs px-1 py-0 h-auto bg-gray-100 text-gray-700">
                  {data.oldStatus || 'Unknown'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-medium">To:</span>
                <StatusBadge status={data.newStatus || data.status || 'Unknown'} />
              </div>
              {data.reason && (
                <div className="mt-1 pt-1 border-t border-gray-200">
                  <span className="text-xs text-gray-600">{data.reason}</span>
                </div>
              )}
            </div>
          )

        case 'OrderItemAdded':
          return (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-xs font-medium">Product:</span>
                <span className="text-xs">{data.item?.productName || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-medium">ID:</span>
                <span className="text-xs font-mono">{data.item?.productId || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-medium">Quantity:</span>
                <span className="text-xs">{data.item?.quantity || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-medium">Price:</span>
                <span className="text-xs font-semibold">${data.item?.price || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-medium">Subtotal:</span>
                <span className="text-xs font-semibold bg-green-100 px-1 rounded">
                  ${((data.item?.quantity || 0) * (data.item?.price || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )

        case 'OrderItemRemoved':
          return (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-xs font-medium">Product ID:</span>
                <span className="text-xs font-mono bg-red-100 px-1 rounded">{data.productId || 'Unknown'}</span>
              </div>
              {data.item && (
                <>
                  <div className="flex justify-between">
                    <span className="text-xs font-medium">Removed:</span>
                    <span className="text-xs">{data.item.productName || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-medium">Was:</span>
                    <span className="text-xs">{data.item.quantity || 0}x ${data.item.price || 0}</span>
                  </div>
                </>
              )}
            </div>
          )

        case 'OrderRolledBack':
          return (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-xs font-medium">Target:</span>
                <span className="text-xs">
                  {data.rollbackPoint || 
                   (data.rollbackType === 'version' ? `Version ${data.rollbackValue}` : 
                    data.rollbackType === 'timestamp' ? new Date(data.rollbackValue).toLocaleString() : 
                    data.targetVersion ? `Version ${data.targetVersion}` : 
                    data.targetTimestamp ? new Date(data.targetTimestamp).toLocaleString() : 'Unknown')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-medium">Events Undone:</span>
                <span className="text-xs font-semibold text-orange-600">{data.eventsUndone || 0}</span>
              </div>
              {data.rollbackType && (
                <div className="flex justify-between">
                  <span className="text-xs font-medium">Type:</span>
                  <span className="text-xs capitalize">{data.rollbackType}</span>
                </div>
              )}
              {(data.rollbackReason || data.reason) && (
                <div className="mt-1 pt-1 border-t border-gray-200">
                  <span className="text-xs text-gray-600">{data.rollbackReason || data.reason}</span>
                </div>
              )}
              {data.previousState && data.newState && (
                <div className="mt-1 pt-1 border-t border-gray-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium">Before:</span>
                    <span className="text-xs">{data.previousState.status} (${data.previousState.totalAmount})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-medium">After:</span>
                    <span className="text-xs">{data.newState.status} (${data.newState.totalAmount})</span>
                  </div>
                </div>
              )}
            </div>
          )

        default:
          // Fallback for unknown event types - show structured data
          return (
            <div className="space-y-1">
              {Object.entries(data || {}).slice(0, 4).map(([key, value], index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-xs font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span className="text-xs max-w-24 truncate" title={String(value || '')}>
                    {typeof value === 'object' ? JSON.stringify(value).slice(0, 20) + '...' : String(value || 'N/A')}
                  </span>
                </div>
              ))}
              {Object.keys(data || {}).length > 4 && (
                <div className="text-xs text-gray-500">... {Object.keys(data).length - 4} more fields</div>
              )}
              {Object.keys(data || {}).length === 0 && (
                <div className="text-xs text-gray-500 italic">No additional data</div>
              )}
            </div>
          )
      }
    }

    return (
      <div className={`border rounded-l-4 border-l-4 p-2 ${getEventColor(event.type)} flex-shrink-0`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">{getEventIcon(event.type)}</span>
            <div>
              <div className="font-medium text-xs">{event.type}</div>
              <div className="text-xs text-gray-500">
                v{event.version || 'N/A'} | {event.aggregateId ? event.aggregateId.substring(0, 8) + '...' : 'N/A'}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'N/A'}
          </div>
        </div>
        <div className="bg-white p-2 rounded border">
          {renderEventData(event.type, event.data)}
        </div>
      </div>
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
    <div className="min-h-screen overflow-hidden" style={{ padding: "0 1rem 1rem 1rem" }}>
      <div className="h-full flex flex-col p-1 sm:p-2">
        <div className="py-2 text-center">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Event Sourcing Order Management</h1>
        </div>

        {/* Mobile Layout - Stack vertically on small screens */}
        <div className="block md:hidden space-y-3 lg:space-y-4 flex-1 min-h-0 overflow-y-auto px-1">
          {/* Mobile - Create Order */}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

          {/* Mobile - Query Operations */}
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
                <Label className="text-sm">Search Order ID</Label>
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
                  className="w-full text-xs"
                >
                  {loading.getOrder && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Get Order
                </Button>
                <Button 
                  onClick={handleGetOrderEventsClick} 
                  disabled={loading.getEvents}
                  className="w-full text-xs"
                >
                  {loading.getEvents && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Get Events
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleGetAllOrdersClick} 
                  disabled={loading.getAllOrders}
                  className="w-full text-xs"
                >
                  {loading.getAllOrders && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  All Orders
                </Button>
                <Button 
                  onClick={handleGetAllEventsClick} 
                  disabled={loading.getAllEvents}
                  className="w-full text-xs"
                >
                  {loading.getAllEvents && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  All Events
                </Button>
              </div>

              <Button 
                onClick={handleHealthCheck}
                className="w-full text-xs bg-green-600 hover:bg-green-700"
              >
                🏥 Health Check
              </Button>
            </CardContent>
          </Card>

          {/* Mobile - Current Order */}
          {currentOrder && (
            <Card className="flex-shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Current Order</CardTitle>
                <CardDescription className="text-sm">Thông tin order hiện tại</CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">ID:</span>
                    <span className="text-sm font-mono">{currentOrder.id.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Customer:</span>
                    <span className="text-sm">{currentOrder.customerId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <StatusBadge status={currentOrder.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total:</span>
                    <span className="text-sm font-semibold">${currentOrder.totalAmount.toFixed(2)}</span>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div>
                    <div className="text-sm font-medium mb-2">Items ({currentOrder.items.length}):</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {currentOrder.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <div className="text-sm font-medium">{item.productName}</div>
                            <div className="text-xs text-gray-500">{item.productId}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm">{item.quantity}x ${item.price}</div>
                            <Button
                              className="h-6 w-6 p-0 mt-1"
                              onClick={() => handleRemoveItem(item.productId)}
                              disabled={loading.removeItem}
                              title="Remove item"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mobile - Order Operations */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Operations</CardTitle>
              <CardDescription className="text-sm">Các thao tác với order đã tạo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <Label>Order ID</Label>
                <Input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Order ID để thao tác"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    disabled={loading.updateStatus || !orderId}
                    className="w-full"
                    title={!orderId ? "Please select an order first" : "Update order status"}
                  >
                    {loading.updateStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Status
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Add New Item</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
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
                  disabled={loading.addItem || !orderId || !newItem.productId}
                  className="w-full mt-2"
                  title={!orderId ? "Please select an order first" : !newItem.productId ? "Please enter product ID" : "Add item to order"}
                >
                  {loading.addItem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Item to Order
                </Button>
              </div>

              {/* Rollback Section */}
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-blue-700">🔄 Rollback Demo</h3>
                
                <div>
                  <Label htmlFor="rollbackOrderId" className="text-sm">Order ID</Label>
                  <Input
                    id="rollbackOrderId"
                    value={rollbackOrderId}
                    onChange={(e) => setRollbackOrderId(e.target.value)}
                    placeholder="order-uuid"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="rollbackVersion" className="text-sm">Version</Label>
                    <Input
                      id="rollbackVersion"
                      type="number"
                      value={rollbackVersion}
                      onChange={(e) => setRollbackVersion(e.target.value)}
                      placeholder="1,2,3..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="rollbackTimestamp" className="text-sm">Timestamp</Label>
                    <Input
                      id="rollbackTimestamp"
                      type="datetime-local"
                      value={rollbackTimestamp}
                      onChange={(e) => setRollbackTimestamp(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleRollback} 
                  disabled={loading.rollback}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {loading.rollback && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  {loading.rollback ? "Rolling back..." : "🔄 Rollback"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mobile - Last Response */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Last Response</CardTitle>
              <CardDescription className="text-sm">Phản hồi từ API gần nhất</CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              {lastResponse ? (
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64">
                  {lastResponse}
                </pre>
              ) : (
                <div className="text-center text-gray-400 py-4">
                  <p>Chưa có response nào</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tablet Layout - 2 columns on medium screens */}
        <div className="hidden md:grid lg:hidden md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-hidden p-2">
          {/* Left Column - Forms and Operations */}
          <div className="flex flex-col space-y-3 min-h-0">
            {/* Tablet - Create Order */}
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
                  <div className="space-y-2 mt-2 max-h-24 overflow-y-auto">
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

            {/* Tablet - Query Operations with Rollback */}
            <Card className="flex-1 min-h-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4" />
                  Query & Operations
                </CardTitle>
                <CardDescription className="text-sm">Truy vấn và thao tác order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 overflow-y-auto max-h-96">
                <div>
                  <Label className="text-sm">Search Order ID</Label>
                  <Input
                    value={searchOrderId}
                    onChange={(e) => setSearchOrderId(e.target.value)}
                    placeholder="Order ID để tìm kiếm"
                    className="h-8"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleGetOrder} 
                    disabled={loading.getOrder}
                    className="w-full h-8 text-xs"
                  >
                    {loading.getOrder && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Get Order
                  </Button>
                  <Button 
                    onClick={handleGetOrderEventsClick} 
                    disabled={loading.getEvents}
                    className="w-full h-8 text-xs"
                  >
                    {loading.getEvents && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Get Events
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleGetAllOrdersClick} 
                    disabled={loading.getAllOrders}
                    className="w-full h-8 text-xs"
                  >
                    {loading.getAllOrders && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    All Orders
                  </Button>
                  <Button 
                    onClick={handleGetAllEventsClick} 
                    disabled={loading.getAllEvents}
                    className="w-full h-8 text-xs"
                  >
                    {loading.getAllEvents && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    All Events
                  </Button>
                </div>

                <Separator />

                {/* Rollback Section */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-blue-700">🔄 Rollback Demo</h3>
                  
                  <div>
                    <Label htmlFor="rollbackOrderId" className="text-xs">Order ID</Label>
                    <Input
                      id="rollbackOrderId"
                      value={rollbackOrderId}
                      onChange={(e) => setRollbackOrderId(e.target.value)}
                      placeholder="order-uuid"
                      className="h-8"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="rollbackVersion" className="text-xs">Version</Label>
                      <Input
                        id="rollbackVersion"
                        type="number"
                        value={rollbackVersion}
                        onChange={(e) => setRollbackVersion(e.target.value)}
                        placeholder="1,2,3..."
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rollbackTimestamp" className="text-xs">Timestamp</Label>
                      <Input
                        id="rollbackTimestamp"
                        type="datetime-local"
                        value={rollbackTimestamp}
                        onChange={(e) => setRollbackTimestamp(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleRollback} 
                    disabled={loading.rollback}
                    className="w-full bg-orange-600 hover:bg-orange-700 h-8 text-xs"
                  >
                    {loading.rollback && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    {loading.rollback ? "Rolling back..." : "🔄 Rollback"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Data Display */}
          <div className="flex flex-col space-y-3 min-h-0">
            {/* Tablet - Current Order */}
            {currentOrder && (
              <Card className="flex-shrink-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Current Order</CardTitle>
                  <CardDescription className="text-sm">Thông tin order hiện tại</CardDescription>
                </CardHeader>
                <CardContent className="p-3 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">ID:</span>
                      <span className="text-sm font-mono">{currentOrder.id.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Customer:</span>
                      <span className="text-sm">{currentOrder.customerId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <StatusBadge status={currentOrder.status} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total:</span>
                      <span className="text-sm font-semibold">${currentOrder.totalAmount.toFixed(2)}</span>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div>
                      <div className="text-sm font-medium mb-2">Items ({currentOrder.items.length}):</div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {currentOrder.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <div className="text-sm font-medium">{item.productName}</div>
                              <div className="text-xs text-gray-500">{item.productId}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm">{item.quantity}x ${item.price}</div>
                              <Button
                                className="h-6 w-6 p-0 mt-1"
                                onClick={() => handleRemoveItem(item.productId)}
                                disabled={loading.removeItem}
                                title="Remove item"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tablet - Last Response */}
            <Card className="flex-1 min-h-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Last Response</CardTitle>
                <CardDescription className="text-sm">Phản hồi từ API gần nhất</CardDescription>
              </CardHeader>
              <CardContent className="h-full pt-0 p-3">
                {lastResponse ? (
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto h-full max-h-96">
                    {lastResponse}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <p>Chưa có response nào</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Desktop Layout - Grid system with better responsive breakpoints */}
        <div className="hidden lg:grid xl:grid-cols-8 lg:grid-cols-6 gap-2 lg:gap-3 flex-1 min-h-0 p-1 lg:p-2">
        {/* Column 1 - Create Order & Order Operations - Responsive columns */}
        <div className="xl:col-span-2 lg:col-span-2 flex flex-col space-y-2 lg:space-y-3 min-h-0">
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
                    disabled={loading.updateStatus || !orderId}
                    className="w-full"
                    title={!orderId ? "Please select an order first" : "Update order status"}
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
                  disabled={loading.addItem || !orderId || !newItem.productId}
                  className="w-full mt-2"
                  title={!orderId ? "Please select an order first" : !newItem.productId ? "Please enter product ID" : "Add item to order"}
                >
                  {loading.addItem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Item to Order
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2 - Query Operations & Last Response - Responsive columns */}
        <div className="xl:col-span-2 lg:col-span-2 flex flex-col space-y-2 lg:space-y-3 min-h-0">
          {/* Query Operations */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4" />
                Query Operations
              </CardTitle>
              <CardDescription className="text-sm">Truy vấn thông tin order và events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div>
                <Label className="text-xs">Search Order ID</Label>
                <Input
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  placeholder="Order ID để tìm kiếm"
                  className="h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleGetOrder} 
                  disabled={loading.getOrder}
                  className="w-full h-8 text-xs"
                >
                  {loading.getOrder && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Get Order
                </Button>
                <Button 
                  onClick={handleGetOrderEventsClick} 
                  disabled={loading.getEvents}
                  className="w-full h-8 text-xs"
                >
                  {loading.getEvents && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Get Events
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleGetAllOrdersClick} 
                  disabled={loading.getAllOrders}
                  className="w-full h-8 text-xs"
                >
                  {loading.getAllOrders && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  All Orders
                </Button>
                <Button 
                  onClick={handleGetAllEventsClick} 
                  disabled={loading.getAllEvents}
                  className="w-full h-8 text-xs"
                >
                  {loading.getAllEvents && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  All Events
                </Button>
              </div>

              <Button 
                onClick={handleHealthCheck}
                className="w-full h-8 text-xs bg-green-600 hover:bg-green-700"
              >
                🏥 Health Check
              </Button>

              <Separator />

              {/* Rollback Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-blue-700">🔄 Rollback Demo</h3>
                
                <div>
                  <Label htmlFor="rollbackOrderId" className="text-xs">Order ID</Label>
                  <Input
                    id="rollbackOrderId"
                    value={rollbackOrderId}
                    onChange={(e) => setRollbackOrderId(e.target.value)}
                    placeholder="order-uuid"
                    className="h-8"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="rollbackVersion" className="text-xs">Version</Label>
                    <Input
                      id="rollbackVersion"
                      type="number"
                      value={rollbackVersion}
                      onChange={(e) => setRollbackVersion(e.target.value)}
                      placeholder="1,2,3..."
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rollbackTimestamp" className="text-xs">Timestamp</Label>
                    <Input
                      id="rollbackTimestamp"
                      type="datetime-local"
                      value={rollbackTimestamp}
                      onChange={(e) => setRollbackTimestamp(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleRollback} 
                  disabled={loading.rollback}
                  className="w-full bg-orange-600 hover:bg-orange-700 h-8 text-xs"
                >
                  {loading.rollback && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  {loading.rollback ? "Rolling back & refreshing..." : "🔄 Rollback"}
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
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto h-full max-h-[24rem] m-4">
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

        {/* Column 3 - Current Order & All Orders & Events - Responsive columns */}
        <div className="xl:col-span-4 lg:col-span-2 flex flex-col space-y-2 lg:space-y-3 min-h-0">
          {/* Current Order - Compact size */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-2 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base">Current Order</CardTitle>
                  <CardDescription className="text-sm">
                    Thông tin order hiện tại
                    {currentOrderLastUpdated && (
                      <span className="block text-xs text-gray-400 mt-1">
                        Last updated: {currentOrderLastUpdated.toLocaleTimeString()}
                      </span>
                    )}
                  </CardDescription>
                </div>
                {currentOrder && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      if (currentOrder.id) {
                        setSearchOrderId(currentOrder.id);
                        handleGetOrder();
                      }
                    }}
                    className="text-xs"
                    title="Refresh current order data"
                  >
                    🔄 Refresh
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3 max-h-36 overflow-y-auto">
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
                          disabled={loading.removeItem || !orderId}
                          title={!orderId ? "Please select an order first" : "Remove item"}
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

          {/* Rollback Result Display - Compact size */}
          {rollbackResult && (
            <Card className="flex-shrink-0">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base text-orange-600">🔄 Rollback Result</CardTitle>
                    <CardDescription>Event Sourcing Time Travel Demo</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRollbackResult(null)
                      setSkippedVersionsInfo("")
                    }}
                    className="text-xs px-2 py-1 h-7"
                    title="Clear rollback result"
                  >
                    ✕ Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 max-h-64 overflow-y-auto space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Order */}
                  <div className="border rounded p-3">
                    <h4 className="font-semibold text-sm mb-2 text-blue-600">📋 Current Order State</h4>
                    <div className="text-xs space-y-1">
                      <p><strong>ID:</strong> {rollbackResult.originalOrder?.id}</p>
                      <p><strong>Status:</strong> <span className="px-2 py-1 bg-blue-100 rounded text-blue-800">{rollbackResult.originalOrder?.status}</span></p>
                      <p><strong>Items:</strong> {rollbackResult.originalOrder?.items?.length || 0}</p>
                      <p><strong>Total:</strong> ${rollbackResult.originalOrder?.totalAmount?.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Rolled Back Order */}
                  <div className="border rounded p-3 bg-orange-50">
                    <h4 className="font-semibold text-sm mb-2 text-orange-600">⏮️ Rolled Back State</h4>
                    <div className="text-xs space-y-1">
                      <p><strong>ID:</strong> {rollbackResult.rolledBackOrder?.id}</p>
                      <p><strong>Status:</strong> <span className="px-2 py-1 bg-orange-100 rounded text-orange-800">{rollbackResult.rolledBackOrder?.status}</span></p>
                      <p><strong>Items:</strong> {rollbackResult.rolledBackOrder?.items?.length || 0}</p>
                      <p><strong>Total:</strong> ${rollbackResult.rolledBackOrder?.totalAmount?.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="font-semibold text-sm mb-2">📊 Rollback Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{rollbackResult.eventsKept}</div>
                      <div className="text-gray-600">Events Kept</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-600">{rollbackResult.eventsUndone}</div>
                      <div className="text-gray-600">Events Undone</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-600 text-xs">{rollbackResult.rollbackPoint}</div>
                      <div className="text-gray-600">Rollback Point</div>
                    </div>
                  </div>
                  {rollbackResult.rollbackEvent && (
                    <div className="mt-2 p-2 bg-purple-50 rounded border-l-2 border-purple-200">
                      <div className="text-xs">
                        <strong>📝 Rollback Event:</strong> v{rollbackResult.rollbackEvent.version} at {new Date(rollbackResult.rollbackEvent.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                  {skippedVersionsInfo && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded border-l-2 border-yellow-300">
                      <div className="text-xs">
                        <strong>⚠️ {skippedVersionsInfo}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {rollbackResult.undoneEvents && rollbackResult.undoneEvents.length > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="font-semibold text-sm mb-2">❌ Undone Events</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {rollbackResult.undoneEvents.map((event: any, index: number) => (
                        <EventVisualizer key={index} event={event} />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Grid layout for All Orders and Order Events - Better space allocation */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 flex-1 min-h-0 overflow-hidden">
            {/* All Orders */}
            <Card className="flex flex-col min-h-0 max-h-full">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base">All Orders</CardTitle>
                    <CardDescription className="text-sm">Danh sách tất cả orders</CardDescription>
                  </div>
                  {allOrdersPagination.total > 0 && (
                    <div className="text-xs text-gray-500">
                      Page {allOrdersPagination.page} of {allOrdersPagination.totalPages} 
                      <span className="block">({allOrdersPagination.total} orders)</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-3 flex flex-col min-h-0">
                {allOrders.length > 0 ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
                      {allOrders.map((order) => (
                        <div key={order.id} className="border rounded p-2 flex-shrink-0">
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

                    {/* Pagination Controls for All Orders */}
                    {allOrdersPagination.totalPages > 1 && (
                      <div className="mt-3 pt-2 border-t bg-gray-50 rounded p-2 space-y-2 flex-shrink-0">
                        {/* Previous/Next Row */}
                        <div className="flex justify-between items-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handlePrevOrdersPage(e)}
                            disabled={!allOrdersPagination.hasPrev || loading.getAllOrders}
                            className="text-xs h-6 px-2"
                          >
                            {loading.getAllOrders ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            ← Previous
                          </Button>
                        
                        <div className="text-xs text-gray-600 text-center">
                          <div className="font-medium">Page {allOrdersPagination.page} of {allOrdersPagination.totalPages}</div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleNextOrdersPage(e)}
                          disabled={!allOrdersPagination.hasNext || loading.getAllOrders}
                          className="text-xs h-6 px-2"
                        >
                          Next →
                          {loading.getAllOrders ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : null}
                        </Button>
                        </div>

                        {/* Page Numbers Row */}
                        <div className="flex justify-center items-center space-x-1">
                          {getOrdersPageNumbers().map((pageNum, index) => {
                            if (pageNum === -1) {
                              // Ellipsis
                              return (
                                <span key={`ellipsis-${index}`} className="px-1 py-0.5 text-xs text-gray-400">
                                  ...
                                </span>
                              )
                            }
                            
                            const isCurrentPage = pageNum === allOrdersPagination.page
                            return (
                              <Button
                                key={pageNum}
                                size="sm"
                                variant={isCurrentPage ? "default" : "outline"}
                                onClick={(e) => handleGoToOrdersPage(pageNum, e)}
                                disabled={loading.getAllOrders || isCurrentPage}
                                className={`text-xs h-6 w-6 p-0 ${
                                  isCurrentPage 
                                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                                    : "hover:bg-gray-100"
                                }`}
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    <p>Chưa có orders nào</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Events */}
            <Card className="flex flex-col min-h-0 max-h-full">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base">Order Events</CardTitle>
                    <CardDescription className="text-sm">Event history của order</CardDescription>
                  </div>
                  {allEventsPagination.total > 0 && allEvents.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Page {allEventsPagination.page} of {allEventsPagination.totalPages} 
                      <span className="block">({allEventsPagination.total} events)</span>
                    </div>
                  )}
                  {orderEventsPagination.total > 0 && orderEvents.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Page {orderEventsPagination.page} of {orderEventsPagination.totalPages} 
                      <span className="block">({orderEventsPagination.total} events)</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-3 flex flex-col min-h-0 overflow-hidden">
                {(orderEvents.length > 0 || allEvents.length > 0) ? (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Show specific order events OR all events, not both */}
                    {orderEvents.length > 0 ? (
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="text-xs font-semibold text-blue-600 mb-2">
                          Specific Order Events ({orderEventsPagination.total} total events):
                        </div>
                        <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
                          {orderEvents.map((event, index) => (
                            <EventVisualizer key={`order-${event.id || index}`} event={event} />
                          ))}
                        </div>

                        {/* Pagination Controls for Order Events */}
                        {orderEventsPagination.totalPages > 1 && (
                          <div className="mt-3 pt-2 border-t bg-gray-50 rounded p-2 space-y-2 flex-shrink-0">
                            {/* Previous/Next Row */}
                            <div className="flex justify-between items-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handlePrevOrderEventsPage(e)}
                                disabled={!orderEventsPagination.hasPrev || loading.getEvents}
                                className="text-xs h-6 px-2"
                              >
                                {loading.getEvents ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                ← Previous
                              </Button>
                            
                            <div className="text-xs text-gray-600 text-center">
                              <div className="font-medium">Page {orderEventsPagination.page} of {orderEventsPagination.totalPages}</div>
                            </div>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleNextOrderEventsPage(e)}
                              disabled={!orderEventsPagination.hasNext || loading.getEvents}
                              className="text-xs h-6 px-2"
                            >
                              Next →
                              {loading.getEvents ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : null}
                            </Button>
                            </div>

                            {/* Page Numbers Row */}
                            <div className="flex justify-center items-center space-x-1">
                              {getOrderEventsPageNumbers().map((pageNum, index) => {
                                if (pageNum === -1) {
                                  // Ellipsis
                                  return (
                                    <span key={`ellipsis-${index}`} className="px-1 py-0.5 text-xs text-gray-400">
                                      ...
                                    </span>
                                  )
                                }
                                
                                const isCurrentPage = pageNum === orderEventsPagination.page
                                return (
                                  <Button
                                    key={pageNum}
                                    size="sm"
                                    variant={isCurrentPage ? "default" : "outline"}
                                    onClick={(e) => handleGoToOrderEventsPage(pageNum, e)}
                                    disabled={loading.getEvents || isCurrentPage}
                                    className={`text-xs h-6 w-6 p-0 ${
                                      isCurrentPage 
                                        ? "bg-blue-600 text-white hover:bg-blue-700" 
                                        : "hover:bg-gray-100"
                                    }`}
                                  >
                                    {pageNum}
                                  </Button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : allEvents.length > 0 ? (
                      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="text-xs font-semibold text-green-600 mb-2">All System Events:</div>
                        <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
                          {allEvents.map((event, index) => (
                            <EventVisualizer key={`all-${event.id || index}`} event={event} />
                          ))}
                        </div>
                        
                        {/* Pagination Controls for All Events */}
                        {allEventsPagination.totalPages > 1 && (
                          <div className="mt-3 pt-2 border-t bg-gray-50 rounded p-2 space-y-2 flex-shrink-0">
                            {/* Previous/Next Row */}
                            <div className="flex justify-between items-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handlePrevEventsPage(e)}
                                  disabled={!allEventsPagination.hasPrev || loading.getAllEvents}
                                  className="text-xs h-6 px-2"
                                >
                                  {loading.getAllEvents ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                  ← Previous
                                </Button>
                              
                              <div className="text-xs text-gray-600 text-center">
                                <div className="font-medium">Page {allEventsPagination.page} of {allEventsPagination.totalPages}</div>
                              </div>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleNextEventsPage(e)}
                                disabled={!allEventsPagination.hasNext || loading.getAllEvents}
                                className="text-xs h-6 px-2"
                              >
                                Next →
                                {loading.getAllEvents ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : null}
                              </Button>
                            </div>

                            {/* Page Numbers Row */}
                            <div className="flex justify-center items-center space-x-1">
                              {getPageNumbers().map((pageNum, index) => {
                                if (pageNum === -1) {
                                  // Ellipsis
                                  return (
                                    <span key={`ellipsis-${index}`} className="px-1 py-0.5 text-xs text-gray-400">
                                      ...
                                    </span>
                                  )
                                }
                                
                                const isCurrentPage = pageNum === allEventsPagination.page
                                return (
                                  <Button
                                    key={pageNum}
                                    size="sm"
                                    variant={isCurrentPage ? "default" : "outline"}
                                    onClick={(e) => handleGoToEventsPage(pageNum, e)}
                                    disabled={loading.getAllEvents || isCurrentPage}
                                    className={`text-xs h-6 w-6 p-0 ${
                                      isCurrentPage 
                                        ? "bg-blue-600 text-white hover:bg-blue-700" 
                                        : "hover:bg-gray-100"
                                    }`}
                                  >
                                    {pageNum}
                                  </Button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
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
