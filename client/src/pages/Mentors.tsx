import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mentorApi } from '../lib/api';
import { tokens } from '../config/tokens';

interface Mentor {
  id: string;
  mentorId: string;
  mentorName: string;
  teamName: string;
  avgCcPct: number;
  avgScPct: number;
  avgUpPct: number;
  avgFixedPct: number;
  weightedScore: number;
  targetsHit: number;
  status: 'ABOVE' | 'WARNING' | 'BELOW';
}

export default function Mentors() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async () => {
    try {
      setLoading(true);
      const response = await mentorApi.list({ limit: 100 });
      // Add rank to each mentor
      const sortedMentors = (response.data || [])
        .sort((a: any, b: any) => (b.weightedScore || 0) - (a.weightedScore || 0))
        .map((m: any, idx: number) => ({ ...m, rank: idx + 1 }));
      setMentors(sortedMentors);
    } catch (error) {
      console.error('Failed to load mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMentors = mentors.filter((m) => {
    const matchesSearch = `${m.mentorName} ${m.mentorId} ${m.teamName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ABOVE': return tokens.colors.success[600];
      case 'WARNING': return tokens.colors.warning[500];
      case 'BELOW': return tokens.colors.danger[600];
      default: return tokens.colors.neutral[600];
    }
  };

  const getMetricStatus = (actual: number, target: number): { status: string; color: string } => {
    if (actual >= target) return { status: 'Above Target', color: tokens.colors.success[600] };
    if (actual >= target * 0.9) return { status: 'Warning', color: tokens.colors.warning[500] };
    return { status: 'Below Target', color: tokens.colors.danger[600] };
  };

  const MetricCard = ({ title, actual, target, hasData = true }: { title: string; actual: number; target: number; hasData?: boolean }) => {
    if (!hasData) {
      return (
        <div style={{ background: tokens.colors.surface.dark, padding: '16px', borderRadius: tokens.radii.md, border: `1px solid ${tokens.colors.neutral[800]}` }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: tokens.colors.neutral[300], marginBottom: '8px' }}>{title}</div>
          <div style={{ fontSize: '16px', color: tokens.colors.neutral[500] }}>No Data</div>
          <div style={{ fontSize: '11px', color: tokens.colors.neutral[600], marginTop: '4px' }}>N/A / {target}%</div>
        </div>
      );
    }

    const { status, color } = getMetricStatus(actual, target);
    const gap = target - actual;

    return (
      <div style={{ background: tokens.colors.surface.dark, padding: '14px', borderRadius: tokens.radii.md, border: `2px solid ${color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: tokens.colors.neutral[100] }}>{title}</div>
          <div style={{ padding: '3px 6px', background: color + '20', color, borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
            {status}
          </div>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.neutral[100], marginBottom: '4px' }}>
          {actual.toFixed(1)}% <span style={{ fontSize: '14px', color: tokens.colors.neutral[500] }}>/ {target}%</span>
        </div>
        <div style={{ fontSize: '11px', color: tokens.colors.neutral[400] }}>
          Current: {actual.toFixed(1)}% • Target: {target}%
        </div>
        {gap > 0 && (
          <div style={{ fontSize: '11px', color: tokens.colors.danger[400], marginTop: '4px' }}>
            Gap: {gap.toFixed(1)}%
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark, padding: '24px' }}>
        <div style={{ color: tokens.colors.neutral[400] }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark }}>
      {/* Header */}
      <header style={{ background: tokens.colors.surface.card, borderBottom: `1px solid ${tokens.colors.neutral[800]}`, padding: '16px 24px' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.primary[600] }}>CMetrics</h1>
            <p style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>Mentor Performance</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <a href="/" style={{ color: tokens.colors.primary[600], textDecoration: 'none', fontSize: '14px' }}>← Back to Overview</a>
            <span style={{ color: tokens.colors.neutral[300], fontSize: '14px' }}>{user?.firstName} {user?.lastName} ({user?.role})</span>
            <button onClick={logout} style={{ padding: '8px 16px', background: tokens.colors.neutral[800], color: tokens.colors.neutral[200], border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Search mentors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '12px 16px', background: tokens.colors.surface.card, border: `1px solid ${tokens.colors.neutral[800]}`, borderRadius: tokens.radii.md, color: tokens.colors.neutral[100], fontSize: '14px' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '12px 16px', background: tokens.colors.surface.card, border: `1px solid ${tokens.colors.neutral[800]}`, borderRadius: tokens.radii.md, color: tokens.colors.neutral[100], fontSize: '14px', minWidth: '150px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ABOVE">Above Target</option>
            <option value="WARNING">Warning</option>
            <option value="BELOW">Below Target</option>
          </select>
        </div>

        {/* Mentor Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(550px, 1fr))', gap: '24px' }}>
          {filteredMentors.map((mentor: any) => {
            // Mock data for demo - replace with real data from API
            const leadStats = {
              totalLeads: Math.floor(Math.random() * 500) + 100,
              recovered: 0,
              unrecovered: 0,
              conversionRate: 29.5,
              referralLeads: Math.floor(Math.random() * 50),
              referralShowups: 0,
              referralPaid: 0,
            };
            leadStats.recovered = Math.floor(leadStats.totalLeads * 0.295);
            leadStats.unrecovered = leadStats.totalLeads - leadStats.recovered;
            const totalStudents = Math.floor(Math.random() * 150) + 50;

            return (
              <div
                key={mentor.id}
                style={{
                  background: tokens.colors.surface.card,
                  borderRadius: tokens.radii.lg,
                  padding: '20px',
                  boxShadow: tokens.shadows.card,
                  border: `2px solid ${getStatusColor(mentor.status)}`,
                }}
              >
                {/* Agent Header */}
                <div style={{ borderBottom: `1px solid ${tokens.colors.neutral[800]}`, paddingBottom: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: tokens.colors.neutral[100], marginBottom: '4px' }}>
                        {mentor.mentorName}
                      </h3>
                      <div style={{ fontSize: '12px', color: tokens.colors.neutral[400] }}>
                        {mentor.mentorId} | {mentor.teamName} | {totalStudents} Students
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: tokens.colors.neutral[500], marginBottom: '4px' }}>Rank #{mentor.rank}</div>
                      <div style={{ padding: '5px 10px', background: getStatusColor(mentor.status) + '20', color: getStatusColor(mentor.status), borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                        {mentor.status}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: tokens.colors.neutral[500] }}>
                    {mentor.targetsHit}/4 Targets Achieved
                  </div>
                </div>

                {/* Performance Overview */}
                <div style={{ background: tokens.colors.primary[900] + '15', padding: '14px', borderRadius: tokens.radii.md, marginBottom: '12px', border: `1px solid ${tokens.colors.primary[800]}` }}>
                  <div style={{ fontSize: '11px', color: tokens.colors.neutral[400], marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Performance Overview</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                    <div>
                      <div style={{ fontSize: '32px', fontWeight: 700, color: tokens.colors.primary[600] }}>
                        {mentor.weightedScore.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '12px', color: tokens.colors.neutral[400] }}>Overall Score</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.neutral[100] }}>{mentor.targetsHit}</div>
                      <div style={{ fontSize: '11px', color: tokens.colors.neutral[500] }}>Targets Hit</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.neutral[100] }}>{totalStudents}</div>
                      <div style={{ fontSize: '11px', color: tokens.colors.neutral[500] }}>Students</div>
                    </div>
                  </div>
                </div>

                {/* Target Achievement Breakdown */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: tokens.colors.neutral[200], marginBottom: '10px' }}>
                    Target Achievement Breakdown
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <MetricCard title="Fixed Rate" actual={mentor.avgFixedPct} target={60} hasData={mentor.avgFixedPct > 0} />
                    <MetricCard title="Class Consumption" actual={mentor.avgCcPct} target={80} hasData={mentor.avgCcPct > 0} />
                    <MetricCard title="Super Class" actual={mentor.avgScPct} target={15} hasData={mentor.avgScPct > 0} />
                    <MetricCard title="Upgrade Rate" actual={mentor.avgUpPct} target={25} hasData={mentor.avgUpPct > 0} />
                  </div>
                </div>

                {/* Lead Conversion */}
                <div style={{ background: tokens.colors.surface.dark, padding: '14px', borderRadius: tokens.radii.md, marginBottom: '12px', border: `1px solid ${tokens.colors.neutral[800]}` }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: tokens.colors.neutral[200], marginBottom: '10px' }}>
                    Lead Conversion
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: tokens.colors.neutral[500], marginBottom: '4px' }}>Conversion Rate</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: tokens.colors.success[600] }}>{leadStats.conversionRate}%</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: tokens.colors.neutral[500], marginBottom: '4px' }}>Total Leads</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: tokens.colors.neutral[100] }}>{leadStats.totalLeads}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: tokens.colors.success[900] + '20', padding: '10px', borderRadius: '6px', border: `1px solid ${tokens.colors.success[800]}` }}>
                      <div style={{ fontSize: '10px', color: tokens.colors.neutral[400], marginBottom: '2px' }}>Recovered</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: tokens.colors.success[500] }}>{leadStats.recovered}</div>
                      <div style={{ fontSize: '9px', color: tokens.colors.neutral[500] }}>Rate: {leadStats.conversionRate}%</div>
                    </div>
                    <div style={{ background: tokens.colors.danger[900] + '20', padding: '10px', borderRadius: '6px', border: `1px solid ${tokens.colors.danger[800]}` }}>
                      <div style={{ fontSize: '10px', color: tokens.colors.neutral[400], marginBottom: '2px' }}>Unrecovered</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: tokens.colors.danger[500] }}>{leadStats.unrecovered}</div>
                      <div style={{ fontSize: '9px', color: tokens.colors.neutral[500] }}>Rate: {(100 - leadStats.conversionRate).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>

                {/* Referral Performance */}
                <div style={{ background: tokens.colors.surface.dark, padding: '14px', borderRadius: tokens.radii.md, border: `1px solid ${tokens.colors.neutral[800]}` }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: tokens.colors.neutral[200], marginBottom: '10px' }}>
                    Referral Performance
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: tokens.colors.neutral[500], marginBottom: '4px' }}>Leads Generated</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: tokens.colors.neutral[100] }}>{leadStats.referralLeads}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: tokens.colors.neutral[500], marginBottom: '4px' }}>Showups</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: tokens.colors.neutral[100] }}>{leadStats.referralShowups}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: tokens.colors.neutral[500], marginBottom: '4px' }}>Paid Conversions</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: tokens.colors.success[600] }}>{leadStats.referralPaid}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredMentors.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: tokens.colors.neutral[500] }}>
            No mentors found matching your filters.
          </div>
        )}
      </main>
    </div>
  );
}
