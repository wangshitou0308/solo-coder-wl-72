import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatKwh, weatherLabel, weatherIcon, todayISO, daysAgo } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import type { GenerationRecord, InverterWithPanels, WeatherType, StatsQuery } from '@/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Sun, Plus, Upload, Trash2 } from 'lucide-react';

const WEATHER_COLORS: Record<string, string> = {
  sunny: '#F5A524', cloudy: '#38BDF8', overcast: '#94A3B8',
  rainy: '#60A5FA', snowy: '#E2E8F0', foggy: '#A78BFA',
};
const WEATHER_TYPES: WeatherType[] = ['sunny', 'cloudy', 'overcast', 'rainy', 'snowy', 'foggy'];
const DIMENSIONS: { value: StatsQuery['dimension']; label: string }[] = [
  { value: 'day', label: '按天' }, { value: 'week', label: '按周' },
  { value: 'month', label: '按月' }, { value: 'year', label: '按年' },
];

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
        <p key={i} style={{ color: p.color }} className="font-mono">{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</p>
      ))}
    </div>
  );
}

export default function Generation() {
  const [filters, setFilters] = useState({ startDate: daysAgo(90), endDate: todayISO(), panelId: 0, dimension: 'month' as StatsQuery['dimension'] });
  const { data: stats, reload: reloadStats } = useApi(() =>
    api.generation.stats({ dimension: filters.dimension, startDate: filters.startDate, endDate: filters.endDate, panelId: filters.panelId || undefined })
  );
  const { data: records, reload: reloadRecords } = useApi(() =>
    api.generation.list({ startDate: filters.startDate, endDate: filters.endDate, panelId: filters.panelId || undefined })
  );
  const { data: inverters } = useApi(() => api.inverters.list());

  const allPanels = inverters?.flatMap((inv: InverterWithPanels) => inv.panels) || [];

  const [entryModal, setEntryModal] = useState(false);
  const [csvModal, setCsvModal] = useState(false);
  const [entryForm, setEntryForm] = useState({ panelId: 0, date: todayISO(), generationKwh: 0, weather: 'sunny' as WeatherType, sunshineHours: 0, temperature: 0 });
  const [csvContent, setCsvContent] = useState('');
  const [csvResult, setCsvResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);

  const submitEntry = async () => {
    await api.generation.create(entryForm);
    setEntryModal(false);
    reloadRecords();
    reloadStats();
  };

  const submitCsv = async () => {
    const result = await api.generation.importCsv(csvContent);
    setCsvResult(result);
    reloadRecords();
    reloadStats();
  };

  const doDelete = async () => {
    if (confirmDel == null) return;
    await fetch(`/api/generation/${confirmDel}`, { method: 'DELETE' });
    setConfirmDel(null);
    reloadRecords();
    reloadStats();
  };

  const refresh = () => { reloadRecords(); reloadStats(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="section-title flex items-center gap-2"><Sun className="w-5 h-5 text-amber" />发电记录</h1>
        <div className="flex gap-2">
          <button className="btn-primary flex items-center gap-1" onClick={() => { setEntryForm({ panelId: allPanels[0]?.id || 0, date: todayISO(), generationKwh: 0, weather: 'sunny', sunshineHours: 0, temperature: 0 }); setEntryModal(true); }}><Plus className="w-4 h-4" />手动录入</button>
          <button className="btn-secondary flex items-center gap-1" onClick={() => { setCsvContent(''); setCsvResult(null); setCsvModal(true); }}><Upload className="w-4 h-4" />CSV 导入</button>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-wrap gap-3 items-end">
        <div><label className="text-white/40 text-xs block mb-1">开始日期</label><input className="input-field" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></div>
        <div><label className="text-white/40 text-xs block mb-1">结束日期</label><input className="input-field" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></div>
        <div><label className="text-white/40 text-xs block mb-1">组件</label><select className="select-field" value={filters.panelId} onChange={(e) => setFilters({ ...filters, panelId: +e.target.value })}><option value={0}>全部</option>{allPanels.map((p) => <option key={p.id} value={p.id}>{p.brandModel}</option>)}</select></div>
        <div><label className="text-white/40 text-xs block mb-1">维度</label><select className="select-field" value={filters.dimension} onChange={(e) => setFilters({ ...filters, dimension: e.target.value as StatsQuery['dimension'] })}>{DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
        <button className="btn-primary text-sm" onClick={refresh}>查询</button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <h2 className="section-title text-base mb-3">发电趋势</h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats.trend}>
                <defs><linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F5A524" stopOpacity={0.3} /><stop offset="100%" stopColor="#F5A524" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="generationKwh" name="发电量" stroke="#F5A524" fill="url(#gGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-4">
            <h2 className="section-title text-base mb-3">天气与发电相关性</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.weatherStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="weather" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(w: string) => weatherIcon(w) + ' ' + weatherLabel(w)} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="avgGenerationKwh" name="平均发电量" radius={[4, 4, 0, 0]}>
                  {stats.weatherStats.map((ws) => <Cell key={ws.weather} fill={WEATHER_COLORS[ws.weather] || '#94A3B8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="table-header">
            <th className="table-cell text-left">日期</th><th className="table-cell text-left">组件</th>
            <th className="table-cell text-right">发电量</th><th className="table-cell text-left">天气</th>
            <th className="table-cell text-right">日照(h)</th><th className="table-cell text-right">温度(℃)</th>
            <th className="table-cell text-left">来源</th><th className="table-cell text-right">操作</th>
          </tr></thead>
          <tbody>
            {records?.length === 0 ? (
              <tr><td colSpan={8} className="table-cell text-center text-white/30 py-8">暂无记录</td></tr>
            ) : records?.map((r: GenerationRecord) => {
              const panel = allPanels.find((p) => p.id === r.panelId);
              return (
                <tr key={r.id} className="table-row">
                  <td className="table-cell">{r.date}</td>
                  <td className="table-cell">{panel?.brandModel || `#${r.panelId}`}</td>
                  <td className="table-cell text-right font-mono text-amber">{formatKwh(r.generationKwh)}</td>
                  <td className="table-cell"><span className={`badge-${r.weather} text-xs px-2 py-0.5 rounded-full`}>{weatherIcon(r.weather)} {weatherLabel(r.weather)}</span></td>
                  <td className="table-cell text-right font-mono">{r.sunshineHours}</td>
                  <td className="table-cell text-right font-mono">{r.temperature}</td>
                  <td className="table-cell text-white/40">{r.source === 'manual' ? '手动' : 'CSV'}</td>
                  <td className="table-cell text-right"><button className="p-1 rounded hover:bg-red-500/20 text-red-400" onClick={() => setConfirmDel(r.id)}><Trash2 className="w-3.5 h-3.5" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={entryModal} onClose={() => setEntryModal(false)} title="手动录入">
        <div className="space-y-3">
          <select className="select-field" value={entryForm.panelId} onChange={(e) => setEntryForm({ ...entryForm, panelId: +e.target.value })}>
            <option value={0}>选择组件</option>{allPanels.map((p) => <option key={p.id} value={p.id}>{p.brandModel}</option>)}
          </select>
          <input className="input-field" type="date" value={entryForm.date} onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })} />
          <input className="input-field" type="number" placeholder="发电量 (kWh)" value={entryForm.generationKwh || ''} onChange={(e) => setEntryForm({ ...entryForm, generationKwh: +e.target.value })} />
          <select className="select-field" value={entryForm.weather} onChange={(e) => setEntryForm({ ...entryForm, weather: e.target.value as WeatherType })}>
            {WEATHER_TYPES.map((w) => <option key={w} value={w}>{weatherIcon(w)} {weatherLabel(w)}</option>)}
          </select>
          <input className="input-field" type="number" placeholder="日照时长 (h)" value={entryForm.sunshineHours || ''} onChange={(e) => setEntryForm({ ...entryForm, sunshineHours: +e.target.value })} />
          <input className="input-field" type="number" placeholder="温度 (℃)" value={entryForm.temperature || ''} onChange={(e) => setEntryForm({ ...entryForm, temperature: +e.target.value })} />
          <button className="btn-primary w-full" onClick={submitEntry}>录入</button>
        </div>
      </Modal>

      <Modal open={csvModal} onClose={() => setCsvModal(false)} title="CSV 导入" width="max-w-xl">
        <div className="space-y-3">
          <textarea className="input-field min-h-[120px]" placeholder="粘贴 CSV 内容…" value={csvContent} onChange={(e) => setCsvContent(e.target.value)} />
          <button className="btn-primary w-full" onClick={submitCsv} disabled={!csvContent.trim()}>导入</button>
          {csvResult && (
            <div className="glass-card p-3 text-sm space-y-1">
              <p className="text-eco">成功导入：{csvResult.imported}</p>
              <p className="text-amber">跳过：{csvResult.skipped}</p>
              {csvResult.errors.length > 0 && <p className="text-red-400">错误：{csvResult.errors.join('；')}</p>}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={confirmDel != null} onClose={() => setConfirmDel(null)} title="确认删除">
        <p className="text-white/70 mb-4">确定要删除此发电记录吗？</p>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setConfirmDel(null)}>取消</button>
          <button className="btn-danger" onClick={doDelete}>删除</button>
        </div>
      </Modal>
    </div>
  );
}
