import { sortBySingleField, sortByMultipleFields, sortByCustomFn } from '../utils/sort';
import { SortOption } from '../types';

describe('Sort Utils', () => {
  interface TestData {
    id: number;
    name: string;
    age: number;
    city: string;
  }

  const testData: TestData[] = [
    { id: 1, name: 'John Doe', age: 30, city: 'New York' },
    { id: 2, name: 'Jane Smith', age: 25, city: 'London' },
    { id: 3, name: 'Peter Jones', age: 35, city: 'Paris' },
    { id: 4, name: 'Alice Brown', age: 28, city: 'New York' },
    { id: 5, name: 'Bob Wilson', age: 25, city: 'Tokyo' },
  ];

  describe('sortBySingleField', () => {
    it('should sort by string field in ascending order', () => {
      const sortOption: SortOption<TestData> = { field: 'name', direction: 'asc' };
      const result = sortBySingleField(testData, sortOption);

      expect(result[0].name).toBe('Alice Brown');
      expect(result[result.length - 1].name).toBe('Peter Jones');
    });

    it('should sort by string field in descending order', () => {
      const sortOption: SortOption<TestData> = { field: 'name', direction: 'desc' };
      const result = sortBySingleField(testData, sortOption);

      expect(result[0].name).toBe('Peter Jones');
      expect(result[result.length - 1].name).toBe('Alice Brown');
    });

    it('should sort by number field in ascending order', () => {
      const sortOption: SortOption<TestData> = { field: 'age', direction: 'asc' };
      const result = sortBySingleField(testData, sortOption);

      expect(result[0].age).toBe(25);
      expect(result[result.length - 1].age).toBe(35);
    });

    it('should sort by number field in descending order', () => {
      const sortOption: SortOption<TestData> = { field: 'age', direction: 'desc' };
      const result = sortBySingleField(testData, sortOption);

      expect(result[0].age).toBe(35);
      expect(result[result.length - 1].age).toBe(25);
    });

    it('should not mutate the original array', () => {
      const original = [...testData];
      const sortOption: SortOption<TestData> = { field: 'name', direction: 'asc' };
      sortBySingleField(testData, sortOption);

      expect(testData).toEqual(original);
    });
  });

  describe('sortByMultipleFields', () => {
    it('should sort by multiple fields', () => {
      const sortOptions: SortOption<TestData>[] = [
        { field: 'age', direction: 'asc' },
        { field: 'name', direction: 'asc' },
      ];
      const result = sortByMultipleFields(testData, sortOptions);

      // Age 25: Bob Wilson, Jane Smith (sorted by name)
      expect(result[0].name).toBe('Bob Wilson');
      expect(result[1].name).toBe('Jane Smith');

      // Age 35: Peter Jones
      expect(result[result.length - 1].name).toBe('Peter Jones');
    });

    it('should respect field order priority', () => {
      const sortOptions: SortOption<TestData>[] = [
        { field: 'city', direction: 'asc' },
        { field: 'age', direction: 'desc' },
      ];
      const result = sortByMultipleFields(testData, sortOptions);

      // London: Jane Smith
      expect(result[0].city).toBe('London');

      // New York has 2 people, sorted by age desc (30, 28)
      const nyPeople = result.filter(p => p.city === 'New York');
      expect(nyPeople[0].age).toBe(30);
      expect(nyPeople[1].age).toBe(28);
    });
  });

  describe('sortByCustomFn', () => {
    it('should sort using custom comparison function', () => {
      const customFn = (a: TestData, b: TestData) => b.age - a.age;
      const result = sortByCustomFn(testData, customFn);

      expect(result[0].age).toBe(35);
      expect(result[result.length - 1].age).toBe(25);
    });

    it('should handle complex custom logic', () => {
      // Sort by city length, then by name
      const customFn = (a: TestData, b: TestData) => {
        const lenDiff = a.city.length - b.city.length;
        if (lenDiff !== 0) return lenDiff;
        return a.name.localeCompare(b.name);
      };
      const result = sortByCustomFn(testData, customFn);

      expect(result[0].city).toBe('Tokyo'); // Length 5
      expect(result[result.length - 1].city).toBe('New York'); // Length 8
    });
  });
});
