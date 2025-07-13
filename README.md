# learn-coding
Sample code in different programming languages to demonstrate concepts

## Repository Structure

This repository is organized as follows:

- **`python/csv-hasher/`**: This directory contains a Python command-line tool for CSV file manipulation.
    - **`hashify.py`**: This script is a command-line utility that takes a CSV file as input, hashes a specified column using a chosen hashing algorithm (e.g., SHA256, MD5), and outputs a new CSV file with the hashed column. This is useful for anonymizing or creating unique identifiers for data in CSV files while preserving the structure.

- **`nodejs/argos/`**: This directory contains a production-grade 12-factor Node.js microservices application demonstrating modern architectural patterns with full observability.
    - **Architecture**: Two TypeScript microservices (products-service and orders-service) with comprehensive monitoring infrastructure including Jaeger for distributed tracing, Prometheus for metrics collection, and Grafana for visualization.
    - **Features**: Demonstrates containerization with Docker, structured logging, health checks, graceful shutdown, security best practices, and comprehensive testing strategies.
    - **Technology Stack**: Node.js, TypeScript, Express, OpenTelemetry, Pino logging, Jest testing, and Docker Compose orchestration.
