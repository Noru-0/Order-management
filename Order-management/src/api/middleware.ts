import { Request, Response, NextFunction } from 'express';
import { OrderStatus } from '../domain/Order';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCreateOrder(req: Request, res: Response, next: NextFunction): void {
  const errors: ValidationError[] = [];
  const { customerId, items } = req.body;

  // Validate customerId
  if (!customerId || typeof customerId !== 'string') {
    errors.push({
      field: 'customerId',
      message: 'Customer ID is required and must be a string'
    });
  }

  // Validate items
  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push({
      field: 'items',
      message: 'Items are required and must be a non-empty array'
    });
  } else {
    items.forEach((item, index) => {
      if (!item.productId || typeof item.productId !== 'string') {
        errors.push({
          field: `items[${index}].productId`,
          message: 'Product ID is required and must be a string'
        });
      }
      
      if (!item.productName || typeof item.productName !== 'string') {
        errors.push({
          field: `items[${index}].productName`,
          message: 'Product name is required and must be a string'
        });
      }
      
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push({
          field: `items[${index}].quantity`,
          message: 'Quantity is required and must be a positive number'
        });
      }
      
      if (!item.price || typeof item.price !== 'number' || item.price <= 0) {
        errors.push({
          field: `items[${index}].price`,
          message: 'Price is required and must be a positive number'
        });
      }
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
}

export function validateUpdateOrderStatus(req: Request, res: Response, next: NextFunction): void {
  const errors: ValidationError[] = [];
  const { status } = req.body;

  // Validate status
  if (!status || typeof status !== 'string') {
    errors.push({
      field: 'status',
      message: 'Status is required and must be a string'
    });
  } else if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
    errors.push({
      field: 'status',
      message: `Status must be one of: ${Object.values(OrderStatus).join(', ')}`
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
}

export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
  console.error('Error:', error);

  if (error.message.includes('not found')) {
    res.status(404).json({
      success: false,
      error: error.message
    });
    return;
  }

  if (error.message.includes('Concurrency conflict')) {
    res.status(409).json({
      success: false,
      error: error.message
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
}
