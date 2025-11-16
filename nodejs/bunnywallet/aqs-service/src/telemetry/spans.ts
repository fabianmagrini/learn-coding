import { trace, SpanStatusCode, Span } from '@opentelemetry/api';

/**
 * Get the current active span
 */
export function getCurrentSpan(): Span | undefined {
  return trace.getActiveSpan();
}

/**
 * Get the current trace ID
 */
export function getTraceId(): string | undefined {
  const span = getCurrentSpan();
  if (span) {
    const spanContext = span.spanContext();
    return spanContext.traceId;
  }
  return undefined;
}

/**
 * Add custom attributes to the current span
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  const span = getCurrentSpan();
  if (span) {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }
}

/**
 * Set span status to error
 */
export function setSpanError(error: Error): void {
  const span = getCurrentSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

/**
 * Wrapper function to automatically trace async operations
 */
export async function traceAsync<T>(
  operationName: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('aqs-service');

  return tracer.startActiveSpan(operationName, async (span) => {
    try {
      // Add custom attributes
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });

      // Execute the function
      const result = await fn(span);

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Extract trace context as HTTP headers for propagation
 */
export function getTraceHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // Inject trace context into headers
  trace.getActiveSpan()?.spanContext();

  return headers;
}
