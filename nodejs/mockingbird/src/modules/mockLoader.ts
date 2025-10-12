/**
 * Mock Loader Module
 * Responsible for loading and parsing mock definitions from configuration files
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { MockDefinition, MockConfig } from '../types';

/**
 * Loads mock definitions from a file (JSON or YAML)
 * @param filePath Path to the mock configuration file
 * @returns Array of mock definitions
 */
export function loadMocksFromFile(filePath: string): MockDefinition[] {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Mock configuration file not found: ${absolutePath}`);
  }

  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  const ext = path.extname(absolutePath).toLowerCase();

  let config: MockConfig;

  try {
    if (ext === '.json') {
      config = JSON.parse(fileContent);
    } else if (ext === '.yaml' || ext === '.yml') {
      config = yaml.load(fileContent) as MockConfig;
    } else {
      throw new Error(`Unsupported file format: ${ext}. Use .json, .yaml, or .yml`);
    }
  } catch (error) {
    throw new Error(`Failed to parse mock configuration file: ${(error as Error).message}`);
  }

  // Validate the configuration structure
  if (!config.mocks || !Array.isArray(config.mocks)) {
    throw new Error('Invalid mock configuration: "mocks" array is required');
  }

  // Validate each mock definition
  config.mocks.forEach((mock, index) => {
    validateMockDefinition(mock, index);
  });

  return config.mocks;
}

/**
 * Loads mock definitions from a directory (all JSON and YAML files)
 * @param dirPath Path to directory containing mock configuration files
 * @returns Array of all mock definitions from all files
 */
export function loadMocksFromDirectory(dirPath: string): MockDefinition[] {
  const absolutePath = path.resolve(dirPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Mock configuration directory not found: ${absolutePath}`);
  }

  const stats = fs.statSync(absolutePath);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${absolutePath}`);
  }

  const files = fs.readdirSync(absolutePath);
  const mockFiles = files.filter(file =>
    /\.(json|yaml|yml)$/i.test(file)
  );

  const allMocks: MockDefinition[] = [];

  for (const file of mockFiles) {
    const filePath = path.join(absolutePath, file);
    try {
      const mocks = loadMocksFromFile(filePath);
      allMocks.push(...mocks);
    } catch (error) {
      console.warn(`Warning: Failed to load mocks from ${file}: ${(error as Error).message}`);
    }
  }

  return allMocks;
}

/**
 * Validates a single mock definition
 * @param mock Mock definition to validate
 * @param index Index of the mock in the array (for error messages)
 */
function validateMockDefinition(mock: MockDefinition, index: number): void {
  const prefix = `Mock definition at index ${index}`;

  if (!mock.request) {
    throw new Error(`${prefix}: "request" is required`);
  }

  if (!mock.request.method) {
    throw new Error(`${prefix}: "request.method" is required`);
  }

  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  if (!validMethods.includes(mock.request.method)) {
    throw new Error(`${prefix}: invalid method "${mock.request.method}". Must be one of: ${validMethods.join(', ')}`);
  }

  if (!mock.request.path) {
    throw new Error(`${prefix}: "request.path" is required`);
  }

  if (typeof mock.request.path !== 'string') {
    throw new Error(`${prefix}: "request.path" must be a string`);
  }

  if (!mock.response) {
    throw new Error(`${prefix}: "response" is required`);
  }

  if (typeof mock.response.statusCode !== 'number') {
    throw new Error(`${prefix}: "response.statusCode" must be a number`);
  }

  if (mock.response.statusCode < 100 || mock.response.statusCode > 599) {
    throw new Error(`${prefix}: "response.statusCode" must be between 100 and 599`);
  }
}
