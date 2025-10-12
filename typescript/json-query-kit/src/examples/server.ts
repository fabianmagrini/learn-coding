/**
 * Example Express.js server demonstrating json-query-kit usage
 * This server provides a REST API endpoint for querying user data
 */

import express, { Request, Response } from 'express';
import { JsonQuery } from '../core';
import { fetchAllUsers } from './mock-remote-api';

const app = express();
app.use(express.json());

/**
 * GET /users - Query users with filtering, sorting, and pagination
 *
 * Query Parameters:
 * - filter: JSON string of filter condition or logical filter
 * - sort: JSON string of sort option or array of sort options
 * - page: Page number (for page-based pagination)
 * - pageSize: Number of items per page
 * - offset: Starting index (for offset-based pagination)
 * - limit: Number of items to return (for offset-based pagination)
 *
 * Examples:
 * - Filter by age: ?filter={"field":"age","operator":"greaterThan","value":28}
 * - Sort by name: ?sort={"field":"name","direction":"asc"}
 * - Paginate: ?page=1&pageSize=10
 */
app.get('/users', async (req: Request, res: Response) => {
  try {
    // Fetch all users from the mock remote API
    const users = await fetchAllUsers();
    const query = new JsonQuery(users);

    // Apply filtering if provided
    if (req.query.filter) {
      try {
        const filters = JSON.parse(req.query.filter as string);
        query.filter(filters);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid filter format' });
      }
    }

    // Apply sorting if provided
    if (req.query.sort) {
      try {
        const sortOptions = JSON.parse(req.query.sort as string);
        query.sort(sortOptions);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid sort format' });
      }
    }

    // Apply pagination
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    if (offset !== undefined && limit !== undefined) {
      query.paginate({ offset, limit });
    } else {
      query.paginate({ page, pageSize });
    }

    // Execute query and return results
    const result = query.execute();
    res.json(result);

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

/**
 * GET /users/search - Advanced search endpoint with multiple filters
 *
 * Example: Complex query with AND/OR logic
 * ?ageMin=25&ageMax=35&cities=["New York","London"]
 */
app.get('/users/search', async (req: Request, res: Response) => {
  try {
    const users = await fetchAllUsers();
    const query = new JsonQuery(users);

    const conditions: any[] = [];

    // Age range filter
    if (req.query.ageMin) {
      conditions.push({
        field: 'age',
        operator: 'greaterThanOrEqual',
        value: parseInt(req.query.ageMin as string)
      });
    }

    if (req.query.ageMax) {
      conditions.push({
        field: 'age',
        operator: 'lessThanOrEqual',
        value: parseInt(req.query.ageMax as string)
      });
    }

    // Cities filter
    if (req.query.cities) {
      try {
        const cities = JSON.parse(req.query.cities as string);
        conditions.push({
          field: 'city',
          operator: 'in',
          value: cities
        });
      } catch (e) {
        return res.status(400).json({ error: 'Invalid cities format' });
      }
    }

    // Apply combined filters with AND logic
    if (conditions.length > 0) {
      if (conditions.length === 1) {
        query.filter(conditions[0]);
      } else {
        query.filter({
          logicalOperator: 'and',
          conditions
        });
      }
    }

    // Sort by age ascending by default
    query.sort({ field: 'age', direction: 'asc' });

    // Apply pagination
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    query.paginate({ page, pageSize });

    const result = query.execute();
    res.json(result);

  } catch (error) {
    console.error('Error processing search:', error);
    res.status(500).json({ error: 'An error occurred while processing your search' });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'json-query-kit example server is running' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  json-query-kit Example Server                        ║
║  Server is running on http://localhost:${PORT}         ║
╚════════════════════════════════════════════════════════╝

Available endpoints:
  GET /health - Health check
  GET /users - Query users with filters, sorting, and pagination
  GET /users/search - Advanced search with multiple filters

Example requests:
  # Get all users (paginated)
  curl "http://localhost:${PORT}/users"

  # Filter users older than 28
  curl "http://localhost:${PORT}/users?filter=%7B%22field%22%3A%22age%22%2C%22operator%22%3A%22greaterThan%22%2C%22value%22%3A28%7D"

  # Sort by name ascending
  curl "http://localhost:${PORT}/users?sort=%7B%22field%22%3A%22name%22%2C%22direction%22%3A%22asc%22%7D"

  # Combined: filter, sort, and paginate
  curl "http://localhost:${PORT}/users?filter=%7B%22field%22%3A%22age%22%2C%22operator%22%3A%22greaterThan%22%2C%22value%22%3A28%7D&sort=%7B%22field%22%3A%22name%22%2C%22direction%22%3A%22asc%22%7D&page=1&pageSize=5"

  # Advanced search: age between 25-35, cities New York or London
  curl "http://localhost:${PORT}/users/search?ageMin=25&ageMax=35&cities=%5B%22New%20York%22%2C%22London%22%5D"
  `);
});
