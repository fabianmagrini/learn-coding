/**
 * Request Matcher Module
 * Evaluates incoming requests against mock definitions to find matches
 */

import { Request } from 'express';
import { MockDefinition, PathParams } from '../types';

/**
 * Result of a successful request match
 */
export interface MatchResult {
  /** The matched mock definition */
  mock: MockDefinition;
  /** Extracted path parameters */
  pathParams: PathParams;
}

/**
 * Finds a matching mock definition for the given request
 * @param request Express request object
 * @param mocks Array of mock definitions to search
 * @returns MatchResult if a match is found, null otherwise
 */
export function findMatchingMock(request: Request, mocks: MockDefinition[]): MatchResult | null {
  for (const mock of mocks) {
    const pathParams = matchPath(request.path, mock.request.path);

    if (pathParams === null) {
      continue; // Path doesn't match
    }

    if (mock.request.method !== request.method) {
      continue; // Method doesn't match
    }

    if (mock.request.headers && !matchHeaders(request.headers, mock.request.headers)) {
      continue; // Headers don't match
    }

    if (mock.request.query && !matchQuery(request.query, mock.request.query)) {
      continue; // Query parameters don't match
    }

    if (mock.request.body && !matchBody(request.body, mock.request.body)) {
      continue; // Body doesn't match
    }

    // All criteria match
    return {
      mock,
      pathParams
    };
  }

  return null;
}

/**
 * Matches a URL path against a pattern (supports :param syntax)
 * @param actualPath The actual request path
 * @param pattern The pattern to match against (e.g., "/users/:id")
 * @returns Object with extracted parameters, or null if no match
 */
export function matchPath(actualPath: string, pattern: string): PathParams | null {
  const patternSegments = pattern.split('/').filter(s => s);
  const actualSegments = actualPath.split('/').filter(s => s);

  if (patternSegments.length !== actualSegments.length) {
    return null;
  }

  const params: PathParams = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const actualSegment = actualSegments[i];

    if (patternSegment.startsWith(':')) {
      // This is a parameter
      const paramName = patternSegment.substring(1);
      params[paramName] = actualSegment;
    } else if (patternSegment !== actualSegment) {
      // Static segment doesn't match
      return null;
    }
  }

  return params;
}

/**
 * Checks if request headers match the expected headers
 * @param actualHeaders Request headers
 * @param expectedHeaders Expected headers from mock definition
 * @returns True if all expected headers are present and match
 */
function matchHeaders(
  actualHeaders: Record<string, any>,
  expectedHeaders: Record<string, string>
): boolean {
  for (const [key, value] of Object.entries(expectedHeaders)) {
    const actualValue = actualHeaders[key.toLowerCase()];
    if (actualValue === undefined || actualValue !== value) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if query parameters match
 * @param actualQuery Request query parameters
 * @param expectedQuery Expected query parameters from mock definition
 * @returns True if all expected query parameters are present and match
 */
function matchQuery(
  actualQuery: Record<string, any>,
  expectedQuery: Record<string, string>
): boolean {
  for (const [key, value] of Object.entries(expectedQuery)) {
    if (actualQuery[key] !== value) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if request body matches expected body
 * @param actualBody Request body
 * @param expectedBody Expected body from mock definition
 * @returns True if bodies match (deep equality for objects)
 */
function matchBody(actualBody: any, expectedBody: any): boolean {
  return JSON.stringify(actualBody) === JSON.stringify(expectedBody);
}
