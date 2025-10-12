/**
 * Response Handler Module
 * Constructs and sends mock responses with template support
 */

import { Response } from 'express';
import { ResponseDefinition, TemplateContext } from '../types';

/**
 * Sends a mock response with optional templating
 * @param res Express response object
 * @param responseDefinition Response definition from mock
 * @param context Template context for dynamic values
 */
export async function sendMockResponse(
  res: Response,
  responseDefinition: ResponseDefinition,
  context: TemplateContext
): Promise<void> {
  // Apply delay if specified
  if (responseDefinition.delay && responseDefinition.delay > 0) {
    await delay(responseDefinition.delay);
  }

  // Set headers
  if (responseDefinition.headers) {
    Object.entries(responseDefinition.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }

  // Set status code
  res.status(responseDefinition.statusCode);

  // Process and send body
  if (responseDefinition.body !== undefined) {
    const processedBody = processTemplate(responseDefinition.body, context);

    // Determine content type if not already set
    if (!responseDefinition.headers || !responseDefinition.headers['Content-Type']) {
      if (typeof processedBody === 'string') {
        res.setHeader('Content-Type', 'text/plain');
      } else {
        res.setHeader('Content-Type', 'application/json');
      }
    }

    res.send(processedBody);
  } else {
    res.end();
  }
}

/**
 * Processes templates in response body
 * Replaces {{request.params.id}}, {{request.query.name}}, etc.
 * @param body Response body (can be object, array, string, etc.)
 * @param context Template context
 * @returns Processed body with templates replaced
 */
function processTemplate(body: any, context: TemplateContext): any {
  if (typeof body === 'string') {
    return replaceTemplateStrings(body, context);
  }

  if (Array.isArray(body)) {
    return body.map(item => processTemplate(item, context));
  }

  if (body !== null && typeof body === 'object') {
    const processed: any = {};
    for (const [key, value] of Object.entries(body)) {
      processed[key] = processTemplate(value, context);
    }
    return processed;
  }

  return body;
}

/**
 * Replaces template strings like {{request.params.id}} with actual values
 * @param str String containing templates
 * @param context Template context
 * @returns String with templates replaced
 */
function replaceTemplateStrings(str: string, context: TemplateContext): string {
  return str.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    const trimmed = expression.trim();
    const value = evaluateExpression(trimmed, context);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Evaluates a template expression like "request.params.id"
 * @param expression Expression to evaluate
 * @param context Template context
 * @returns Evaluated value or undefined if not found
 */
function evaluateExpression(expression: string, context: TemplateContext): any {
  const parts = expression.split('.');

  if (parts[0] !== 'request') {
    return undefined;
  }

  if (parts.length < 2) {
    return undefined;
  }

  const category = parts[1]; // params, query, headers, body

  if (parts.length === 2) {
    // Return the whole category
    return (context as any)[category];
  }

  // Navigate through the path
  let current: any = (context as any)[category];
  for (let i = 2; i < parts.length; i++) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[parts[i]];
  }

  return current;
}

/**
 * Delays execution for the specified milliseconds
 * @param ms Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
