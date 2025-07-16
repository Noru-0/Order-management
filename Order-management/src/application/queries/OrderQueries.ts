import { Order } from '../../domain/models/Order';
import { BaseDomainEvent } from '../../domain/events/types';

// Base query interface
export interface IQuery<TResult = any> {
  readonly type: string;
}

// Query DTOs
export interface GetOrderQuery extends IQuery<Order | null> {
  readonly type: 'GetOrder';
  readonly orderId: string;
}

export interface GetAllOrdersQuery extends IQuery<Order[]> {
  readonly type: 'GetAllOrders';
  readonly page?: number;
  readonly limit?: number;
}

export interface GetOrderEventsQuery extends IQuery<BaseDomainEvent[]> {
  readonly type: 'GetOrderEvents';
  readonly orderId: string;
}

export interface GetAllEventsQuery extends IQuery<{
  events: BaseDomainEvent[];
  totalCount: number;
  page: number;
  limit: number;
}> {
  readonly type: 'GetAllEvents';
  readonly page?: number;
  readonly limit?: number;
}

export interface GetSkippedVersionsQuery extends IQuery<number[]> {
  readonly type: 'GetSkippedVersions';
  readonly orderId: string;
}

export interface HealthCheckQuery extends IQuery<{
  status: string;
  database: { type: string; healthy: boolean };
  timestamp: string;
  uptime: number;
  version: string;
}> {
  readonly type: 'HealthCheck';
}

export interface GetDatabaseStatsQuery extends IQuery<{
  totalEvents: number;
  totalAggregates: number;
  eventTypes: { type: string; count: number }[];
  databaseType: string;
  timestamp: string;
}> {
  readonly type: 'GetDatabaseStats';
}

// Union type for all queries
export type OrderQuery = 
  | GetOrderQuery 
  | GetAllOrdersQuery 
  | GetOrderEventsQuery 
  | GetAllEventsQuery 
  | GetSkippedVersionsQuery 
  | HealthCheckQuery 
  | GetDatabaseStatsQuery;
