/**
 * Unit tests for Response Handler module
 */

import { sendMockResponse } from '../responseHandler';
import { Response } from 'express';
import { ResponseDefinition, TemplateContext } from '../../types';

describe('Response Handler', () => {
  let mockResponse: Partial<Response>;
  let statusCode: number;
  let headers: Record<string, string>;
  let sentData: any;

  beforeEach(() => {
    statusCode = 200;
    headers = {};
    sentData = null;

    mockResponse = {
      status: jest.fn().mockImplementation((code: number) => {
        statusCode = code;
        return mockResponse as Response;
      }),
      setHeader: jest.fn().mockImplementation((key: string, value: string) => {
        headers[key] = value;
        return mockResponse as Response;
      }),
      send: jest.fn().mockImplementation((data: any) => {
        sentData = data;
        return mockResponse as Response;
      }),
      end: jest.fn().mockReturnValue(mockResponse as Response)
    };
  });

  describe('sendMockResponse', () => {
    it('should send basic response with status code', async () => {
      const responseDefinition: ResponseDefinition = {
        statusCode: 201,
        body: { message: 'Created' }
      };

      const context: TemplateContext = {
        params: {},
        query: {},
        headers: {},
        body: {}
      };

      await sendMockResponse(mockResponse as Response, responseDefinition, context);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(sentData).toEqual({ message: 'Created' });
    });

    it('should set custom headers', async () => {
      const responseDefinition: ResponseDefinition = {
        statusCode: 200,
        headers: {
          'X-Custom-Header': 'custom-value'
        },
        body: 'test'
      };

      const context: TemplateContext = {
        params: {},
        query: {},
        headers: {},
        body: {}
      };

      await sendMockResponse(mockResponse as Response, responseDefinition, context);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Custom-Header', 'custom-value');
    });

    it('should replace template strings in response body', async () => {
      const responseDefinition: ResponseDefinition = {
        statusCode: 200,
        body: {
          id: '{{request.params.userId}}',
          name: 'User {{request.params.userId}}'
        }
      };

      const context: TemplateContext = {
        params: { userId: '123' },
        query: {},
        headers: {},
        body: {}
      };

      await sendMockResponse(mockResponse as Response, responseDefinition, context);

      expect(sentData).toEqual({
        id: '123',
        name: 'User 123'
      });
    });

    it('should handle query parameters in templates', async () => {
      const responseDefinition: ResponseDefinition = {
        statusCode: 200,
        body: {
          filter: '{{request.query.filter}}'
        }
      };

      const context: TemplateContext = {
        params: {},
        query: { filter: 'active' },
        headers: {},
        body: {}
      };

      await sendMockResponse(mockResponse as Response, responseDefinition, context);

      expect(sentData).toEqual({
        filter: 'active'
      });
    });

    it('should send empty response when body is undefined', async () => {
      const responseDefinition: ResponseDefinition = {
        statusCode: 204
      };

      const context: TemplateContext = {
        params: {},
        query: {},
        headers: {},
        body: {}
      };

      await sendMockResponse(mockResponse as Response, responseDefinition, context);

      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});
