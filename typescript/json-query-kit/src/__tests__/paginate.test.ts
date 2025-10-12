import { paginateByPage, paginateByOffset, paginate } from '../utils/paginate';
import { PaginationOption } from '../types';

describe('Pagination Utils', () => {
  const testData = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, value: `Item ${i + 1}` }));

  describe('paginateByPage', () => {
    it('should paginate correctly for first page', () => {
      const result = paginateByPage(testData, 1, 10);

      expect(result.data.length).toBe(10);
      expect(result.data[0].id).toBe(1);
      expect(result.data[9].id).toBe(10);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.totalItems).toBe(25);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(false);
    });

    it('should paginate correctly for middle page', () => {
      const result = paginateByPage(testData, 2, 10);

      expect(result.data.length).toBe(10);
      expect(result.data[0].id).toBe(11);
      expect(result.data[9].id).toBe(20);
      expect(result.meta.currentPage).toBe(2);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(true);
    });

    it('should paginate correctly for last page', () => {
      const result = paginateByPage(testData, 3, 10);

      expect(result.data.length).toBe(5);
      expect(result.data[0].id).toBe(21);
      expect(result.data[4].id).toBe(25);
      expect(result.meta.currentPage).toBe(3);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(true);
    });

    it('should handle page number beyond available pages', () => {
      const result = paginateByPage(testData, 10, 10);

      expect(result.data.length).toBe(5);
      expect(result.meta.currentPage).toBe(3); // Clamped to last page
    });

    it('should handle page number less than 1', () => {
      const result = paginateByPage(testData, 0, 10);

      expect(result.meta.currentPage).toBe(1); // Clamped to first page
    });

    it('should handle empty array', () => {
      const result = paginateByPage([], 1, 10);

      expect(result.data.length).toBe(0);
      expect(result.meta.totalItems).toBe(0);
      expect(result.meta.totalPages).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(false);
    });
  });

  describe('paginateByOffset', () => {
    it('should paginate correctly with offset 0', () => {
      const result = paginateByOffset(testData, 0, 10);

      expect(result.data.length).toBe(10);
      expect(result.data[0].id).toBe(1);
      expect(result.data[9].id).toBe(10);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(false);
    });

    it('should paginate correctly with non-zero offset', () => {
      const result = paginateByOffset(testData, 10, 10);

      expect(result.data.length).toBe(10);
      expect(result.data[0].id).toBe(11);
      expect(result.data[9].id).toBe(20);
      expect(result.meta.currentPage).toBe(2);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(true);
    });

    it('should handle offset beyond array length', () => {
      const result = paginateByOffset(testData, 100, 10);

      expect(result.data.length).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('should handle limit exceeding remaining items', () => {
      const result = paginateByOffset(testData, 20, 10);

      expect(result.data.length).toBe(5);
      expect(result.data[0].id).toBe(21);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(true);
    });
  });

  describe('paginate', () => {
    it('should use page-based pagination by default', () => {
      const options: PaginationOption = { page: 2, pageSize: 10 };
      const result = paginate(testData, options);

      expect(result.data.length).toBe(10);
      expect(result.data[0].id).toBe(11);
      expect(result.meta.currentPage).toBe(2);
    });

    it('should prioritize offset-based pagination when both are provided', () => {
      const options: PaginationOption = {
        page: 2,
        pageSize: 10,
        offset: 5,
        limit: 5
      };
      const result = paginate(testData, options);

      expect(result.data.length).toBe(5);
      expect(result.data[0].id).toBe(6);
    });

    it('should use default page and pageSize when not provided', () => {
      const options: PaginationOption = {};
      const result = paginate(testData, options);

      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.pageSize).toBe(10);
    });

    it('should handle partial offset-based options', () => {
      const options: PaginationOption = { offset: 10 };
      const result = paginate(testData, options);

      // Should fall back to page-based since limit is not provided
      expect(result.meta.currentPage).toBe(1);
    });
  });
});
