'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface RevenuePoint {
  date: string
  revenue: number
  orders: number
}

interface CountryRow {
  country: string
  count: number
}

interface MethodRow {
  method: string
  count: number
}

interface AnalyticsChartsProps {
  revenue: RevenuePoint[]
  countries: CountryRow[]
  methods: MethodRow[]
  funnel: { step: string; count: number }[]
}

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']

export function AnalyticsCharts({ revenue, countries, methods, funnel }: AnalyticsChartsProps) {
  return (
    <div className="space-y-8">
      {/* Revenue over time */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Revenue over time (€)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color: '#10b981' }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion funnel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Conversion Funnel</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={funnel} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="step" stroke="#64748b" tick={{ fontSize: 11 }} width={110} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Countries + Methods side by side */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Orders by Country</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={countries} dataKey="count" nameKey="country" cx="50%" cy="50%" outerRadius={70} label>
                {countries.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={methods} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={70} label>
                {methods.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
