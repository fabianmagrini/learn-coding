import { useCompletion } from 'ai/react';
import { SummaryLength } from '../types';

export function useSummarize() {
  const {
    completion: summary,
    handleSubmit,
    isLoading,
    error,
  } = useCompletion({
    api: '/api/summarize',
  });

  const summarize = async (text: string, length: SummaryLength = 'medium') => {
    await handleSubmit(undefined, {
      body: { text, length },
    });
  };

  return {
    summary,
    summarize,
    isLoading,
    error,
  };
}