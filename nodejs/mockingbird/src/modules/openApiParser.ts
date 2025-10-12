/**
 * OpenAPI Parser Module
 * Parses OpenAPI specifications and generates mock definitions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { MockDefinition, HttpMethod } from '../types';

/**
 * OpenAPI 3.0 Specification (simplified structure)
 */
interface OpenAPISpec {
  openapi: string;
  paths: {
    [path: string]: {
      [method: string]: {
        summary?: string;
        description?: string;
        responses: {
          [statusCode: string]: {
            description?: string;
            content?: {
              [mediaType: string]: {
                schema?: any;
                example?: any;
                examples?: any;
              };
            };
          };
        };
      };
    };
  };
}

/**
 * Loads and parses an OpenAPI specification file
 * @param filePath Path to OpenAPI spec file (JSON or YAML)
 * @returns Array of mock definitions generated from the spec
 */
export function loadOpenAPISpec(filePath: string): MockDefinition[] {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`OpenAPI specification file not found: ${absolutePath}`);
  }

  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  const ext = path.extname(absolutePath).toLowerCase();

  let spec: OpenAPISpec;

  try {
    if (ext === '.json') {
      spec = JSON.parse(fileContent);
    } else if (ext === '.yaml' || ext === '.yml') {
      spec = yaml.load(fileContent) as OpenAPISpec;
    } else {
      throw new Error(`Unsupported file format: ${ext}. Use .json, .yaml, or .yml`);
    }
  } catch (error) {
    throw new Error(`Failed to parse OpenAPI specification: ${(error as Error).message}`);
  }

  // Validate OpenAPI version
  if (!spec.openapi || !spec.openapi.startsWith('3.')) {
    throw new Error('Only OpenAPI 3.x specifications are supported');
  }

  return generateMocksFromSpec(spec);
}

/**
 * Generates mock definitions from an OpenAPI specification
 * @param spec OpenAPI specification object
 * @returns Array of mock definitions
 */
function generateMocksFromSpec(spec: OpenAPISpec): MockDefinition[] {
  const mocks: MockDefinition[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      const upperMethod = method.toUpperCase();

      // Skip if not a valid HTTP method
      const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      if (!validMethods.includes(upperMethod as HttpMethod)) {
        continue;
      }

      // Find a successful response (2xx status code)
      const responses = operation.responses || {};
      const successStatus = Object.keys(responses).find(status =>
        status.startsWith('2') && status.length === 3
      ) || '200';

      const response = responses[successStatus];
      if (!response) {
        continue;
      }

      // Extract response body from examples or schema
      let responseBody: any = undefined;
      const content = response.content;

      if (content) {
        // Try to find JSON content type
        const jsonContent = content['application/json'];
        if (jsonContent) {
          if (jsonContent.example) {
            responseBody = jsonContent.example;
          } else if (jsonContent.examples) {
            // Use the first example
            const firstExampleKey = Object.keys(jsonContent.examples)[0];
            if (firstExampleKey) {
              responseBody = jsonContent.examples[firstExampleKey].value;
            }
          } else if (jsonContent.schema) {
            // Generate example from schema
            responseBody = generateExampleFromSchema(jsonContent.schema);
          }
        }
      }

      // Create mock definition
      const mock: MockDefinition = {
        request: {
          method: upperMethod as HttpMethod,
          path: path
        },
        response: {
          statusCode: parseInt(successStatus, 10),
          headers: {
            'Content-Type': 'application/json'
          },
          body: responseBody
        },
        description: operation.summary || operation.description || `${upperMethod} ${path}`
      };

      mocks.push(mock);
    }
  }

  return mocks;
}

/**
 * Generates a simple example from an OpenAPI schema
 * @param schema OpenAPI schema object
 * @returns Example data matching the schema
 */
function generateExampleFromSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return undefined;
  }

  if (schema.example !== undefined) {
    return schema.example;
  }

  switch (schema.type) {
    case 'string':
      return schema.enum ? schema.enum[0] : 'string';
    case 'number':
    case 'integer':
      return schema.enum ? schema.enum[0] : 0;
    case 'boolean':
      return false;
    case 'array':
      const itemExample = schema.items ? generateExampleFromSchema(schema.items) : null;
      return [itemExample];
    case 'object':
      if (schema.properties) {
        const obj: any = {};
        for (const [key, value] of Object.entries(schema.properties)) {
          obj[key] = generateExampleFromSchema(value);
        }
        return obj;
      }
      return {};
    default:
      return null;
  }
}
