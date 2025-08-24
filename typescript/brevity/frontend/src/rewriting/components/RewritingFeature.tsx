import React from 'react';
import { useRewrite } from '../hooks/useRewrite';
import { RewriteInput } from './RewriteInput';
import { RewriteOutput } from './RewriteOutput';

export function RewritingFeature() {
  const { rewrittenText, rewrite, isLoading, error } = useRewrite();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Input</h2>
        <RewriteInput onRewrite={rewrite} isLoading={isLoading} />
      </div>
      
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Output</h2>
        <RewriteOutput rewrittenText={rewrittenText} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
}