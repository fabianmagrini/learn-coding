import { marked } from 'marked';
import { readFile } from 'fs/promises';

export interface ConversionOptions {
  breaks?: boolean;
  gfm?: boolean;
  headerIds?: boolean;
  sanitize?: boolean;
}

export class MarkdownConverter {
  private renderer: marked.Renderer;

  constructor(options: ConversionOptions = {}) {
    this.renderer = new marked.Renderer();
    
    marked.setOptions({
      breaks: options.breaks ?? true,
      gfm: options.gfm ?? true,
      headerIds: options.headerIds ?? true,
      sanitize: options.sanitize ?? false,
      renderer: this.renderer
    });

    this.setupCustomRenderer();
  }

  private setupCustomRenderer(): void {
    this.renderer.code = (code: string, language: string | undefined) => {
      const lang = language ? ` class="language-${language}"` : '';
      return `<pre><code${lang}>${this.escapeHtml(code)}</code></pre>\n`;
    };

    this.renderer.codespan = (code: string) => {
      return `<code>${this.escapeHtml(code)}</code>`;
    };
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  async convertFile(filePath: string): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return this.convertString(content);
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  convertString(markdown: string): string {
    try {
      return marked(markdown);
    } catch (error) {
      throw new Error(`Failed to convert markdown: ${error}`);
    }
  }

  extractTitle(markdown: string): string | null {
    const lines = markdown.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }
    return null;
  }
}