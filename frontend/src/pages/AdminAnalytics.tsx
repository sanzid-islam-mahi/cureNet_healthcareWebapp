import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../context/AuthContext';

const STATUS_COLORS = ['#3990D7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];
const TYPE_COLORS = ['#3990D7', '#10b981', '#f59e0b'];

interface Analytics {
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  dailyCounts: { date: string; count: number }[];
  period: number;
}

function formatLabel(str: string) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPieLabel({ name, percent }: { name?: string; percent?: number }) {
  const safeName = name ?? '';
  const safePercent = percent ?? 0;
  return `${safeName} ${(safePercent * 100).toFixed(0)}%`;
}

function formatCountTooltip(value: number | string | undefined) {
  const safeValue = typeof value === 'number' ? value : Number(value || 0);
  return [safeValue, 'Count'] as [number, string];
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState(14);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', period],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { analytics: Analytics } }>(
        '/admin/analytics/appointments',
        { params: { period } }
      );
      return res.data?.analytics ?? null;
    },
  });

  const analytics = data;
  const statusCounts = analytics?.statusCounts ?? {};
  const typeCounts = analytics?.typeCounts ?? {};
  const dailyCounts = analytics?.dailyCounts ?? [];

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: formatLabel(name),
    value,
  }));
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({
    name: formatLabel(name),
    value,
  }));
  const dailyData = dailyCounts.map(({ date, count }) => ({
    date: date.slice(5),
    count,
    fullDate: date,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">System analytics</h2>
        <Link to="/app/admin-dashboard" className="text-sm text-[#3990D7] hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <div className="flex gap-3 items-center">
        <label className="text-sm text-gray-600">Period (days):</label>
        <select
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#3990D7]"
        >
          <option value={7}>7</option>
          <option value={14}>14</option>
          <option value={30}>30</option>
          <option value={90}>90</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading analytics...</p>
      ) : (
        <div className="space-y-8">
          {/* Appointments by status – Pie + Bar */}
          <div className="rounded-xl bg-white border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Appointments by status</h3>
            {statusData.length === 0 ? (
              <p className="text-gray-500">No data for this period.</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        label={formatPieLabel}
                      >
                        {statusData.map((_, i) => (
                          <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={formatCountTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Appointments" fill="#3990D7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Appointments by type – Pie + Bar */}
          <div className="rounded-xl bg-white border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Appointments by type</h3>
            {typeData.length === 0 ? (
              <p className="text-gray-500">No data for this period.</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        label={formatPieLabel}
                      >
                        {typeData.map((_, i) => (
                          <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={formatCountTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Appointments" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Daily counts – Bar chart */}
          <div className="rounded-xl bg-white border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Appointments per day</h3>
            {dailyData.length === 0 ? (
              <p className="text-gray-500">No appointments in this period.</p>
            ) : (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      interval={dailyData.length > 14 ? Math.floor(dailyData.length / 14) : 0}
                    />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.[0] ? (
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                            <p className="text-sm font-medium text-gray-700">
                              {payload[0].payload.fullDate}
                            </p>
                            <p className="text-sm text-gray-600">
                              {payload[0].value} appointments
                            </p>
                          </div>
                        ) : null
                      }
                    />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name="Appointments"
                      fill="#3990D7"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total (period)</p>
              <p className="text-2xl font-bold text-gray-900">
                {statusData.reduce((s, d) => s + d.value, 0)}
              </p>
            </div>
            <div className="rounded-xl bg-white border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {statusCounts.completed ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-white border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Pending (requested/approved)</p>
              <p className="text-2xl font-bold text-amber-600">
                {(statusCounts.requested ?? 0) + (statusCounts.approved ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-white border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Days with data</p>
              <p className="text-2xl font-bold text-gray-900">{dailyData.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
