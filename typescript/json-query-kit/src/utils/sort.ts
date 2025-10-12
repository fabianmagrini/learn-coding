import { SortOption, CompareFn } from '../types';

/**
 * Sort an array of objects by a single field
 */
export function sortBySingleField<T>(
  data: T[],
  sortOption: SortOption<T>
): T[] {
  const { field, direction } = sortOption;
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...data].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal === bVal) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return multiplier * aVal.localeCompare(bVal);
    }

    if (aVal < bVal) return -1 * multiplier;
    if (aVal > bVal) return 1 * multiplier;
    return 0;
  });
}

/**
 * Sort an array of objects by multiple fields
 */
export function sortByMultipleFields<T>(
  data: T[],
  sortOptions: SortOption<T>[]
): T[] {
  return [...data].sort((a, b) => {
    for (const { field, direction } of sortOptions) {
      const multiplier = direction === 'asc' ? 1 : -1;
      const aVal = a[field];
      const bVal = b[field];

      if (aVal === bVal) continue;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return multiplier * aVal.localeCompare(bVal);
      }

      if (aVal < bVal) return -1 * multiplier;
      if (aVal > bVal) return 1 * multiplier;
    }
    return 0;
  });
}

/**
 * Sort an array using a custom comparison function
 */
export function sortByCustomFn<T>(data: T[], compareFn: CompareFn<T>): T[] {
  return [...data].sort(compareFn);
}
