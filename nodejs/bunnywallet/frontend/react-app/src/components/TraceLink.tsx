import { ExternalLink } from 'lucide-react';

interface TraceLinkProps {
  traceId?: string;
  className?: string;
  showIcon?: boolean;
}

export function TraceLink({ traceId, className = '', showIcon = true }: TraceLinkProps) {
  if (!traceId) {
    return null;
  }

  const jaegerUrl = `http://localhost:16686/trace/${traceId}`;

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span className="text-muted-foreground">Trace:</span>
      <a
        href={jaegerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
        title="View trace in Jaeger"
      >
        <span className="truncate max-w-[120px]">{traceId}</span>
        {showIcon && <ExternalLink className="h-3 w-3" />}
      </a>
    </div>
  );
}
