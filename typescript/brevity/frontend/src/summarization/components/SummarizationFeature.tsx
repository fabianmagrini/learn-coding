import React from 'react';
import { useSummarize } from '../hooks/useSummarize';
import { SummarizationInput } from './SummarizationInput';
import { SummaryOutput } from './SummaryOutput';

export function SummarizationFeature() {
  const { summary, summarize, isLoading, error } = useSummarize();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Input</h2>
        <SummarizationInput onSummarize={summarize} isLoading={isLoading} />
      </div>
      
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Output</h2>
        <SummaryOutput summary={summary} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
}