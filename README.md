# learn-coding
Sample code in different programming languages to demonstrate concepts

## Repository Structure

This repository is organized as follows:

- **`python/csv-hasher/`**: This directory contains a Python command-line tool for CSV file manipulation.
    - **`hashify.py`**: This script is a command-line utility that takes a CSV file as input, hashes a specified column using a chosen hashing algorithm (e.g., SHA256, MD5), and outputs a new CSV file with the hashed column. This is useful for anonymizing or creating unique identifiers for data in CSV files while preserving the structure.

- **`javascript/rubiks-cube/`**: This directory contains an interactive Three.js Rubik's Cube application.
    - **`index.html`**: A single-file Three.js app that renders an interactive Rubik's Cube of any size from 2×2×2 up to 20×20×20. Features include layer rotation via UI controls, scramble functionality, smooth step-by-step solve animation, and performance optimization using InstancedMesh for large cubes.

- **`nodejs/argos/`**: This directory contains a production-grade 12-factor Node.js microservices application demonstrating modern architectural patterns with full observability.
    - **Architecture**: Two TypeScript microservices (products-service and orders-service) with comprehensive monitoring infrastructure including Jaeger for distributed tracing, Prometheus for metrics collection, and Grafana for visualization.
    - **Features**: Demonstrates containerization with Docker, structured logging, health checks, graceful shutdown, security best practices, and comprehensive testing strategies.
    - **Technology Stack**: Node.js, TypeScript, Express, OpenTelemetry, Pino logging, Jest testing, and Docker Compose orchestration.

- **`typescript/md2html/`**: This directory contains a fast and simple CLI Markdown-to-HTML converter built with Bun and TypeScript.
    - **Features**: Fast conversion powered by Bun runtime, supports single file or directory conversion, flexible output options, built-in styling, custom templates, CSS integration, and comprehensive test coverage.
    - **Technology Stack**: TypeScript, Bun runtime, marked (Markdown parser), meow (CLI helper), with modular architecture for easy extension.
    - **Usage**: Command-line tool that can convert individual Markdown files or entire directories to HTML with customizable templates and styling options.

- **`nodejs/onya/`**: This directory contains a comprehensive AI-powered customer service chatbot system with seamless human escalation capabilities.
    - **Architecture**: Modern microservices architecture with React frontends (customer and operator apps), Node.js BFF (Backend for Frontend) services, and shared business logic services with integrated AI/LLM capabilities.
    - **Features**: AI-powered chat responses, real-time WebSocket communication, smart escalation triggers, operator dashboard, enterprise security with JWT authentication, comprehensive monitoring and alerting, and 200+ test coverage.
    - **Technology Stack**: TypeScript, React 18, tRPC, Node.js/Express, PostgreSQL with Prisma ORM, Redis caching, OpenAI API integration, Docker containerization, and Prometheus/Grafana monitoring.

- **`typescript/brevity/`**: This directory contains an AI-powered content summarization and rewriting application with real-time streaming capabilities.
    - **Architecture**: Full-stack TypeScript application with React frontend and Express.js backend, organized using vertical slice architecture by feature for better maintainability.
    - **Features**: Content summarization with adjustable length options, text rewriting with different tone styles, PDF upload and text extraction, real-time streaming responses using Vercel AI SDK, and responsive modern UI.
    - **Technology Stack**: React, TypeScript, Express.js, Vercel AI SDK, Tailwind CSS, Rsbuild, Multer for file uploads, and pdf-parse for PDF text extraction.
