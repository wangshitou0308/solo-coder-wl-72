import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { orientationLabel, statusLabel } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import type { InverterWithPanels, Panel } from '@/types';
import { Sun, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const ORIENTATIONS = ['south', 'south_east', 'south_west', 'east', 'west', 'north'] as const;

const emptyInverter = { name: '', model: '', location: '', installDate: '', ratedPowerKw: 0 };
const emptyPanel = { inverterId: 0, brandModel: '', ratedPowerW: 0, installDate: '', orientation: 'south', tiltAngle: 30, location: '' };

export default function Panels() {
  const { data: inverters, loading, error, reload } = useApi(() => api.inverters.list());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [invModal, setInvModal] = useState<{ open: boolean; edit?: InverterWithPanels }>({ open: false });
  const [panelModal, setPanelModal] = useState<{ open: boolean; edit?: Panel; inverterId?: number }>({ open: false });
  const [confirmDel, setConfirmDel] = useState<{ type: 'inverter' | 'panel'; id: number } | null>(null);
  const [invForm, setInvForm] = useState(emptyInverter);
  const [panelForm, setPanelForm] = useState(emptyPanel);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openInvModal = (inv?: InverterWithPanels) => {
    if (inv) setInvForm({ name: inv.name, model: inv.model || '', location: inv.location || '', installDate: inv.installDate || '', ratedPowerKw: inv.ratedPowerKw || 0 });
    else setInvForm(emptyInverter);
    setInvModal({ open: true, edit: inv });
  };

  const openPanelModal = (p?: Panel, inverterId?: number) => {
    if (p) setPanelForm({ inverterId: p.inverterId, brandModel: p.brandModel, ratedPowerW: p.ratedPowerW, installDate: p.installDate || '', orientation: p.orientation, tiltAngle: p.tiltAngle, location: p.location || '' });
    else setPanelForm({ ...emptyPanel, inverterId: inverterId || inverters?.[0]?.id || 0 });
    setPanelModal({ open: true, edit: p, inverterId });
  };

  const saveInverter = async () => {
    if (invModal.edit) {
      await api.inverters.update(invModal.edit.id, invForm);
    } else {
      await api.inverters.create(invForm);
    }
    setInvModal({ open: false });
    reload();
  };

  const savePanel = async () => {
    if (panelModal.edit) {
      await api.panels.update(panelModal.edit.id, panelForm);
    } else {
      await api.panels.create(panelForm);
    }
    setPanelModal({ open: false });
    reload();
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    if (confirmDel.type === 'inverter') {
      await api.inverters.delete(confirmDel.id);
    } else {
      await api.panels.delete(confirmDel.id);
    }
    setConfirmDel(null);
    reload();
  };

  if (error) return <div className="flex items-center justify-center h-64 text-red-400">加载失败：{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="section-title flex items-center gap-2"><Sun className="w-5 h-5 text-amber" />组件管理</h1>
        <div className="flex gap-2">
          <button className="btn-primary flex items-center gap-1" onClick={() => openInvModal()}><Plus className="w-4 h-4" />添加逆变器</button>
          <button className="btn-secondary flex items-center gap-1" onClick={() => openPanelModal()} disabled={!inverters?.length}><Plus className="w-4 h-4" />添加组件</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[1, 2].map(i => <div key={i} className="glass-card animate-pulse h-32 rounded-xl" />)}</div>
      ) : inverters?.length === 0 ? (
        <div className="glass-card p-8 text-center text-white/40">暂无逆变器，请先添加</div>
      ) : inverters?.map((inv) => (
        <div key={inv.id} className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => toggle(inv.id)}>
            <div className="flex items-center gap-3">
              {expanded.has(inv.id) ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
              <div>
                <span className="font-semibold text-white">{inv.name}</span>
                <span className="text-white/40 text-sm ml-2">{inv.model}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/50">
              <span>{inv.panelCount} 块组件</span>
              <span>{inv.totalRatedPowerW}W</span>
              <button className="p-1.5 rounded hover:bg-white/10" onClick={(e) => { e.stopPropagation(); openInvModal(inv); }}><Pencil className="w-3.5 h-3.5" /></button>
              <button className="p-1.5 rounded hover:bg-red-500/20 text-red-400" onClick={(e) => { e.stopPropagation(); setConfirmDel({ type: 'inverter', id: inv.id }); }}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          {expanded.has(inv.id) && (
            <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {inv.panels.length === 0 ? (
                <p className="text-white/30 text-sm col-span-full">暂无组件</p>
              ) : inv.panels.map((p) => (
                <div key={p.id} className="stat-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white text-sm">{p.brandModel}</span>
                    <span className={`badge-${p.status} text-xs px-2 py-0.5 rounded-full`}>{statusLabel(p.status)}</span>
                  </div>
                  <div className="text-white/50 text-xs space-y-0.5">
                    <p>额定功率：{p.ratedPowerW}W</p>
                    <p>朝向：{orientationLabel(p.orientation)} · 倾角 {p.tiltAngle}°</p>
                    {p.location && <p>位置：{p.location}</p>}
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <button className="p-1 rounded hover:bg-white/10" onClick={() => openPanelModal(p)}><Pencil className="w-3 h-3 text-white/40" /></button>
                    <button className="p-1 rounded hover:bg-red-500/20 text-red-400" onClick={() => setConfirmDel({ type: 'panel', id: p.id })}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <Modal open={invModal.open} onClose={() => setInvModal({ open: false })} title={invModal.edit ? '编辑逆变器' : '添加逆变器'}>
        <div className="space-y-3">
          <input className="input-field" placeholder="名称" value={invForm.name} onChange={(e) => setInvForm({ ...invForm, name: e.target.value })} />
          <input className="input-field" placeholder="型号" value={invForm.model} onChange={(e) => setInvForm({ ...invForm, model: e.target.value })} />
          <input className="input-field" placeholder="位置" value={invForm.location} onChange={(e) => setInvForm({ ...invForm, location: e.target.value })} />
          <input className="input-field" type="date" value={invForm.installDate} onChange={(e) => setInvForm({ ...invForm, installDate: e.target.value })} />
          <input className="input-field" type="number" placeholder="额定功率 (kW)" value={invForm.ratedPowerKw || ''} onChange={(e) => setInvForm({ ...invForm, ratedPowerKw: +e.target.value })} />
          <button className="btn-primary w-full" onClick={saveInverter}>保存</button>
        </div>
      </Modal>

      <Modal open={panelModal.open} onClose={() => setPanelModal({ open: false })} title={panelModal.edit ? '编辑组件' : '添加组件'}>
        <div className="space-y-3">
          <select className="select-field" value={panelForm.inverterId} onChange={(e) => setPanelForm({ ...panelForm, inverterId: +e.target.value })}>
            <option value={0}>选择逆变器</option>
            {inverters?.map((inv) => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
          </select>
          <input className="input-field" placeholder="品牌型号" value={panelForm.brandModel} onChange={(e) => setPanelForm({ ...panelForm, brandModel: e.target.value })} />
          <input className="input-field" type="number" placeholder="额定功率 (W)" value={panelForm.ratedPowerW || ''} onChange={(e) => setPanelForm({ ...panelForm, ratedPowerW: +e.target.value })} />
          <input className="input-field" type="date" value={panelForm.installDate} onChange={(e) => setPanelForm({ ...panelForm, installDate: e.target.value })} />
          <select className="select-field" value={panelForm.orientation} onChange={(e) => setPanelForm({ ...panelForm, orientation: e.target.value })}>
            {ORIENTATIONS.map((o) => <option key={o} value={o}>{orientationLabel(o)}</option>)}
          </select>
          <input className="input-field" type="number" placeholder="倾角 (°)" value={panelForm.tiltAngle || ''} onChange={(e) => setPanelForm({ ...panelForm, tiltAngle: +e.target.value })} />
          <input className="input-field" placeholder="位置" value={panelForm.location} onChange={(e) => setPanelForm({ ...panelForm, location: e.target.value })} />
          <button className="btn-primary w-full" onClick={savePanel}>保存</button>
        </div>
      </Modal>

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="确认删除">
        <p className="text-white/70 mb-4">确定要删除此{confirmDel?.type === 'inverter' ? '逆变器' : '组件'}吗？此操作不可撤销。</p>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setConfirmDel(null)}>取消</button>
          <button className="btn-danger" onClick={doDelete}>删除</button>
        </div>
      </Modal>
    </div>
  );
}
