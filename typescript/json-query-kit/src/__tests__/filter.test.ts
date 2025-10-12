import { filterByCondition, filterByLogical, filterData } from '../utils/filter';
import { FilterCondition, LogicalFilter } from '../types';

describe('Filter Utils', () => {
  interface TestData {
    id: number;
    name: string;
    age: number;
    city: string;
    tags: string[];
  }

  const testData: TestData[] = [
    { id: 1, name: 'John Doe', age: 30, city: 'New York', tags: ['developer', 'senior'] },
    { id: 2, name: 'Jane Smith', age: 25, city: 'London', tags: ['designer', 'junior'] },
    { id: 3, name: 'Peter Jones', age: 35, city: 'Paris', tags: ['developer', 'lead'] },
    { id: 4, name: 'Alice Brown', age: 28, city: 'New York', tags: ['manager'] },
    { id: 5, name: 'Bob Wilson', age: 25, city: 'Tokyo', tags: ['developer', 'junior'] },
  ];

  describe('filterByCondition', () => {
    it('should filter using equals operator', () => {
      const condition: FilterCondition<TestData> = {
        field: 'city',
        operator: 'equals',
        value: 'New York',
      };
      const result = filterByCondition(testData, condition);

      expect(result.length).toBe(2);
      expect(result.every(item => item.city === 'New York')).toBe(true);
    });

    it('should filter using notEquals operator', () => {
      const condition: FilterCondition<TestData> = {
        field: 'city',
        operator: 'notEquals',
        value: 'New York',
      };
      const result = filterByCondition(testData, condition);

      expect(result.length).toBe(3);
      expect(result.every(item => item.city !== 'New York')).toBe(true);
    });

    it('should filter using contains operator on strings', () => {
      const condition: FilterCondition<TestData> = {
        field: 'name',
        operator: 'contains',
        value: 'John',
      };
      const result = filterByCondition(testData, condition);

      expect(result.length).toBe(1); // Only John Doe
      expect(result[0].name).toBe('John Doe');
    });

    it('should filter using contains operator on arrays', () => {
      const condition: FilterCondition<TestData> = {
        field: 'tags',
        operator: 'contains',
        value: 'developer',
      };
      const result = filterByCondition(testData, condition);

      expect(result.length).toBe(3);
    });

    it('should filter using startsWith operator', () => {
      const condition: FilterCondition<TestData> = {
        field: 'name',
        operator: 'startsWith',
        value: 'J',
      };
      const result = filterByCondition(testData, condition);

      expect(result.length).toBe(2); // John and Jane
    });

    it('should filter using endsWith operator', () => {
      const condition: FilterCondition<TestData> = {
        field: 'name',
        operator: 'endsWith',
        value: 'son',
      };
      const result = filterByCondition(testData, condition);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Bob Wilson');
    });

    it('should filter using greaterThan operator', () => {
      const condition: FilterCondition<TestData> = {
        field: 'age',
        operator: 'greaterThan',
        value: 28,
      };
      const result = filterByCondition(testData, condition);

      expect(result.length).toBe(2); // 30 and 35
    });

    it('should filter using lessThan operator', () => {
      const condition: FilterCondition<TestData> = {
        field: 'age',
        operator: 'lessThan',
        value: 28,
      };
      const result = filterByCondition(testData, condition);

      expect(result.length).toBe(2); // Two people aged 25
    });

    it('should filter using greaterThanOrEqual operator', () => {
      const condition: FilterCondition<TestData> = {
        field: 'age',
        operator: 'greaterThanOrEqual',
        value: 28,
      };
      const result = filterByCondition(testData, condition);

      expect(result.length).toBe(3);
    });

    it('should filter using lessThanOrEqual operator', () => {
      const condition: FilterCondition<TestData> = {
        field: 'age',
        operator: 'lessThanOrEqual',
        value: 28,
      };
      const result = filterByCondition(testData, condition);

      expect(result.length).toBe(3);
    });

    it('should filter using in operator', () => {
      const condition: FilterCondition<TestData> = {
        field: 'city',
        operator: 'in',
        value: ['New York', 'Paris', 'Berlin'],
      };
      const result = filterByCondition(testData, condition);

      expect(result.length).toBe(3);
    });
  });

  describe('filterByLogical', () => {
    it('should filter using AND logic', () => {
      const filter: LogicalFilter<TestData> = {
        logicalOperator: 'and',
        conditions: [
          { field: 'age', operator: 'greaterThan', value: 25 },
          { field: 'city', operator: 'equals', value: 'New York' },
        ],
      };
      const result = filterByLogical(testData, filter);

      expect(result.length).toBe(2);
      expect(result.every(item => item.age > 25 && item.city === 'New York')).toBe(true);
    });

    it('should filter using OR logic', () => {
      const filter: LogicalFilter<TestData> = {
        logicalOperator: 'or',
        conditions: [
          { field: 'city', operator: 'equals', value: 'Paris' },
          { field: 'city', operator: 'equals', value: 'Tokyo' },
        ],
      };
      const result = filterByLogical(testData, filter);

      expect(result.length).toBe(2);
    });

    it('should handle nested logical filters', () => {
      const filter: LogicalFilter<TestData> = {
        logicalOperator: 'and',
        conditions: [
          { field: 'age', operator: 'greaterThan', value: 20 },
          {
            logicalOperator: 'or',
            conditions: [
              { field: 'city', operator: 'equals', value: 'New York' },
              { field: 'city', operator: 'equals', value: 'Paris' },
            ],
          },
        ],
      };
      const result = filterByLogical(testData, filter);

      expect(result.length).toBe(3);
    });
  });

  describe('filterData', () => {
    it('should work with simple conditions', () => {
      const condition: FilterCondition<TestData> = {
        field: 'age',
        operator: 'greaterThan',
        value: 28,
      };
      const result = filterData(testData, condition);

      expect(result.length).toBe(2);
    });

    it('should work with logical filters', () => {
      const filter: LogicalFilter<TestData> = {
        logicalOperator: 'and',
        conditions: [
          { field: 'age', operator: 'greaterThanOrEqual', value: 25 },
          { field: 'tags', operator: 'contains', value: 'developer' },
        ],
      };
      const result = filterData(testData, filter);

      expect(result.length).toBe(3);
    });
  });
});
