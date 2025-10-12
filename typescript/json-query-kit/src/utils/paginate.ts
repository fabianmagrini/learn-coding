import { PaginationOption, PaginationMeta } from '../types';

/**
 * Paginate result structure
 */
export interface PaginationResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Paginate an array using page-based pagination
 */
export function paginateByPage<T>(
  data: T[],
  page: number,
  pageSize: number
): PaginationResult<T> {
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedData = data.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    meta: {
      totalItems,
      currentPage,
      pageSize,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    },
  };
}

/**
 * Paginate an array using offset-based pagination
 */
export function paginateByOffset<T>(
  data: T[],
  offset: number,
  limit: number
): PaginationResult<T> {
  const totalItems = data.length;
  const startIndex = Math.max(0, Math.min(offset, totalItems));
  const endIndex = Math.min(startIndex + limit, totalItems);
  const paginatedData = data.slice(startIndex, endIndex);

  // Calculate equivalent page-based values for metadata
  const pageSize = limit;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    data: paginatedData,
    meta: {
      totalItems,
      currentPage,
      pageSize,
      totalPages,
      hasNextPage: endIndex < totalItems,
      hasPrevPage: startIndex > 0,
    },
  };
}

/**
 * Paginate an array based on pagination options
 */
export function paginate<T>(
  data: T[],
  options: PaginationOption
): PaginationResult<T> {
  // Offset-based pagination takes precedence
  if (options.offset !== undefined && options.limit !== undefined) {
    return paginateByOffset(data, options.offset, options.limit);
  }

  // Page-based pagination
  const page = options.page || 1;
  const pageSize = options.pageSize || 10;
  return paginateByPage(data, page, pageSize);
}
