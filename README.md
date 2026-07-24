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

#### **`typescript/pitchpulse/`** - Football News Aggregation Platform
Cross-platform football news aggregation platform providing personalized, curated news feeds from thousands of sources.
- **Features**: User authentication, personalized onboarding with team/league selection, RSS feed aggregation from top sources, keyword tagging for teams and players, personalized news feeds, reliability scoring for sources, responsive card-based UI, and monorepo structure with pnpm workspaces.
- **Technology Stack**: React 18, TypeScript, Express.js, PostgreSQL, Redis, TanStack Query, Zustand, Tailwind CSS with shadcn/ui, rsbuild, Vitest, Storybook, Docker Compose
- **Architecture**: Feature-based modules with frontend/backend separation, comprehensive testing, and component-driven development.

#### **`typescript/json-query-kit/`** - Type-Safe JSON Data Manipulation
Lightweight library for sorting, filtering, and paginating JSON data.
- **Features**: Fluent API with method chaining, comprehensive filtering with AND/OR operators, flexible sorting (single-field, multi-field, custom functions), dual pagination support (page-based and offset-based), zero external dependencies, and full TypeScript type safety.
- **Technology Stack**: TypeScript, Jest
- **Use Cases**: Client-side or server-side data manipulation, REST API query implementation, frontend data filtering and pagination.

#### **`typescript/md2html/`** - Markdown-to-HTML Converter
Fast CLI tool for converting Markdown to HTML.
- **Features**: Fast conversion powered by Bun runtime, single file or directory conversion, flexible output options, built-in styling, custom templates, CSS integration, and comprehensive test coverage.
- **Technology Stack**: TypeScript, Bun, marked, meow

#### **`typescript/flappy-bird-ai-learner/`** - Flappy Bird AI via Genetic Programming
Interactive web app that evolves Flappy Bird–playing programs using Genetic Programming (GP).
- **Features**: Real-time visualisation of evolving bird populations, explainable AI with readable expression trees (not neural networks), configurable population/mutation/depth parameters, speed control (1×–20×), best-bird replay, and SVG program tree inspector.
- **Technology Stack**: React 18, TypeScript, Vite 6, Zustand 5, Recharts 2, Vitest, Web Workers
- **Architecture**: Evolution loop runs headless in a Web Worker (tournament selection, subtree crossover, three mutation operators, elitism); main thread renders via `requestAnimationFrame` independently.

#### **`typescript/acmestore/`** - Modular Full-Stack Reference Implementation
Reference implementation demonstrating modular architecture patterns for a full-stack TypeScript web application.
- **Features**: Product listing with pagination, product detail pages, cart management persisted to localStorage, checkout summary with simulated order placement, end-to-end type safety, and feature-based module organisation.
- **Technology Stack**: React 18, TypeScript, Vite, React Router v7, TanStack Query, tRPC v11, Zod, Zustand, Tailwind CSS v3, NestJS, Turborepo, pnpm workspaces, Playwright, Vitest
- **Architecture**: Monorepo with contract-first API design — `packages/api` defines tRPC routers and Zod schemas shared between the NestJS BFF and React frontend, with feature modules (product, checkout) on both sides.

#### **`typescript/pr-triage-agent/`** - GitHub PR Triage Bot (Eve Demo Agent)
GitHub pull-request triage bot built on Eve, Vercel's filesystem-first agent framework, demonstrating auto-discovered agent capabilities.
- **Features**: Diff-based PR risk scoring, review checklist with progressive-disclosure skills (loads a deeper security skill only when relevant), concise findings comments, automatic triage labelling, human-in-the-loop approval gate before submitting formal APPROVE/REQUEST_CHANGES reviews, multi-channel deploy (GitHub App webhooks + built-in HTTP), and scheduled autonomous stale-PR digest via cron.
- **Technology Stack**: TypeScript, Eve (Vercel agent framework), Anthropic Claude (claude-sonnet-5), Zod, Node 24, GitHub REST API
- **Architecture**: Filesystem-first design where every capability (tools, skills, channels, schedules) is a single auto-discovered file under `agent/` with no registry to keep in sync; sensitive actions gated by default and sessions durably parked while awaiting approval.

