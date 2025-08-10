import { readFile } from 'fs/promises';

export interface TemplateOptions {
  title?: string;
  cssContent?: string;
  cssFile?: string;
  charset?: string;
  lang?: string;
}

export class TemplateProcessor {
  private static readonly DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="{{charset}}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  {{css}}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #2c3e50;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    code {
      background-color: #f4f4f4;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }
    pre {
      background-color: #f4f4f4;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 0;
      padding-left: 1em;
      color: #666;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f4f4f4;
      font-weight: bold;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
{{content}}
</body>
</html>`;

  private template: string;

  constructor(customTemplate?: string) {
    this.template = customTemplate || TemplateProcessor.DEFAULT_TEMPLATE;
  }

  static async fromFile(templatePath: string): Promise<TemplateProcessor> {
    try {
      const template = await readFile(templatePath, 'utf-8');
      return new TemplateProcessor(template);
    } catch (error) {
      throw new Error(`Failed to read template file ${templatePath}: ${error}`);
    }
  }

  async processContent(htmlContent: string, options: TemplateOptions = {}): Promise<string> {
    let result = this.template;

    result = result.replace(/\{\{content\}\}/g, htmlContent);
    result = result.replace(/\{\{title\}\}/g, options.title || 'Converted Document');
    result = result.replace(/\{\{charset\}\}/g, options.charset || 'UTF-8');
    result = result.replace(/\{\{lang\}\}/g, options.lang || 'en');

    const cssContent = await this.processCss(options);
    result = result.replace(/\{\{css\}\}/g, cssContent);

    return result;
  }

  private async processCss(options: TemplateOptions): Promise<string> {
    let cssContent = '';

    if (options.cssFile) {
      try {
        const css = await readFile(options.cssFile, 'utf-8');
        cssContent += `<style>\n${css}\n</style>`;
      } catch (error) {
        console.warn(`Warning: Failed to read CSS file ${options.cssFile}: ${error}`);
      }
    }

    if (options.cssContent) {
      cssContent += `<style>\n${options.cssContent}\n</style>`;
    }

    return cssContent;
  }

  getPlaceholders(): string[] {
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(this.template)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1]);
      }
    }

    return placeholders;
  }
}