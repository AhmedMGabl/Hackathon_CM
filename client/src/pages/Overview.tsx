import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mentorApi, configApi, alertApi } from '../lib/api';
import { tokens } from '../config/tokens';

export default function Overview() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mentors, setMentors] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [alertStats, setAlertStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mentorsRes, configRes, alertsRes] = await Promise.all([
        mentorApi.list({ limit: 100 }),
        configApi.get(),
        alertApi.stats(),
      ]);

      setMentors(mentorsRes.data || []);
      setConfig(configRes.data);
      setAlertStats(alertsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpis = {
    avgCC: mentors.length ? mentors.reduce((sum, m) => sum + (m.avgCcPct || 0), 0) / mentors.length : 0,
    avgSC: mentors.length ? mentors.reduce((sum, m) => sum + (m.avgScPct || 0), 0) / mentors.length : 0,
    avgUP: mentors.length ? mentors.reduce((sum, m) => sum + (m.avgUpPct || 0), 0) / mentors.length : 0,
    avgFixed: mentors.length ? mentors.reduce((sum, m) => sum + (m.avgFixedPct || 0), 0) / mentors.length : 0,
    aboveCount: mentors.filter((m) => m.status === 'ABOVE').length,
    warningCount: mentors.filter((m) => m.status === 'WARNING').length,
    belowCount: mentors.filter((m) => m.status === 'BELOW').length,
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark, padding: '24px', color: tokens.colors.neutral[400] }}>Loading...</div>;
  }

  const KPICard = ({ title, value, target }: { title: string; value: number; target: number }) => (
    <div style={{ background: tokens.colors.surface.card, padding: '24px', borderRadius: tokens.radii.lg, boxShadow: tokens.shadows.card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>{title}</span>
        <span style={{ padding: '4px 8px', background: value >= target ? tokens.colors.success[900] + '20' : tokens.colors.warning[900] + '20', color: value >= target ? tokens.colors.success[400] : tokens.colors.warning[400], borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
          Target: {target}%
        </span>
      </div>
      <div style={{ fontSize: '30px', fontWeight: 700, color: tokens.colors.neutral[100] }}>{value.toFixed(1)}%</div>
      <div style={{ fontSize: '14px', color: value >= target ? tokens.colors.success[400] : tokens.colors.danger[400] }}>
        {value >= target ? '↑ Above target' : '↓ Below target'}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark }}>
      <header style={{ background: tokens.colors.surface.card, borderBottom: `1px solid ${tokens.colors.neutral[800]}`, padding: '16px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.primary[600] }}>CMetrics</h1>
            <p style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>Operational clarity for Course Mentors</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ color: tokens.colors.neutral[300], fontSize: '14px' }}>{user?.firstName} {user?.lastName} ({user?.role})</span>
            <button onClick={logout} style={{ padding: '8px 16px', background: tokens.colors.neutral[800], color: tokens.colors.neutral[200], border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ fontSize: '30px', fontWeight: 700, color: tokens.colors.neutral[100], marginBottom: '24px' }}>Team Performance Overview</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <KPICard title="Class Consumption" value={kpis.avgCC} target={config?.ccTarget || 80} />
          <KPICard title="Super-CC" value={kpis.avgSC} target={config?.scTarget || 15} />
          <KPICard title="Upgrade" value={kpis.avgUP} target={config?.upTarget || 25} />
          <KPICard title="Fixed" value={kpis.avgFixed} target={config?.fixedTarget || 60} />
        </div>

        <div style={{ background: tokens.colors.surface.card, padding: '24px', borderRadius: tokens.radii.lg, boxShadow: tokens.shadows.card, marginBottom: '32px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: tokens.colors.neutral[100], marginBottom: '16px' }}>Mentor Status Distribution</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <div style={{ flex: kpis.aboveCount, background: tokens.colors.success[600], height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 600 }}>
              {kpis.aboveCount > 0 && `${kpis.aboveCount} Above`}
            </div>
            <div style={{ flex: kpis.warningCount, background: tokens.colors.warning[500], height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 600 }}>
              {kpis.warningCount > 0 && `${kpis.warningCount} Warning`}
            </div>
            <div style={{ flex: kpis.belowCount, background: tokens.colors.danger[600], height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 600 }}>
              {kpis.belowCount > 0 && `${kpis.belowCount} Below`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: tokens.colors.neutral[400] }}>
            <span>Total Mentors: {mentors.length}</span>
            {alertStats && <span>Active Alerts: {alertStats.active}</span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <a href="/mentors" style={{ background: tokens.colors.surface.card, padding: '16px', borderRadius: tokens.radii.lg, textDecoration: 'none', color: tokens.colors.neutral[100] }}>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>View Mentors</div>
            <div style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>Detailed performance table</div>
          </a>
          <a href="/alerts" style={{ background: tokens.colors.surface.card, padding: '16px', borderRadius: tokens.radii.lg, textDecoration: 'none', color: tokens.colors.neutral[100] }}>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Alerts</div>
            <div style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>{alertStats?.active || 0} active alerts</div>
          </a>
          <a href="/targets" style={{ background: tokens.colors.surface.card, padding: '16px', borderRadius: tokens.radii.lg, textDecoration: 'none', color: tokens.colors.neutral[100] }}>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Targets</div>
            <div style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>Configure targets & weights</div>
          </a>
        </div>
      </main>
    </div>
  );
}
