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
  errors: any[];
  message: string;
}

export default function Upload() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<UploadTab>('cc');
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    cc: null,
    fixed: null,
    upgrade: null,
    leads: null,
    teams: null,
  });
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  // Check if user is Super Admin
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0E27', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#F9FAFB' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Access Denied</h2>
          <p style={{ color: '#9CA3AF' }}>Only Super Admins can upload files.</p>
          <a href="/" style={{ color: '#3B82F6', marginTop: '16px', display: 'inline-block' }}>Go to Dashboard</a>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'cc', name: 'Class Consumption', description: 'Student class consumption data' },
    { id: 'fixed', name: 'Fixed Rate', description: 'Fixed/unfixed student status' },
    { id: 'upgrade', name: 'Upgrade Rate', description: 'Student upgrade metrics' },
    { id: 'leads', name: 'Leads', description: 'Lead recovery tracking (57k+ rows)' },
    { id: 'teams', name: 'Teams', description: 'Referral metrics per team' },
  ];

  const handleFileSelect = (tab: UploadTab, file: File | null) => {
    setFiles(prev => ({ ...prev, [tab]: file }));
  };

  const handleUpload = async () => {
    const formData = new FormData();
    let hasFiles = false;

    Object.entries(files).forEach(([key, file]) => {
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
        // Clear successful uploads
        const newFiles = { ...files };
        data.results.forEach((result: UploadResult) => {
          if (result.status === 'SUCCESS') {
            const tabKey = result.source.replace('_file', '');
            newFiles[tabKey as UploadTab] = null;
          }
        });
        setFiles(newFiles);
      } else {
        alert('Upload failed: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const FileDropZone = ({ tab }: { tab: UploadTab }) => {
    const file = files[tab];
    const tabInfo = tabs.find(t => t.id === tab);

    return (
      <div
        style={{
          border: `2px dashed ${file ? '#3B82F6' : '#374151'}`,
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          background: '#1A1F3A',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onDrop={(e) => {
          e.preventDefault();
          const droppedFile = e.dataTransfer.files[0];
          if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            handleFileSelect(tab, droppedFile);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xlsx,.xls';
          input.onchange = (e: any) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) {
              handleFileSelect(tab, selectedFile);
            }
          };
          input.click();
        }}
      >
        {file ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#F9FAFB', marginBottom: '8px' }}>{file.name}</div>
            <div style={{ fontSize: '14px', color: '#9CA3AF' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFileSelect(tab, null);
              }}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                background: '#EF4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Remove
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#F9FAFB', marginBottom: '8px' }}>
              Drop Excel file here or click to browse
            </div>
            <div style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '4px' }}>
              {tabInfo?.description}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              Accepts .xlsx and .xls files
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0E27' }}>
      {/* Header */}
      <header style={{ background: '#1A1F3A', borderBottom: '1px solid #374151', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#3B82F6' }}>CMetrics</h1>
            <p style={{ fontSize: '14px', color: '#9CA3AF' }}>File Upload</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <a href="/" style={{ color: '#3B82F6', textDecoration: 'none', fontSize: '14px' }}>← Back to Dashboard</a>
            <span style={{ color: '#D1D5DB', fontSize: '14px' }}>{user?.firstName} {user?.lastName}</span>
            <button onClick={logout} style={{ padding: '8px 16px', background: '#374151', color: '#D1D5DB', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#F9FAFB', marginBottom: '8px' }}>Upload Data Files</h2>
        <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '24px' }}>
          Upload Excel files to import data into the system. You can upload multiple files at once.
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #374151' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as UploadTab)}
              style={{
                padding: '12px 24px',
                background: activeTab === tab.id ? '#3B82F6' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#9CA3AF',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3B82F6' : '2px solid transparent',
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

        {/* Active Tab Content */}
        <div style={{ marginBottom: '32px' }}>
          <FileDropZone tab={activeTab} />
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !Object.values(files).some(f => f !== null)}
          style={{
            padding: '12px 32px',
            background: Object.values(files).some(f => f !== null) ? '#3B82F6' : '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: Object.values(files).some(f => f !== null) ? 'pointer' : 'not-allowed',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#F9FAFB', marginBottom: '16px' }}>Upload Results</h3>
            {results.map((result, idx) => (
              <div
                key={idx}
                style={{
                  background: '#1A1F3A',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  border: `2px solid ${result.status === 'SUCCESS' ? '#10B981' : result.status === 'PARTIAL' ? '#F59E0B' : '#EF4444'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#F9FAFB' }}>
                    {result.source.replace('_file', '').toUpperCase()}
                  </div>
                  <div
                    style={{
                      padding: '4px 12px',
                      background: result.status === 'SUCCESS' ? '#10B98120' : result.status === 'PARTIAL' ? '#F59E0B20' : '#EF444420',
                      color: result.status === 'SUCCESS' ? '#10B981' : result.status === 'PARTIAL' ? '#F59E0B' : '#EF4444',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {result.status}
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '8px' }}>{result.message}</div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6B7280' }}>
                  <span>Processed: {result.processed}</span>
                  <span>Created: {result.created}</span>
                  <span>Updated: {result.updated}</span>
                  {result.errors.length > 0 && <span style={{ color: '#EF4444' }}>Errors: {result.errors.length}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
