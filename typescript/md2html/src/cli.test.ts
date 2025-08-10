import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { spawn } from 'child_process';
import { writeFile, unlink, mkdir, rmdir } from 'fs/promises';
import { join } from 'path';

describe('CLI Integration', () => {
  const testDir = join(process.cwd(), 'test-cli-dir');
  const testFile = join(testDir, 'test.md');
  const outputFile = join(testDir, 'test.html');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await unlink(testFile);
    } catch {}
    try {
      await unlink(outputFile);
    } catch {}
    try {
      await rmdir(testDir);
    } catch {}
  });

  const runCli = (args: string[]): Promise<{ stdout: string; stderr: string; code: number }> => {
    return new Promise((resolve) => {
      const child = spawn('bun', ['run', 'src/cli.ts', ...args], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout, stderr, code: code ?? 0 });
      });
    });
  };

  it('should show help when no input provided', async () => {
    const result = await runCli([]);
    
    expect(result.stderr).toContain('Input file or directory is required');
  });

  it('should convert single markdown file to stdout', async () => {
    const markdown = '# Test Document\n\nThis is a test.';
    await writeFile(testFile, markdown, 'utf-8');
    
    const result = await runCli(['-i', testFile]);
    
    expect(result.stdout).toContain('<h1>Test Document</h1>');
    expect(result.stdout).toContain('This is a test.');
    expect(result.code).toBe(0);
  });

  it('should convert markdown file to output file', async () => {
    const markdown = '# Test Document\n\nOutput test.';
    await writeFile(testFile, markdown, 'utf-8');
    
    const result = await runCli(['-i', testFile, '-o', outputFile]);
    
    expect(result.stdout).toContain('→');
    expect(result.code).toBe(0);

    const outputContent = await Bun.file(outputFile).text();
    expect(outputContent).toContain('<h1>Test Document</h1>');
  });

  it('should show error for non-existent file', async () => {
    const result = await runCli(['-i', 'non-existent.md']);
    
    expect(result.stderr).toContain('No markdown files found');
    expect(result.code).toBe(1);
  });

  it('should handle directory input', async () => {
    const markdown1 = '# Doc 1';
    const markdown2 = '# Doc 2';
    await writeFile(join(testDir, 'doc1.md'), markdown1, 'utf-8');
    await writeFile(join(testDir, 'doc2.md'), markdown2, 'utf-8');
    
    const outputDir = join(testDir, 'output');
    await mkdir(outputDir, { recursive: true });
    
    const result = await runCli(['-i', testDir, '-o', outputDir]);
    
    expect(result.stdout).toContain('Successfully converted 2 file(s)');
    expect(result.code).toBe(0);
  }, 10000);

  it('should show help with --help flag', async () => {
    const result = await runCli(['--help']);
    
    expect(result.stdout).toContain('Usage');
    expect(result.stdout).toContain('md2html');
    expect(result.stdout).toContain('Options');
  });

  it('should handle positional argument as input', async () => {
    const markdown = '# Positional Test';
    await writeFile(testFile, markdown, 'utf-8');
    
    const result = await runCli([testFile]);
    
    expect(result.stdout).toContain('<h1>Positional Test</h1>');
    expect(result.code).toBe(0);
  });
});