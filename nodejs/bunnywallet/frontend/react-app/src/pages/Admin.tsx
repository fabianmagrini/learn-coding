import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/services/api';
import type { SimulateBackendRequest } from '@/types';

const BACKENDS = ['bank-service', 'credit-service', 'loan-service', 'investment-service', 'legacy-service', 'crypto-service'];

export function Admin() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('');

  const simulateBackend = async (backend: string, mode: SimulateBackendRequest['mode'], latencyMs?: number) => {
    setLoading((prev) => ({ ...prev, [backend]: true }));
    setMessage('');
    try {
      await apiService.simulateBackend(backend, { mode, latencyMs });
      setMessage(`✓ ${backend} set to ${mode} mode` + (latencyMs ? ` with ${latencyMs}ms latency` : ''));
    } catch (error) {
      setMessage(`✗ Failed to configure ${backend}: ${error}`);
    } finally {
      setLoading((prev) => ({ ...prev, [backend]: false }));
    }
  };

  const invalidateAllCache = async () => {
    setLoading((prev) => ({ ...prev, cache: true }));
    setMessage('');
    try {
      await apiService.invalidateAllCache();
      setMessage('✓ All cache invalidated successfully');
    } catch (error) {
      setMessage(`✗ Failed to invalidate cache: ${error}`);
    } finally {
      setLoading((prev) => ({ ...prev, cache: false }));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Control Panel</h1>
        <p className="text-muted-foreground mt-1">
          Simulate backend failures and manage cache
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.startsWith('✓')
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
          }`}
        >
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Backend Simulation</CardTitle>
          <CardDescription>
            Control the behavior of mock backend services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {BACKENDS.map((backend) => (
              <div key={backend} className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-3">{backend}</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => simulateBackend(backend, 'healthy')}
                    disabled={loading[backend]}
                  >
                    Healthy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => simulateBackend(backend, 'slow', 2000)}
                    disabled={loading[backend]}
                  >
                    Slow (2s)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => simulateBackend(backend, 'error')}
                    disabled={loading[backend]}
                  >
                    Error
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => simulateBackend(backend, 'flaky')}
                    disabled={loading[backend]}
                  >
                    Flaky
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>
            Manage the Redis cache for account data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={invalidateAllCache}
            disabled={loading.cache}
          >
            Invalidate All Cache
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
