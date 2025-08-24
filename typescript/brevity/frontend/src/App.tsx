import React, { useState } from 'react';
import { SummarizationFeature } from './summarization/components/SummarizationFeature';
import { RewritingFeature } from './rewriting/components/RewritingFeature';
import { PdfUpload } from './components/PdfUpload';

type ActiveFeature = 'summarize' | 'rewrite';

function App() {
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>('summarize');
  const [inputText, setInputText] = useState('');

  const handleTextExtracted = (text: string) => {
    setInputText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Brevity</h1>
              <p className="text-gray-600 mt-2">AI-powered content summarization and rewriting</p>
            </div>
            
            <nav className="mt-4 sm:mt-0">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveFeature('summarize')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeFeature === 'summarize'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Summarize
                </button>
                <button
                  onClick={() => setActiveFeature('rewrite')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeFeature === 'rewrite'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Rewrite
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload PDF (Optional)</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Upload a PDF file to extract text automatically, then use the summarization or rewriting features below.
            </p>
            <PdfUpload onTextExtracted={handleTextExtracted} />
            
            {inputText && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Extracted Text Preview</h3>
                <p className="text-sm text-blue-700 line-clamp-3">
                  {inputText.substring(0, 200)}...
                </p>
                <button
                  onClick={() => setInputText('')}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Clear extracted text
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          {activeFeature === 'summarize' && <SummarizationFeature />}
          {activeFeature === 'rewrite' && <RewritingFeature />}
        </div>

        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Built with React, TypeScript, Tailwind CSS, and the Vercel AI SDK
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;