import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatKwh, formatYuan, formatCarbon, weatherLabel, weatherIcon } from '@/lib/format';
import type { WeatherStat } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, Download, Calendar, Printer } from 'lucide-react';

const WEATHER_COLORS: Record<string, string> = {
  sunny: '#F5A524', cloudy: '#38BDF8', overcast: '#94A3B8',
  rainy: '#60A5FA', snowy: '#E2E8F0', foggy: '#A78BFA',
};

const currentYear = new Date().getFullYear();
const YEARS = [currentYear, currentYear - 1, currentYear - 2];

interface ChartTipProps {
  active?: boolean;
  payload?: { name: string; value: number | string; color: string }[];
  label?: string;
}

function ChartTip({ active, payload, label }: ChartTipProps) {
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

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  const bgClass = color === 'amber' ? 'bg-amber/15' : color === 'cyan' ? 'bg-cyan/15' : color === 'eco' ? 'bg-eco/15' : 'bg-purple-500/15';
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

export default function Report() {
  const [year, setYear] = useState(currentYear);
  const { data: report, loading, error } = useApi(() => api.report.annual(year), [year]);

  const handlePrint = () => window.print();
  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annual-report-${year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        加载失败：{error}
      </div>
    );
  }

  return (
    <div className="space-y-6 print:text-black print:bg-white">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="section-title flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber" />
          年度报告
        </h1>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-1" onClick={handleExport}>
            <Download className="w-4 h-4" />导出
          </button>
          <button className="btn-primary flex items-center gap-1" onClick={handlePrint}>
            <Printer className="w-4 h-4" />打印 PDF
          </button>
        </div>
      </div>

      <div className="print:hidden">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-white/40" />
          {YEARS.map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                y === year ? 'bg-amber/20 text-amber' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center mb-2 print:block hidden">
        <h1 className="text-2xl font-bold">{year} 年度光伏发电报告</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="animate-pulse h-24 glass-card" />)}
        </div>
      ) : report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={Calendar} label="总发电量" value={formatKwh(report.totalGenerationKwh)} color="amber" />
            <StatCard icon={FileText} label="总收益" value={formatYuan(report.totalRevenue)} color="cyan" />
            <StatCard icon={Download} label="自用节省" value={formatYuan(report.totalSelfUseSaving)} color="eco" />
            <StatCard icon={FileText} label="上网收入" value={formatYuan(report.totalGridIncome)} color="cyan" />
            <StatCard icon={Calendar} label="碳减排" value={formatCarbon(report.carbonKg)} color="eco" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5 print:border print:border-gray-300">
              <h2 className="section-title text-base mb-3">月度发电量</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={report.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="generationKwh" name="发电量" fill="#F5A524" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-5 print:border print:border-gray-300">
              <h2 className="section-title text-base mb-3">天气与发电相关性</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={report.weatherStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="weather"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(w: string) => weatherIcon(w) + ' ' + weatherLabel(w)} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="avgGenerationKwh" name="平均发电量" radius={[4, 4, 0, 0]}>
                    {report.weatherStats.map((ws: WeatherStat) => (
                      <Cell key={ws.weather} fill={WEATHER_COLORS[ws.weather] || '#94A3B8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-5 print:border print:border-gray-300 print:text-black">
            <h2 className="section-title text-base mb-3">年度概览</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white/5 rounded-lg print:bg-gray-100">
                <p className="stat-label">发电量</p>
                <p className="font-mono text-amber text-lg print:text-amber-600">{formatKwh(report.totalGenerationKwh)}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg print:bg-gray-100">
                <p className="stat-label">总收益</p>
                <p className="font-mono text-cyan text-lg print:text-cyan-600">{formatYuan(report.totalRevenue)}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg print:bg-gray-100">
                <p className="stat-label">碳减排</p>
                <p className="font-mono text-eco text-lg print:text-green-600">{formatCarbon(report.carbonKg)}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg print:bg-gray-100">
                <p className="stat-label">自用节省</p>
                <p className="font-mono text-eco text-lg print:text-green-600">{formatYuan(report.totalSelfUseSaving)}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg print:bg-gray-100">
                <p className="stat-label">上网收入</p>
                <p className="font-mono text-cyan text-lg print:text-cyan-600">{formatYuan(report.totalGridIncome)}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg print:bg-gray-100">
                <p className="stat-label">组件数量</p>
                <p className="font-mono text-white text-lg print:text-gray-800">{report.panelCount}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
