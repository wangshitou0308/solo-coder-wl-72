import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatKwh, formatYuan, formatCarbon, weatherLabel, weatherIcon } from '@/lib/format';
import type { WeatherStat, PanelRankItem } from '@/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { Zap, DollarSign, PiggyBank, Leaf, Sun, BarChart3 } from 'lucide-react';

const WEATHER_COLORS: Record<string, string> = {
  sunny: '#F5A524', cloudy: '#38BDF8', overcast: '#94A3B8',
  rainy: '#60A5FA', snowy: '#E2E8F0', foggy: '#A78BFA',
};

function Skeleton() {
  return <div className="glass-card animate-pulse h-40 rounded-xl" />;
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  const bgClass = color === 'amber' ? 'bg-amber/15' : color === 'cyan' ? 'bg-cyan/15' : 'bg-eco/15';
  const textClass = `text-${color}`;
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${textClass}`} />
        </div>
        <span className="stat-label">{label}</span>
      </div>
      <span className={`stat-value font-mono ${textClass}`}>{value}</span>
    </div>
  );
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number | string; color: string }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-midnight-light border border-white/10 rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, loading: sLoading, error: sError } = useApi(() => api.dashboard.summary());
  const { data: stats, loading: stLoading, error: stError } = useApi(() =>
    api.generation.stats({ dimension: 'month' })
  );
  const { data: panelRank, loading: rLoading, error: rError } = useApi(() =>
    api.generation.panelRank()
  );

  const error = sError || stError || rError;
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        加载失败：{error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="section-title flex items-center gap-2">
        <Sun className="w-5 h-5 text-amber" />
        实时概览
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sLoading ? <><Skeleton /><Skeleton /><Skeleton /><Skeleton /></> : summary && (
          <>
            <StatCard icon={Zap} label="今日发电" value={formatKwh(summary.todayGenerationKwh)} color="amber" />
            <StatCard icon={DollarSign} label="今日收益" value={formatYuan(summary.todayRevenue)} color="cyan" />
            <StatCard icon={PiggyBank} label="今日节省" value={formatYuan(summary.todaySaving)} color="eco" />
            <StatCard icon={Leaf} label="今日减碳" value={formatCarbon(summary.todayCarbonKg)} color="eco" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stLoading ? <><Skeleton /><Skeleton /></> : stats && (
          <>
            <div className="glass-card p-4">
              <h2 className="section-title text-base mb-3">月度发电趋势</h2>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.trend}>
                  <defs>
                    <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F5A524" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#F5A524" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="generationKwh" name="发电量" stroke="#F5A524" fill="url(#amberGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-4">
              <h2 className="section-title text-base mb-3">天气与发电相关性</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.weatherStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="weather"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(w: string) => weatherIcon(w) + ' ' + weatherLabel(w)}
                  />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="avgGenerationKwh" name="平均发电量" radius={[4, 4, 0, 0]}>
                    {stats.weatherStats.map((ws: WeatherStat) => (
                      <Cell key={ws.weather} fill={WEATHER_COLORS[ws.weather] || '#94A3B8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <h2 className="section-title text-base mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber" />
            组件效率排行
          </h2>
          {rLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-8 bg-white/5 rounded" />
              ))}
            </div>
          ) : panelRank && panelRank.length > 0 ? (
            <div className="space-y-2">
              {panelRank.map((p: PanelRankItem, idx: number) => {
                const maxKwh = panelRank[0].avgDailyKwh || 1;
                const pct = (p.avgDailyKwh / maxKwh) * 100;
                return (
                  <div key={p.panelId} className="flex items-center gap-3">
                    <span className="w-5 text-right text-white/40 text-xs font-mono">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-0.5">
                        <span className="truncate text-white/80">{p.brandModel}</span>
                        <span className="font-mono text-amber text-xs ml-2 shrink-0">
                          {formatKwh(p.avgDailyKwh)} · {p.kwhPerKw.toFixed(2)} kWh/kW
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-amber/60" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-white/40 text-sm">暂无数据</p>
          )}
        </div>

        <div className="glass-card p-4">
          <h2 className="section-title text-base mb-3">累计总览</h2>
          {sLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse h-8 bg-white/5 rounded" />
              ))}
            </div>
          ) : summary && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-white/40 text-xs mb-1">累计发电</p>
                <p className="font-mono text-amber text-lg">{formatKwh(summary.totalGenerationKwh)}</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-white/40 text-xs mb-1">累计收益</p>
                <p className="font-mono text-cyan text-lg">{formatYuan(summary.totalRevenue)}</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-white/40 text-xs mb-1">累计减碳</p>
                <p className="font-mono text-eco text-lg">{formatCarbon(summary.totalCarbonKg)}</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-white/40 text-xs mb-1">组件数量</p>
                <p className="font-mono text-white text-lg">{summary.panelCount}
                  <span className="text-xs text-white/40 ml-1">({summary.activePanelCount} 运行中)</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
