import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TraceLink } from '@/components/TraceLink';
import { apiService } from '@/services/api';
import type { AccountSummary } from '@/types';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';

export function AccountDetails() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAccount = async (noCache = false) => {
    if (!accountId) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getAccount(accountId, noCache);
      setAccount(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  const invalidateCache = async () => {
    if (!accountId) return;
    try {
      await apiService.invalidateCache(accountId);
      await loadAccount(true);
    } catch (err: any) {
      setError(err.message || 'Failed to invalidate cache');
    }
  };

  useEffect(() => {
    loadAccount();
  }, [accountId]);

  if (loading && !account) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error && !account) {
    return (
      <div className="container mx-auto p-6">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-300">Error</CardTitle>
            <CardDescription className="text-red-600 dark:text-red-400">{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!account) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{account.displayName || account.accountId}</h1>
            <p className="text-muted-foreground mt-1">{account.accountId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => loadAccount(true)} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={invalidateCache} variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Cache
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Type:</span>
              <Badge>{account.accountType}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={account.status === 'active' ? 'success' : 'warning'}>
                {account.status || 'unknown'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Backend Source:</span>
              <span className="font-mono text-sm">{account.backendSource}</span>
            </div>
            {account.lastUpdated && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="text-sm">{new Date(account.lastUpdated).toLocaleString()}</span>
              </div>
            )}
            {account.stale && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cache Status:</span>
                <Badge variant="warning">STALE</Badge>
              </div>
            )}
            {account.traceId && (
              <div className="pt-3 border-t">
                <TraceLink traceId={account.traceId} />
              </div>
            )}
          </CardContent>
        </Card>

        {account.balances && account.balances.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Balances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {account.balances.map((balance, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-semibold text-lg">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: balance.currency || 'USD',
                      }).format(balance.available)}
                    </span>
                  </div>
                  {balance.ledger !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Ledger:</span>
                      <span className="text-sm">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: balance.currency || 'USD',
                        }).format(balance.ledger)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {account.owner && (
          <Card>
            <CardHeader>
              <CardTitle>Owner Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {account.owner.name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{account.owner.name}</span>
                </div>
              )}
              {account.owner.customerId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer ID:</span>
                  <span className="font-mono text-sm">{account.owner.customerId}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Raw Metadata</CardTitle>
            <CardDescription>Backend-specific account data</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(account, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
