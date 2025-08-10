import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TemplateProcessor } from './template.js';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('TemplateProcessor', () => {
  let processor: TemplateProcessor;

  beforeEach(() => {
    processor = new TemplateProcessor();
  });

  describe('processContent', () => {
    it('should replace content placeholder', async () => {
      const htmlContent = '<h1>Test Content</h1>';
      const result = await processor.processContent(htmlContent);
      
      expect(result).toContain('<h1>Test Content</h1>');
      expect(result).toContain('<!DOCTYPE html>');
    });

    it('should replace title placeholder', async () => {
      const result = await processor.processContent('<p>content</p>', { title: 'My Custom Title' });
      
      expect(result).toContain('<title>My Custom Title</title>');
    });

    it('should use default title when none provided', async () => {
      const result = await processor.processContent('<p>content</p>');
      
      expect(result).toContain('<title>Converted Document</title>');
    });

    it('should replace charset and lang placeholders', async () => {
      const result = await processor.processContent('<p>content</p>', {
        charset: 'ISO-8859-1',
        lang: 'fr'
      });
      
      expect(result).toContain('<meta charset="ISO-8859-1">');
      expect(result).toContain('<html lang="fr">');
    });

    it('should use default charset and lang when none provided', async () => {
      const result = await processor.processContent('<p>content</p>');
      
      expect(result).toContain('<meta charset="UTF-8">');
      expect(result).toContain('<html lang="en">');
    });

    it('should include CSS content when provided', async () => {
      const result = await processor.processContent('<p>content</p>', {
        cssContent: 'body { background: red; }'
      });
      
      expect(result).toContain('<style>\nbody { background: red; }\n</style>');
    });
  });

  describe('fromFile', () => {
    const testTemplate = join(process.cwd(), 'test-template.html');

    afterEach(async () => {
      try {
        await unlink(testTemplate);
      } catch {}
    });

    it('should load template from file', async () => {
      const templateContent = '<html><head><title>{{title}}</title></head><body>{{content}}</body></html>';
      await writeFile(testTemplate, templateContent, 'utf-8');
      
      const processor = await TemplateProcessor.fromFile(testTemplate);
      const result = await processor.processContent('<p>test</p>', { title: 'File Template' });
      
      expect(result).toBe('<html><head><title>File Template</title></head><body><p>test</p></body></html>');
    });

    it('should throw error for non-existent template file', async () => {
      await expect(TemplateProcessor.fromFile('non-existent.html')).rejects.toThrow('Failed to read template file');
    });
  });

  describe('processCss', () => {
    const testCssFile = join(process.cwd(), 'test-styles.css');

    afterEach(async () => {
      try {
        await unlink(testCssFile);
      } catch {}
    });

    it('should include CSS from file', async () => {
      const cssContent = 'body { margin: 0; }';
      await writeFile(testCssFile, cssContent, 'utf-8');
      
      const result = await processor.processContent('<p>content</p>', { cssFile: testCssFile });
      
      expect(result).toContain('<style>\nbody { margin: 0; }\n</style>');
    });

    it('should handle non-existent CSS file gracefully', async () => {
      const originalWarn = console.warn;
      let warnMessage = '';
      console.warn = (message: string) => { warnMessage = message; };
      
      const result = await processor.processContent('<p>content</p>', { cssFile: 'non-existent.css' });
      
      expect(result).not.toContain('non-existent.css');
      expect(warnMessage).toContain('Warning: Failed to read CSS file');
      
      console.warn = originalWarn;
    });

    it('should combine CSS file and CSS content', async () => {
      const cssContent = 'body { margin: 0; }';
      await writeFile(testCssFile, cssContent, 'utf-8');
      
      const result = await processor.processContent('<p>content</p>', {
        cssFile: testCssFile,
        cssContent: 'p { color: blue; }'
      });
      
      expect(result).toContain('body { margin: 0; }');
      expect(result).toContain('p { color: blue; }');
    });
  });

  describe('getPlaceholders', () => {
    it('should return default template placeholders', () => {
      const placeholders = processor.getPlaceholders();
      
      expect(placeholders).toContain('lang');
      expect(placeholders).toContain('charset');
      expect(placeholders).toContain('title');
      expect(placeholders).toContain('css');
      expect(placeholders).toContain('content');
    });

    it('should return custom template placeholders', () => {
      const customTemplate = '<div>{{custom}} and {{another}}</div>';
      const customProcessor = new TemplateProcessor(customTemplate);
      const placeholders = customProcessor.getPlaceholders();
      
      expect(placeholders).toEqual(['custom', 'another']);
    });

    it('should not return duplicate placeholders', () => {
      const customTemplate = '<div>{{test}} and {{test}} again</div>';
      const customProcessor = new TemplateProcessor(customTemplate);
      const placeholders = customProcessor.getPlaceholders();
      
      expect(placeholders).toEqual(['test']);
    });
  });

  describe('custom template', () => {
    it('should use custom template in constructor', async () => {
      const customTemplate = '<html><body class="custom">{{content}}</body></html>';
      const customProcessor = new TemplateProcessor(customTemplate);
      
      const result = await customProcessor.processContent('<p>test</p>');
      
      expect(result).toBe('<html><body class="custom"><p>test</p></body></html>');
    });
  });
});