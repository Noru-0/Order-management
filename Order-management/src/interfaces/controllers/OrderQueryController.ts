import { Request, Response } from 'express';
import { 
  GetOrderHandler,
  GetAllOrdersHandler,
  GetOrderEventsHandler,
  GetAllEventsHandler,
  GetSkippedVersionsHandler,
  HealthCheckHandler,
  GetDatabaseStatsHandler
} from '../../application/queries/handlers/OrderQueryHandlers';
import { 
  GetOrderQuery,
  GetAllOrdersQuery,
  GetOrderEventsQuery,
  GetAllEventsQuery,
  GetSkippedVersionsQuery,
  HealthCheckQuery,
  GetDatabaseStatsQuery
} from '../../application/queries/OrderQueries';

/**
 * Query Controller for handling read operations (CQRS Read Side)
 * Responsible for processing queries that retrieve data without modifying state
 */
export class OrderQueryController {
  constructor(
    private getOrderHandler: GetOrderHandler,
    private getAllOrdersHandler: GetAllOrdersHandler,
    private getOrderEventsHandler: GetOrderEventsHandler,
    private getAllEventsHandler: GetAllEventsHandler,
    private getSkippedVersionsHandler: GetSkippedVersionsHandler,
    private healthCheckHandler: HealthCheckHandler,
    private getDatabaseStatsHandler: GetDatabaseStatsHandler
  ) {}

  /**
   * Get a specific order
   * GET /api/orders/:orderId
   */
  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      // Validate order ID
      if (!orderId?.trim()) {
        res.status(400).json({
          error: 'Order ID is required',
          details: 'orderId parameter cannot be empty'
        });
        return;
      }

      // Create query
      const query: GetOrderQuery = {
        type: 'GetOrder',
        orderId: orderId.trim()
      };

      // Execute query
      const order = await this.getOrderHandler.handle(query);

      if (!order) {
        res.status(404).json({
          error: 'Order not found',
          details: `Order with ID ${orderId} does not exist`
        });
        return;
      }

