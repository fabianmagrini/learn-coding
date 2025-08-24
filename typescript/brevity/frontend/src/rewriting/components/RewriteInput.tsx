import React, { useState } from 'react';
import { ToneType } from '../types';

interface RewriteInputProps {
  onRewrite: (text: string, tone: ToneType) => void;
  isLoading: boolean;
}

export function RewriteInput({ onRewrite, isLoading }: RewriteInputProps) {
  const [text, setText] = useState('');
  const [tone, setTone] = useState<ToneType>('professional');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onRewrite(text.trim(), tone);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="rewrite-text-input" className="block text-sm font-medium text-gray-700 mb-2">
          Text to Rewrite
        </label>
        <textarea
          id="rewrite-text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your text here..."
          className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="tone-select" className="block text-sm font-medium text-gray-700 mb-2">
          Writing Tone
        </label>
        <select
          id="tone-select"
          value={tone}
          onChange={(e) => setTone(e.target.value as ToneType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isLoading}
        >
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="confident">Confident</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={!text.trim() || isLoading}
        className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Rewriting...' : 'Rewrite'}
      </button>
    </form>
  );
}