### Node.js

#### **`nodejs/argos/`** - Production-Grade Microservices Application
12-factor microservices application demonstrating modern architectural patterns with full observability.
- **Features**: Containerization with Docker, structured logging, health checks, graceful shutdown, security best practices, and comprehensive testing strategies.
- **Technology Stack**: Node.js, TypeScript, Express, OpenTelemetry, Pino, Jest, Docker Compose
- **Architecture**: Two TypeScript microservices (products-service and orders-service) with Jaeger distributed tracing, Prometheus metrics collection, and Grafana visualization.

#### **`nodejs/bunnywallet/`** - Multi-Account Financial Dashboard
Demonstration of the Account Query Service (AQS) architecture pattern for aggregating financial account data from multiple backend systems.
- **Features**: Adapter pattern for pluggable account types (Bank, Credit Card, Loan, Investment, Legacy), resilience patterns (circuit breakers, retries, timeouts, bulkheads), Redis caching with stale-while-revalidate strategy, partial results support when backends fail, comprehensive observability with Prometheus metrics and structured logging, NGINX API gateway with TLS termination and rate limiting, and 5 configurable mock services with simulation modes.
- **Technology Stack**: Node.js 20+, TypeScript, Express, Redis, Cockatiel (resilience), Prometheus, Winston, NGINX, Docker Compose, Jest, Pact (contract testing)
- **Architecture**: Account Query Service pattern with adapter registry, resilience layer per adapter, caching layer, and orchestrator for multi-account queries with NGINX gateway for production-grade security and performance.

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

#### **`nodejs/devfoundry/`** - AI-Native Engineering Platform
Governed AI code generation platform at organisational scale, filling the gap between AI coding assistants and governed engineering systems.
- **Features**: AI agent fleet (feature, test, refactor, security, dependency, PR reviewer), automated harness pipeline (build → test → lint → architecture → risk → policy → decision), risk tier classification, approval workflows, policy engine, DORA metrics, and engineering dashboard.
- **Technology Stack**: TypeScript, NestJS, React 18, Vite, oclif CLI, Anthropic SDK (claude-sonnet-4-6), BullMQ, PostgreSQL, Redis, Tailwind CSS, TanStack Query, Turbo, Docker Compose
- **Architecture**: Monorepo with pnpm workspaces — api, web, cli, and agents packages — with an Engineering Control Plane enforcing architecture rules and approval workflows over all AI-generated changes.

### Rust

#### **`rust/minigrep/`** - Tiny grep Clone (Rust Starter Project)
The canonical first Rust project — a command-line tool that searches a file for lines containing a query string.
- **Features**: Case-sensitive and case-insensitive line search (via a `-i`/`--ignore-case` flag or the `IGNORE_CASE` env var), input from a file argument or piped via standard input, optional 1-based line numbers (`-n`/`--line-number`), ANSI bold-red highlighting of matches when writing to a terminal (auto-disabled when piped), auto-generated `--help`/`--version`, friendly error handling with clean exit codes, and a suite of unit tests; designed as a hands-on introduction to Rust's core concepts.
- **Technology Stack**: Rust, Cargo, clap (derive-based CLI parsing)
- **Architecture**: Standard Rust CLI layout with a thin binary (`src/main.rs`) over a testable library (`src/lib.rs`), demonstrating ownership and borrowing (lifetime-annotated string slices), `Result`/`?` error propagation, a `clap::Parser`-derived config struct, `Option`/`match` for file-vs-stdin input, iterators and closures (`enumerate` for line numbers), tuple destructuring, TTY-aware output via `IsTerminal`, and built-in `#[cfg(test)]` unit testing.
