# md2html

A fast and simple CLI Markdown-to-HTML converter built with Bun and TypeScript.

## Features

- **Fast conversion** - Powered by Bun runtime for optimal performance
- **Single file or directory** - Convert individual files or entire directories recursively
- **Flexible output** - Output to stdout, specific files, or directories
- **Built-in styling** - Clean, responsive CSS styling out of the box
- **Custom templates** - Use your own HTML templates with placeholder support
- **CSS integration** - Embed custom CSS files in the output
- **TypeScript** - Fully typed for better development experience
- **Well tested** - Comprehensive test suite with 56+ tests covering all functionality

## Installation

### Prerequisites

- [Bun](https://bun.sh/) runtime installed

### Install dependencies

```bash
bun install
```

### Build the project

```bash
bun run build
```

## Usage

### Command Line Interface

```bash
# Development mode
bun run dev [options] <input>

# Production mode (after build)
./dist/cli.js [options] <input>
```

### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--input` | `-i` | Input file or directory (required) |
| `--output` | `-o` | Output file or directory (optional, defaults to stdout) |
| `--template` | `-t` | Custom HTML template file |
| `--css` | `-c` | CSS file to embed in output |
| `--watch` | `-w` | Watch input files and re-convert on changes (not yet implemented) |
| `--help` | `-h` | Show help message |

## Examples

### Basic Usage

```bash
# Convert a single file to stdout
bun run dev README.md

# Convert using explicit input flag
bun run dev -i README.md

# Convert a single file to a specific output file
bun run dev -i README.md -o README.html

# Convert all .md files in a directory to a dist folder
bun run dev -i docs/ -o dist/
```

### Advanced Usage

```bash
# Use a custom HTML template
bun run dev -i README.md -t my-template.html

# Add custom CSS styling
bun run dev -i README.md -c styles.css

# Combine template and CSS
bun run dev -i docs/ -o dist/ -t template.html -c styles.css
```

## Custom Templates

You can create custom HTML templates using placeholders that will be replaced during conversion:

```html
<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="{{charset}}">
  <title>{{title}}</title>
  {{css}}
</head>
<body>
  <header>
    <h1>My Custom Site</h1>
  </header>
  <main>
    {{content}}
  </main>
</body>
</html>
```

### Available Placeholders

- `{{content}}` - The converted HTML content
- `{{title}}` - Document title (extracted from first H1 or filename)
- `{{charset}}` - Character encoding (default: UTF-8)
- `{{lang}}` - Language code (default: en)
- `{{css}}` - Embedded CSS styles

## Supported Markdown Features

- **Headers** (H1-H6)
- **Text formatting** (bold, italic, strikethrough)
- **Code blocks** with syntax highlighting classes
- **Inline code**
- **Lists** (ordered and unordered)
- **Links** and images
- **Tables**
- **Blockquotes**
- **GitHub Flavored Markdown** (GFM)

## Project Structure

```
md2html/
├── src/
│   ├── cli.ts             # CLI entrypoint and argument parsing
│   ├── converter.ts       # Markdown to HTML conversion logic
│   ├── template.ts        # HTML template processing
│   ├── utils.ts           # Utility functions (file system helpers)
│   ├── cli.test.ts        # CLI integration tests
│   ├── converter.test.ts  # Converter unit tests
│   ├── template.test.ts   # Template processor tests
│   └── utils.test.ts      # Utility function tests
├── dist/                  # Built output (after running build)
├── docs/                  # Example markdown files
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Scripts

```bash
# Run in development mode
bun run dev

# Build for production
bun run build

# Run type checking
bun run lint

# Run tests
bun run test
```

### Adding New Features

The codebase is modular and easy to extend:

- **CLI interface** - Modify `src/cli.ts`
- **Markdown processing** - Extend `src/converter.ts`
- **Template system** - Enhance `src/template.ts`
- **File operations** - Add utilities to `src/utils.ts`

## Dependencies

- **[marked](https://github.com/markedjs/marked)** - Fast Markdown parser
- **[meow](https://github.com/sindresorhus/meow)** - CLI helper with elegant argument parsing
- **TypeScript** - Type safety and modern JavaScript features
- **Bun** - Fast JavaScript runtime and package manager

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `bun run test`
5. Run type checking: `bun run lint`
6. Commit your changes: `git commit -am 'Add new feature'`
7. Push to the branch: `git push origin feature-name`
8. Submit a pull request

## Examples Output

### Input Markdown
```markdown
# My Document

This is a **sample** document with:

- A list item
- Another item

## Code Example

```javascript
function hello() {
  console.log("Hello, World!");
}
```

| Feature | Status |
|---------|--------|
| Tables  | ✅     |
```

### Generated HTML
The above markdown converts to clean, styled HTML with:
- Responsive design that works on all devices
- Syntax highlighting classes for code blocks
- Professional typography with system fonts
- Styled tables, lists, and blockquotes
- Proper semantic HTML structure

---

Built with ❤️ using [Bun](https://bun.sh/) and TypeScript.