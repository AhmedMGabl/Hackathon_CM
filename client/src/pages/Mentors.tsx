import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mentorApi } from '../lib/api';
import { tokens, getStatusColor } from '../config/tokens';

type MentorListItem = {
  id: string;
  mentorId: string;
  mentorName: string;
  teamId: string;
  teamName: string;
  avgCcPct: number;
  avgScPct: number;
  avgUpPct: number;
  avgFixedPct: number;
  weightedScore: number;
  status: 'ABOVE' | 'WARNING' | 'BELOW';
  targetsHit: number;
  totalStudents: number;
  totalLeads: number;
  recoveredLeads: number;
  unrecoveredLeads: number;
  conversionRatePct: number;
  referralLeads: number;
  referralShowups: number;
  referralPaid: number;
};

type TeamGroup = {
  teamName: string;
  mentors: MentorListItem[];
  summary: {
    mentorCount: number;
    avgWeightedScore: number;
    aboveCount: number;
    warningCount: number;
    belowCount: number;
  };
};

const statusFilters: Array<{ label: string; value: 'ALL' | 'ABOVE' | 'WARNING' | 'BELOW' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Above', value: 'ABOVE' },
  { label: 'Warning', value: 'WARNING' },
  { label: 'Below', value: 'BELOW' },
];

function MetricPill({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: tokens.colors.surface.dark,
        borderRadius: tokens.radii.md,
        padding: tokens.spacing[3],
        border: `1px solid ${tokens.colors.neutral[900]}`,
        minWidth: '120px',
      }}
    >
      <span style={{ fontSize: '12px', color: tokens.colors.neutral[500], marginBottom: '4px' }}>{label}</span>
      <span style={{ fontSize: '18px', fontWeight: 600, color: tokens.colors.neutral[100] }}>
        {value.toFixed(1)}
        {unit}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: 'ABOVE' | 'WARNING' | 'BELOW' }) {
  const color = getStatusColor(status);
  const label = status === 'ABOVE' ? 'Above Target' : status === 'WARNING' ? 'Near Target' : 'Below Target';

  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: tokens.radii.full,
        fontSize: '12px',
        fontWeight: 600,
        color,
        background: color + '20',
      }}
    >
      {label}
    </span>
  );
}

