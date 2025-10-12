/**
 * Mock remote API for demonstration purposes
 * Simulates fetching user data from an external API
 */

export interface User {
  id: number;
  name: string;
  age: number;
  city: string;
}

/**
 * Simulates fetching all users from a remote API
 * Includes a 500ms delay to simulate network latency
 *
 * @returns Promise resolving to an array of user objects
 */
export const fetchAllUsers = async (): Promise<User[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([
        { id: 1, name: 'John Doe', age: 30, city: 'New York' },
        { id: 2, name: 'Jane Smith', age: 25, city: 'London' },
        { id: 3, name: 'Peter Jones', age: 35, city: 'Paris' },
        { id: 4, name: 'Alice Brown', age: 28, city: 'New York' },
        { id: 5, name: 'Bob Wilson', age: 25, city: 'Tokyo' },
        { id: 6, name: 'Carol White', age: 32, city: 'London' },
        { id: 7, name: 'David Lee', age: 29, city: 'Seoul' },
        { id: 8, name: 'Emma Davis', age: 27, city: 'Sydney' },
        { id: 9, name: 'Frank Miller', age: 33, city: 'Berlin' },
        { id: 10, name: 'Grace Taylor', age: 31, city: 'Toronto' },
        { id: 11, name: 'Henry Moore', age: 26, city: 'Paris' },
        { id: 12, name: 'Iris Anderson', age: 34, city: 'New York' },
        { id: 13, name: 'Jack Thomas', age: 24, city: 'London' },
        { id: 14, name: 'Kate Jackson', age: 36, city: 'Tokyo' },
        { id: 15, name: 'Leo Martin', age: 23, city: 'Madrid' },
      ]);
    }, 500);
  });
};
