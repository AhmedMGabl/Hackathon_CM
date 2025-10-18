import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mentorApi, configApi } from '../lib/api';
import { tokens, getStatusColor } from '../config/tokens';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import AICoachPanel from '../components/AICoachPanel';
import AIHelpButton from '../components/AIHelpButton';

interface MentorSummary {
  studentCounts: { total: number; active: number };
  classConsumptionBuckets: Array<{ label: string; value: number }>;
  engagement: {
    avgClassConsumption: number;
    superClassPct: number;
    excellentStudentRate: number;
  };
  fixedRate: { fixedStudents: number; totalFixable: number; fixedRatePct: number };
  upgrade: { firstPurchaseCount: number; upgradedCount: number; upgradeRatePct: number };
  leads: { totalLeads: number; recoveredLeads: number; unrecoveredLeads: number; conversionRatePct: number };
  referral: { referralLeads: number; referralShowups: number; referralPaid: number };
  composite: { weightedScore: number; targetsHit: number; status: 'ABOVE' | 'WARNING' | 'BELOW' };
}

interface TimeSeriesPoint {
  periodDate: string;
  weightedScore: number;
  avgClassConsumption: number;
  superClassPct: number;
  upgradeRatePct: number;
  fixedRatePct: number;
  conversionRatePct: number;
  targetsHit: number;
  status: 'ABOVE' | 'WARNING' | 'BELOW';
}

interface MentorDetailResponse {
  mentor: {
    id: string;
    mentorId: string;
    mentorName: string;
    teamId: string;
    teamName: string;
  };
  summary: MentorSummary;
  timeSeries: Array<{
    periodDate: string;
    weightedScore: number;
    avgClassConsumption: number;
    superClassPct: number;
    upgradeRatePct: number;
    fixedRatePct: number;
    conversionRatePct: number;
    targetsHit: number;
    status: 'ABOVE' | 'WARNING' | 'BELOW';
  }>;
  studentInsights: {
    totals: { total: number; fixedCount: number; recoveredCount: number };
    topPerformers: Array<StudentRecord>;
    needsAttention: Array<StudentRecord>;
    sample: Array<StudentRecord>;
  };
  latestStat: any;
}

interface StudentRecord {
  id: string;
  studentId: string;
  studentLevel: string | null;
  classConsumptionThisMonth: number | null;
  classConsumptionLastMonth: number | null;
  isFixed: boolean;
  isRecovered: boolean;
  packages: string | null;
}

const statusLabel: Record<'ABOVE' | 'WARNING' | 'BELOW', string> = {
  ABOVE: 'Above Target',
  WARNING: 'Near Target',
  BELOW: 'Below Target',
};

const tooltipStyle = {
  background: tokens.colors.surface.card,
  border: `1px solid ${tokens.colors.neutral[800]}`,
  borderRadius: tokens.radii.md,
  color: tokens.colors.neutral[100],
};

function formatDateLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function MetricCard({
  label,
  value,
  suffix = '',
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: tokens.colors.surface.card,
        borderRadius: tokens.radii.lg,
        padding: tokens.spacing[5],
        boxShadow: tokens.shadows.card,
        border: `1px solid ${tokens.colors.neutral[900]}`,
      }}
    >
      <div style={{ fontSize: '14px', color: tokens.colors.neutral[400], marginBottom: tokens.spacing[2] }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: 700, color: accent ?? tokens.colors.neutral[50] }}>
        {value.toFixed(1)}
        {suffix}
      </div>
    </div>
  );
}

