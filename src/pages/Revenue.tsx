import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatKwh, formatYuan, formatCarbon, formatPercent } from '@/lib/format';
import type { TariffSetting } from '@/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Leaf, TreePine, Flame, Save, TrendingUp } from 'lucide-react';

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
          {p.name}: {typeof p.value === 'number' ? formatYuan(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function Revenue() {
  const { data: tariff, loading: tLoad, reload: reloadTariff } = useApi(() => api.revenue.tariff());
  const { data: summary, loading: sLoad, reload: reloadSummary } = useApi(() => api.revenue.summary());
  const { data: payback, loading: pLoad, reload: reloadPayback } = useApi(() => api.revenue.payback());
  const { data: carbon, loading: cLoad, reload: reloadCarbon } = useApi(() => api.revenue.carbon());

  const [form, setForm] = useState<Partial<TariffSetting>>({});
  const [saving, setSaving] = useState(false);

  const loadedTariff = tariff && !form.feedInTariff && form.feedInTariff !== 0 ? tariff : null;
  const displayForm = loadedTariff
    ? { feedInTariff: tariff.feedInTariff, selfUseTariff: tariff.selfUseTariff, investmentCost: tariff.investmentCost, selfUseRatio: tariff.selfUseRatio }
    : form;

  const initForm = () => {
    if (!tariff) return;
    setForm({
      feedInTariff: tariff.feedInTariff,
      selfUseTariff: tariff.selfUseTariff,
      investmentCost: tariff.investmentCost,
      selfUseRatio: tariff.selfUseRatio,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const safeNum = (v: number | undefined, fallback: number | undefined) => {
        if (v === undefined || v === null || isNaN(v)) return fallback;
        return v;
      };
      const payload: Partial<TariffSetting> = {
        feedInTariff: safeNum(form.feedInTariff, tariff?.feedInTariff),
        selfUseTariff: safeNum(form.selfUseTariff, tariff?.selfUseTariff),
        investmentCost: safeNum(form.investmentCost, tariff?.investmentCost),
        selfUseRatio: safeNum(form.selfUseRatio, tariff?.selfUseRatio),
      };
      await api.revenue.updateTariff(payload);
      await Promise.all([
        reloadTariff(),
        reloadSummary(),
        reloadPayback(),
        reloadCarbon(),
      ]);
      setForm({});
    } finally {
      setSaving(false);
    }
  };

  const ratio = payback?.recoveredRatio || 0;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference * (1 - ratio);

  return (
    <div className="space-y-6">
      <h1 className="section-title flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-cyan" />
        收益分析
      </h1>

      <div className="glass-card p-5">
        <h2 className="section-title text-base mb-4">电价设置</h2>
        {tLoad ? (
          <div className="animate-pulse h-32 bg-white/5 rounded" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-white/40 text-xs block mb-1">上网电价 (元/kWh)</label>
              <input className="input-field" type="number" step="0.01"
                value={displayForm.feedInTariff ?? ''}
                onChange={(e) => setForm({ ...form, feedInTariff: +e.target.value })}
                onFocus={initForm} />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">自用电价 (元/kWh)</label>
              <input className="input-field" type="number" step="0.01"
                value={displayForm.selfUseTariff ?? ''}
                onChange={(e) => setForm({ ...form, selfUseTariff: +e.target.value })}
                onFocus={initForm} />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">总投资 (元)</label>
              <input className="input-field" type="number" step="100"
                value={displayForm.investmentCost ?? ''}
                onChange={(e) => setForm({ ...form, investmentCost: +e.target.value })}
                onFocus={initForm} />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">自用比例</label>
              <input className="input-field" type="number" step="0.01" min="0" max="1"
                value={displayForm.selfUseRatio ?? ''}
                onChange={(e) => setForm({ ...form, selfUseRatio: +e.target.value })}
                onFocus={initForm} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button className="btn-primary flex items-center gap-1" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4" />{saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sLoad ? (
          <><div className="animate-pulse h-24 glass-card" /><div className="animate-pulse h-24 glass-card" /><div className="animate-pulse h-24 glass-card" /></>
        ) : summary && (
          <>
            <div className="stat-card">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-eco/15 flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-eco" />
                </div>
                <span className="stat-label">自用节省</span>
              </div>
              <span className="stat-value font-mono text-eco">{formatYuan(summary.todaySelfUseSaving)}</span>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan/15 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-cyan" />
                </div>
                <span className="stat-label">上网收入</span>
              </div>
              <span className="stat-value font-mono text-cyan">{formatYuan(summary.todayGridIncome)}</span>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber/15 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-amber" />
                </div>
                <span className="stat-label">今日总收益</span>
              </div>
              <span className="stat-value font-mono text-amber">{formatYuan(summary.todayRevenue)}</span>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5 flex flex-col items-center justify-center">
          <h2 className="section-title text-base mb-4 self-start">回本进度</h2>
          {pLoad ? (
            <div className="animate-pulse h-48 w-48 bg-white/5 rounded-full" />
          ) : payback && (
            <div className="flex flex-col items-center">
              <svg width="140" height="140" className="-rotate-90">
                <circle cx="70" cy="70" r="54" stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
                <circle cx="70" cy="70" r="54" stroke="#F5A524" strokeWidth="10" fill="none"
                  strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
                  className="transition-all duration-700" />
              </svg>
              <div className="text-center -mt-24 mb-6">
                <span className="text-3xl font-mono text-amber">{formatPercent(ratio)}</span>
                <p className="text-white/40 text-xs mt-1">已回收</p>
              </div>
              <div className="text-center space-y-1 text-sm text-white/60">
                <p>累计收益：{formatYuan(payback.totalRevenue)}</p>
                <p>剩余：{formatYuan(payback.remainingAmount)}</p>
                {payback.estimatedMonths != null && (
                  <p>预计回本：<span className="text-amber font-mono">{payback.estimatedMonths}</span> 个月</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <h2 className="section-title text-base mb-3">月度收益趋势</h2>
          {pLoad ? (
            <div className="animate-pulse h-60 bg-white/5 rounded" />
          ) : payback?.monthlyTrend && (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={payback.monthlyTrend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="revenue" name="收益" stroke="#38BDF8" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass-card p-5">
        <h2 className="section-title text-base mb-4">减碳贡献</h2>
        {cLoad ? (
          <div className="animate-pulse h-24 bg-white/5 rounded" />
        ) : carbon && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <Flame className="w-5 h-5 text-amber mx-auto mb-1" />
              <p className="stat-value font-mono text-amber text-lg">{formatKwh(carbon.totalGenerationKwh)}</p>
              <p className="stat-label">总发电量</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <Leaf className="w-5 h-5 text-eco mx-auto mb-1" />
              <p className="stat-value font-mono text-eco text-lg">{formatCarbon(carbon.carbonKg)}</p>
              <p className="stat-label">碳减排</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <TreePine className="w-5 h-5 text-eco mx-auto mb-1" />
              <p className="stat-value font-mono text-eco text-lg">{carbon.equivalentTrees}</p>
              <p className="stat-label">等效植树</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <p className="stat-value font-mono text-orange-400 text-lg">{carbon.equivalentCoalKg.toFixed(0)} kg</p>
              <p className="stat-label">等效节煤</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