export default function Mentors() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mentors, setMentors] = useState<MentorListItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ABOVE' | 'WARNING' | 'BELOW'>('ALL');

  useEffect(() => {
    async function loadMentors() {
      try {
        setLoading(true);
        console.log('[Mentors] Fetching mentors...');
        const response = await mentorApi.list({ limit: 200 });
        console.log('[Mentors] API response:', response);
        console.log('[Mentors] Data length:', response.data?.length);
        setMentors(response.data ?? []);
      } catch (error) {
        console.error('[Mentors] Failed to load mentors:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMentors();
  }, []);

  const filteredMentors = useMemo(() => {
    return mentors.filter((mentor) => {
      const matchesSearch =
        mentor.mentorName.toLowerCase().includes(search.toLowerCase()) ||
        mentor.mentorId.toLowerCase().includes(search.toLowerCase()) ||
        mentor.teamName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || mentor.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [mentors, search, statusFilter]);

  const groupedMentors = useMemo<TeamGroup[]>(() => {
    const groups = new Map<string, MentorListItem[]>();
    filteredMentors.forEach((mentor) => {
      if (!groups.has(mentor.teamName)) {
        groups.set(mentor.teamName, []);
      }
      groups.get(mentor.teamName)!.push(mentor);
    });

    return Array.from(groups.entries())
      .map(([teamName, teamMentors]) => {
        const mentorCount = teamMentors.length;
        const avgWeightedScore =
          teamMentors.reduce((sum, m) => sum + (m.weightedScore || 0), 0) / Math.max(mentorCount, 1);
        const aboveCount = teamMentors.filter((m) => m.status === 'ABOVE').length;
        const warningCount = teamMentors.filter((m) => m.status === 'WARNING').length;
        const belowCount = teamMentors.filter((m) => m.status === 'BELOW').length;
        return {
          teamName,
          mentors: teamMentors,
          summary: {
            mentorCount,
            avgWeightedScore,
            aboveCount,
            warningCount,
            belowCount,
          },
        };
      })
      .sort((a, b) => a.teamName.localeCompare(b.teamName));
  }, [filteredMentors]);

  const grandTotals = useMemo(() => {
    const mentorCount = filteredMentors.length;
    const avgWeightedScore =
      filteredMentors.reduce((sum, m) => sum + (m.weightedScore || 0), 0) / Math.max(mentorCount, 1);
    const aboveCount = filteredMentors.filter((m) => m.status === 'ABOVE').length;
    const warningCount = filteredMentors.filter((m) => m.status === 'WARNING').length;
    const belowCount = filteredMentors.filter((m) => m.status === 'BELOW').length;
    return { mentorCount, avgWeightedScore, aboveCount, warningCount, belowCount };
  }, [filteredMentors]);

  const exportCsv = () => {
    if (groupedMentors.length === 0) {
      return;
    }

    const header = [
      'Team',
      'Mentor ID',
      'Mentor Name',
      'Weighted Score',
      'Class Consumption %',
      'Super Class %',
      'Upgrade Rate %',
      'Fixed Rate %',
      'Status',
      'Targets Hit',
      'Total Students',
      'Total Leads',
      'Recovered Leads',
      'Unrecovered Leads',
      'Conversion Rate %',
      'Referral Leads',
      'Referral Showups',
      'Referral Paid',
    ];

    const rows: string[][] = [header];

    groupedMentors.forEach((group) => {
      group.mentors.forEach((mentor) => {
        rows.push([
          group.teamName,
          mentor.mentorId,
          mentor.mentorName,
          mentor.weightedScore.toFixed(1),
          mentor.avgCcPct.toFixed(1),
          mentor.avgScPct.toFixed(1),
          mentor.avgUpPct.toFixed(1),
          mentor.avgFixedPct.toFixed(1),
          mentor.status,
          mentor.targetsHit.toString(),
          mentor.totalStudents.toString(),
          mentor.totalLeads.toString(),
          mentor.recoveredLeads.toString(),
          mentor.unrecoveredLeads.toString(),
          mentor.conversionRatePct.toFixed(1),
          mentor.referralLeads.toString(),
          mentor.referralShowups.toString(),
          mentor.referralPaid.toString(),
        ]);
      });
    });

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'mentor-performance.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark }}>
      <header
        style={{
          background: tokens.colors.surface.card,
          borderBottom: `1px solid ${tokens.colors.neutral[900]}`,
          padding: '16px 32px',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.neutral[50] }}>Mentor Performance</h1>
            <p style={{ fontSize: '13px', color: tokens.colors.neutral[400] }}>
              Track mentor progress, health, and opportunities across teams.
            </p>
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing[3], alignItems: 'center' }}>
            <span style={{ color: tokens.colors.neutral[300], fontSize: '13px' }}>
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
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <section
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {statusFilters.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: tokens.radii.full,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12px',
                  background:
                    statusFilter === option.value ? tokens.colors.primary[600] : tokens.colors.neutral[900],
                  color: statusFilter === option.value ? tokens.colors.neutral[50] : tokens.colors.neutral[400],
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by mentor, ID, or team…"
              style={{
                padding: '10px 16px',
                borderRadius: tokens.radii.md,
                border: `1px solid ${tokens.colors.neutral[800]}`,
                background: tokens.colors.surface.card,
                color: tokens.colors.neutral[100],
                minWidth: '240px',
              }}
            />
            <button
              onClick={exportCsv}
              disabled={filteredMentors.length === 0}
              style={{
                padding: '10px 16px',
                borderRadius: tokens.radii.md,
                border: 'none',
                background: filteredMentors.length === 0 ? tokens.colors.neutral[800] : tokens.colors.primary[600],
                color: tokens.colors.neutral[50],
                fontWeight: 600,
                cursor: filteredMentors.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Export CSV
            </button>
          </div>
        </section>

        <section
          style={{
            display: 'flex',
            gap: tokens.spacing[3],
            flexWrap: 'wrap',
            background: tokens.colors.surface.card,
            borderRadius: tokens.radii.lg,
            padding: tokens.spacing[4],
            border: `1px solid ${tokens.colors.neutral[900]}`,
          }}
        >
          <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
            <div style={{ fontSize: '13px', color: tokens.colors.neutral[400] }}>Mentors</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: tokens.colors.neutral[50] }}>{grandTotals.mentorCount}</div>
          </div>
          <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
            <div style={{ fontSize: '13px', color: tokens.colors.neutral[400] }}>Average Weighted Score</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: tokens.colors.primary[500] }}>
              {grandTotals.avgWeightedScore.toFixed(1)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing[2], flex: '1 1 240px', minWidth: '240px' }}>
            <div
              style={{
                flex: 1,
                background: tokens.colors.success[900] + '25',
                borderRadius: tokens.radii.md,
                padding: tokens.spacing[3],
                color: tokens.colors.success[500],
                border: `1px solid ${tokens.colors.success[800]}`,
              }}
            >
              <div style={{ fontSize: '12px' }}>Above</div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{grandTotals.aboveCount}</div>
            </div>
            <div
              style={{
                flex: 1,
                background: tokens.colors.warning[900] + '25',
                borderRadius: tokens.radii.md,
                padding: tokens.spacing[3],
                color: tokens.colors.warning[500],
                border: `1px solid ${tokens.colors.warning[800]}`,
              }}
            >
              <div style={{ fontSize: '12px' }}>Warning</div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{grandTotals.warningCount}</div>
            </div>
            <div
              style={{
                flex: 1,
                background: tokens.colors.danger[900] + '25',
                borderRadius: tokens.radii.md,
                padding: tokens.spacing[3],
                color: tokens.colors.danger[500],
                border: `1px solid ${tokens.colors.danger[800]}`,
              }}
            >
              <div style={{ fontSize: '12px' }}>Below</div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{grandTotals.belowCount}</div>
            </div>
          </div>
        </section>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: tokens.colors.neutral[500] }}>Loading mentors…</div>
        ) : groupedMentors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', color: tokens.colors.neutral[500] }}>
            No mentors match the selected filters.
          </div>
        ) : (
          groupedMentors.map((group) => (
            <section
              key={group.teamName}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[4],
                background: tokens.colors.surface.card,
                borderRadius: tokens.radii.lg,
                padding: tokens.spacing[5],
                border: `1px solid ${tokens.colors.neutral[900]}`,
              }}
            >
              <header
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: tokens.spacing[3],
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: tokens.colors.neutral[100] }}>{group.teamName}</h2>
                  <p style={{ fontSize: '12px', color: tokens.colors.neutral[400] }}>
                    {group.summary.mentorCount} mentors · Avg. score {group.summary.avgWeightedScore.toFixed(1)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
                  <StatusBadge status="ABOVE" />
                  <span style={{ fontSize: '12px', color: tokens.colors.neutral[400] }}>{group.summary.aboveCount}</span>
                  <StatusBadge status="WARNING" />
                  <span style={{ fontSize: '12px', color: tokens.colors.neutral[400] }}>{group.summary.warningCount}</span>
                  <StatusBadge status="BELOW" />
                  <span style={{ fontSize: '12px', color: tokens.colors.neutral[400] }}>{group.summary.belowCount}</span>
                </div>
              </header>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                {group.mentors.map((mentor) => (
                  <div
                    key={mentor.id}
                    style={{
                      background: tokens.colors.surface.dark,
                      borderRadius: tokens.radii.lg,
                      padding: tokens.spacing[4],
                      border: `1px solid ${tokens.colors.neutral[900]}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: tokens.spacing[3],
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: tokens.colors.neutral[100] }}>
                          {mentor.mentorName}
                        </h3>
                        <p style={{ fontSize: '12px', color: tokens.colors.neutral[400] }}>
                          {mentor.mentorId} · {mentor.teamName}
                        </p>
                      </div>
                      <StatusBadge status={mentor.status} />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <MetricPill label="Weighted Score" value={mentor.weightedScore} />
                      <MetricPill label="Class Consumption" value={mentor.avgCcPct} unit="%" />
                      <MetricPill label="Upgrade Rate" value={mentor.avgUpPct} unit="%" />
                      <MetricPill label="Fixed Rate" value={mentor.avgFixedPct} unit="%" />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: tokens.spacing[1],
                        fontSize: '12px',
                        color: tokens.colors.neutral[400],
                        background: tokens.colors.surface.card,
                        padding: tokens.spacing[3],
                        borderRadius: tokens.radii.md,
                        border: `1px solid ${tokens.colors.neutral[900]}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Students</span>
                        <span style={{ color: tokens.colors.neutral[100] }}>{mentor.totalStudents}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Leads · Recovered</span>
                        <span style={{ color: tokens.colors.success[400] }}>
                          {mentor.recoveredLeads}/{mentor.totalLeads}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Conversion Rate</span>
                        <span style={{ color: tokens.colors.primary[400] }}>{mentor.conversionRatePct.toFixed(1)}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Referrals · Paid</span>
                        <span style={{ color: tokens.colors.neutral[100] }}>
                          {mentor.referralPaid}/{mentor.referralLeads}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/mentors/${mentor.id}`)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: tokens.radii.md,
                        border: 'none',
                        background: tokens.colors.primary[600],
                        color: tokens.colors.neutral[50],
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