      res.json({
        success: true,
        data: order.toJSON()
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({
        error: 'Failed to fetch order',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all orders with pagination
   * GET /api/orders
   */
  async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

      // Validate pagination parameters
      if (page < 1) {
        res.status(400).json({
          error: 'Invalid page number',
          details: 'Page must be a positive number'
        });
        return;
      }

      if (limit < 1) {
        res.status(400).json({
          error: 'Invalid limit',
          details: 'Limit must be a positive number'
        });
        return;
      }

      // Create query
      const query: GetAllOrdersQuery = {
        type: 'GetAllOrders',
        page,
        limit
      };

      // Execute query
      const result = await this.getAllOrdersHandler.handle(query);

      res.json({
        success: true,
        data: {
          orders: result.orders.map(order => order.toJSON()),
          pagination: result.pagination
        }
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all events for a specific order
   * GET /api/orders/:orderId/events
   */
  async getOrderEvents(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      // Validate order ID
      if (!orderId?.trim()) {
        res.status(400).json({
          error: 'Order ID is required',
          details: 'orderId parameter cannot be empty'
        });
        return;
      }

      // Create query
      const query: GetOrderEventsQuery = {
        type: 'GetOrderEvents',
        orderId: orderId.trim()
      };

      // Execute query
      const result = await this.getOrderEventsHandler.handle(query);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching order events:', error);
      res.status(500).json({
        error: 'Failed to fetch order events',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all events in the system with pagination
   * GET /api/events
   */
  async getAllEvents(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 4, 20);

      // Validate pagination parameters
      if (page < 1) {
        res.status(400).json({
          error: 'Invalid page number',
          details: 'Page must be a positive number'
        });
        return;
      }

      if (limit < 1) {
        res.status(400).json({
          error: 'Invalid limit',
          details: 'Limit must be a positive number'
        });
        return;
      }

      // Create query
      const query: GetAllEventsQuery = {
        type: 'GetAllEvents',
        page,
        limit
      };

      // Execute query
      const result = await this.getAllEventsHandler.handle(query);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({
        error: 'Failed to fetch events',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get skipped versions for an order
   * GET /api/orders/:orderId/skipped-versions
   */
  async getSkippedVersions(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      // Validate order ID
      if (!orderId?.trim()) {
        res.status(400).json({
          error: 'Order ID is required',
          details: 'orderId parameter cannot be empty'
        });
        return;
      }

      // Create query
      const query: GetSkippedVersionsQuery = {
        type: 'GetSkippedVersions',
        orderId: orderId.trim()
      };

      // Execute query
      const skippedVersions = await this.getSkippedVersionsHandler.handle(query);

      res.json({
        success: true,
        data: {
          orderId,
          skippedVersions,
          count: skippedVersions.length
        }
      });
    } catch (error) {
      console.error('Error fetching skipped versions:', error);
      res.status(500).json({
        error: 'Failed to fetch skipped versions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Health check endpoint
   * GET /api/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Create query
      const query: HealthCheckQuery = {
        type: 'HealthCheck'
      };

      // Execute query
      const healthData = await this.healthCheckHandler.handle(query);

      // Return appropriate status code based on health
      const statusCode = healthData.database.healthy ? 200 : 503;

      res.status(statusCode).json({
        success: healthData.database.healthy,
        data: healthData
      });
    } catch (error) {
      console.error('Error during health check:', error);
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        data: {
          status: 'ERROR',
          timestamp: new Date().toISOString(),
          database: { type: 'Unknown', healthy: false },
          uptime: process.uptime(),
          version: '1.0.0'
        }
      });
    }
  }

  /**
   * Get database statistics
   * GET /api/stats
   */
  async getDatabaseStats(req: Request, res: Response): Promise<void> {
    try {
      // Create query
      const query: GetDatabaseStatsQuery = {
        type: 'GetDatabaseStats'
      };

      // Execute query
      const stats = await this.getDatabaseStatsHandler.handle(query);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching database stats:', error);
      res.status(500).json({
        error: 'Failed to fetch database statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get order summary (lightweight version)
   * GET /api/orders/:orderId/summary
   */
  async getOrderSummary(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      // Validate order ID
      if (!orderId?.trim()) {
        res.status(400).json({
          error: 'Order ID is required',
          details: 'orderId parameter cannot be empty'
        });
        return;
      }

      // Create query
      const query: GetOrderQuery = {
        type: 'GetOrder',
        orderId: orderId.trim()
      };

      // Execute query
      const order = await this.getOrderHandler.handle(query);

      if (!order) {
        res.status(404).json({
          error: 'Order not found',
          details: `Order with ID ${orderId} does not exist`
        });
        return;
      }

      // Return summary data only
      res.json({
        success: true,
        data: {
          orderId: order.id,
          customerId: order.customerId,
          status: order.status,
          itemCount: order.items.length,
          totalAmount: order.totalAmount
        }
      });
    } catch (error) {
      console.error('Error fetching order summary:', error);
      res.status(500).json({
        error: 'Failed to fetch order summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Search orders by customer ID
   * GET /api/orders/search?customerId=:customerId
   */
  async searchOrdersByCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

      // Validate customer ID
      if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
        res.status(400).json({
          error: 'Customer ID is required',
          details: 'customerId query parameter cannot be empty'
        });
        return;
      }

      // Create query to get all orders first
      const query: GetAllOrdersQuery = {
        type: 'GetAllOrders',
        page: 1,
        limit: 1000 // Get more orders to filter
      };

      // Execute query
      const result = await this.getAllOrdersHandler.handle(query);

      // Filter by customer ID
      const customerOrders = result.orders.filter(order => 
        order.customerId === customerId.trim()
      );

      // Apply pagination to filtered results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedOrders = customerOrders.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          orders: paginatedOrders.map(order => order.toJSON()),
          pagination: {
            page,
            limit,
            total: customerOrders.length,
            totalPages: Math.ceil(customerOrders.length / limit),
            hasNext: endIndex < customerOrders.length,
            hasPrev: page > 1
          },
          searchCriteria: {
            customerId: customerId.trim()
          }
        }
      });
    } catch (error) {
      console.error('Error searching orders by customer:', error);
      res.status(500).json({
        error: 'Failed to search orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
