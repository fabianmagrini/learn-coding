/**
 * Mockingbird - API Mocking Service
 * Main entry point
 */

import express, { Request, Response, NextFunction } from 'express';
import { MockDefinition, TemplateContext } from './types';
import { loadMocksFromFile, loadMocksFromDirectory } from './modules/mockLoader';
import { loadOpenAPISpec } from './modules/openApiParser';
import { findMatchingMock } from './modules/requestMatcher';
import { sendMockResponse } from './modules/responseHandler';
import { createAdminRouter } from './admin/adminRouter';

/**
 * Main Mockingbird server class
 */
export class MockingbirdServer {
  private app: express.Application;
  private mocks: MockDefinition[] = [];
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;

    // Middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Loads mock definitions from a file
   */
  loadFromFile(filePath: string): void {
    console.log(`Loading mocks from file: ${filePath}`);
    const mocks = loadMocksFromFile(filePath);
    this.mocks.push(...mocks);
    console.log(`Loaded ${mocks.length} mock(s) from file`);
  }

  /**
   * Loads mock definitions from a directory
   */
  loadFromDirectory(dirPath: string): void {
    console.log(`Loading mocks from directory: ${dirPath}`);
    const mocks = loadMocksFromDirectory(dirPath);
    this.mocks.push(...mocks);
    console.log(`Loaded ${mocks.length} mock(s) from directory`);
  }

  /**
   * Loads mock definitions from an OpenAPI specification
   */
  loadFromOpenAPI(filePath: string): void {
    console.log(`Loading mocks from OpenAPI spec: ${filePath}`);
    const mocks = loadOpenAPISpec(filePath);
    this.mocks.push(...mocks);
    console.log(`Generated ${mocks.length} mock(s) from OpenAPI spec`);
  }

  /**
   * Adds a mock definition programmatically
   */
  addMock(mock: MockDefinition): void {
    this.mocks.push(mock);
  }

  /**
   * Gets all loaded mocks
   */
  getMocks(): MockDefinition[] {
    return this.mocks;
  }

  /**
   * Clears all loaded mocks
   */
  clearMocks(): void {
    this.mocks = [];
    console.log('All mocks cleared');
  }

  /**
   * Sets up routes and middleware
   */
  private setupRoutes(): void {
    // Admin API
    this.app.use('/__admin', createAdminRouter(this));

    // Catch-all route for mock handling using middleware instead of route
    this.app.use(async (req: Request, res: Response) => {
      const matchResult = findMatchingMock(req, this.mocks);

      if (!matchResult) {
        res.status(404).json({
          error: 'No matching mock found',
          request: {
            method: req.method,
            path: req.path
          }
        });
        return;
      }

      // Build template context
      const context: TemplateContext = {
        params: matchResult.pathParams,
        query: req.query as Record<string, string | string[]>,
        headers: req.headers,
        body: req.body
      };

      // Send mock response
      await sendMockResponse(res, matchResult.mock.response, context);
    });
  }

  /**
   * Starts the server
   */
  start(): void {
    this.setupRoutes();

    this.app.listen(this.port, () => {
      console.log(`\n🐦 Mockingbird server is running on port ${this.port}`);
      console.log(`📝 Loaded ${this.mocks.length} mock endpoint(s)`);
      console.log(`🔧 Admin API available at http://localhost:${this.port}/__admin`);
      console.log('');
    });
  }

  /**
   * Gets the Express app instance (useful for testing)
   */
  getApp(): express.Application {
    this.setupRoutes();
    return this.app;
  }
}

/**
 * CLI entry point
 */
if (require.main === module) {
  const server = new MockingbirdServer(3000);

  // Check for command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: mockingbird <config-file-or-directory>');
    console.log('       mockingbird --openapi <openapi-spec-file>');
    process.exit(1);
  }

  try {
    if (args[0] === '--openapi' && args[1]) {
      server.loadFromOpenAPI(args[1]);
    } else {
      const configPath = args[0];
      const fs = require('fs');
      const stats = fs.statSync(configPath);

      if (stats.isDirectory()) {
        server.loadFromDirectory(configPath);
      } else {
        server.loadFromFile(configPath);
      }
    }

    server.start();
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}
