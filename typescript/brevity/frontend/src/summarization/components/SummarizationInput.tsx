import React, { useState } from 'react';
import { SummaryLength } from '../types';

interface SummarizationInputProps {
  onSummarize: (text: string, length: SummaryLength) => void;
  isLoading: boolean;
}

export function SummarizationInput({ onSummarize, isLoading }: SummarizationInputProps) {
  const [text, setText] = useState('');
  const [length, setLength] = useState<SummaryLength>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSummarize(text.trim(), length);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-2">
          Text to Summarize
        </label>
        <textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your text here..."
          className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="length-select" className="block text-sm font-medium text-gray-700 mb-2">
          Summary Length
        </label>
        <select
          id="length-select"
          value={length}
          onChange={(e) => setLength(e.target.value as SummaryLength)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isLoading}
        >
          <option value="short">Short (2-3 sentences)</option>
          <option value="medium">Medium (1-2 paragraphs)</option>
          <option value="detailed">Detailed (3-4 paragraphs)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={!text.trim() || isLoading}
        className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Summarizing...' : 'Summarize'}
      </button>
    </form>
  );
}