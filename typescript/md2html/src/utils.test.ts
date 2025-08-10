import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { 
  isDirectory, 
  isFile, 
  ensureDirectoryExists, 
  findMarkdownFiles, 
  changeExtension, 
  getOutputPath 
} from './utils.js';
import { writeFile, unlink, rmdir, mkdir } from 'fs/promises';
import { join } from 'path';

describe('utils', () => {
  const testDir = join(process.cwd(), 'test-utils-dir');
  const testFile = join(testDir, 'test.md');
  const testSubDir = join(testDir, 'subdir');
  const testSubFile = join(testSubDir, 'sub.md');

  afterEach(async () => {
    try {
      await unlink(testFile);
    } catch {}
    try {
      await unlink(testSubFile);
    } catch {}
    try {
      await rmdir(testSubDir);
    } catch {}
    try {
      await rmdir(testDir);
    } catch {}
  });

  describe('isDirectory', () => {
    it('should return true for existing directory', async () => {
      await mkdir(testDir, { recursive: true });
      
      const result = await isDirectory(testDir);
      
      expect(result).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const result = await isDirectory('non-existent-path');
      
      expect(result).toBe(false);
    });

    it('should return false for file', async () => {
      await mkdir(testDir, { recursive: true });
      await writeFile(testFile, 'content', 'utf-8');
      
      const result = await isDirectory(testFile);
      
      expect(result).toBe(false);
    });
  });

  describe('isFile', () => {
    it('should return true for existing file', async () => {
      await mkdir(testDir, { recursive: true });
      await writeFile(testFile, 'content', 'utf-8');
      
      const result = await isFile(testFile);
      
      expect(result).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const result = await isFile('non-existent-file.txt');
      
      expect(result).toBe(false);
    });

    it('should return false for directory', async () => {
      await mkdir(testDir, { recursive: true });
      
      const result = await isFile(testDir);
      
      expect(result).toBe(false);
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', async () => {
      const filePath = join(testDir, 'nested', 'file.txt');
      
      await ensureDirectoryExists(filePath);
      
      const exists = await isDirectory(join(testDir, 'nested'));
      expect(exists).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      await mkdir(testDir, { recursive: true });
      const filePath = join(testDir, 'file.txt');
      
      await expect(ensureDirectoryExists(filePath)).resolves.toBeUndefined();
    });
  });

  describe('findMarkdownFiles', () => {
    beforeEach(async () => {
      await mkdir(testDir, { recursive: true });
      await mkdir(testSubDir, { recursive: true });
    });

    it('should find single markdown file', async () => {
      await writeFile(testFile, '# Test', 'utf-8');
      
      const files = await findMarkdownFiles(testFile);
      
      expect(files).toEqual([testFile]);
    });

    it('should return empty array for non-markdown file', async () => {
      const txtFile = join(testDir, 'test.txt');
      await writeFile(txtFile, 'content', 'utf-8');
      
      const files = await findMarkdownFiles(txtFile);
      
      expect(files).toEqual([]);
    });

    it('should find markdown files in directory', async () => {
      await writeFile(testFile, '# Test', 'utf-8');
      await writeFile(join(testDir, 'other.txt'), 'text', 'utf-8');
      
      const files = await findMarkdownFiles(testDir);
      
      expect(files).toContain(testFile);
      expect(files).toHaveLength(1);
    });

    it('should find markdown files recursively', async () => {
      await writeFile(testFile, '# Test', 'utf-8');
      await writeFile(testSubFile, '# Sub Test', 'utf-8');
      
      const files = await findMarkdownFiles(testDir);
      
      expect(files).toContain(testFile);
      expect(files).toContain(testSubFile);
      expect(files).toHaveLength(2);
    });

    it('should return empty array for non-existent path', async () => {
      const files = await findMarkdownFiles('non-existent-path');
      
      expect(files).toEqual([]);
    });
  });

  describe('changeExtension', () => {
    it('should change file extension', () => {
      const result = changeExtension('document.md', '.html');
      
      expect(result).toBe('document.html');
    });

    it('should handle files with multiple dots', () => {
      const result = changeExtension('my.document.md', '.html');
      
      expect(result).toBe('my.document.html');
    });

    it('should handle paths with directories', () => {
      const result = changeExtension('/path/to/file.md', '.html');
      
      expect(result).toBe('/path/to/file.html');
    });
  });

  describe('getOutputPath', () => {
    it('should return default HTML extension when no output specified', () => {
      const result = getOutputPath('input.md');
      
      expect(result).toBe('input.html');
    });

    it('should return specified output path', () => {
      const result = getOutputPath('input.md', 'output.html');
      
      expect(result.endsWith('output.html')).toBe(true);
    });

    it('should handle directory output path', () => {
      const result = getOutputPath('input.md', 'output-dir/');
      
      expect(result.includes('input.html')).toBe(true);
      expect(result.includes('output-dir')).toBe(true);
    });

    it('should handle backslash directory separator', () => {
      const result = getOutputPath('input.md', 'output-dir\\');
      
      expect(result.includes('input.html')).toBe(true);
    });
  });
});