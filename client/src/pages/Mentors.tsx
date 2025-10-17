import { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
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

interface MentorDetailModalProps {
  mentor: Mentor;
  onClose: () => void;
}

function MentorDetailModal({ mentor, onClose }: MentorDetailModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: tokens.colors.surface.card,
          borderRadius: tokens.radii.xl,
          padding: '32px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.neutral[100], marginBottom: '4px' }}>
              {mentor.mentorName}
            </h2>
            <p style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>{mentor.teamName}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: tokens.colors.neutral[400],
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <MetricCard label="Class Consumption" value={mentor.avgCcPct} />
          <MetricCard label="Super-CC" value={mentor.avgScPct} />
          <MetricCard label="Upgrade" value={mentor.avgUpPct} />
          <MetricCard label="Fixed" value={mentor.avgFixedPct} />
        </div>

        <div style={{ background: tokens.colors.surface.dark, padding: '16px', borderRadius: tokens.radii.lg, marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: tokens.colors.neutral[400], marginBottom: '8px' }}>Weighted Score</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: tokens.colors.neutral[100] }}>
            {mentor.weightedScore.toFixed(1)}
          </div>
        </div>

        <div style={{ background: tokens.colors.surface.dark, padding: '16px', borderRadius: tokens.radii.lg }}>
          <div style={{ fontSize: '14px', color: tokens.colors.neutral[400], marginBottom: '8px' }}>Targets Hit</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: tokens.colors.neutral[100] }}>
            {mentor.targetsHit} / 4
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: tokens.colors.surface.dark, padding: '16px', borderRadius: tokens.radii.lg }}>
      <div style={{ fontSize: '12px', color: tokens.colors.neutral[400], marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.neutral[100] }}>
        {value.toFixed(1)}%
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'ABOVE':
      return { bg: tokens.colors.success[900] + '20', text: tokens.colors.success[400] };
    case 'WARNING':
      return { bg: tokens.colors.warning[900] + '20', text: tokens.colors.warning[400] };
    case 'BELOW':
      return { bg: tokens.colors.danger[900] + '20', text: tokens.colors.danger[400] };
    default:
      return { bg: tokens.colors.neutral[800], text: tokens.colors.neutral[400] };
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors = getStatusColor(status);
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
      }}
    >
      {status}
    </span>
  );
}

