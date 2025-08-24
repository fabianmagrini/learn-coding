import { useCompletion } from 'ai/react';
import { ToneType } from '../types';

export function useRewrite() {
  const {
    completion: rewrittenText,
    handleSubmit,
    isLoading,
    error,
  } = useCompletion({
    api: '/api/rewrite',
  });

  const rewrite = async (text: string, tone: ToneType = 'professional') => {
    await handleSubmit(undefined, {
      body: { text, tone },
    });
  };

  return {
    rewrittenText,
    rewrite,
    isLoading,
    error,
  };
}