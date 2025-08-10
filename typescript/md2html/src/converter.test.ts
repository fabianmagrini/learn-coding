import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MarkdownConverter } from './converter.js';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('MarkdownConverter', () => {
  let converter: MarkdownConverter;

  beforeEach(() => {
    converter = new MarkdownConverter();
  });

  describe('convertString', () => {
    it('should convert basic markdown to HTML', () => {
      const markdown = '# Hello World\n\nThis is **bold** text.';
      const result = converter.convertString(markdown);
      
      expect(result).toContain('<h1>Hello World</h1>');
      expect(result).toContain('<strong>bold</strong>');
    });

    it('should handle code blocks with language', () => {
      const markdown = '```javascript\nconst x = 42;\n```';
      const result = converter.convertString(markdown);
      
      expect(result).toContain('<pre><code class="language-javascript">const x = 42;</code></pre>');
    });

    it('should handle inline code', () => {
      const markdown = 'Use `console.log()` to print.';
      const result = converter.convertString(markdown);
      
      expect(result).toContain('<code>console.log()</code>');
    });

    it('should escape HTML in code blocks', () => {
      const markdown = '```html\n<div>test</div>\n```';
      const result = converter.convertString(markdown);
      
      expect(result).toContain('&lt;div&gt;test&lt;/div&gt;');
    });

    it('should handle empty markdown', () => {
      const result = converter.convertString('');
      expect(result).toBe('');
    });
  });

  describe('convertFile', () => {
    const testFile = join(process.cwd(), 'test-markdown.md');

    afterEach(async () => {
      try {
        await unlink(testFile);
      } catch {}
    });

    it('should convert markdown file to HTML', async () => {
      const markdown = '# Test File\n\nThis is a test.';
      await writeFile(testFile, markdown, 'utf-8');
      
      const result = await converter.convertFile(testFile);
      
      expect(result).toContain('<h1>Test File</h1>');
      expect(result).toContain('This is a test.');
    });

    it('should throw error for non-existent file', async () => {
      await expect(converter.convertFile('non-existent-file.md')).rejects.toThrow('Failed to read file');
    });
  });

  describe('extractTitle', () => {
    it('should extract title from H1 heading', () => {
      const markdown = '# My Document Title\n\nContent here.';
      const result = converter.extractTitle(markdown);
      
      expect(result).toBe('My Document Title');
    });

    it('should return first H1 when multiple exist', () => {
      const markdown = '# First Title\n\n## Sub heading\n\n# Second Title';
      const result = converter.extractTitle(markdown);
      
      expect(result).toBe('First Title');
    });

    it('should handle H1 with extra whitespace', () => {
      const markdown = '#    Spaced Title   \n\nContent.';
      const result = converter.extractTitle(markdown);
      
      expect(result).toBe('Spaced Title');
    });

    it('should return null when no H1 found', () => {
      const markdown = '## Sub heading\n\nNo H1 here.';
      const result = converter.extractTitle(markdown);
      
      expect(result).toBe(null);
    });

    it('should ignore H1 not at line start', () => {
      const markdown = 'Text # Not a heading\n\n## Real heading';
      const result = converter.extractTitle(markdown);
      
      expect(result).toBe(null);
    });
  });

  describe('constructor options', () => {
    it('should create converter with custom options', () => {
      const customConverter = new MarkdownConverter({
        breaks: false,
        gfm: false,
        headerIds: false,
        sanitize: true
      });
      
      const markdown = '# Test\n\nLine 1\nLine 2';
      const result = customConverter.convertString(markdown);
      
      expect(result).toContain('<h1>Test</h1>');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML entities in code', () => {
      const markdown = '`<script>alert("test")</script>`';
      const result = converter.convertString(markdown);
      
      expect(result).toContain('&amp;lt;script&amp;gt;alert(&amp;quot;test&amp;quot;)&amp;lt;/script&amp;gt;');
    });
  });
});