import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AccountSummary } from '@/types';
import { AlertCircle, CheckCircle2, Clock, Wallet } from 'lucide-react';

interface AccountCardProps {
  account: AccountSummary;
  latencyMs?: number;
  isLoading?: boolean;
  error?: string;
}

export function AccountCard({ account, latencyMs, isLoading, error }: AccountCardProps) {
  const navigate = useNavigate();

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      bank: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      creditcard: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      loan: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
      investment: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      legacy: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
      crypto: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    };
    return colors[type] || colors.legacy;
  };

  const getStatusVariant = (status?: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'warning';
      case 'closed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getLatencyColor = (ms?: number) => {
    if (!ms) return 'text-gray-500';
    if (ms < 100) return 'text-green-600';
    if (ms < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="h-5 w-5" />
            Error Loading Account
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-400">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card
      className="w-full hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/account/${account.accountId}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {account.displayName || account.accountId}
            </CardTitle>
            <CardDescription className="mt-1">
              {account.accountId}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge className={getAccountTypeColor(account.accountType)}>
              {account.accountType}
            </Badge>
            {account.stale && (
              <Badge variant="warning" className="text-xs">
                STALE
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {account.balances && account.balances.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Balances</h4>
            <div className="space-y-1">
              {account.balances.map((balance, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-semibold">
                    {formatCurrency(balance.available, balance.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {account.status === 'active' ? (
              <CheckCircle2 className="h-3 w-3 text-green-600" />
            ) : (
              <AlertCircle className="h-3 w-3 text-yellow-600" />
            )}
            <Badge variant={getStatusVariant(account.status)} className="text-xs">
              {account.status || 'unknown'}
            </Badge>
          </div>

          {latencyMs !== undefined && (
            <div className={`flex items-center gap-1 ${getLatencyColor(latencyMs)}`}>
              <Clock className="h-3 w-3" />
              <span>{latencyMs}ms</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Backend:</span>
            <span className="font-mono text-xs">{account.backendSource}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Updated:</span>
            <span>{formatDate(account.lastUpdated)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
