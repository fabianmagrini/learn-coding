import {
  SortOption,
  FilterCondition,
  LogicalFilter,
  PaginationOption,
  QueryResult,
  CompareFn,
} from '../types';
import {
  sortBySingleField,
  sortByMultipleFields,
  sortByCustomFn,
  filterData,
  paginate,
} from '../utils';

/**
 * JsonQuery - A fluent API for querying, sorting, filtering, and paginating JSON data
 *
 * @template T - The type of objects in the data array
 */
export class JsonQuery<T> {
  private data: T[];
  private sortOptions: SortOption<T>[] = [];
  private customSortFn?: CompareFn<T>;
  private filterConfig?: FilterCondition<T> | LogicalFilter<T>;
  private paginationConfig?: PaginationOption;

  /**
   * Create a new JsonQuery instance
   *
   * @param data - The array of data to query
   */
  constructor(data: T[]) {
    this.data = [...data]; // Create a copy to avoid mutating original
  }

  /**
   * Add a sort operation
   *
   * @param sortOption - A single sort option or an array of sort options
   * @returns The JsonQuery instance for chaining
   *
   * @example
   * ```typescript
   * query.sort({ field: 'name', direction: 'asc' })
   * query.sort([
   *   { field: 'lastName', direction: 'asc' },
   *   { field: 'age', direction: 'desc' }
   * ])
   * ```
   */
  sort(sortOption: SortOption<T> | SortOption<T>[]): this {
    if (Array.isArray(sortOption)) {
      this.sortOptions = sortOption;
    } else {
      this.sortOptions = [sortOption];
    }
    this.customSortFn = undefined; // Clear custom sort if any
    return this;
  }

  /**
   * Sort using a custom comparison function
   *
   * @param compareFn - A custom comparison function
   * @returns The JsonQuery instance for chaining
   *
   * @example
   * ```typescript
   * query.sortBy((a, b) => a.score - b.score)
   * ```
   */
  sortBy(compareFn: CompareFn<T>): this {
    this.customSortFn = compareFn;
    this.sortOptions = []; // Clear standard sort options
    return this;
  }

  /**
   * Add a filter operation
   *
   * @param filter - A filter condition or logical filter
   * @returns The JsonQuery instance for chaining
   *
   * @example
   * ```typescript
   * // Single condition
   * query.filter({ field: 'age', operator: 'greaterThan', value: 28 })
   *
   * // Logical filter with multiple conditions
   * query.filter({
   *   logicalOperator: 'and',
   *   conditions: [
   *     { field: 'age', operator: 'greaterThan', value: 25 },
   *     { field: 'city', operator: 'equals', value: 'New York' }
   *   ]
   * })
   * ```
   */
  filter(filter: FilterCondition<T> | LogicalFilter<T>): this {
    this.filterConfig = filter;
    return this;
  }

  /**
   * Add pagination
   *
   * @param options - Pagination options (page-based or offset-based)
   * @returns The JsonQuery instance for chaining
   *
   * @example
   * ```typescript
   * // Page-based pagination
   * query.paginate({ page: 1, pageSize: 10 })
   *
   * // Offset-based pagination
   * query.paginate({ offset: 0, limit: 10 })
   * ```
   */
  paginate(options: PaginationOption): this {
    this.paginationConfig = options;
    return this;
  }

  /**
   * Execute the query and return results
   *
   * @returns Query results with data and metadata
   *
   * @example
   * ```typescript
   * const result = query
   *   .filter({ field: 'age', operator: 'greaterThan', value: 28 })
   *   .sort({ field: 'name', direction: 'asc' })
   *   .paginate({ page: 1, pageSize: 10 })
   *   .execute();
   * ```
   */
  execute(): QueryResult<T> {
    let result = [...this.data];

    // Apply filtering
    if (this.filterConfig) {
      result = filterData(result, this.filterConfig);
    }

    // Apply sorting
    if (this.customSortFn) {
      result = sortByCustomFn(result, this.customSortFn);
    } else if (this.sortOptions.length > 0) {
      if (this.sortOptions.length === 1) {
        result = sortBySingleField(result, this.sortOptions[0]);
      } else {
        result = sortByMultipleFields(result, this.sortOptions);
      }
    }

    // Apply pagination
    if (this.paginationConfig) {
      const paginationResult = paginate(result, this.paginationConfig);
      return {
        data: paginationResult.data,
        meta: {
          pagination: paginationResult.meta,
        },
      };
    }

    // Return without pagination
    return {
      data: result,
      meta: {},
    };
  }

  /**
   * Reset the query to its initial state
   *
   * @returns The JsonQuery instance for chaining
   */
  reset(): this {
    this.sortOptions = [];
    this.customSortFn = undefined;
    this.filterConfig = undefined;
    this.paginationConfig = undefined;
    return this;
  }

  /**
   * Get the current data without executing the full query
   * Useful for debugging or inspecting intermediate states
   *
   * @returns A copy of the current data
   */
  getData(): T[] {
    return [...this.data];
  }
}
