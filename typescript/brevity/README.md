# Brevity - AI-Powered Content Summarizer & Rewriter

A modern, full-stack application built with React, TypeScript, Express.js, and the Vercel AI SDK that provides real-time content summarization and rewriting capabilities.

## 🚀 Features

- **Content Summarization**: Generate concise summaries with adjustable length (short, medium, detailed)
- **Content Rewriting**: Rewrite text with different tones (professional, casual, confident)
- **PDF Upload**: Extract text from PDF files for processing
- **Real-time Streaming**: See results as they're generated using the Vercel AI SDK
- **Responsive Design**: Clean, modern UI built with Tailwind CSS
- **Vertical Slice Architecture**: Organized by feature for better maintainability

## 🛠 Tech Stack

### Frontend
- **React** with TypeScript
- **Rsbuild** for fast builds
- **Tailwind CSS** for styling
- **Vercel AI SDK** (`ai/react`) for streaming responses

### Backend  
- **Node.js** with Express.js
- **TypeScript**
- **Vercel AI SDK** (`ai`) for AI model integration
- **Multer** for file uploads
- **pdf-parse** for PDF text extraction

## 📋 Prerequisites

- Node.js 18+
- pnpm 8+
- OpenAI API key (or Anthropic API key)

## 🔧 Setup Instructions

1. **Clone and navigate to the project**:
   ```bash
   cd brevity
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and add your API key
   OPENAI_API_KEY=your-openai-api-key-here
   ```

4. **Start the development servers**:
   ```bash
   # This starts both frontend and backend
   pnpm dev
   ```

   Or start them individually:
   ```bash
   # Terminal 1 - Backend (runs on :3001)
   cd backend && pnpm dev
   
   # Terminal 2 - Frontend (runs on :3000)
   cd frontend && pnpm dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## 🏗 Project Structure

```
brevity/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # Shared components
│   │   ├── summarization/    # Summarization feature
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   ├── rewriting/        # Rewriting feature
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   └── App.tsx
│   └── package.json
├── backend/                  # Express backend
│   ├── src/
│   │   ├── api/             # Shared API endpoints
│   │   ├── summarization/   # Summarization feature
│   │   │   └── api/
│   │   ├── rewriting/       # Rewriting feature
│   │   │   └── api/
│   │   ├── lib/             # Shared utilities
│   │   └── index.ts
│   └── package.json
└── package.json             # Root package.json
```

## 🔌 API Endpoints

### POST `/api/summarize`
Summarize text content with streaming response.
```json
{
  "text": "Your text content here...",
  "length": "short" | "medium" | "detailed"
}
```

### POST `/api/rewrite`
Rewrite text content with streaming response.
```json
{
  "text": "Your text content here...",
  "tone": "professional" | "casual" | "confident"
}
```

### POST `/api/upload-pdf`
Extract text from uploaded PDF file.
- Content-Type: `multipart/form-data`
- Field: `pdf` (file)
- Max size: 10MB

## 🧪 Testing

```bash
# Run tests for all packages
pnpm test

# Run tests for specific package
cd frontend && pnpm test
cd backend && pnpm test
```

## 🚀 Building for Production

```bash
# Build all packages
pnpm build

# Build specific package
cd frontend && pnpm build
cd backend && pnpm build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🔮 Future Enhancements

- URL input for article summarization
- Multiple AI model providers
- User preferences and settings
- Export functionality (PDF, Word, etc.)
- Batch processing
- API rate limiting and caching