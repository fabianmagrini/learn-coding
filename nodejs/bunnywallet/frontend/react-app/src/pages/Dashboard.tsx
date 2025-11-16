import { useState, useEffect } from 'react';
import { AccountCard } from '@/components/AccountCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TraceLink } from '@/components/TraceLink';
import { apiService } from '@/services/api';
import type { AccountResult } from '@/types';
import { RefreshCw, AlertCircle } from 'lucide-react';

// Demo account IDs
const DEFAULT_ACCOUNTS = [
  'bank-001',
  'bank-002',
  'credit-001',
  'loan-001',
  'invest-001',
  'legacy-001',
  'crypto-001',
];

export function Dashboard() {
  const [accounts, setAccounts] = useState<AccountResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState<string>('');
  const [overallStatus, setOverallStatus] = useState<string>('');
  const [traceId, setTraceId] = useState<string | undefined>(undefined);
  const [noCache, setNoCache] = useState(false);

  const loadAccounts = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const response = await apiService.getAccounts(DEFAULT_ACCOUNTS, forceRefresh || noCache);
      setAccounts(response.results);
      setRequestId(response.requestId);
      setOverallStatus(response.overallStatus);
      setTraceId(response.traceId);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'ok':
        return 'success';
      case 'partial':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">BunnyWallet Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Multi-account financial overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={noCache}
              onChange={(e) => setNoCache(e.target.checked)}
              className="rounded border-gray-300"
            />
            Force Refresh (no-cache)
          </label>
          <Button
            onClick={() => loadAccounts(true)}
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh All
              </>
            )}
          </Button>
        </div>
      </div>

      {requestId && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">Request ID: <span className="font-mono text-xs">{requestId}</span></p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Overall Status:</span>
              <Badge variant={getStatusBadgeVariant(overallStatus)}>
                {overallStatus.toUpperCase()}
              </Badge>
            </div>
            <TraceLink traceId={traceId} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && accounts.length === 0
          ? DEFAULT_ACCOUNTS.map((id) => (
              <AccountCard
                key={id}
                account={{
                  accountId: id,
                  accountType: 'bank',
                  backendSource: '',
                }}
                isLoading={true}
              />
            ))
          : accounts.map((result) => (
              <AccountCard
                key={result.accountId}
                account={result.data || {
                  accountId: result.accountId,
                  accountType: 'bank',
                  backendSource: 'unknown',
                }}
                latencyMs={result.latencyMs}
                error={result.error?.message}
              />
            ))}
      </div>

      {accounts.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No accounts found</h3>
          <p className="text-muted-foreground mt-2">
            Click "Refresh All" to load account data
          </p>
        </div>
      )}
    </div>
  );
}