function StudentsTable({ title, students }: { title: string; students: StudentRecord[] }) {
  return (
    <div
      style={{
        background: tokens.colors.surface.card,
        borderRadius: tokens.radii.lg,
        padding: tokens.spacing[5],
        border: `1px solid ${tokens.colors.neutral[900]}`,
        boxShadow: tokens.shadows.card,
      }}
    >
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: tokens.colors.neutral[100],
          marginBottom: tokens.spacing[3],
        }}
      >
        {title}
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tokens.colors.neutral[800]}` }}>
              <th style={{ textAlign: 'left', padding: '12px', color: tokens.colors.neutral[400], fontSize: '13px' }}>
                Student ID
              </th>
              <th style={{ textAlign: 'left', padding: '12px', color: tokens.colors.neutral[400], fontSize: '13px' }}>
                Level
              </th>
              <th style={{ textAlign: 'left', padding: '12px', color: tokens.colors.neutral[400], fontSize: '13px' }}>
                Consumption (This Month)
              </th>
              <th style={{ textAlign: 'left', padding: '12px', color: tokens.colors.neutral[400], fontSize: '13px' }}>
                Fixed
              </th>
              <th style={{ textAlign: 'left', padding: '12px', color: tokens.colors.neutral[400], fontSize: '13px' }}>
                Recovered
              </th>
              <th style={{ textAlign: 'left', padding: '12px', color: tokens.colors.neutral[400], fontSize: '13px' }}>
                Package
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} style={{ borderBottom: `1px solid ${tokens.colors.neutral[900]}` }}>
                <td style={{ padding: '12px', color: tokens.colors.neutral[100], fontSize: '13px' }}>{student.studentId}</td>
                <td style={{ padding: '12px', color: tokens.colors.neutral[300], fontSize: '13px' }}>
                  {student.studentLevel ?? '—'}
                </td>
                <td style={{ padding: '12px', color: tokens.colors.neutral[100], fontSize: '13px' }}>
                  {student.classConsumptionThisMonth?.toFixed(1) ?? '0.0'}
                </td>
                <td style={{ padding: '12px', color: student.isFixed ? tokens.colors.success[400] : tokens.colors.neutral[500] }}>
                  {student.isFixed ? 'Yes' : 'No'}
                </td>
                <td
                  style={{ padding: '12px', color: student.isRecovered ? tokens.colors.success[400] : tokens.colors.neutral[500] }}
                >
                  {student.isRecovered ? 'Yes' : 'No'}
                </td>
                <td style={{ padding: '12px', color: tokens.colors.neutral[300], fontSize: '13px' }}>
                  {student.packages ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MentorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MentorDetailResponse | null>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        const [mentorResponse, configResponse] = await Promise.all([
          mentorApi.getById(id),
          configApi.get(),
        ]);
        if (!cancelled) {
          setData(mentorResponse.data);
          setConfig(configResponse.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load mentor detail');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const timeSeries = useMemo<TimeSeriesPoint[]>(() => {
    if (!data) return [];
    return data.timeSeries.map((entry) => ({
      ...entry,
      periodDate: entry.periodDate,
    }));
  }, [data]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark, padding: tokens.spacing[6] }}>
        <p style={{ color: tokens.colors.neutral[400] }}>Loading mentor insights…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark, padding: tokens.spacing[6] }}>
        <div
          style={{
            maxWidth: '640px',
            margin: '0 auto',
            background: tokens.colors.surface.card,
            borderRadius: tokens.radii.lg,
            padding: tokens.spacing[6],
            border: `1px solid ${tokens.colors.danger[700]}`,
          }}
        >
          <h2 style={{ color: tokens.colors.danger[500], fontSize: '20px', marginBottom: tokens.spacing[3] }}>Something went wrong</h2>
          <p style={{ color: tokens.colors.neutral[300], marginBottom: tokens.spacing[4] }}>
            {error ?? 'Unable to load mentor detail at this time.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
              background: tokens.colors.primary[600],
              color: tokens.colors.neutral[50],
              border: 'none',
              borderRadius: tokens.radii.md,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { mentor, summary, studentInsights } = data;

  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark }}>
      <header
        style={{
          padding: '20px 32px',
          borderBottom: `1px solid ${tokens.colors.neutral[900]}`,
          background: tokens.colors.surface.card,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: '8px 16px',
                background: tokens.colors.neutral[800],
                color: tokens.colors.neutral[200],
                border: 'none',
                borderRadius: tokens.radii.md,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
            <div>
              <h1 style={{ color: tokens.colors.neutral[50], fontSize: '26px', fontWeight: 700 }}>{mentor.mentorName}</h1>
              <p style={{ color: tokens.colors.neutral[400], fontSize: '14px' }}>
                {mentor.mentorId} · {mentor.teamName}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing[3], flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '6px 12px',
                borderRadius: tokens.radii.full,
                background: getStatusColor(summary.composite.status) + '20',
                color: getStatusColor(summary.composite.status),
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {statusLabel[summary.composite.status]}
            </span>
            <span style={{ color: tokens.colors.neutral[400], fontSize: '13px' }}>
              Weighted Score: {summary.composite.weightedScore.toFixed(1)}
            </span>
            <span style={{ color: tokens.colors.neutral[400], fontSize: '13px' }}>
              Targets Hit: {summary.composite.targetsHit}
            </span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <section>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: tokens.colors.neutral[100], marginBottom: tokens.spacing[4] }}>
            Performance Snapshot
          </h2>
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <MetricCard label="Avg. Class Consumption" value={summary.engagement.avgClassConsumption} suffix="%" />
            <MetricCard label="Super Class %" value={summary.engagement.superClassPct} suffix="%" />
            <MetricCard label="Upgrade Rate" value={summary.upgrade.upgradeRatePct} suffix="%" />
            <MetricCard label="Fixed Rate" value={summary.fixedRate.fixedRatePct} suffix="%" />
            <MetricCard
              label="Total Leads"
              value={summary.leads.totalLeads}
              accent={tokens.colors.primary[500]}
              suffix=""
            />
            <MetricCard label="Recovered Leads" value={summary.leads.recoveredLeads} suffix="" accent={tokens.colors.success[500]} />
          </div>
        </section>

        <section
          style={{ background: tokens.colors.surface.card, borderRadius: tokens.radii.lg, padding: tokens.spacing[5], boxShadow: tokens.shadows.card }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[4] }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: tokens.colors.neutral[100] }}>Performance Trend</h2>
            <span style={{ color: tokens.colors.neutral[500], fontSize: '12px' }}>Rolling 12 periods</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.neutral[800]} />
              <XAxis dataKey="periodDate" stroke={tokens.colors.neutral[400]} tickFormatter={formatDateLabel} />
              <YAxis stroke={tokens.colors.neutral[400]} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              />
              <Legend />
              <Line type="monotone" dataKey="weightedScore" stroke={tokens.colors.primary[500]} strokeWidth={2} dot={false} name="Weighted Score" />
              <Line type="monotone" dataKey="avgClassConsumption" stroke={tokens.colors.success[500]} strokeWidth={2} dot={false} name="Class Consumption %" />
              <Line type="monotone" dataKey="upgradeRatePct" stroke={tokens.colors.warning[500]} strokeWidth={2} dot={false} name="Upgrade Rate %" />
              <Line type="monotone" dataKey="fixedRatePct" stroke={tokens.colors.danger[500]} strokeWidth={2} dot={false} name="Fixed Rate %" />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section
          style={{ background: tokens.colors.surface.card, borderRadius: tokens.radii.lg, padding: tokens.spacing[5], boxShadow: tokens.shadows.card }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: tokens.colors.neutral[100], marginBottom: tokens.spacing[4] }}>
            Class Consumption Distribution
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary.classConsumptionBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.neutral[800]} />
              <XAxis dataKey="label" stroke={tokens.colors.neutral[400]} />
              <YAxis stroke={tokens.colors.neutral[400]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill={tokens.colors.primary[600]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section
          style={{
            display: 'grid',
            gap: '16px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          <div
            style={{
              background: tokens.colors.surface.card,
              borderRadius: tokens.radii.lg,
              padding: tokens.spacing[5],
              border: `1px solid ${tokens.colors.neutral[900]}`,
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing[3],
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: tokens.colors.neutral[100] }}>Student Breakdown</h3>
            <div style={{ color: tokens.colors.neutral[300], fontSize: '14px' }}>
              <p>Total Students: <strong style={{ color: tokens.colors.neutral[100] }}>{summary.studentCounts.total}</strong></p>
              <p>Active Students: <strong style={{ color: tokens.colors.success[500] }}>{summary.studentCounts.active}</strong></p>
              <p>Fixed Students: <strong style={{ color: tokens.colors.success[500] }}>{summary.fixedRate.fixedStudents}</strong></p>
            </div>
            <div style={{ height: '4px', background: tokens.colors.neutral[900], borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  width:
                    summary.studentCounts.total > 0
                      ? `${(summary.fixedRate.fixedStudents / summary.studentCounts.total) * 100}%`
                      : '0%',
                  background: tokens.colors.success[500],
                  height: '100%',
                }}
              />
            </div>
          </div>

          <div
            style={{
              background: tokens.colors.surface.card,
              borderRadius: tokens.radii.lg,
              padding: tokens.spacing[5],
              border: `1px solid ${tokens.colors.neutral[900]}`,
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: tokens.colors.neutral[100], marginBottom: tokens.spacing[2] }}>
              Lead Funnel
            </h3>
            <p style={{ color: tokens.colors.neutral[400], fontSize: '13px' }}>
              Conversion rate: <strong style={{ color: tokens.colors.primary[500] }}>{summary.leads.conversionRatePct.toFixed(1)}%</strong>
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, color: tokens.colors.neutral[300], fontSize: '14px' }}>
              <li>Total Leads: {summary.leads.totalLeads}</li>
              <li>Recovered Leads: {summary.leads.recoveredLeads}</li>
              <li>Unrecovered Leads: {summary.leads.unrecoveredLeads}</li>
            </ul>
          </div>

          <div
            style={{
              background: tokens.colors.surface.card,
              borderRadius: tokens.radii.lg,
              padding: tokens.spacing[5],
              border: `1px solid ${tokens.colors.neutral[900]}`,
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: tokens.colors.neutral[100], marginBottom: tokens.spacing[2] }}>
              Referrals
            </h3>
            <p style={{ color: tokens.colors.neutral[400], fontSize: '13px' }}>
              Paid conversions: <strong style={{ color: tokens.colors.success[500] }}>{summary.referral.referralPaid}</strong>
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, color: tokens.colors.neutral[300], fontSize: '14px' }}>
              <li>Referral Leads: {summary.referral.referralLeads}</li>
              <li>Referral Showups: {summary.referral.referralShowups}</li>
            </ul>
          </div>
        </section>

        <section style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
          <StudentsTable title="Top Performers" students={studentInsights.topPerformers} />
          <StudentsTable title="Needs Attention" students={studentInsights.needsAttention} />
        </section>

        {/* AI Coach Panel for Mentor */}
        <section style={{ marginTop: '32px' }}>
          <AICoachPanel
            agentId={mentor.mentorId}
            metrics={{
              ccPct: summary.engagement.avgClassConsumption,
              scPct: summary.engagement.superClassPct,
              upPct: summary.upgrade.upgradeRatePct,
              fixedPct: summary.fixedRate.fixedRatePct,
              conversionPct: summary.leads.conversionRatePct,
            }}
            targets={{
              ccTarget: config?.ccTarget || 80,
              scTarget: config?.scTarget || 15,
              upTarget: config?.upTarget || 25,
              fixedTarget: config?.fixedTarget || 60,
            }}
          />
        </section>
      </main>

      {/* AI Help Button (floating) */}
      <AIHelpButton />
    </div>
  );
}
