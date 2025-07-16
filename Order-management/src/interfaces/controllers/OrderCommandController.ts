import { Request, Response } from 'express';
import { 
  CreateOrderHandler,
  UpdateOrderStatusHandler,
  AddOrderItemHandler,
  RemoveOrderItemHandler,
  RollbackOrderHandler
} from '../../application/commands/handlers/OrderCommandHandlers';
import { 
  CreateOrderCommand,
  UpdateOrderStatusCommand,
  AddOrderItemCommand,
  RemoveOrderItemCommand,
  RollbackOrderCommand
} from '../../application/commands/OrderCommands';
import { OrderStatus } from '../../domain/models/Order';

/**
 * Command Controller for handling write operations (CQRS Write Side)
 * Responsible for processing commands that modify the system state
 */
export class OrderCommandController {
  constructor(
    private createOrderHandler: CreateOrderHandler,
    private updateStatusHandler: UpdateOrderStatusHandler,
    private addItemHandler: AddOrderItemHandler,
    private removeItemHandler: RemoveOrderItemHandler,
    private rollbackHandler: RollbackOrderHandler
  ) {}

  /**
   * Create a new order
   * POST /api/orders
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { customerId, items } = req.body;

      // Validate required fields
      if (!customerId?.trim()) {
        res.status(400).json({
          error: 'Customer ID is required',
          details: 'customerId field cannot be empty'
        });
        return;
      }

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          error: 'Items are required',
          details: 'At least one item must be provided'
        });
        return;
      }

      // Validate items
      for (const item of items) {
        if (!item.productId?.trim()) {
          res.status(400).json({
            error: 'Product ID is required for all items',
            details: 'Each item must have a valid productId'
          });
          return;
        }
        
        if (!item.productName?.trim()) {
          res.status(400).json({
            error: 'Product name is required for all items',
            details: 'Each item must have a productName'
          });
          return;
        }

        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          res.status(400).json({
            error: 'Valid quantity is required for all items',
            details: 'Quantity must be a positive number'
          });
          return;
        }

        if (typeof item.price !== 'number' || item.price <= 0) {
          res.status(400).json({
            error: 'Valid price is required for all items',
            details: 'Price must be a positive number'
          });
          return;
        }
      }

      // Create command
      const command: CreateOrderCommand = {
        type: 'CreateOrder',
        customerId: customerId.trim(),
        items
      };

      // Execute command
      const orderId = await this.createOrderHandler.handle(command);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        orderId,
        data: {
          orderId,
          customerId,
          items,
          status: OrderStatus.PENDING
        }
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update order status
   * PUT /api/orders/:orderId/status
   */
  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      // Validate order ID
      if (!orderId?.trim()) {
        res.status(400).json({
          error: 'Order ID is required',
          details: 'orderId parameter cannot be empty'
        });
        return;
      }

      // Validate status
      if (!status || !Object.values(OrderStatus).includes(status)) {
        res.status(400).json({
          error: 'Valid status is required',
          details: `Status must be one of: ${Object.values(OrderStatus).join(', ')}`
        });
        return;
      }

      // Create command
      const command: UpdateOrderStatusCommand = {
        type: 'UpdateOrderStatus',
        orderId: orderId.trim(),
        status
      };

