import { JsonQuery } from '../core/JsonQuery';

describe('JsonQuery', () => {
  interface User {
    id: number;
    name: string;
    age: number;
    city: string;
    active: boolean;
  }

  const users: User[] = [
    { id: 1, name: 'John Doe', age: 30, city: 'New York', active: true },
    { id: 2, name: 'Jane Smith', age: 25, city: 'London', active: true },
    { id: 3, name: 'Peter Jones', age: 35, city: 'Paris', active: false },
    { id: 4, name: 'Alice Brown', age: 28, city: 'New York', active: true },
    { id: 5, name: 'Bob Wilson', age: 25, city: 'Tokyo', active: true },
    { id: 6, name: 'Carol White', age: 32, city: 'London', active: false },
  ];

  describe('constructor', () => {
    it('should create a new instance with data', () => {
      const query = new JsonQuery(users);
      expect(query).toBeInstanceOf(JsonQuery);
    });

    it('should not mutate original data', () => {
      const original = [...users];
      const query = new JsonQuery(users);
      query.execute();

      expect(users).toEqual(original);
    });
  });

  describe('sorting', () => {
    it('should sort by single field ascending', () => {
      const query = new JsonQuery(users);
      const result = query.sort({ field: 'age', direction: 'asc' }).execute();

      expect(result.data[0].age).toBe(25);
      expect(result.data[result.data.length - 1].age).toBe(35);
    });

    it('should sort by single field descending', () => {
      const query = new JsonQuery(users);
      const result = query.sort({ field: 'name', direction: 'desc' }).execute();

      expect(result.data[0].name).toBe('Peter Jones');
      expect(result.data[result.data.length - 1].name).toBe('Alice Brown');
    });

    it('should sort by multiple fields', () => {
      const query = new JsonQuery(users);
      const result = query.sort([
        { field: 'age', direction: 'asc' },
        { field: 'name', direction: 'asc' }
      ]).execute();

      // Age 25: Bob Wilson, Jane Smith
      expect(result.data[0].name).toBe('Bob Wilson');
      expect(result.data[1].name).toBe('Jane Smith');
    });

    it('should sort by custom function', () => {
      const query = new JsonQuery(users);
      const result = query.sortBy((a, b) => b.id - a.id).execute();

      expect(result.data[0].id).toBe(6);
      expect(result.data[result.data.length - 1].id).toBe(1);
    });
  });

  describe('filtering', () => {
    it('should filter by single condition', () => {
      const query = new JsonQuery(users);
      const result = query.filter({
        field: 'city',
        operator: 'equals',
        value: 'New York'
      }).execute();

      expect(result.data.length).toBe(2);
      expect(result.data.every(u => u.city === 'New York')).toBe(true);
    });

    it('should filter by logical AND', () => {
      const query = new JsonQuery(users);
      const result = query.filter({
        logicalOperator: 'and',
        conditions: [
          { field: 'age', operator: 'greaterThan', value: 25 },
          { field: 'active', operator: 'equals', value: true }
        ]
      }).execute();

      expect(result.data.length).toBe(2); // John and Alice
    });

    it('should filter by logical OR', () => {
      const query = new JsonQuery(users);
      const result = query.filter({
        logicalOperator: 'or',
        conditions: [
          { field: 'city', operator: 'equals', value: 'Paris' },
          { field: 'city', operator: 'equals', value: 'Tokyo' }
        ]
      }).execute();

      expect(result.data.length).toBe(2); // Peter and Bob
    });

    it('should filter using contains operator', () => {
      const query = new JsonQuery(users);
      const result = query.filter({
        field: 'name',
        operator: 'contains',
        value: 'o'
      }).execute();

      expect(result.data.length).toBe(5); // John, Jones, Brown, Wilson, Carol (case insensitive)
    });
  });

  describe('pagination', () => {
    it('should paginate with page-based approach', () => {
      const query = new JsonQuery(users);
      const result = query.paginate({ page: 1, pageSize: 3 }).execute();

      expect(result.data.length).toBe(3);
      expect(result.meta.pagination?.totalItems).toBe(6);
      expect(result.meta.pagination?.totalPages).toBe(2);
      expect(result.meta.pagination?.currentPage).toBe(1);
      expect(result.meta.pagination?.hasNextPage).toBe(true);
      expect(result.meta.pagination?.hasPrevPage).toBe(false);
    });

    it('should paginate with offset-based approach', () => {
      const query = new JsonQuery(users);
      const result = query.paginate({ offset: 2, limit: 3 }).execute();

      expect(result.data.length).toBe(3);
      expect(result.data[0].id).toBe(3);
    });

    it('should return correct metadata for last page', () => {
      const query = new JsonQuery(users);
      const result = query.paginate({ page: 2, pageSize: 3 }).execute();

      expect(result.data.length).toBe(3);
      expect(result.meta.pagination?.hasNextPage).toBe(false);
      expect(result.meta.pagination?.hasPrevPage).toBe(true);
    });
  });

  describe('chaining operations', () => {
    it('should chain filter, sort, and paginate', () => {
      const query = new JsonQuery(users);
      const result = query
        .filter({ field: 'active', operator: 'equals', value: true })
        .sort({ field: 'age', direction: 'asc' })
        .paginate({ page: 1, pageSize: 2 })
        .execute();

      expect(result.data.length).toBe(2);
      expect(result.data[0].age).toBe(25); // Bob or Jane
      expect(result.meta.pagination?.totalItems).toBe(4); // 4 active users
    });

    it('should apply operations in correct order', () => {
      const query = new JsonQuery(users);
      const result = query
        .filter({ field: 'age', operator: 'greaterThan', value: 25 })
        .sort({ field: 'name', direction: 'asc' })
        .execute();

      // Filter first: 4 users (John 30, Peter 35, Alice 28, Carol 32)
      // Then sort by name: Alice, Carol, John, Peter
      expect(result.data[0].name).toBe('Alice Brown');
      expect(result.data[1].name).toBe('Carol White');
      expect(result.data[2].name).toBe('John Doe');
      expect(result.data[3].name).toBe('Peter Jones');
    });

    it('should allow multiple executions with same query', () => {
      const query = new JsonQuery(users)
        .filter({ field: 'active', operator: 'equals', value: true });

      const result1 = query.execute();
      const result2 = query.execute();

      expect(result1).toEqual(result2);
    });
  });

  describe('reset', () => {
    it('should reset all query configurations', () => {
      const query = new JsonQuery(users);
      query
        .filter({ field: 'active', operator: 'equals', value: true })
        .sort({ field: 'age', direction: 'asc' })
        .paginate({ page: 1, pageSize: 2 })
        .reset();

      const result = query.execute();

      expect(result.data.length).toBe(6);
      expect(result.meta.pagination).toBeUndefined();
    });
  });

  describe('getData', () => {
    it('should return a copy of the data', () => {
      const query = new JsonQuery(users);
      const data = query.getData();

      expect(data).toEqual(users);
      expect(data).not.toBe(users); // Different reference
    });
  });

  describe('edge cases', () => {
    it('should handle empty data array', () => {
      const query = new JsonQuery<User>([]);
      const result = query
        .filter({ field: 'active', operator: 'equals', value: true })
        .execute();

      expect(result.data.length).toBe(0);
    });

    it('should handle no matching filters', () => {
      const query = new JsonQuery(users);
      const result = query
        .filter({ field: 'age', operator: 'greaterThan', value: 100 })
        .execute();

      expect(result.data.length).toBe(0);
    });

    it('should return data without meta.pagination when no pagination is applied', () => {
      const query = new JsonQuery(users);
      const result = query.execute();

      expect(result.data.length).toBe(6);
      expect(result.meta.pagination).toBeUndefined();
    });
  });
});
