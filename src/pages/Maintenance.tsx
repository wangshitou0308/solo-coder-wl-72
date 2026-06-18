import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { maintenanceTypeLabel, formatDate, todayISO } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import type { MaintenanceRecord, MaintenanceStatsItem, InverterWithPanels, MaintenanceType } from '@/types';
import { Wrench, Plus, Trash2, AlertTriangle, Calendar } from 'lucide-react';

const TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'clean', label: '清洁' },
  { value: 'inspect', label: '检查接线' },
  { value: 'repair', label: '故障维修' },
  { value: 'inverter_check', label: '逆变器检查' },
];

const TYPE_COLORS: Record<string, string> = {
  clean: 'bg-cyan/15 text-cyan',
  inspect: 'bg-amber/15 text-amber',
  repair: 'bg-red-500/15 text-red-400',
  inverter_check: 'bg-purple-500/15 text-purple-400',
};

export default function Maintenance() {
  const { data: records, loading: rLoad, reload: reloadRecords } = useApi(() => api.maintenance.list());
  const { data: stats, loading: sLoad } = useApi(() => api.maintenance.stats());
  const { data: inverters } = useApi(() => api.inverters.list());

  const allPanels = inverters?.flatMap((inv: InverterWithPanels) => inv.panels) || [];

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ panelId: 0, date: todayISO(), type: 'clean' as MaintenanceType, description: '', faultType: '', cost: 0 });
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: Partial<MaintenanceRecord> = {
        panelId: form.panelId,
        date: form.date,
        type: form.type,
        description: form.description,
        cost: form.cost,
      };
      if (form.type === 'repair') payload.faultType = form.faultType;
      await api.maintenance.create(payload);
      setModal(false);
      reloadRecords();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmDel == null) return;
    await api.maintenance.delete(confirmDel);
    setConfirmDel(null);
    reloadRecords();
  };

  const openModal = () => {
    setForm({ panelId: allPanels[0]?.id || 0, date: todayISO(), type: 'clean', description: '', faultType: '', cost: 0 });
    setModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="section-title flex items-center gap-2">
          <Wrench className="w-5 h-5 text-amber" />
          设备维护
        </h1>
        <button className="btn-primary flex items-center gap-1" onClick={openModal}>
          <Plus className="w-4 h-4" />新增记录
        </button>
      </div>

      <div className="glass-card p-5">
        <h2 className="section-title text-base mb-4">维护记录</h2>
        {rLoad ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="animate-pulse h-16 bg-white/5 rounded" />)}</div>
        ) : records && records.length > 0 ? (
          <div className="relative pl-6 border-l-2 border-white/10 space-y-4">
            {records.map((r: MaintenanceRecord & { brandModel?: string }) => {
              const isRepair = r.type === 'repair';
              const colorClass = TYPE_COLORS[r.type] || 'bg-white/10 text-white/60';
              return (
                <div key={r.id} className="relative">
                  <div className={`absolute -left-[25px] top-2 w-3 h-3 rounded-full border-2 ${isRepair ? 'border-red-400 bg-red-400/30' : 'border-amber bg-amber/30'}`} />
                  <div className={`glass-card p-3 ${isRepair ? 'border-red-500/20' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>{maintenanceTypeLabel(r.type)}</span>
                        <span className="text-white/40 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{formatDate(r.date)}
                        </span>
                        <span className="text-white/40 text-xs">{r.brandModel || `面板 #${r.panelId}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.cost > 0 && <span className="text-xs text-white/50 font-mono">¥{r.cost.toFixed(2)}</span>}
                        <button className="p-1 rounded hover:bg-red-500/20 text-red-400" onClick={() => setConfirmDel(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-white/70">{r.description}</p>
                    {isRepair && r.faultType && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />故障类型：{r.faultType}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-white/40 text-sm text-center py-8">暂无维护记录</p>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10">
          <h2 className="section-title text-base">面板维护统计</h2>
        </div>
        {sLoad ? (
          <div className="p-5 space-y-2">{[1, 2, 3].map(i => <div key={i} className="animate-pulse h-8 bg-white/5 rounded" />)}</div>
        ) : stats && stats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="table-cell text-left">组件型号</th>
                  <th className="table-cell text-right">运行天数</th>
                  <th className="table-cell text-right">故障次数</th>
                  <th className="table-cell text-right">平均故障间隔(天)</th>
                  <th className="table-cell text-right">总维修费用</th>
                  <th className="table-cell text-left">最近维护</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s: MaintenanceStatsItem) => (
                  <tr key={s.panelId} className="table-row">
                    <td className="table-cell font-medium">{s.brandModel}</td>
                    <td className="table-cell text-right font-mono">{s.runDays}</td>
                    <td className="table-cell text-right font-mono">
                      {s.faultCount > 0 ? (
                        <span className="badge-fault text-xs px-2 py-0.5 rounded-full">{s.faultCount}</span>
                      ) : s.faultCount}
                    </td>
                    <td className="table-cell text-right font-mono">
                      {s.avgFaultIntervalDays != null ? s.avgFaultIntervalDays : '-'}
                    </td>
                    <td className="table-cell text-right font-mono">¥{s.totalRepairCost.toFixed(2)}</td>
                    <td className="table-cell">{s.lastMaintenanceDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-white/40 text-sm text-center py-8">暂无统计数据</p>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="新增维护记录">
        <div className="space-y-3">
          <div>
            <label className="text-white/40 text-xs block mb-1">组件</label>
            <select className="select-field" value={form.panelId} onChange={(e) => setForm({ ...form, panelId: +e.target.value })}>
              <option value={0}>选择组件</option>
              {allPanels.map(p => <option key={p.id} value={p.id}>{p.brandModel}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/40 text-xs block mb-1">日期</label>
            <input className="input-field" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="text-white/40 text-xs block mb-1">类型</label>
            <select className="select-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MaintenanceType })}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {form.type === 'repair' && (
            <div>
              <label className="text-white/40 text-xs block mb-1">故障类型</label>
              <input className="input-field" placeholder="如：热斑、隐裂…" value={form.faultType} onChange={(e) => setForm({ ...form, faultType: e.target.value })} />
            </div>
          )}
          <div>
            <label className="text-white/40 text-xs block mb-1">描述</label>
            <textarea className="input-field min-h-[80px]" placeholder="维护详情…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="text-white/40 text-xs block mb-1">费用 (元)</label>
            <input className="input-field" type="number" step="0.01" value={form.cost || ''} onChange={(e) => setForm({ ...form, cost: +e.target.value })} />
          </div>
          <button className="btn-primary w-full" onClick={handleSubmit} disabled={submitting || !form.panelId}>
            {submitting ? '提交中…' : '提交'}
          </button>
        </div>
      </Modal>

      <Modal open={confirmDel != null} onClose={() => setConfirmDel(null)} title="确认删除">
        <p className="text-white/70 mb-4">确定要删除此维护记录吗？</p>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setConfirmDel(null)}>取消</button>
          <button className="btn-danger" onClick={handleDelete}>删除</button>
        </div>
      </Modal>
    </div>
  );
}
