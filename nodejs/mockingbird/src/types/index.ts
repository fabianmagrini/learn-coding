/**
 * Core type definitions for Mockingbird API mocking service
 */

/**
 * HTTP methods supported by the mock service
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Request matching criteria
 */
export interface RequestMatch {
  /** HTTP method to match */
  method: HttpMethod;
  /** URL path pattern (supports :param syntax for path parameters) */
  path: string;
  /** Optional headers to match */
  headers?: Record<string, string>;
  /** Optional query parameters to match */
  query?: Record<string, string>;
  /** Optional body content to match (for POST/PUT/PATCH) */
  body?: any;
}

/**
 * Response definition
 */
export interface ResponseDefinition {
  /** HTTP status code */
  statusCode: number;
  /** Response headers */
  headers?: Record<string, string>;
  /** Response body (can be object, string, array, etc.) */
  body?: any;
  /** Optional delay in milliseconds before sending response */
  delay?: number;
}

/**
 * Complete mock definition
 */
export interface MockDefinition {
  /** Request matching criteria */
  request: RequestMatch;
  /** Response to return when request matches */
  response: ResponseDefinition;
  /** Optional description of this mock */
  description?: string;
}

/**
 * Mock configuration file structure
 */
export interface MockConfig {
  /** Array of mock definitions */
  mocks: MockDefinition[];
}

/**
 * Parsed path parameter from URL
 */
export interface PathParams {
  [key: string]: string;
}

/**
 * Template context for dynamic response generation
 */
export interface TemplateContext {
  /** Path parameters extracted from URL */
  params: PathParams;
  /** Query parameters from request */
  query: Record<string, string | string[]>;
  /** Request headers */
  headers: Record<string, string | string[] | undefined>;
  /** Request body */
  body?: any;
}
