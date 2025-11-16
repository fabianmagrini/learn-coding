import { circuitBreaker, handleAll, retry, timeout, wrap, IPolicy, TimeoutStrategy, ExponentialBackoff, ConsecutiveBreaker } from 'cockatiel';
import { recordCircuitBreakerState } from '../telemetry/metrics';
import { logger } from '../telemetry/logger';

export interface ResilienceOptions {
  timeoutMs: number;
  retries: number;
  adapter: string;
  circuitBreakerConfig?: {
    failureThreshold: number;
    cooldownMs: number;
  };
}

const circuitBreakers = new Map<string, IPolicy>();

export function getResiliencePolicy(options: ResilienceOptions): IPolicy {
  const {
    timeoutMs,
    retries,
    adapter,
    circuitBreakerConfig = { failureThreshold: 50, cooldownMs: 30000 }
  } = options;

  // Check if we already have a circuit breaker for this adapter
  let cb = circuitBreakers.get(adapter);

  if (!cb) {
    // Create circuit breaker for this adapter
    cb = circuitBreaker(handleAll, {
      halfOpenAfter: circuitBreakerConfig.cooldownMs,
      breaker: new ConsecutiveBreaker(5), // Open after 5 consecutive failures
    });

    circuitBreakers.set(adapter, cb);
    // Initialize metric to closed state
    recordCircuitBreakerState(adapter, 0);
    logger.debug('Circuit breaker initialized', { adapter });
  }

  // Compose policies: timeout -> retry -> circuit breaker
  const policy = wrap(
    timeout(timeoutMs, TimeoutStrategy.Aggressive),
    retry(handleAll, { maxAttempts: retries + 1, backoff: new ExponentialBackoff() }),
    cb
  );

  return policy;
}

export async function withResilience<T>(
  fn: () => Promise<T>,
  options: ResilienceOptions
): Promise<T> {
  const policy = getResiliencePolicy(options);
  return policy.execute(fn);
}

// Export circuit breaker state for observability
export function getCircuitBreakerState(adapter: string): string {
  const cb = circuitBreakers.get(adapter);
  if (!cb) return 'closed';

  // Cockatiel doesn't expose state directly, so we use a marker
  return 'unknown'; // In production, use observability hooks
}
