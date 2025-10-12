# json-query-kit

A lightweight, type-safe TypeScript library for sorting, filtering, and paginating JSON data. Perfect for client-side or server-side data manipulation with a fluent, intuitive API.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/Tests-60%20passed-brightgreen.svg)](#testing)

## Features

- **Type-Safe**: Built with TypeScript for full type safety and IntelliSense support
- **Fluent API**: Chain operations naturally with a readable, intuitive interface
- **Framework Agnostic**: Works with any TypeScript/JavaScript project
- **Comprehensive Filtering**: Support for multiple operators and logical combinations
- **Flexible Sorting**: Single-field, multi-field, and custom sorting functions
- **Dual Pagination**: Both page-based and offset-based pagination supported
- **Zero Dependencies**: Core library has no external dependencies
- **Well Tested**: 60+ unit and integration tests with high code coverage

## Installation

```bash
npm install json-query-kit
```

Or with yarn:

```bash
yarn add json-query-kit
```

## Quick Start

```typescript
import { JsonQuery } from 'json-query-kit';

const data = [
  { id: 1, name: 'John Doe', age: 30, city: 'New York' },
  { id: 2, name: 'Jane Smith', age: 25, city: 'London' },
  { id: 3, name: 'Peter Jones', age: 35, city: 'Paris' },
];

const result = new JsonQuery(data)
  .filter({ field: 'age', operator: 'greaterThan', value: 28 })
  .sort({ field: 'name', direction: 'asc' })
  .paginate({ page: 1, pageSize: 10 })
  .execute();

console.log(result);
// {
//   data: [
//     { id: 1, name: 'John Doe', age: 30, city: 'New York' },
//     { id: 3, name: 'Peter Jones', age: 35, city: 'Paris' }
//   ],
//   meta: {
//     pagination: {
//       totalItems: 2,
//       currentPage: 1,
//       pageSize: 10,
//       totalPages: 1,
//       hasNextPage: false,
//       hasPrevPage: false
//     }
//   }
// }
```

## API Reference

### JsonQuery Class

The main class for building and executing queries.

```typescript
const query = new JsonQuery<T>(data: T[])
```

### Filtering

#### Filter Operators

- `equals`: Exact match
- `notEquals`: Not equal to
- `contains`: String contains (case-insensitive) or array includes
- `startsWith`: String starts with (case-insensitive)
- `endsWith`: String ends with (case-insensitive)
- `greaterThan`: Numeric greater than
- `lessThan`: Numeric less than
- `greaterThanOrEqual`: Numeric greater than or equal
- `lessThanOrEqual`: Numeric less than or equal
- `in`: Value is in array

#### Single Condition

```typescript
query.filter({
  field: 'age',
  operator: 'greaterThan',
  value: 25
})
```

#### Logical Filters (AND/OR)

```typescript
// AND logic - all conditions must match
query.filter({
  logicalOperator: 'and',
  conditions: [
    { field: 'age', operator: 'greaterThan', value: 25 },
    { field: 'city', operator: 'equals', value: 'New York' }
  ]
})

// OR logic - any condition can match
query.filter({
  logicalOperator: 'or',
  conditions: [
    { field: 'city', operator: 'equals', value: 'Paris' },
    { field: 'city', operator: 'equals', value: 'Tokyo' }
  ]
})
```

#### Nested Logical Filters

```typescript
query.filter({
  logicalOperator: 'and',
  conditions: [
    { field: 'age', operator: 'greaterThan', value: 20 },
    {
      logicalOperator: 'or',
      conditions: [
        { field: 'city', operator: 'equals', value: 'New York' },
        { field: 'city', operator: 'equals', value: 'Paris' }
      ]
    }
  ]
})
```

### Sorting

#### Single Field Sort

```typescript
query.sort({ field: 'age', direction: 'asc' })
query.sort({ field: 'name', direction: 'desc' })
```

#### Multi-Field Sort

```typescript
query.sort([
  { field: 'city', direction: 'asc' },
  { field: 'age', direction: 'desc' }
])
```

#### Custom Sort Function

```typescript
query.sortBy((a, b) => {
  // Custom sorting logic
  return a.score - b.score;
})
```

### Pagination

#### Page-Based Pagination

```typescript
query.paginate({ page: 1, pageSize: 10 })
```

#### Offset-Based Pagination

```typescript
query.paginate({ offset: 20, limit: 10 })
```

### Execution and Utilities

```typescript
// Execute the query
const result = query.execute()

// Reset all configurations
query.reset()

// Get raw data (for debugging)
const data = query.getData()
```

## Advanced Examples

### Complex Query with Multiple Operations

```typescript
const users = [
  { id: 1, name: 'John Doe', age: 30, city: 'New York', active: true },
  { id: 2, name: 'Jane Smith', age: 25, city: 'London', active: true },
  // ... more users
];

const result = new JsonQuery(users)
  .filter({
    logicalOperator: 'and',
    conditions: [
      { field: 'active', operator: 'equals', value: true },
      {
        logicalOperator: 'or',
        conditions: [
          { field: 'age', operator: 'lessThan', value: 30 },
          { field: 'city', operator: 'in', value: ['New York', 'Paris'] }
        ]
      }
    ]
  })
  .sort([
    { field: 'city', direction: 'asc' },
    { field: 'age', direction: 'asc' }
  ])
  .paginate({ page: 1, pageSize: 5 })
  .execute();
```

### Express.js API Integration

```typescript
import express from 'express';
import { JsonQuery } from 'json-query-kit';

const app = express();

app.get('/users', async (req, res) => {
  const users = await fetchUsersFromDatabase();
  const query = new JsonQuery(users);

  // Apply filters from query params
  if (req.query.filter) {
    const filters = JSON.parse(req.query.filter as string);
    query.filter(filters);
  }

  // Apply sorting
  if (req.query.sort) {
    const sortOptions = JSON.parse(req.query.sort as string);
    query.sort(sortOptions);
  }

  // Apply pagination
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  query.paginate({ page, pageSize });

  const result = query.execute();
  res.json(result);
});
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';
import { JsonQuery, QueryResult } from 'json-query-kit';

function useFilteredData<T>(data: T[], filters: any) {
  const [result, setResult] = useState<QueryResult<T>>({ data: [], meta: {} });

  useEffect(() => {
    const query = new JsonQuery(data);

    if (filters.search) {
      query.filter({
        field: 'name',
        operator: 'contains',
        value: filters.search
      });
    }

    if (filters.sortBy) {
      query.sort({
        field: filters.sortBy,
        direction: filters.sortDirection || 'asc'
      });
    }

    query.paginate({
      page: filters.page || 1,
      pageSize: filters.pageSize || 10
    });

    setResult(query.execute());
  }, [data, filters]);

  return result;
}
```

## TypeScript Support

The library is written in TypeScript and provides full type definitions.

```typescript
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

// Full type inference
const query = new JsonQuery<Product>(products);

// Type-safe field access
query.filter({
  field: 'price', // ✅ Type-safe: 'price' is a valid key
  operator: 'greaterThan',
  value: 100
});

// This would cause a TypeScript error:
// query.filter({ field: 'invalid', ... }) // ❌ Error: 'invalid' is not a key of Product
```

## Testing

The library includes comprehensive test coverage:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Building

```bash
# Build the library
npm run build

# Build in watch mode
npm run build:watch
```

## Examples

The repository includes several examples:

1. **Basic Usage** (`src/examples/basic-usage.ts`): Demonstrates all core features
2. **Express Server** (`src/examples/server.ts`): REST API with json-query-kit
3. **Mock API** (`src/examples/mock-remote-api.ts`): Simulated remote data source

To run the examples:

```bash
# Run the basic usage example
npx ts-node src/examples/basic-usage.ts

# Run the Express server example
npx ts-node src/examples/server.ts
```

## Performance Considerations

- All operations create copies of the data to avoid mutation
- Filtering is applied before sorting for optimal performance
- Pagination is applied last to limit the result set
- For very large datasets (>10,000 items), consider server-side processing

## Browser Compatibility

The library works in all modern browsers and Node.js environments:

- Node.js: 14.x or higher
- Browsers: Chrome, Firefox, Safari, Edge (ES2020 support required)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0 (2025-10-12)

- Initial release
- Core filtering, sorting, and pagination functionality
- Full TypeScript support
- Comprehensive test suite
- Express.js integration examples

## Support

If you have any questions or need help, please:

- Open an issue on GitHub
- Check the examples in the `src/examples` directory
- Review the test files for usage patterns

## Acknowledgments

Built with TypeScript, tested with Jest, and designed for developer happiness.
