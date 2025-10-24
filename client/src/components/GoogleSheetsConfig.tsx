import { useState, useEffect } from 'react';
import { tokens } from '../config/tokens';

interface GoogleSheetsConfigData {
  id?: string;
  apiKey?: string;
  serviceAccountJson?: string;
  spreadsheetId?: string;
  ccRange?: string;
  fixedRange?: string;
  upgradeRange?: string;
  referralRange?: string;
  allLeadsRange?: string;
  teamsRange?: string;
  autoSync?: boolean;
  syncIntervalHours?: number;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
}

interface TestResult {
  connected: boolean;
  spreadsheetTitle?: string;
  sheets?: string[];
  error?: string;
}

export default function GoogleSheetsConfig() {
  const [config, setConfig] = useState<GoogleSheetsConfigData>({});
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [authMethod, setAuthMethod] = useState<'apiKey' | 'serviceAccount'>('apiKey');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/google-sheets/config', {
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success && result.data) {
        setConfig(result.data);
        if (result.data.serviceAccountJson && result.data.serviceAccountJson !== '[REDACTED]') {
          setAuthMethod('serviceAccount');
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.spreadsheetId) {
      setMessage({ type: 'error', text: 'Please enter a Spreadsheet ID first' });
      return;
    }

    try {
      setTesting(true);
      setMessage(null);
      setTestResult(null);

      const testData: any = {
        spreadsheetId: config.spreadsheetId,
      };

      if (authMethod === 'apiKey' && config.apiKey) {
        testData.apiKey = config.apiKey;
      } else if (authMethod === 'serviceAccount' && config.serviceAccountJson) {
        testData.serviceAccountJson = config.serviceAccountJson;
      }

      const response = await fetch('/api/google-sheets/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(testData),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult(result.data);
        setMessage({ type: 'success', text: 'Connection successful!' });
      } else {
        setMessage({ type: 'error', text: result.error?.message || 'Connection failed' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const saveData = { ...config };

      // Only include the auth method being used
      if (authMethod === 'apiKey') {
        delete saveData.serviceAccountJson;
      } else {
        delete saveData.apiKey;
      }

      const response = await fetch('/api/google-sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(saveData),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Configuration saved successfully!' });
        loadConfig();
      } else {
        setMessage({ type: 'error', text: result.error?.message || 'Failed to save' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setMessage(null);

      const response = await fetch('/api/google-sheets/sync', {
        method: 'POST',
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Sync triggered successfully' });
        loadConfig();
      } else {
        setMessage({ type: 'error', text: result.error?.message || 'Sync failed' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    background: tokens.colors.surface.dark,
    border: `1px solid ${tokens.colors.neutral[800]}`,
    borderRadius: tokens.radii.md,
    color: tokens.colors.neutral[100],
    fontSize: '14px',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: tokens.colors.neutral[300],
  };

  const buttonStyle = (primary = false, disabled = false) => ({
    padding: '12px 24px',
    background: disabled
      ? tokens.colors.neutral[800]
      : primary
      ? tokens.colors.primary[600]
      : tokens.colors.neutral[700],
    color: tokens.colors.neutral[50],
    border: 'none',
    borderRadius: tokens.radii.md,
    fontSize: '14px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  });

  return (
    <div
      style={{
        background: tokens.colors.surface.card,
        borderRadius: tokens.radii.lg,
        padding: '24px',
        border: `1px solid ${tokens.colors.neutral[800]}`,
      }}
    >
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: tokens.colors.neutral[100], marginBottom: '8px' }}>
        Google Sheets Integration
      </h2>
      <p style={{ fontSize: '14px', color: tokens.colors.neutral[400], marginBottom: '24px' }}>
        Configure automatic data import from Google Sheets
      </p>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: tokens.colors.neutral[400] }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Message Banner */}
          {message && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: tokens.radii.md,
                background:
                  message.type === 'success'
                    ? `${tokens.colors.success[900]}30`
                    : `${tokens.colors.danger[900]}30`,
                border: `1px solid ${
                  message.type === 'success' ? tokens.colors.success[700] : tokens.colors.danger[700]
                }`,
                color: message.type === 'success' ? tokens.colors.success[400] : tokens.colors.danger[400],
                fontSize: '14px',
              }}
            >
              {message.text}
            </div>
          )}

          {/* Authentication Method */}
          <div>
            <label style={labelStyle}>Authentication Method</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setAuthMethod('apiKey')}
                style={{
                  ...buttonStyle(authMethod === 'apiKey'),
                  flex: 1,
                }}
              >
                API Key (Simple)
              </button>
              <button
                onClick={() => setAuthMethod('serviceAccount')}
                style={{
                  ...buttonStyle(authMethod === 'serviceAccount'),
                  flex: 1,
                }}
              >
                Service Account (Advanced)
              </button>
            </div>
          </div>

          {/* API Key */}
          {authMethod === 'apiKey' && (
            <div>
              <label style={labelStyle}>
                Google API Key
                <span style={{ fontWeight: 400, color: tokens.colors.neutral[500] }}> (for read-only access)</span>
              </label>
              <input
                type="text"
                value={config.apiKey || ''}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="AIzaSy..."
                style={inputStyle}
              />
              <p style={{ fontSize: '12px', color: tokens.colors.neutral[500], marginTop: '4px' }}>
                Get your API key from{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: tokens.colors.primary[400] }}
                >
                  Google Cloud Console
                </a>
              </p>
            </div>
          )}

          {/* Service Account JSON */}
          {authMethod === 'serviceAccount' && (
            <div>
              <label style={labelStyle}>Service Account JSON</label>
              <textarea
                value={config.serviceAccountJson === '[REDACTED]' ? '' : config.serviceAccountJson || ''}
                onChange={(e) => setConfig({ ...config, serviceAccountJson: e.target.value })}
                placeholder='{"type": "service_account", "project_id": "...", ...}'
                rows={6}
                style={{
                  ...inputStyle,
                  fontFamily: tokens.typography.fontFamily.mono,
                  fontSize: '12px',
                  resize: 'vertical',
                }}
              />
              <p style={{ fontSize: '12px', color: tokens.colors.neutral[500], marginTop: '4px' }}>
                Paste the entire JSON key file from your service account
              </p>
            </div>
          )}

          {/* Spreadsheet ID */}
          <div>
            <label style={labelStyle}>Google Spreadsheet ID</label>
            <input
              type="text"
              value={config.spreadsheetId || ''}
              onChange={(e) => setConfig({ ...config, spreadsheetId: e.target.value })}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              style={inputStyle}
            />
            <p style={{ fontSize: '12px', color: tokens.colors.neutral[500], marginTop: '4px' }}>
              Find this in your Google Sheets URL: docs.google.com/spreadsheets/d/<strong>[ID]</strong>/edit
            </p>
          </div>

          {/* Test Connection Button */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleTestConnection} disabled={testing || !config.spreadsheetId} style={buttonStyle(false, testing || !config.spreadsheetId)}>
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              style={{
                padding: '16px',
                background: tokens.colors.success[900] + '20',
                border: `1px solid ${tokens.colors.success[700]}`,
                borderRadius: tokens.radii.md,
              }}
            >
              <div style={{ fontWeight: 600, color: tokens.colors.success[400], marginBottom: '8px' }}>
                Connected to: {testResult.spreadsheetTitle}
              </div>
              {testResult.sheets && testResult.sheets.length > 0 && (
                <div style={{ fontSize: '13px', color: tokens.colors.neutral[300] }}>
                  Available sheets: {testResult.sheets.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Sheet Ranges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>CC Data Range</label>
              <input
                type="text"
                value={config.ccRange || ''}
                onChange={(e) => setConfig({ ...config, ccRange: e.target.value })}
                placeholder="CC Data!A1:Z1000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Fixed Data Range</label>
              <input
                type="text"
                value={config.fixedRange || ''}
                onChange={(e) => setConfig({ ...config, fixedRange: e.target.value })}
                placeholder="Fixed!A1:Z1000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Upgrade Data Range</label>
              <input
                type="text"
                value={config.upgradeRange || ''}
                onChange={(e) => setConfig({ ...config, upgradeRange: e.target.value })}
                placeholder="Upgrade!A1:Z1000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Referral Data Range</label>
              <input
                type="text"
                value={config.referralRange || ''}
                onChange={(e) => setConfig({ ...config, referralRange: e.target.value })}
                placeholder="Referral!A1:Z1000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>All Leads Range</label>
              <input
                type="text"
                value={config.allLeadsRange || ''}
                onChange={(e) => setConfig({ ...config, allLeadsRange: e.target.value })}
                placeholder="All Leads!A1:Z1000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Teams Range</label>
              <input
                type="text"
                value={config.teamsRange || ''}
                onChange={(e) => setConfig({ ...config, teamsRange: e.target.value })}
                placeholder="Teams!A1:Z1000"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: `1px solid ${tokens.colors.neutral[800]}` }}>
            <button onClick={handleSave} disabled={saving} style={buttonStyle(true, saving)}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button onClick={handleSync} disabled={syncing || !config.id} style={buttonStyle(false, syncing || !config.id)}>
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {/* Last Sync Info */}
          {config.lastSyncAt && (
            <div style={{ fontSize: '13px', color: tokens.colors.neutral[400], paddingTop: '8px' }}>
              Last sync: {new Date(config.lastSyncAt).toLocaleString()}
              {config.lastSyncStatus && ` (${config.lastSyncStatus})`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