      // Execute command
      await this.updateStatusHandler.handle(command);

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: {
          orderId,
          newStatus: status
        }
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          res.status(404).json({
            error: 'Order not found',
            details: error.message
          });
          return;
        }
        
        if (error.message.includes('Cannot transition') || error.message.includes('Invalid status')) {
          res.status(400).json({
            error: 'Invalid status transition',
            details: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to update order status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Add item to order
   * POST /api/orders/:orderId/items
   */
  async addOrderItem(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const item = req.body;

      // Validate order ID
      if (!orderId?.trim()) {
        res.status(400).json({
          error: 'Order ID is required',
          details: 'orderId parameter cannot be empty'
        });
        return;
      }

      // Validate item
      if (!item.productId?.trim()) {
        res.status(400).json({
          error: 'Product ID is required',
          details: 'Item must have a valid productId'
        });
        return;
      }

      if (!item.productName?.trim()) {
        res.status(400).json({
          error: 'Product name is required',
          details: 'Item must have a productName'
        });
        return;
      }

      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        res.status(400).json({
          error: 'Valid quantity is required',
          details: 'Quantity must be a positive number'
        });
        return;
      }

      if (typeof item.price !== 'number' || item.price <= 0) {
        res.status(400).json({
          error: 'Valid price is required',
          details: 'Price must be a positive number'
        });
        return;
      }

      // Create command
      const command: AddOrderItemCommand = {
        type: 'AddOrderItem',
        orderId: orderId.trim(),
        item: {
          productId: item.productId.trim(),
          productName: item.productName.trim(),
          quantity: item.quantity,
          price: item.price
        }
      };

      // Execute command
      await this.addItemHandler.handle(command);

      res.json({
        success: true,
        message: 'Item added to order successfully',
        data: {
          orderId,
          item: command.item
        }
      });
    } catch (error) {
      console.error('Error adding order item:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          res.status(404).json({
            error: 'Order not found',
            details: error.message
          });
          return;
        }
        
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          res.status(409).json({
            error: 'Item already exists',
            details: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to add item to order',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Remove item from order
   * DELETE /api/orders/:orderId/items/:productId
   */
  async removeOrderItem(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, productId } = req.params;

      // Validate parameters
      if (!orderId?.trim()) {
        res.status(400).json({
          error: 'Order ID is required',
          details: 'orderId parameter cannot be empty'
        });
        return;
      }

      if (!productId?.trim()) {
        res.status(400).json({
          error: 'Product ID is required',
          details: 'productId parameter cannot be empty'
        });
        return;
      }

      // Create command
      const command: RemoveOrderItemCommand = {
        type: 'RemoveOrderItem',
        orderId: orderId.trim(),
        productId: productId.trim()
      };

      // Execute command
      await this.removeItemHandler.handle(command);

      res.json({
        success: true,
        message: 'Item removed from order successfully',
        data: {
          orderId,
          productId
        }
      });
    } catch (error) {
      console.error('Error removing order item:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          res.status(404).json({
            error: 'Order or item not found',
            details: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to remove item from order',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Rollback order to previous state
   * POST /api/orders/:orderId/rollback
   */
  async rollbackOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { toVersion, toTimestamp } = req.body;

      // Validate order ID
      if (!orderId?.trim()) {
        res.status(400).json({
          error: 'Order ID is required',
          details: 'orderId parameter cannot be empty'
        });
        return;
      }

      // Validate rollback parameters
      if (!toVersion && !toTimestamp) {
        res.status(400).json({
          error: 'Rollback target is required',
          details: 'Either toVersion (number) or toTimestamp (string) must be provided'
        });
        return;
      }

      if (toVersion && toTimestamp) {
        res.status(400).json({
          error: 'Conflicting rollback parameters',
          details: 'Provide either toVersion or toTimestamp, not both'
        });
        return;
      }

      if (toVersion !== undefined && (typeof toVersion !== 'number' || toVersion < 1)) {
        res.status(400).json({
          error: 'Invalid version',
          details: 'toVersion must be a positive number'
        });
        return;
      }

      if (toTimestamp !== undefined && typeof toTimestamp !== 'string') {
        res.status(400).json({
          error: 'Invalid timestamp',
          details: 'toTimestamp must be a valid timestamp string'
        });
        return;
      }

      // Create command
      const command: RollbackOrderCommand = {
        type: 'RollbackOrder',
        orderId: orderId.trim(),
        toVersion,
        toTimestamp
      };

      // Execute command
      await this.rollbackHandler.handle(command);

      res.json({
        success: true,
        message: 'Order rolled back successfully',
        data: {
          orderId,
          rollbackTo: toVersion ? `Version ${toVersion}` : `Timestamp ${toTimestamp}`
        }
      });
    } catch (error) {
      console.error('Error rolling back order:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          res.status(404).json({
            error: 'Order not found',
            details: error.message
          });
          return;
        }
        
        if (error.message.includes('Invalid version') || error.message.includes('Invalid timestamp')) {
          res.status(400).json({
            error: 'Invalid rollback target',
            details: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to rollback order',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
