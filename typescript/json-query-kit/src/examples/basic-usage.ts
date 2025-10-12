/**
 * Basic usage examples of json-query-kit
 * Run this file to see how the library works
 */

import { JsonQuery } from '../core';

// Sample data
const products = [
  { id: 1, name: 'Laptop', price: 999, category: 'Electronics', inStock: true },
  { id: 2, name: 'Mouse', price: 25, category: 'Electronics', inStock: true },
  { id: 3, name: 'Keyboard', price: 75, category: 'Electronics', inStock: false },
  { id: 4, name: 'Desk', price: 350, category: 'Furniture', inStock: true },
  { id: 5, name: 'Chair', price: 200, category: 'Furniture', inStock: true },
  { id: 6, name: 'Monitor', price: 300, category: 'Electronics', inStock: true },
  { id: 7, name: 'Bookshelf', price: 150, category: 'Furniture', inStock: false },
  { id: 8, name: 'Webcam', price: 80, category: 'Electronics', inStock: true },
];

console.log('=== json-query-kit Examples ===\n');

// Example 1: Simple filtering
console.log('1. Filter products in stock:');
const inStockProducts = new JsonQuery(products)
  .filter({ field: 'inStock', operator: 'equals', value: true })
  .execute();
console.log(`Found ${inStockProducts.data.length} products in stock`);
console.log(inStockProducts.data.map(p => p.name).join(', '));
console.log();

// Example 2: Sorting
console.log('2. Sort products by price (ascending):');
const sortedByPrice = new JsonQuery(products)
  .sort({ field: 'price', direction: 'asc' })
  .execute();
console.log(sortedByPrice.data.map(p => `${p.name}: $${p.price}`).join(', '));
console.log();

// Example 3: Multiple filters with AND logic
console.log('3. Electronics products under $100:');
const cheapElectronics = new JsonQuery(products)
  .filter({
    logicalOperator: 'and',
    conditions: [
      { field: 'category', operator: 'equals', value: 'Electronics' },
      { field: 'price', operator: 'lessThan', value: 100 }
    ]
  })
  .execute();
console.log(cheapElectronics.data.map(p => p.name).join(', '));
console.log();

// Example 4: Chaining operations
console.log('4. In-stock Electronics, sorted by price, first 3 items:');
const topElectronics = new JsonQuery(products)
  .filter({
    logicalOperator: 'and',
    conditions: [
      { field: 'category', operator: 'equals', value: 'Electronics' },
      { field: 'inStock', operator: 'equals', value: true }
    ]
  })
  .sort({ field: 'price', direction: 'asc' })
  .paginate({ page: 1, pageSize: 3 })
  .execute();
console.log('Results:', topElectronics.data.map(p => p.name).join(', '));
console.log('Pagination:', topElectronics.meta.pagination);
console.log();

// Example 5: Multi-field sorting
console.log('5. Sort by category (asc), then by price (desc):');
const multiSort = new JsonQuery(products)
  .sort([
    { field: 'category', direction: 'asc' },
    { field: 'price', direction: 'desc' }
  ])
  .execute();
console.log(multiSort.data.map(p => `${p.category}: ${p.name} ($${p.price})`).join('\n'));
console.log();

// Example 6: String operations
console.log('6. Products with names containing "o" or "e":');
const containsO = new JsonQuery(products)
  .filter({
    logicalOperator: 'or',
    conditions: [
      { field: 'name', operator: 'contains', value: 'o' },
      { field: 'name', operator: 'contains', value: 'e' }
    ]
  })
  .execute();
console.log(containsO.data.map(p => p.name).join(', '));
console.log();

// Example 7: Using 'in' operator
console.log('7. Products in specific price ranges:');
const priceRanges = new JsonQuery(products)
  .filter({ field: 'price', operator: 'in', value: [25, 75, 150, 200] })
  .sort({ field: 'price', direction: 'asc' })
  .execute();
console.log(priceRanges.data.map(p => `${p.name}: $${p.price}`).join(', '));
console.log();

// Example 8: Custom sort function
console.log('8. Custom sort by name length (longest first):');
const customSort = new JsonQuery(products)
  .sortBy((a, b) => b.name.length - a.name.length)
  .execute();
console.log(customSort.data.map(p => `${p.name} (${p.name.length} chars)`).join(', '));
console.log();

// Example 9: Offset-based pagination
console.log('9. Offset-based pagination (skip 3, take 2):');
const offsetPagination = new JsonQuery(products)
  .sort({ field: 'price', direction: 'asc' })
  .paginate({ offset: 3, limit: 2 })
  .execute();
console.log('Results:', offsetPagination.data.map(p => p.name).join(', '));
console.log('Pagination info:', offsetPagination.meta.pagination);
console.log();

// Example 10: Complex nested filters
console.log('10. Complex nested filters:');
const complexFilter = new JsonQuery(products)
  .filter({
    logicalOperator: 'and',
    conditions: [
      { field: 'inStock', operator: 'equals', value: true },
      {
        logicalOperator: 'or',
        conditions: [
          { field: 'price', operator: 'lessThan', value: 100 },
          { field: 'category', operator: 'equals', value: 'Furniture' }
        ]
      }
    ]
  })
  .sort({ field: 'price', direction: 'asc' })
  .execute();
console.log('In stock AND (cheap OR furniture):');
console.log(complexFilter.data.map(p => `${p.name} ($${p.price}, ${p.category})`).join('\n'));
console.log();

console.log('=== End of Examples ===');
