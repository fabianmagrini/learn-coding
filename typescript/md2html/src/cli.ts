#!/usr/bin/env bun

import meow from 'meow';
import { writeFile } from 'fs/promises';
import { resolve, relative, basename } from 'path';
import { MarkdownConverter } from './converter.js';
import { TemplateProcessor } from './template.js';
import { findMarkdownFiles, getOutputPath, ensureDirectoryExists, isDirectory } from './utils.js';

interface CliOptions {
  input?: string;
  output?: string;
  template?: string;
  css?: string;
  watch?: boolean;
}

const cli = meow(`
  Usage
    $ md2html [options] <input>

  Options
    --input, -i      Input file or directory (required)
    --output, -o     Output file or directory (optional, defaults to stdout)
    --template, -t   Custom HTML template file
    --css, -c        CSS file to embed in output
    --watch, -w      Watch input files and re-convert on changes (not yet implemented)
    --help, -h       Show this help message

  Examples
    # Convert a single file to stdout
    $ md2html README.md
    $ md2html -i README.md

    # Convert a single file to a specific output file
    $ md2html -i README.md -o README.html

    # Convert all .md files in a directory
    $ md2html -i docs/ -o dist/

    # Use a custom template
    $ md2html -i README.md -t my-template.html

    # Add CSS styling
    $ md2html -i README.md -c styles.css
`, {
  importMeta: import.meta,
  flags: {
    input: {
      type: 'string',
      shortFlag: 'i',
    },
    output: {
      type: 'string',
      shortFlag: 'o',
    },
    template: {
      type: 'string',
      shortFlag: 't',
    },
    css: {
      type: 'string',
      shortFlag: 'c',
    },
    watch: {
      type: 'boolean',
      shortFlag: 'w',
    },
  },
});

class Md2HtmlCli {
  private converter: MarkdownConverter;
  private templateProcessor: TemplateProcessor;

  constructor() {
    this.converter = new MarkdownConverter();
    this.templateProcessor = new TemplateProcessor();
  }

  async run(): Promise<void> {
    const options = this.parseOptions();

    if (!options.input) {
      console.error('Error: Input file or directory is required');
      cli.showHelp();
      return;
    }

    try {
      if (options.template) {
        this.templateProcessor = await TemplateProcessor.fromFile(options.template);
      }

      const files = await findMarkdownFiles(options.input);
      if (files.length === 0) {
        console.error('No markdown files found in the specified input.');
        process.exit(1);
      }

      await this.convertFiles(files, options);
      console.log(`Successfully converted ${files.length} file(s).`);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  }

  private parseOptions(): CliOptions {
    const options: CliOptions = {};
    
    options.input = cli.flags.input || cli.input[0];
    options.output = cli.flags.output;
    options.template = cli.flags.template;
    options.css = cli.flags.css;
    options.watch = cli.flags.watch;

    return options;
  }

  private async convertFiles(files: string[], options: CliOptions): Promise<void> {
    for (const file of files) {
      await this.convertSingleFile(file, options);
    }
  }

  private async convertSingleFile(inputFile: string, options: CliOptions): Promise<void> {
    try {
      const htmlContent = await this.converter.convertFile(inputFile);
      const markdownContent = await Bun.file(inputFile).text();
      const title = this.converter.extractTitle(markdownContent) || basename(inputFile, '.md');
      
      const processedHtml = await this.templateProcessor.processContent(htmlContent, {
        title,
        cssFile: options.css,
      });

      if (options.output === undefined) {
        console.log(processedHtml);
        return;
      }

      let outputFile: string;
      if (await isDirectory(options.input!)) {
        const relativePath = relative(resolve(options.input!), inputFile);
        const outputDir = options.output || './dist';
        outputFile = resolve(outputDir, relativePath.replace(/\.md$/, '.html'));
      } else {
        outputFile = getOutputPath(inputFile, options.output);
      }

      await ensureDirectoryExists(outputFile);
      await writeFile(outputFile, processedHtml, 'utf-8');
      
      console.log(`${relative(process.cwd(), inputFile)} → ${relative(process.cwd(), outputFile)}`);
    } catch (error) {
      throw new Error(`Failed to convert ${inputFile}: ${error}`);
    }
  }

}

if (import.meta.main) {
  const md2htmlCli = new Md2HtmlCli();
  await md2htmlCli.run();
}