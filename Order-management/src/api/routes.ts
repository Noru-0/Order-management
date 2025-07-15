import express from 'express';
import { OrderController } from './controller';
import { validateCreateOrder, validateUpdateOrderStatus } from './middleware';

export function createOrderRoutes(orderController: OrderController): express.Router {
  const router = express.Router();

  // Create a new order
  router.post('/orders', validateCreateOrder, async (req, res, next) => {
    try {
      await orderController.createOrder(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Get an order by ID
  router.get('/orders/:id', async (req, res, next) => {
    try {
      await orderController.getOrder(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Update order status
  router.put('/orders/:id/status', validateUpdateOrderStatus, async (req, res, next) => {
    try {
      await orderController.updateOrderStatus(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Add item to order
  router.post('/orders/:id/items', async (req, res, next) => {
    try {
      await orderController.addOrderItem(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Remove item from order
  router.delete('/orders/:id/items/:productId', async (req, res, next) => {
    try {
      await orderController.removeOrderItem(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Get all orders
  router.get('/orders', async (req, res, next) => {
    try {
      await orderController.getAllOrders(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Debug endpoints for demo
  router.get('/debug/events', async (req, res, next) => {
    try {
      await orderController.getAllEvents(req, res);
    } catch (error) {
      next(error);
    }
  });

  router.get('/debug/orders/:id/events', async (req, res, next) => {
    try {
      await orderController.getOrderEvents(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Database statistics endpoint
  router.get('/debug/stats', async (req, res, next) => {
    try {
      await orderController.getDatabaseStats(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Rollback endpoint for Event Sourcing demo
  router.post('/debug/orders/:id/rollback', async (req, res, next) => {
    try {
      await orderController.rollbackOrder(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Debug rebuild endpoint
  router.get('/debug/orders/:id/rebuild', async (req, res, next) => {
    try {
      await orderController.debugRebuildOrder(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Get skipped versions for an order
  router.get('/debug/orders/:id/skipped-versions', async (req, res, next) => {
    try {
      await orderController.getSkippedVersions(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Debug skipped versions endpoint
  router.get('/debug/orders/:id/skipped-versions-debug', async (req, res, next) => {
    try {
      await orderController.debugSkippedVersions(req, res);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
