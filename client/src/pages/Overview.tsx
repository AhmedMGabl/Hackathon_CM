import { LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { chartColors } from '@/config/design-tokens';
import { mockKPIData, mockWeeklyData, mockTeamRadarData, mockAgents } from '@/lib/mockData';

export default function Overview() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Team Health Overview</h2>
        <p className="text-muted-foreground mt-2">
          Real-time performance metrics and analytics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockKPIData.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-card border border-border rounded-lg p-6 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {kpi.value}%
                </p>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                kpi.value >= kpi.target
                  ? 'bg-success/10 text-success'
                  : 'bg-warning/10 text-warning'
              }`}>
                {kpi.change}
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-3">
              Target: {kpi.target}%
            </div>
            {/* Sparkline */}
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={kpi.trend.map((v) => ({ value: v }))}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={chartColors.primary}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Weekly Pacing Chart */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-foreground mb-4">
          Weekly Pacing vs Target
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={mockWeeklyData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="cc"
              stackId="1"
              stroke={chartColors.primary}
              fill={chartColors.primary}
              fillOpacity={0.6}
              name="CC Actual"
            />
            <Area
              type="monotone"
              dataKey="ccTarget"
              stackId="2"
              stroke={chartColors.neutral}
              fill={chartColors.neutral}
              fillOpacity={0.3}
              name="CC Target"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Team Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-foreground mb-4">
            Team Performance Shape
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={mockTeamRadarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis />
              <Radar
                name="Sales Team Alpha"
                dataKey="teamA"
                stroke={chartColors.primary}
                fill={chartColors.primary}
                fillOpacity={0.6}
              />
              <Radar
                name="Support Team Beta"
                dataKey="teamB"
                stroke={chartColors.secondary}
                fill={chartColors.secondary}
                fillOpacity={0.6}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Status Distribution */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-foreground mb-4">
            Agent Status Distribution
          </h3>
          <div className="space-y-4">
            {['above', 'warning', 'below'].map((status) => {
              const count = mockAgents.filter((a) => a.status === status).length;
              const percentage = (count / mockAgents.length) * 100;
              const colors = {
                above: 'bg-success text-success-foreground',
                warning: 'bg-warning text-warning-foreground',
                below: 'bg-destructive text-destructive-foreground',
              };
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize font-medium">{status}</span>
                    <span>{count} agents ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[status as keyof typeof colors]} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agent Performance Bar Chart */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-foreground mb-4">
          Agent Performance Comparison
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={mockAgents}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="agentName" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="ccPct" fill={chartColors.primary} name="CC %" />
            <Bar dataKey="scPct" fill={chartColors.success} name="SC %" />
            <Bar dataKey="upPct" fill={chartColors.warning} name="UP %" />
            <Bar dataKey="fixedPct" fill={chartColors.secondary} name="Fixed %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TODO PASS 4: Add filters, search, interactive drill-downs */}
    </div>
  );
}
