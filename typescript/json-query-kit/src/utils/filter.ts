import { FilterCondition, FilterOperator, LogicalFilter } from '../types';

/**
 * Apply a filter operator to a value
 */
function applyOperator<T>(
  itemValue: any,
  operator: FilterOperator,
  filterValue: any
): boolean {
  switch (operator) {
    case 'equals':
      return itemValue === filterValue;

    case 'notEquals':
      return itemValue !== filterValue;

    case 'contains':
      if (typeof itemValue === 'string' && typeof filterValue === 'string') {
        return itemValue.toLowerCase().includes(filterValue.toLowerCase());
      }
      if (Array.isArray(itemValue)) {
        return itemValue.includes(filterValue);
      }
      return false;

    case 'startsWith':
      if (typeof itemValue === 'string' && typeof filterValue === 'string') {
        return itemValue.toLowerCase().startsWith(filterValue.toLowerCase());
      }
      return false;

    case 'endsWith':
      if (typeof itemValue === 'string' && typeof filterValue === 'string') {
        return itemValue.toLowerCase().endsWith(filterValue.toLowerCase());
      }
      return false;

    case 'greaterThan':
      return itemValue > filterValue;

    case 'lessThan':
      return itemValue < filterValue;

    case 'greaterThanOrEqual':
      return itemValue >= filterValue;

    case 'lessThanOrEqual':
      return itemValue <= filterValue;

    case 'in':
      if (Array.isArray(filterValue)) {
        return filterValue.includes(itemValue);
      }
      return false;

    default:
      return false;
  }
}

/**
 * Check if an item matches a single filter condition
 */
function matchesCondition<T>(
  item: T,
  condition: FilterCondition<T>
): boolean {
  const itemValue = item[condition.field];
  return applyOperator(itemValue, condition.operator, condition.value);
}

/**
 * Check if an item matches a logical filter (with nested conditions)
 */
function matchesLogicalFilter<T>(
  item: T,
  filter: LogicalFilter<T>
): boolean {
  const { logicalOperator, conditions } = filter;

  if (logicalOperator === 'and') {
    return conditions.every(cond => matchesFilter(item, cond));
  } else {
    return conditions.some(cond => matchesFilter(item, cond));
  }
}

/**
 * Check if an item matches a filter (condition or logical filter)
 */
function matchesFilter<T>(
  item: T,
  filter: FilterCondition<T> | LogicalFilter<T>
): boolean {
  if ('logicalOperator' in filter) {
    return matchesLogicalFilter(item, filter);
  } else {
    return matchesCondition(item, filter);
  }
}

/**
 * Filter an array based on a single condition
 */
export function filterByCondition<T>(
  data: T[],
  condition: FilterCondition<T>
): T[] {
  return data.filter(item => matchesCondition(item, condition));
}

/**
 * Filter an array based on a logical filter with multiple conditions
 */
export function filterByLogical<T>(
  data: T[],
  filter: LogicalFilter<T>
): T[] {
  return data.filter(item => matchesLogicalFilter(item, filter));
}

/**
 * Filter an array based on any filter type
 */
export function filterData<T>(
  data: T[],
  filter: FilterCondition<T> | LogicalFilter<T>
): T[] {
  return data.filter(item => matchesFilter(item, filter));
}
