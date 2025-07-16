import { Router } from 'express';
import { OrderCommandController } from '../controllers/OrderCommandController';
import { OrderQueryController } from '../controllers/OrderQueryController';

/**
 * Order routes with CQRS separation
 * Commands and Queries are handled by separate controllers
 */
export class OrderRoutes {
  private router: Router;

  constructor(
    private commandController: OrderCommandController,
    private queryController: OrderQueryController
  ) {
    this.router = Router();
    this.setupRoutes();
  }

  /**
   * Setup all order routes
   */
  private setupRoutes(): void {
    // Command routes (Write operations)
    this.setupCommandRoutes();
    
    // Query routes (Read operations)
    this.setupQueryRoutes();
    
    // System routes
    this.setupSystemRoutes();
  }

  /**
   * Setup command routes for write operations
   */
  private setupCommandRoutes(): void {
    // Create order
    this.router.post('/orders', 
      this.commandController.createOrder.bind(this.commandController)
    );

    // Update order status
    this.router.put('/orders/:orderId/status', 
      this.commandController.updateOrderStatus.bind(this.commandController)
    );

    // Add item to order
    this.router.post('/orders/:orderId/items', 
      this.commandController.addOrderItem.bind(this.commandController)
    );

    // Remove item from order
    this.router.delete('/orders/:orderId/items/:productId', 
      this.commandController.removeOrderItem.bind(this.commandController)
    );

    // Rollback order
    this.router.post('/orders/:orderId/rollback', 
      this.commandController.rollbackOrder.bind(this.commandController)
    );
  }

  /**
   * Setup query routes for read operations
   */
  private setupQueryRoutes(): void {
    // Get all orders with pagination
    this.router.get('/orders', 
      this.queryController.getAllOrders.bind(this.queryController)
    );

    // Search orders by customer
    this.router.get('/orders/search', 
      this.queryController.searchOrdersByCustomer.bind(this.queryController)
    );

    // Get specific order
    this.router.get('/orders/:orderId', 
      this.queryController.getOrder.bind(this.queryController)
    );

    // Get order summary
    this.router.get('/orders/:orderId/summary', 
      this.queryController.getOrderSummary.bind(this.queryController)
    );

    // Get order events
    this.router.get('/orders/:orderId/events', 
      this.queryController.getOrderEvents.bind(this.queryController)
    );

    // Get skipped versions for order
    this.router.get('/orders/:orderId/skipped-versions', 
      this.queryController.getSkippedVersions.bind(this.queryController)
    );

    // Get all events in system
    this.router.get('/events', 
      this.queryController.getAllEvents.bind(this.queryController)
    );
  }

  /**
   * Setup system routes
   */
  private setupSystemRoutes(): void {
    // Health check
    this.router.get('/health', 
      this.queryController.healthCheck.bind(this.queryController)
    );

    // Database statistics
    this.router.get('/stats', 
      this.queryController.getDatabaseStats.bind(this.queryController)
    );
  }

  /**
   * Get the configured router
   */
  getRouter(): Router {
    return this.router;
  }
}

/**
 * Factory function to create order routes
 */
export function createOrderRoutes(
  commandController: OrderCommandController,
  queryController: OrderQueryController
): Router {
  const orderRoutes = new OrderRoutes(commandController, queryController);
  return orderRoutes.getRouter();
}
