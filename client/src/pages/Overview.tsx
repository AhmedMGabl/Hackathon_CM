import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mentorApi, configApi, alertApi } from '../lib/api';
import { tokens } from '../config/tokens';
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AICoachPanel from '../components/AICoachPanel';
import AIHelpButton from '../components/AIHelpButton';

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

  // Weekly pacing data (mock for now, will be real data in PASS 2)
  const weeklyData = [
    { week: 'W1', target: 25, actual: 28, multiplier: 4 },
    { week: 'W2', target: 33.3, actual: 31, multiplier: 3 },
    { week: 'W3', target: 50, actual: 48, multiplier: 2 },
    { week: 'W4', target: 100, actual: kpis.avgCC, multiplier: 1 },
  ];

  // Team radar data
  const radarData = [
    { metric: 'CC%', value: kpis.avgCC, target: config?.ccTarget || 80 },
    { metric: 'SC%', value: kpis.avgSC, target: config?.scTarget || 15 },
    { metric: 'UP%', value: kpis.avgUP, target: config?.upTarget || 25 },
    { metric: 'Fixed%', value: kpis.avgFixed, target: config?.fixedTarget || 60 },
  ];

  // Top/Bottom performers
  const sortedByScore = [...mentors].sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0));
  const topPerformers = sortedByScore.slice(0, 5);
  const bottomPerformers = sortedByScore.slice(-5).reverse();

  const comparisonData = [
    ...topPerformers.map((m) => ({ name: m.mentorName || 'Unknown', score: m.weightedScore || 0, type: 'top' })),
    ...bottomPerformers.map((m) => ({ name: m.mentorName || 'Unknown', score: m.weightedScore || 0, type: 'bottom' })),
  ];

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

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <KPICard title="Class Consumption" value={kpis.avgCC} target={config?.ccTarget || 80} />
          <KPICard title="Super-CC" value={kpis.avgSC} target={config?.scTarget || 15} />
          <KPICard title="Upgrade" value={kpis.avgUP} target={config?.upTarget || 25} />
          <KPICard title="Fixed" value={kpis.avgFixed} target={config?.fixedTarget || 60} />
        </div>

        {/* Mentor Status Distribution */}
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

        {/* Charts Row 1: Weekly Pacing + Team Radar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          {/* Weekly Pacing Chart */}
          <div style={{ background: tokens.colors.surface.card, padding: '24px', borderRadius: tokens.radii.lg, boxShadow: tokens.shadows.card }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: tokens.colors.neutral[100], marginBottom: '16px' }}>Weekly Pacing</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.neutral[800]} />
                <XAxis dataKey="week" stroke={tokens.colors.neutral[400]} />
                <YAxis stroke={tokens.colors.neutral[400]} />
                <Tooltip contentStyle={{ background: tokens.colors.surface.dark, border: `1px solid ${tokens.colors.neutral[700]}`, borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="target" stroke={tokens.colors.warning[500]} strokeWidth={2} name="Target" />
                <Line type="monotone" dataKey="actual" stroke={tokens.colors.primary[600]} strokeWidth={2} name="Actual" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Team Radar */}
          <div style={{ background: tokens.colors.surface.card, padding: '24px', borderRadius: tokens.radii.lg, boxShadow: tokens.shadows.card }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: tokens.colors.neutral[100], marginBottom: '16px' }}>Team Metrics Radar</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={tokens.colors.neutral[700]} />
                <PolarAngleAxis dataKey="metric" stroke={tokens.colors.neutral[400]} />
                <PolarRadiusAxis stroke={tokens.colors.neutral[400]} />
                <Radar name="Actual" dataKey="value" stroke={tokens.colors.primary[600]} fill={tokens.colors.primary[600]} fillOpacity={0.5} />
                <Radar name="Target" dataKey="target" stroke={tokens.colors.warning[500]} fill={tokens.colors.warning[500]} fillOpacity={0.3} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agent Comparison Chart */}
        <div style={{ background: tokens.colors.surface.card, padding: '24px', borderRadius: tokens.radii.lg, boxShadow: tokens.shadows.card, marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: tokens.colors.neutral[100], marginBottom: '16px' }}>Top & Bottom Performers (Weighted Score)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.neutral[800]} />
              <XAxis dataKey="name" stroke={tokens.colors.neutral[400]} angle={-45} textAnchor="end" height={100} />
              <YAxis stroke={tokens.colors.neutral[400]} />
              <Tooltip contentStyle={{ background: tokens.colors.surface.dark, border: `1px solid ${tokens.colors.neutral[700]}`, borderRadius: '8px' }} />
              <Bar dataKey="score" fill={tokens.colors.primary[600]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Coach Panel */}
        <div style={{ marginBottom: '32px' }}>
          <AICoachPanel
            metrics={{
              ccPct: kpis.avgCC,
              scPct: kpis.avgSC,
              upPct: kpis.avgUP,
              fixedPct: kpis.avgFixed,
            }}
            targets={{
              ccTarget: config?.ccTarget || 80,
              scTarget: config?.scTarget || 15,
              upTarget: config?.upTarget || 25,
              fixedTarget: config?.fixedTarget || 60,
            }}
          />
        </div>

        {/* Navigation Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <a href="/mentors" style={{ background: tokens.colors.surface.card, padding: '16px', borderRadius: tokens.radii.lg, textDecoration: 'none', color: tokens.colors.neutral[100], border: `1px solid ${tokens.colors.neutral[800]}`, transition: 'all 0.2s' }}>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>View Mentors</div>
            <div style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>Detailed performance table</div>
          </a>
          <a href="/alerts" style={{ background: tokens.colors.surface.card, padding: '16px', borderRadius: tokens.radii.lg, textDecoration: 'none', color: tokens.colors.neutral[100], border: `1px solid ${tokens.colors.neutral[800]}`, transition: 'all 0.2s' }}>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Meeting Prep</div>
            <div style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>Schedule performance meetings</div>
          </a>
          <a href="/targets" style={{ background: tokens.colors.surface.card, padding: '16px', borderRadius: tokens.radii.lg, textDecoration: 'none', color: tokens.colors.neutral[100], border: `1px solid ${tokens.colors.neutral[800]}`, transition: 'all 0.2s' }}>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Targets</div>
            <div style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>Configure targets & weights</div>
          </a>
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
            <a href="/admin/ingestion" style={{ background: tokens.colors.primary[900] + '20', padding: '16px', borderRadius: tokens.radii.lg, textDecoration: 'none', color: tokens.colors.neutral[100], border: `2px solid ${tokens.colors.primary[600]}`, transition: 'all 0.2s' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px', color: tokens.colors.primary[600] }}>Upload Data</div>
              <div style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>Import Excel files</div>
            </a>
          )}
        </div>
      </main>

      {/* AI Help Button (floating) */}
      <AIHelpButton />
    </div>
  );
}
