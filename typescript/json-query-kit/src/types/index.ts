/**
 * Sort direction options
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort configuration for a single field
 */
export interface SortOption<T> {
  field: keyof T;
  direction: SortDirection;
}

/**
 * Filter operators supported by the library
 */
export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'in';

/**
 * A single filter condition
 */
export interface FilterCondition<T> {
  field: keyof T;
  operator: FilterOperator;
  value: any;
}

/**
 * Logical operators for combining filters
 */
export type LogicalOperator = 'and' | 'or';

/**
 * Logical filter for combining multiple conditions
 */
export interface LogicalFilter<T> {
  logicalOperator: LogicalOperator;
  conditions: (FilterCondition<T> | LogicalFilter<T>)[];
}

/**
 * Pagination configuration options
 */
export interface PaginationOption {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

/**
 * Pagination metadata included in query results
 */
export interface PaginationMeta {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Query result structure
 */
export interface QueryResult<T> {
  data: T[];
  meta: {
    pagination?: PaginationMeta;
  };
}

/**
 * Custom comparison function for sorting
 */
export type CompareFn<T> = (a: T, b: T) => number;
