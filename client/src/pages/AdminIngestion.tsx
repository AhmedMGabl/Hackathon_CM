import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface FileState {
  file: File | null;
  preview: string;
  error: string | null;
}

interface IngestionReport {
  timestamp: string;
  sources: Array<{
    source: string;
    files: string[];
    received: number;
    accepted: number;
    updated: number;
    skippedDuplicate: number;
    rejected: Array<{ file: string; row: number; reason: string }>;
    columnsDetected: string[];
    columnsMapped?: Record<string, string>;
  }>;
  totals: {
    filesProcessed: number;
    received: number;
    accepted: number;
    updated: number;
    created: number;
    skippedDuplicate: number;
    rejected: number;
  };
  coverage: Record<string, number>;
  mentorCount: number;
  teamCount: number;
  errors: string[];
  duration: number;
}

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const ALLOWED_TYPES = ['.xlsx', '.xls'];

const SOURCE_LABELS: Record<string, string> = {
  cc_file: 'Class Consumption (CC/SC%)',
  fixed_file: 'Fixed Rate',
  re_file: 'Referral Funnel',
  up_file: 'Upgrade Rate',
  all_leads_file: 'All Leads & Recovery'
};

export default function AdminIngestion() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<Record<string, FileState>>({
    cc_file: { file: null, preview: '', error: null },
    fixed_file: { file: null, preview: '', error: null },
    re_file: { file: null, preview: '', error: null },
    up_file: { file: null, preview: '', error: null },
    all_leads_file: { file: null, preview: '', error: null }
  });

  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState<IngestionReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((sourceKey: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    const file = droppedFiles[0];
    validateAndSetFile(sourceKey, file);
  }, []);

  const handleFileSelect = useCallback((sourceKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const file = selectedFiles[0];
    validateAndSetFile(sourceKey, file);
  }, []);

  const validateAndSetFile = (sourceKey: string, file: File) => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!ALLOWED_TYPES.includes(extension)) {
      setFiles(prev => ({
        ...prev,
        [sourceKey]: {
          file: null,
          preview: '',
          error: `Invalid file type. Only ${ALLOWED_TYPES.join(', ')} files are allowed.`
        }
      }));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFiles(prev => ({
        ...prev,
        [sourceKey]: {
          file: null,
          preview: '',
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
        }
      }));
      return;
    }

    setFiles(prev => ({
      ...prev,
      [sourceKey]: {
        file,
        preview: file.name,
        error: null
      }
    }));
  };

  const handleClear = (sourceKey: string) => {
    setFiles(prev => ({
      ...prev,
      [sourceKey]: { file: null, preview: '', error: null }
    }));
  };

  const handleClearAll = () => {
    setFiles({
      cc_file: { file: null, preview: '', error: null },
      fixed_file: { file: null, preview: '', error: null },
      re_file: { file: null, preview: '', error: null },
      up_file: { file: null, preview: '', error: null },
      all_leads_file: { file: null, preview: '', error: null }
    });
    setReport(null);
    setError(null);
  };

  const handleUpload = async () => {
    setUploading(true);
    setError(null);
    setReport(null);

    try {
      const formData = new FormData();
      let hasFiles = false;

      Object.entries(files).forEach(([key, state]) => {
        if (state.file) {
          formData.append(key, state.file);
          hasFiles = true;
        }
      });

      if (!hasFiles) {
        setError('Please select at least one file to upload.');
        setUploading(false);
        return;
      }

      const response = await fetch('/api/ingest/uploads', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingestion-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasAnyFile = Object.values(files).some(f => f.file !== null);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Data Ingestion</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload Excel files to import mentor performance data
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Files</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.entries(SOURCE_LABELS).map(([sourceKey, label]) => {
              const state = files[sourceKey];
              return (
                <div key={sourceKey} className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>

                  <div
                    className={`relative ${state.file ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'} border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-100 transition`}
                    onDrop={(e) => handleDrop(sourceKey, e)}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => document.getElementById(`file-input-${sourceKey}`)?.click()}
                  >
                    {state.file ? (
                      <div className="space-y-2">
                        <svg className="mx-auto h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm text-gray-700 font-medium">{state.preview}</p>
                        <p className="text-xs text-gray-500">{(state.file.size / 1024).toFixed(1)} KB</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClear(sourceKey);
                          }}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-600">Drag & drop or click</p>
                        <p className="text-xs text-gray-500">.xlsx, .xls (max 200MB)</p>
                      </div>
                    )}

                    <input
                      id={`file-input-${sourceKey}`}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => handleFileSelect(sourceKey, e)}
                    />
                  </div>

                  {state.error && (
                    <div className="mt-2 text-sm text-red-600">{state.error}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Select any subset of files. All are optional.
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClearAll}
                disabled={!hasAnyFile || uploading}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear All
              </button>

              <button
                onClick={handleUpload}
                disabled={!hasAnyFile || uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  'Upload & Process'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload failed</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Report Display */}
      {report && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Ingestion Report</h2>
                <p className="text-sm text-gray-500">
                  Completed in {(report.duration / 1000).toFixed(2)}s
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/overview')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  View Overview
                </button>
                <button
                  onClick={() => navigate('/mentors')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  View Mentors
                </button>
                <button
                  onClick={downloadReport}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
                >
                  Download JSON
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Mentors</div>
                <div className="text-2xl font-semibold text-gray-900">{report.mentorCount}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Created</div>
                <div className="text-2xl font-semibold text-green-700">{report.totals.created}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Updated</div>
                <div className="text-2xl font-semibold text-yellow-700">{report.totals.updated}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Skipped</div>
                <div className="text-2xl font-semibold text-gray-700">{report.totals.skippedDuplicate}</div>
              </div>
            </div>

            {/* Coverage */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Coverage</h3>
              <div className="space-y-2">
                {Object.entries(report.coverage).map(([metric, percentage]) => (
                  <div key={metric} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-gray-600">{metric}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-12 text-sm font-medium text-gray-900 text-right">{percentage}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sources Breakdown */}
            {report.sources.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Sources</h3>
                <div className="space-y-4">
                  {report.sources.map((source, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900">{source.source}</div>
                        <div className="text-sm text-gray-500">{source.files.join(', ')}</div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Received</div>
                          <div className="font-medium">{source.received}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Accepted</div>
                          <div className="font-medium text-green-600">{source.accepted}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Rejected</div>
                          <div className="font-medium text-red-600">{source.rejected.length}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Columns</div>
                          <div className="font-medium">{source.columnsDetected.length}</div>
                        </div>
                      </div>

                      {source.rejected.length > 0 && (
                        <details className="mt-3">
                          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                            View {source.rejected.length} rejected row(s)
                          </summary>
                          <div className="mt-2 space-y-1 text-xs">
                            {source.rejected.slice(0, 10).map((rej, i) => (
                              <div key={i} className="text-red-600 pl-4">
                                Row {rej.row}: {rej.reason}
                              </div>
                            ))}
                            {source.rejected.length > 10 && (
                              <div className="text-gray-500 pl-4">
                                ... and {source.rejected.length - 10} more
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {report.errors.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Warnings & Errors</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="space-y-1 text-sm text-yellow-800">
                    {report.errors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Note */}
      {!report && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Production Upload</h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>Upload any subset of the five Excel sources. Files will be auto-detected and merged.</p>
                <p className="mt-1">For local development, you can also use <code className="bg-blue-100 px-1 py-0.5 rounded">npm run ingest:folder</code> to ingest from <code className="bg-blue-100 px-1 py-0.5 rounded">./Excel Sheets of What We Will Upload/</code></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
