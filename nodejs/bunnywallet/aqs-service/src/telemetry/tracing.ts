import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { logger } from './logger.js';

let sdk: NodeSDK | null = null;

export function initializeTracing(): NodeSDK {
  // Create OTLP exporter
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  });

  // Create SDK with automatic instrumentations
  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'aqs-service',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Automatically instrument Express, HTTP, and other Node.js libraries
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          requestHook: (span, request) => {
            // Add custom attributes to HTTP spans
            span.setAttribute('http.request_id', (request as any).requestId || 'unknown');
          },
        },
        '@opentelemetry/instrumentation-redis-4': {
          enabled: true,
        },
      }),
    ],
  });

  // Start the SDK
  sdk.start();

  logger.info('OpenTelemetry tracing initialized', {
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    service: 'aqs-service',
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    try {
      await sdk?.shutdown();
      logger.info('OpenTelemetry SDK shut down successfully');
    } catch (error) {
      logger.error('Error shutting down OpenTelemetry SDK', { error });
    }
  });

  return sdk;
}

export function getTracer() {
  const { trace } = require('@opentelemetry/api');
  return trace.getTracer('aqs-service', '1.0.0');
}
