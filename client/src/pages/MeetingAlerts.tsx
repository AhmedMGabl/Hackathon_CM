import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { alertApi } from '../lib/api';
import { tokens } from '../config/tokens';

interface Alert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  mentorId: string;
  mentorName: string;
  teamName: string;
  rule: string;
  message: string;
  period: string;
  dismissed: boolean;
  assignedTo: string | null;
  createdAt: string;
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return '🔴';
    case 'WARNING':
      return '⚠️';
    case 'INFO':
      return 'ℹ️';
    default:
      return '•';
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return { bg: tokens.colors.danger[900] + '20', text: tokens.colors.danger[400] };
    case 'WARNING':
      return { bg: tokens.colors.warning[900] + '20', text: tokens.colors.warning[400] };
    case 'INFO':
      return { bg: tokens.colors.primary[900] + '20', text: tokens.colors.primary[400] };
    default:
      return { bg: tokens.colors.neutral[800], text: tokens.colors.neutral[400] };
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors = getSeverityColor(severity);
  return (
    <span
      style={{
        padding: '6px 12px',
        background: colors.bg,
        color: colors.text,
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <span>{getSeverityIcon(severity)}</span>
      {severity}
    </span>
  );
}

export default function MeetingAlerts() {
  const { user, logout, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    severity: '' as '' | 'INFO' | 'WARNING' | 'CRITICAL',
    dismissed: false,
  });
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAlerts();
  }, [pagination.page, filters]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await alertApi.list({
        page: pagination.page,
        limit: pagination.limit,
        severity: filters.severity || undefined,
        dismissed: filters.dismissed,
      });

      setAlerts(response.data || []);
      setPagination((prev) => ({ ...prev, total: response.pagination?.total || 0 }));
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (alertIds: string[]) => {
    if (alertIds.length === 0) return;

    try {
      setProcessing(true);
      setError('');
      await alertApi.dismiss(alertIds);
      setSuccess(`Dismissed ${alertIds.length} alert(s)`);
      setSelectedAlerts(new Set());
      setTimeout(() => setSuccess(''), 3000);
      await loadAlerts();
    } catch (err: any) {
      console.error('Failed to dismiss alerts:', err);
      setError(err.message || 'Failed to dismiss alerts');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleSelect = (alertId: string) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedAlerts.size === alerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(alerts.map((a) => a.id)));
    }
  };

  const exportCSV = () => {
    const headers = ['Severity', 'Mentor', 'Team', 'Rule', 'Message', 'Period', 'Created', 'Dismissed'];
    const rows = alerts.map((a) => [
      a.severity,
      a.mentorName,
      a.teamName,
      a.rule,
      a.message,
      a.period,
      new Date(a.createdAt).toISOString(),
      a.dismissed ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark }}>
      {/* Header */}
      <header
        style={{
          background: tokens.colors.surface.card,
          borderBottom: `1px solid ${tokens.colors.neutral[800]}`,
          padding: '16px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1600px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.primary[600] }}>CMetrics</h1>
            <p style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>Meeting Alerts</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <a href="/overview" style={{ color: tokens.colors.neutral[300], fontSize: '14px', textDecoration: 'none' }}>
              ← Back to Overview
            </a>
            <span style={{ color: tokens.colors.neutral[300], fontSize: '14px' }}>
              {user?.firstName} {user?.lastName} ({user?.role})
            </span>
            <button
              onClick={logout}
              style={{
                padding: '8px 16px',
                background: tokens.colors.neutral[800],
                color: tokens.colors.neutral[200],
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px' }}>
        {/* Error/Success Messages */}
        {error && (
          <div
            style={{
              background: tokens.colors.danger[900] + '20',
              border: `1px solid ${tokens.colors.danger[700]}`,
              color: tokens.colors.danger[400],
              padding: '16px',
              borderRadius: tokens.radii.lg,
              marginBottom: '24px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              background: tokens.colors.success[900] + '20',
              border: `1px solid ${tokens.colors.success[700]}`,
              color: tokens.colors.success[400],
              padding: '16px',
              borderRadius: tokens.radii.lg,
              marginBottom: '24px',
              fontSize: '14px',
            }}
          >
            {success}
          </div>
        )}

        {/* Filters & Actions */}
        <div
          style={{
            background: tokens.colors.surface.card,
            padding: '24px',
            borderRadius: tokens.radii.lg,
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
            <select
              value={filters.severity}
              onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value as any }))}
              style={{
                padding: '10px 16px',
                background: tokens.colors.surface.dark,
                border: `1px solid ${tokens.colors.neutral[700]}`,
                borderRadius: '8px',
                color: tokens.colors.neutral[100],
                fontSize: '14px',
              }}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: tokens.colors.neutral[300],
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={filters.dismissed}
                onChange={(e) => setFilters((f) => ({ ...f, dismissed: e.target.checked }))}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Show dismissed
            </label>

            <div style={{ flex: 1 }} />

            <button
              onClick={exportCSV}
              disabled={alerts.length === 0}
              style={{
                padding: '10px 20px',
                background: tokens.colors.neutral[800],
                color: tokens.colors.neutral[200],
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: alerts.length > 0 ? 'pointer' : 'not-allowed',
                opacity: alerts.length > 0 ? 1 : 0.5,
              }}
            >
              Export CSV
            </button>
          </div>

          {/* Bulk Actions */}
          {selectedAlerts.size > 0 && (
            <div
              style={{
                padding: '12px',
                background: tokens.colors.primary[900] + '20',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <span style={{ color: tokens.colors.neutral[100], fontSize: '14px', fontWeight: 600 }}>
                {selectedAlerts.size} alert(s) selected
              </span>
              <button
                onClick={() => handleDismiss(Array.from(selectedAlerts))}
                disabled={processing}
                style={{
                  padding: '8px 16px',
                  background: tokens.colors.danger[600],
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.5 : 1,
                }}
              >
                {processing ? 'Dismissing...' : 'Dismiss Selected'}
              </button>
              <button
                onClick={() => setSelectedAlerts(new Set())}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: tokens.colors.neutral[300],
                  border: `1px solid ${tokens.colors.neutral[600]}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div style={{ background: tokens.colors.surface.card, borderRadius: tokens.radii.lg, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: tokens.colors.neutral[400] }}>Loading...</div>
          ) : alerts.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: tokens.colors.neutral[400] }}>
              No alerts found
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tokens.colors.neutral[800]}` }}>
                      <th style={{ padding: '16px', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedAlerts.size === alerts.length && alerts.length > 0}
                          onChange={handleSelectAll}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </th>
                      <th
                        style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: tokens.colors.neutral[400],
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Severity
                      </th>
                      <th
                        style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: tokens.colors.neutral[400],
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Mentor
                      </th>
                      <th
                        style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: tokens.colors.neutral[400],
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Team
                      </th>
                      <th
                        style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: tokens.colors.neutral[400],
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Rule
                      </th>
                      <th
                        style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: tokens.colors.neutral[400],
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Message
                      </th>
                      <th
                        style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: tokens.colors.neutral[400],
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Period
                      </th>
                      <th
                        style={{
                          padding: '16px',
                          textAlign: 'right',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: tokens.colors.neutral[400],
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr
                        key={alert.id}
                        style={{
                          borderBottom: `1px solid ${tokens.colors.neutral[800]}`,
                          opacity: alert.dismissed ? 0.5 : 1,
                        }}
                      >
                        <td style={{ padding: '16px' }}>
                          <input
                            type="checkbox"
                            checked={selectedAlerts.has(alert.id)}
                            onChange={() => handleToggleSelect(alert.id)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '16px' }}>
                          <SeverityBadge severity={alert.severity} />
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: tokens.colors.neutral[100] }}>
                            {alert.mentorName}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontSize: '14px', color: tokens.colors.neutral[300] }}>{alert.teamName}</div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontSize: '14px', color: tokens.colors.neutral[300] }}>{alert.rule}</div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontSize: '14px', color: tokens.colors.neutral[200], maxWidth: '300px' }}>
                            {alert.message}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>{alert.period}</div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          {!alert.dismissed && (
                            <button
                              onClick={() => handleDismiss([alert.id])}
                              disabled={processing}
                              style={{
                                padding: '6px 12px',
                                background: tokens.colors.neutral[800],
                                color: tokens.colors.neutral[200],
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: processing ? 'not-allowed' : 'pointer',
                                opacity: processing ? 0.5 : 1,
                              }}
                            >
                              Dismiss
                            </button>
                          )}
                          {alert.dismissed && (
                            <span
                              style={{
                                fontSize: '12px',
                                color: tokens.colors.neutral[500],
                                fontStyle: 'italic',
                              }}
                            >
                              Dismissed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: `1px solid ${tokens.colors.neutral[800]}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>
                  Showing {alerts.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} alerts
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    disabled={pagination.page === 1}
                    style={{
                      padding: '8px 16px',
                      background: tokens.colors.neutral[800],
                      color: tokens.colors.neutral[200],
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                      opacity: pagination.page === 1 ? 0.5 : 1,
                    }}
                  >
                    Previous
                  </button>
                  <div style={{ padding: '8px 16px', color: tokens.colors.neutral[300], fontSize: '14px' }}>
                    Page {pagination.page} of {totalPages || 1}
                  </div>
                  <button
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    disabled={pagination.page >= totalPages}
                    style={{
                      padding: '8px 16px',
                      background: tokens.colors.neutral[800],
                      color: tokens.colors.neutral[200],
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: pagination.page >= totalPages ? 'not-allowed' : 'pointer',
                      opacity: pagination.page >= totalPages ? 0.5 : 1,
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
