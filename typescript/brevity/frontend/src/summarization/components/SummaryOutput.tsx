import React, { useState } from 'react';

interface SummaryOutputProps {
  summary: string;
  isLoading: boolean;
  error?: Error | null;
}

export function SummaryOutput({ summary, isLoading, error }: SummaryOutputProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (summary) {
      try {
        await navigator.clipboard.writeText(summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-red-800 mb-2">Error</h3>
        <p className="text-sm text-red-700">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Summary</h3>
        {summary && !isLoading && (
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      
      <div className="min-h-40 p-4 border border-gray-300 rounded-md bg-gray-50">
        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
            <span className="text-sm">Generating summary...</span>
          </div>
        )}
        
        {summary && (
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-gray-900 leading-relaxed">
              {summary}
            </p>
          </div>
        )}
        
        {!summary && !isLoading && (
          <p className="text-gray-500 text-sm italic">
            Your summary will appear here once generated.
          </p>
        )}
      </div>
    </div>
  );
}