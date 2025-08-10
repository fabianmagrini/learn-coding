import { stat, readdir, mkdir } from 'fs/promises';
import { dirname, extname, join, resolve } from 'path';

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function isFile(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function ensureDirectoryExists(path: string): Promise<void> {
  const dir = dirname(path);
  try {
    await mkdir(dir, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

export async function findMarkdownFiles(inputPath: string): Promise<string[]> {
  const files: string[] = [];
  const resolvedPath = resolve(inputPath);

  if (await isFile(resolvedPath)) {
    if (extname(resolvedPath) === '.md') {
      files.push(resolvedPath);
    }
    return files;
  }

  if (await isDirectory(resolvedPath)) {
    const entries = await readdir(resolvedPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(resolvedPath, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await findMarkdownFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && extname(entry.name) === '.md') {
        files.push(fullPath);
      }
    }
  }

  return files;
}

export function changeExtension(filePath: string, newExtension: string): string {
  const baseName = filePath.slice(0, filePath.lastIndexOf('.'));
  return baseName + newExtension;
}

export function getOutputPath(inputPath: string, outputPath?: string): string {
  if (!outputPath) {
    return changeExtension(inputPath, '.html');
  }

  const resolvedOutput = resolve(outputPath);
  
  if (outputPath.endsWith('/') || outputPath.endsWith('\\')) {
    const inputFileName = inputPath.split('/').pop() || inputPath.split('\\').pop() || 'output';
    return join(resolvedOutput, changeExtension(inputFileName, '.html'));
  }

  return resolvedOutput;
}