function MetricChip({ value, target }: { value: number; target: number }) {
  const isAbove = value >= target;
  return (
    <span
      style={{
        padding: '4px 8px',
        background: isAbove ? tokens.colors.success[900] + '20' : tokens.colors.danger[900] + '20',
        color: isAbove ? tokens.colors.success[400] : tokens.colors.danger[400],
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {value.toFixed(1)}%
    </span>
  );
}

export default function Mentors() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState({
    search: '',
    teamId: '',
    status: '' as '' | 'ABOVE' | 'WARNING' | 'BELOW',
  });
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [pagination.page, sorting, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const sortBy = sorting[0]?.id as 'mentorName' | 'weightedScore' | 'targetsHit' | undefined;
      const sortOrder = sorting[0]?.desc ? 'desc' : 'asc';

      const [mentorsRes, configRes] = await Promise.all([
        mentorApi.list({
          page: pagination.page,
          limit: pagination.limit,
          sortBy,
          sortOrder,
          status: filters.status || undefined,
          search: filters.search || undefined,
          teamId: filters.teamId || undefined,
        }),
        config ? Promise.resolve({ data: config }) : mentorApi.list({ limit: 1 }).then(() => ({ data: null })),
      ]);

      setMentors(mentorsRes.data || []);
      setPagination((prev) => ({ ...prev, total: mentorsRes.pagination?.total || 0 }));
      if (!config && configRes.data) setConfig(configRes.data);
    } catch (error) {
      console.error('Failed to load mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<Mentor>[]>(
    () => [
      {
        id: 'rank',
        header: 'Rank',
        cell: ({ row }) => (
          <div style={{ fontSize: '14px', fontWeight: 600, color: tokens.colors.neutral[300] }}>
            #{pagination.limit * (pagination.page - 1) + row.index + 1}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'mentorName',
        header: 'Mentor',
        cell: ({ getValue }) => (
          <div style={{ fontSize: '14px', fontWeight: 600, color: tokens.colors.neutral[100] }}>
            {getValue() as string}
          </div>
        ),
      },
      {
        accessorKey: 'teamName',
        header: 'Team',
        cell: ({ getValue }) => (
          <div style={{ fontSize: '14px', color: tokens.colors.neutral[300] }}>{getValue() as string}</div>
        ),
        enableSorting: false,
      },
      {
        id: 'cc',
        header: 'CC',
        accessorKey: 'avgCcPct',
        cell: ({ row }) => <MetricChip value={row.original.avgCcPct} target={config?.ccTarget || 80} />,
        enableSorting: false,
      },
      {
        id: 'sc',
        header: 'SC',
        accessorKey: 'avgScPct',
        cell: ({ row }) => <MetricChip value={row.original.avgScPct} target={config?.scTarget || 15} />,
        enableSorting: false,
      },
      {
        id: 'up',
        header: 'UP',
        accessorKey: 'avgUpPct',
        cell: ({ row }) => <MetricChip value={row.original.avgUpPct} target={config?.upTarget || 25} />,
        enableSorting: false,
      },
      {
        id: 'fixed',
        header: 'Fixed',
        accessorKey: 'avgFixedPct',
        cell: ({ row }) => <MetricChip value={row.original.avgFixedPct} target={config?.fixedTarget || 60} />,
        enableSorting: false,
      },
      {
        accessorKey: 'weightedScore',
        header: 'Score',
        cell: ({ getValue }) => (
          <div style={{ fontSize: '14px', fontWeight: 700, color: tokens.colors.primary[600] }}>
            {(getValue() as number).toFixed(1)}
          </div>
        ),
      },
      {
        accessorKey: 'targetsHit',
        header: 'Targets',
        cell: ({ getValue }) => (
          <div style={{ fontSize: '14px', fontWeight: 600, color: tokens.colors.neutral[100] }}>
            {getValue() as number} / 4
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
        enableSorting: false,
      },
    ],
    [pagination.page, pagination.limit, config]
  );

  const table = useReactTable({
    data: mentors,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    manualPagination: true,
    manualSorting: true,
  });

  const exportCSV = () => {
    const headers = ['Rank', 'Mentor', 'Team', 'CC %', 'SC %', 'UP %', 'Fixed %', 'Weighted Score', 'Targets Hit', 'Status'];
    const rows = mentors.map((m, idx) => [
      idx + 1,
      m.mentorName,
      m.teamName,
      m.avgCcPct.toFixed(1),
      m.avgScPct.toFixed(1),
      m.avgUpPct.toFixed(1),
      m.avgFixedPct.toFixed(1),
      m.weightedScore.toFixed(1),
      m.targetsHit,
      m.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mentors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

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
        {/* Filters */}
        <div
          style={{
            background: tokens.colors.surface.card,
            padding: '24px',
            borderRadius: tokens.radii.lg,
            marginBottom: '24px',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Search mentors..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            style={{
              flex: '1',
              minWidth: '200px',
              padding: '10px 16px',
              background: tokens.colors.surface.dark,
              border: `1px solid ${tokens.colors.neutral[700]}`,
              borderRadius: '8px',
              color: tokens.colors.neutral[100],
              fontSize: '14px',
            }}
          />

          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as any }))}
            style={{
              padding: '10px 16px',
              background: tokens.colors.surface.dark,
              border: `1px solid ${tokens.colors.neutral[700]}`,
              borderRadius: '8px',
              color: tokens.colors.neutral[100],
              fontSize: '14px',
            }}
          >
            <option value="">All Statuses</option>
            <option value="ABOVE">Above</option>
            <option value="WARNING">Warning</option>
            <option value="BELOW">Below</option>
          </select>

          <button
            onClick={exportCSV}
            disabled={mentors.length === 0}
            style={{
              padding: '10px 20px',
              background: tokens.colors.primary[600],
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: mentors.length > 0 ? 'pointer' : 'not-allowed',
              opacity: mentors.length > 0 ? 1 : 0.5,
            }}
          >
            Export CSV
          </button>
        </div>

        {/* Table */}
        <div style={{ background: tokens.colors.surface.card, borderRadius: tokens.radii.lg, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: tokens.colors.neutral[400] }}>Loading...</div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} style={{ borderBottom: `1px solid ${tokens.colors.neutral[800]}` }}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                            style={{
                              padding: '16px',
                              textAlign: 'left',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: tokens.colors.neutral[400],
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              cursor: header.column.getCanSort() ? 'pointer' : 'default',
                              userSelect: 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <span style={{ fontSize: '10px' }}>
                                  {header.column.getIsSorted() === 'asc' ? '↑' : header.column.getIsSorted() === 'desc' ? '↓' : '↕'}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedMentor(row.original)}
                        style={{
                          borderBottom: `1px solid ${tokens.colors.neutral[800]}`,
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.colors.neutral[900])}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} style={{ padding: '16px' }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
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
                  Showing {mentors.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} mentors
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

      {/* Detail Modal */}
      {selectedMentor && <MentorDetailModal mentor={selectedMentor} onClose={() => setSelectedMentor(null)} />}
    </div>
  );
}
