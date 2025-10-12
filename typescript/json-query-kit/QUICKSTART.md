# Quick Start Guide

## Installation

```bash
npm install json-query-kit
```

## Basic Usage

```typescript
import { JsonQuery } from 'json-query-kit';

const data = [
  { id: 1, name: 'John', age: 30, city: 'New York' },
  { id: 2, name: 'Jane', age: 25, city: 'London' },
  { id: 3, name: 'Bob', age: 35, city: 'Paris' }
];

// Simple filter
const result = new JsonQuery(data)
  .filter({ field: 'age', operator: 'greaterThan', value: 28 })
  .execute();

console.log(result.data);
// Output: [{ id: 1, name: 'John', age: 30, city: 'New York' },
//          { id: 3, name: 'Bob', age: 35, city: 'Paris' }]
```

## Chaining Operations

```typescript
const result = new JsonQuery(data)
  .filter({ field: 'age', operator: 'greaterThan', value: 20 })
  .sort({ field: 'name', direction: 'asc' })
  .paginate({ page: 1, pageSize: 10 })
  .execute();
```

## Common Operations

### Filtering

```typescript
// Equals
.filter({ field: 'city', operator: 'equals', value: 'London' })

// Contains (case-insensitive)
.filter({ field: 'name', operator: 'contains', value: 'jo' })

// Greater than
.filter({ field: 'age', operator: 'greaterThan', value: 25 })

// In array
.filter({ field: 'city', operator: 'in', value: ['London', 'Paris'] })
```

### Logical Filters (AND/OR)

```typescript
// AND - all conditions must match
.filter({
  logicalOperator: 'and',
  conditions: [
    { field: 'age', operator: 'greaterThan', value: 25 },
    { field: 'city', operator: 'equals', value: 'London' }
  ]
})

// OR - any condition can match
.filter({
  logicalOperator: 'or',
  conditions: [
    { field: 'city', operator: 'equals', value: 'London' },
    { field: 'city', operator: 'equals', value: 'Paris' }
  ]
})
```

### Sorting

```typescript
// Single field
.sort({ field: 'age', direction: 'asc' })

// Multiple fields
.sort([
  { field: 'city', direction: 'asc' },
  { field: 'age', direction: 'desc' }
])

// Custom function
.sortBy((a, b) => a.score - b.score)
```

### Pagination

```typescript
// Page-based
.paginate({ page: 1, pageSize: 10 })

// Offset-based
.paginate({ offset: 0, limit: 10 })
```

## Running the Examples

```bash
# Run basic usage examples
npm run example:basic

# Run Express.js server example
npm run example:server
```

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Generate coverage
npm run test:coverage

# Build
npm run build
```

## Next Steps

- Read the full [README.md](README.md) for comprehensive documentation
- Check out the [examples](src/examples/) directory for more use cases
- Review the [spec.md](spec.md) for detailed specifications
