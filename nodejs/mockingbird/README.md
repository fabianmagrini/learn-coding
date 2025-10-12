# Mockingbird

A lightweight and flexible API mocking service built with Node.js and TypeScript. Mockingbird empowers developers to simulate API endpoints for rapid prototyping, parallel development, and robust testing.

## Features

- **Easy Configuration**: Define mocks using simple JSON or YAML files
- **Dynamic Responses**: Template support for generating responses based on request data
- **OpenAPI Integration**: Automatically generate mocks from OpenAPI/Swagger specifications
- **Path Parameters**: Support for dynamic URL segments (e.g., `/users/:id`)
- **Query & Header Matching**: Match requests based on query parameters and headers
- **Admin API**: Manage mocks at runtime through REST endpoints
- **Comprehensive Testing**: High code coverage with unit and integration tests
- **TypeScript**: Fully typed for better developer experience

## Installation

```bash
npm install
npm run build
```

## Quick Start

### 1. Create a Mock Configuration File

Create a file `mocks.json`:

```json
{
  "mocks": [
    {
      "request": {
        "method": "GET",
        "path": "/api/users/:id"
      },
      "response": {
        "statusCode": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "id": "{{request.params.id}}",
          "name": "John Doe",
          "email": "john.doe@example.com"
        }
      }
    }
  ]
}
```

### 2. Run the Server

```bash
npm run build
node dist/index.js mocks.json
```

Or use the dev server with hot reload:

```bash
npm run dev
```

### 3. Test Your Mock

```bash
curl http://localhost:3000/api/users/123
```

Response:
```json
{
  "id": "123",
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

## Usage

### Loading Mocks from Files

**Single File:**
```bash
node dist/index.js path/to/mocks.json
```

**Directory (loads all .json, .yaml, .yml files):**
```bash
node dist/index.js path/to/mocks-directory/
```

**OpenAPI Specification:**
```bash
node dist/index.js --openapi path/to/openapi-spec.yaml
```

### Mock Definition Format

#### Basic Structure

```yaml
mocks:
  - description: "Optional description"
    request:
      method: GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS
      path: /api/path/:param
      headers:              # Optional
        Authorization: "Bearer token"
      query:                # Optional
        filter: "active"
      body:                 # Optional (for POST/PUT/PATCH)
        key: "value"
    response:
      statusCode: 200
      headers:              # Optional
        Content-Type: "application/json"
      body:                 # Optional
        data: "response data"
      delay: 1000           # Optional delay in milliseconds
```

#### Path Parameters

Use `:paramName` syntax in the path:

```json
{
  "request": {
    "method": "GET",
    "path": "/api/users/:userId/posts/:postId"
  },
  "response": {
    "statusCode": 200,
    "body": {
      "userId": "{{request.params.userId}}",
      "postId": "{{request.params.postId}}"
    }
  }
}
```

#### Template Variables

Use `{{request.*}}` syntax to insert dynamic values:

- `{{request.params.paramName}}` - Path parameters
- `{{request.query.queryName}}` - Query parameters
- `{{request.headers.headerName}}` - Request headers
- `{{request.body.fieldName}}` - Request body fields

Example:
```json
{
  "response": {
    "body": {
      "message": "Hello {{request.query.name}}!",
      "id": "{{request.params.id}}"
    }
  }
}
```

#### Request Matching

Mocks are matched based on:
1. **HTTP Method** (required)
2. **Path** (required, supports parameters)
3. **Headers** (optional, all specified headers must match)
4. **Query Parameters** (optional, all specified params must match)
5. **Body** (optional, exact match)

### Admin API

The admin API is available at `http://localhost:3000/__admin`

#### List All Mocks
```bash
GET /__admin/mocks
```

Response:
```json
{
  "count": 5,
  "mocks": [...]
}
```

#### Add Mock at Runtime
```bash
POST /__admin/mocks
Content-Type: application/json

{
  "request": {
    "method": "GET",
    "path": "/api/test"
  },
  "response": {
    "statusCode": 200,
    "body": { "test": true }
  }
}
```

#### Clear All Mocks
```bash
DELETE /__admin/mocks
```

#### Health Check
```bash
GET /__admin/health
```

## Examples

Check the `examples/` directory for complete examples:

- `simple-api.json` - Basic CRUD operations
- `advanced-api.yaml` - Advanced features (delays, errors, nested resources)
- `petstore-openapi.yaml` - OpenAPI specification example

### Running Examples

```bash
# Simple API example
npm run build
node dist/index.js examples/simple-api.json

# Advanced features
node dist/index.js examples/advanced-api.yaml

# OpenAPI specification
node dist/index.js --openapi examples/petstore-openapi.yaml
```

## Development

### Project Structure

```
mockingbird/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── modules/         # Core modules
│   │   ├── mockLoader.ts
│   │   ├── requestMatcher.ts
│   │   ├── responseHandler.ts
│   │   └── openApiParser.ts
│   ├── admin/           # Admin API
│   └── index.ts         # Main server
├── examples/            # Example configurations
└── __tests__/          # Test files
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the production server
- `npm run dev` - Start development server with hot reload
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage report

## Use Cases

### Parallel Development
Frontend and backend teams can work simultaneously. Frontend developers can build against mocks while the backend is being developed.

### Testing
Isolate your services by mocking external API dependencies. Test edge cases, error scenarios, and timeouts without relying on external services.

### Rapid Prototyping
Quickly create functional prototypes and demos without a fully implemented backend.

### Cost Optimization
Avoid costs and rate limits associated with third-party APIs during development and testing.

## Requirements

- Node.js 18+ or 20+
- TypeScript 5.0+

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Future Enhancements

- Stateful mocking (maintain state between requests)
- Web-based UI for managing mocks
- Proxy and record mode (record real API responses)
- GraphQL support
- Performance and chaos testing features
