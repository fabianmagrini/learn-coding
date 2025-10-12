# learn-coding

Sample code in different programming languages to demonstrate concepts.

## Repository Structure

### Python

#### **`python/csv-hasher/`** - CSV File Manipulation Tool
Python command-line tool for hashing CSV columns.
- **Features**: Command-line utility for hashing specified columns using SHA256, MD5, or other algorithms; useful for data anonymization and creating unique identifiers while preserving CSV structure.
- **Technology Stack**: Python

### JavaScript

#### **`javascript/rubiks-cube/`** - Interactive Three.js Rubik's Cube
Single-file Three.js application rendering an interactive Rubik's Cube.
- **Features**: Supports cube sizes from 2×2×2 to 20×20×20, layer rotation via UI controls, scramble functionality, smooth step-by-step solve animation, and performance optimization using InstancedMesh.
- **Technology Stack**: JavaScript, Three.js

### TypeScript

#### **`typescript/brevity/`** - AI-Powered Content Summarization
Full-stack application for content summarization and rewriting with real-time streaming.
- **Features**: Adjustable-length summarization, multiple tone styles for rewriting, PDF upload and text extraction, real-time streaming responses, and responsive modern UI.
- **Technology Stack**: React, TypeScript, Express.js, Vercel AI SDK, Tailwind CSS, Rsbuild, Multer, pdf-parse
- **Architecture**: Vertical slice architecture by feature for better maintainability.

#### **`typescript/json-query-kit/`** - Type-Safe JSON Data Manipulation
Lightweight library for sorting, filtering, and paginating JSON data.
- **Features**: Fluent API with method chaining, comprehensive filtering with AND/OR operators, flexible sorting (single-field, multi-field, custom functions), dual pagination support (page-based and offset-based), zero external dependencies, and full TypeScript type safety.
- **Technology Stack**: TypeScript, Jest
- **Use Cases**: Client-side or server-side data manipulation, REST API query implementation, frontend data filtering and pagination.

#### **`typescript/md2html/`** - Markdown-to-HTML Converter
Fast CLI tool for converting Markdown to HTML.
- **Features**: Fast conversion powered by Bun runtime, single file or directory conversion, flexible output options, built-in styling, custom templates, CSS integration, and comprehensive test coverage.
- **Technology Stack**: TypeScript, Bun, marked, meow

### Node.js

#### **`nodejs/argos/`** - Production-Grade Microservices Application
12-factor microservices application demonstrating modern architectural patterns with full observability.
- **Features**: Containerization with Docker, structured logging, health checks, graceful shutdown, security best practices, and comprehensive testing strategies.
- **Technology Stack**: Node.js, TypeScript, Express, OpenTelemetry, Pino, Jest, Docker Compose
- **Architecture**: Two TypeScript microservices (products-service and orders-service) with Jaeger distributed tracing, Prometheus metrics collection, and Grafana visualization.

#### **`nodejs/mockingbird/`** - API Mocking Service
Lightweight and flexible API mocking service for rapid prototyping, parallel development, and testing.
- **Features**: JSON/YAML configuration, dynamic responses with template support, OpenAPI/Swagger integration, path parameters and dynamic URL segments, query and header matching, admin API for runtime mock management, and comprehensive test coverage.
- **Technology Stack**: Node.js, TypeScript, Express.js, Jest
- **Use Cases**: Frontend and backend parallel development, external API mocking for isolated testing, rapid prototyping and demos, edge case and error scenario testing, cost optimization.

#### **`nodejs/onya/`** - AI-Powered Customer Service Chatbot
Comprehensive chatbot system with seamless human escalation capabilities.
- **Features**: AI-powered chat responses, real-time WebSocket communication, smart escalation triggers, operator dashboard, enterprise security with JWT authentication, comprehensive monitoring and alerting, and 200+ test coverage.
- **Technology Stack**: TypeScript, React 18, tRPC, Node.js, Express, PostgreSQL, Prisma ORM, Redis, OpenAI API, Docker, Prometheus, Grafana
- **Architecture**: Modern microservices with React frontends (customer and operator apps), Node.js BFF services, and shared business logic with integrated AI/LLM capabilities.
