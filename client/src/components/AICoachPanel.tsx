import { useState } from 'react';
import { aiApi } from '../lib/api';

interface AICoachPanelProps {
  agentId?: string;
  metrics?: {
    ccPct?: number;
    scPct?: number;
    upPct?: number;
    fixedPct?: number;
    conversionPct?: number;
  };
  targets?: {
    ccTarget?: number;
    scTarget?: number;
    upTarget?: number;
    fixedTarget?: number;
  };
}

export default function AICoachPanel({ agentId, metrics, targets }: AICoachPanelProps) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAsk = async () => {
    if (!question.trim() && !metrics) {
      setError('Please enter a question or provide metrics for general insights');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await aiApi.coach({
        agentId,
        question: question.trim() || undefined,
        metrics,
        targets,
      });

      if (result.success && result.data) {
        setResponse(result.data.answer);
        setIsExpanded(true);
      } else {
        setError('Failed to get coaching insights');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while contacting AI coach');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickInsights = async () => {
    setQuestion('');
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await aiApi.coach({
        agentId,
        metrics,
        targets,
      });

      if (result.success && result.data) {
        setResponse(result.data.answer);
        setIsExpanded(true);
      } else {
        setError('Failed to get coaching insights');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while contacting AI coach');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h3 className="font-semibold text-slate-900">AI Performance Coach</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-500 hover:text-slate-700"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Input Area */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ask a question (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="e.g., How can I improve my CC%?"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleAsk}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Asking...' : 'Ask'}
              </button>
            </div>
          </div>

          {/* Quick Insights Button */}
          {metrics && (
            <div className="mb-3">
              <button
                onClick={handleQuickInsights}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Generating...' : 'Get Quick Performance Insights'}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: response.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                }}
              />
            </div>
          )}

          {/* Loading State */}
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
                <span>Analyzing performance...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
