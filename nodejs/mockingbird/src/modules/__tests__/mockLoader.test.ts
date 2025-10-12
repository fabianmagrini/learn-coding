/**
 * Unit tests for Mock Loader module
 */

import { loadMocksFromFile } from '../mockLoader';
import * as fs from 'fs';
import * as path from 'path';

describe('Mock Loader', () => {
  const testDir = path.join(__dirname, 'test-fixtures');

  beforeAll(() => {
    // Create test fixtures directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create a valid JSON mock file
    const validJsonMock = {
      mocks: [
        {
          request: {
            method: 'GET',
            path: '/api/test'
          },
          response: {
            statusCode: 200,
            body: { message: 'test' }
          }
        }
      ]
    };
    fs.writeFileSync(
      path.join(testDir, 'valid.json'),
      JSON.stringify(validJsonMock, null, 2)
    );

    // Create a valid YAML mock file
    const validYamlMock = `mocks:
  - request:
      method: GET
      path: /api/yaml-test
    response:
      statusCode: 200
      body:
        message: yaml test
`;
    fs.writeFileSync(path.join(testDir, 'valid.yaml'), validYamlMock);

    // Create an invalid mock file
    const invalidMock = {
      mocks: [
        {
          request: {
            path: '/api/invalid'
            // missing method
          },
          response: {
            statusCode: 200
          }
        }
      ]
    };
    fs.writeFileSync(
      path.join(testDir, 'invalid.json'),
      JSON.stringify(invalidMock, null, 2)
    );
  });

  afterAll(() => {
    // Clean up test fixtures
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('loadMocksFromFile', () => {
    it('should load mocks from JSON file', () => {
      const mocks = loadMocksFromFile(path.join(testDir, 'valid.json'));
      expect(mocks).toHaveLength(1);
      expect(mocks[0].request.method).toBe('GET');
      expect(mocks[0].request.path).toBe('/api/test');
    });

    it('should load mocks from YAML file', () => {
      const mocks = loadMocksFromFile(path.join(testDir, 'valid.yaml'));
      expect(mocks).toHaveLength(1);
      expect(mocks[0].request.method).toBe('GET');
      expect(mocks[0].request.path).toBe('/api/yaml-test');
    });

    it('should throw error for non-existent file', () => {
      expect(() => {
        loadMocksFromFile(path.join(testDir, 'nonexistent.json'));
      }).toThrow('Mock configuration file not found');
    });

    it('should throw error for invalid mock definition', () => {
      expect(() => {
        loadMocksFromFile(path.join(testDir, 'invalid.json'));
      }).toThrow('request.method');
    });
  });
});
