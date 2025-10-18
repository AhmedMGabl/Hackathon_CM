import { useState } from 'react';
import { aiApi } from '../lib/api';

export default function AIHelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);

  const handleAsk = async () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setCitations([]);

    try {
      const result = await aiApi.help({ question: question.trim() });

      if (result.success && result.data) {
        setResponse(result.data.answer);
        if (result.data.citations) {
          setCitations(result.data.citations);
        }
      } else {
        setError('Failed to get help response');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while contacting AI help');
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    'How do I upload data?',
    'How do I schedule a performance meeting?',
    'Where can I see the latest metrics?',
    'How do I export reports?',
  ];

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-50"
        title="AI Help"
      >
        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="text-xl font-semibold text-slate-900">AI Help</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Quick Questions */}
              {!response && !isLoading && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Quick questions:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {quickQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuestion(q);
                          setTimeout(() => {
                            setQuestion(q);
                            handleAsk();
                          }, 0);
                        }}
                        className="text-left px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ask a question
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                    placeholder="e.g., How do I improve my team's performance?"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleAsk}
                    disabled={isLoading || !question.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Asking...' : 'Ask'}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Getting answer...</span>
                  </div>
                </div>
              )}

              {/* Response */}
              {response && (
                <div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-3">
                    <div
                      className="prose prose-sm max-w-none text-slate-800"
                      dangerouslySetInnerHTML={{
                        __html: response
                          .replace(/\n/g, '<br>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/- (.*?)(<br>|$)/g, '• $1$2'),
                      }}
                    />
                  </div>

                  {/* Citations */}
                  {citations.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                      <p className="text-xs font-medium text-slate-600 mb-1">Sources:</p>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {citations.map((citation, idx) => (
                          <li key={idx}>• {citation}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ask Another */}
                  <button
                    onClick={() => {
                      setQuestion('');
                      setResponse(null);
                      setCitations([]);
                      setError(null);
                    }}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Ask another question
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
