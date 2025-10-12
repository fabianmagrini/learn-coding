/**
 * Unit tests for Request Matcher module
 */

import { matchPath } from '../requestMatcher';

describe('Request Matcher', () => {
  describe('matchPath', () => {
    it('should match exact paths', () => {
      const result = matchPath('/api/users', '/api/users');
      expect(result).toEqual({});
    });

    it('should not match different paths', () => {
      const result = matchPath('/api/users', '/api/posts');
      expect(result).toBeNull();
    });

    it('should match paths with single parameter', () => {
      const result = matchPath('/api/users/123', '/api/users/:id');
      expect(result).toEqual({ id: '123' });
    });

    it('should match paths with multiple parameters', () => {
      const result = matchPath('/api/users/123/posts/456', '/api/users/:userId/posts/:postId');
      expect(result).toEqual({ userId: '123', postId: '456' });
    });

    it('should not match paths with different segment counts', () => {
      const result = matchPath('/api/users', '/api/users/:id');
      expect(result).toBeNull();
    });

    it('should handle trailing slashes consistently', () => {
      const result = matchPath('/api/users/', '/api/users');
      expect(result).toEqual({});
    });

    it('should match root path', () => {
      const result = matchPath('/', '/');
      expect(result).toEqual({});
    });

    it('should extract parameters with special characters', () => {
      const result = matchPath('/api/users/john-doe-123', '/api/users/:username');
      expect(result).toEqual({ username: 'john-doe-123' });
    });
  });
});
