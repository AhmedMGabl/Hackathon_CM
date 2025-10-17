import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tokens } from '../config/tokens';

type UploadTab = 'cc' | 'fixed' | 'upgrade' | 'leads' | 'teams';

interface UploadResult {
  source: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  processed: number;
  created: number;
  updated: number;
  errors: Array<{ message: string }>;
  message: string;
}

const TAB_DEFINITIONS: Array<{ id: UploadTab; name: string; description: string }> = [
  { id: 'cc', name: 'Class Consumption', description: 'Student class consumption data' },
  { id: 'fixed', name: 'Fixed Rate', description: 'Fixed/unfixed student status' },
  { id: 'upgrade', name: 'Upgrade Rate', description: 'Student upgrade metrics' },
  { id: 'leads', name: 'Leads', description: 'Lead recovery tracking (57k+ rows)' },
  { id: 'teams', name: 'Teams', description: 'Referral metrics per team' },
];

export default function Upload() {
  const { user, logout, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<UploadTab>('cc');
  const [files, setFiles] = useState<Record<UploadTab, File | null>>({
    cc: null,
    fixed: null,
    upgrade: null,
    leads: null,
    teams: null,
  });
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  const handleFileSelect = (tab: UploadTab, file: File | null) => {
    setFiles((prev) => ({ ...prev, [tab]: file }));
  };

  const resetSuccessfulUploads = (uploadResults: UploadResult[]) => {
    const next = { ...files };
    uploadResults.forEach((result) => {
      if (result.status === 'SUCCESS') {
        const tabKey = result.source.replace('_file', '') as UploadTab;
        next[tabKey] = null;
      }
    });
    setFiles(next);
  };

  const handleUpload = async () => {
    const formData = new FormData();
    let hasFiles = false;

    (Object.entries(files) as Array<[UploadTab, File | null]>).forEach(([key, file]) => {
      if (file) {
        formData.append(`${key}_file`, file);
        hasFiles = true;
      }
    });

    if (!hasFiles) {
      alert('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    setResults([]);

    try {
      const response = await fetch('/api/upload/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        resetSuccessfulUploads(data.results as UploadResult[]);
      } else {
        alert('Upload failed: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const renderFileDropZone = (tab: UploadTab) => {
    const file = files[tab];
    const tabInfo = TAB_DEFINITIONS.find((entry) => entry.id === tab);

    return (
      <div
        key={tab}
        style={{
          border: `2px dashed ${file ? tokens.colors.primary[600] : tokens.colors.neutral[700]}`,
          borderRadius: tokens.radii.lg,
          padding: tokens.spacing[8],
          textAlign: 'center',
          background: tokens.colors.surface.card,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onDrop={(event) => {
          event.preventDefault();
          const droppedFile = event.dataTransfer.files[0];
          if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            handleFileSelect(tab, droppedFile);
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xlsx,.xls';
          input.onchange = (event) => {
            const target = event.target as HTMLInputElement;
            const selectedFile = target.files?.[0] ?? null;
            if (selectedFile) {
              handleFileSelect(tab, selectedFile);
            }
          };
          input.click();
        }}
      >
        <div style={{ marginBottom: tokens.spacing[4] }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: tokens.colors.neutral[100],
              marginBottom: tokens.spacing[2],
            }}
          >
            {tabInfo?.name}
          </div>
          <div style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>{tabInfo?.description}</div>
        </div>
        <div
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: tokens.spacing[2],
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: tokens.radii.lg,
              background: file ? tokens.colors.primary[700] + '30' : tokens.colors.neutral[900],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: file ? tokens.colors.primary[500] : tokens.colors.neutral[500],
              fontSize: '24px',
            }}
          >
            📁
          </div>
          <div style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>
            {file ? file.name : 'Click to select a file'}
          </div>
          <div style={{ fontSize: '12px', color: tokens.colors.neutral[500] }}>Accepts .xlsx and .xls files</div>
        </div>
      </div>
    );
  };

  if (!isSuperAdmin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: tokens.colors.surface.dark,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', color: tokens.colors.neutral[100] }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Access Denied</h2>
          <p style={{ color: tokens.colors.neutral[400] }}>Only Super Admins can upload files.</p>
          <a
            href="/"
            style={{
              color: tokens.colors.primary[500],
              marginTop: '16px',
              display: 'inline-block',
              textDecoration: 'none',
            }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const hasSelectedFiles = Object.values(files).some((file) => file !== null);

  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark }}>
      <header
        style={{
          background: tokens.colors.surface.card,
          borderBottom: `1px solid ${tokens.colors.neutral[800]}`,
          padding: '16px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.primary[500] }}>CMetrics</h1>
            <p style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>File Upload</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <a
              href="/"
              style={{ color: tokens.colors.primary[500], textDecoration: 'none', fontSize: '14px' }}
            >
              ← Back to Dashboard
            </a>
            <span style={{ color: tokens.colors.neutral[200], fontSize: '14px' }}>
              {user?.firstName} {user?.lastName}
            </span>
            <button
              onClick={logout}
              style={{
                padding: '8px 16px',
                background: tokens.colors.neutral[800],
                color: tokens.colors.neutral[200],
                border: 'none',
                borderRadius: tokens.radii.md,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: tokens.colors.neutral[50], marginBottom: '8px' }}>
          Upload Data Files
        </h2>
        <p style={{ fontSize: '14px', color: tokens.colors.neutral[400], marginBottom: '24px' }}>
          Upload Excel files to import data into the system. You can upload multiple files at once.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            borderBottom: `1px solid ${tokens.colors.neutral[800]}`,
          }}
        >
          {TAB_DEFINITIONS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                background: activeTab === tab.id ? tokens.colors.primary[600] : 'transparent',
                color: activeTab === tab.id ? tokens.colors.neutral[50] : tokens.colors.neutral[400],
                border: 'none',
                borderBottom:
                  activeTab === tab.id ? `2px solid ${tokens.colors.primary[600]}` : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: '32px' }}>{renderFileDropZone(activeTab)}</div>

        <button
          onClick={handleUpload}
          disabled={uploading || !hasSelectedFiles}
          style={{
            padding: '12px 32px',
            background: hasSelectedFiles ? tokens.colors.primary[600] : tokens.colors.neutral[700],
            color: tokens.colors.neutral[50],
            border: 'none',
            borderRadius: tokens.radii.md,
            fontSize: '16px',
            fontWeight: 600,
            cursor: hasSelectedFiles ? 'pointer' : 'not-allowed',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>

        {results.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: tokens.colors.neutral[50], marginBottom: '16px' }}>
              Upload Results
            </h3>
            {results.map((result, index) => {
              const statusColor =
                result.status === 'SUCCESS'
                  ? tokens.colors.success[500]
                  : result.status === 'PARTIAL'
                    ? tokens.colors.warning[500]
                    : tokens.colors.danger[500];

              return (
                <div
                  key={`${result.source}-${index}`}
                  style={{
                    background: tokens.colors.surface.card,
                    padding: '16px',
                    borderRadius: tokens.radii.md,
                    marginBottom: '12px',
                    border: `2px solid ${statusColor}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: 600, color: tokens.colors.neutral[100] }}>
                      {result.source.replace('_file', '').toUpperCase()}
                    </div>
                    <div
                      style={{
                        padding: '4px 12px',
                        background: statusColor + '20',
                        color: statusColor,
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {result.status}
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', color: tokens.colors.neutral[400], marginBottom: '8px' }}>
                    {result.message}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: tokens.colors.neutral[500] }}>
                    <span>Processed: {result.processed}</span>
                    <span>Created: {result.created}</span>
                    <span>Updated: {result.updated}</span>
                    {result.errors.length > 0 && (
                      <span style={{ color: tokens.colors.danger[500] }}>Errors: {result.errors.length}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
