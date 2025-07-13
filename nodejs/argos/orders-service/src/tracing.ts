import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const traceExporter = new OTLPTraceExporter({
  url: process.env.JAEGER_ENDPOINT || 'http://jaeger:4318/v1/traces',
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'orders-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

export function initializeTracing() {
  try {
    sdk.start();
    console.log('Tracing initialized successfully');
  } catch (error) {
    console.error('Error initializing tracing:', error);
  }
}

export function shutdownTracing() {
  return sdk.shutdown();
}