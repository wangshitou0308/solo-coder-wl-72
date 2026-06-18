import { Router, type Request, type Response } from 'express';
import { all, run } from '../db/database.js';
import { mapMaintenance, type MaintenanceRow, type PanelRow } from '../lib/mappers.js';
import type { MaintenanceStatsItem } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { panelId } = req.query;
  const where = panelId ? 'WHERE m.panel_id = ?' : '';
  const params = panelId ? [Number(panelId)] : [];
  const rows = all<MaintenanceRow & { brand_model: string }>(
    `SELECT m.*, p.brand_model FROM maintenance_record m
     JOIN panel p ON p.id = m.panel_id
     ${where} ORDER BY m.date DESC, m.id DESC`,
    ...params,
  );
  res.json(rows.map((r) => ({ ...mapMaintenance(r), brandModel: r.brand_model })));
});

router.post('/', (req: Request, res: Response) => {
  const { panelId, date, type, description, faultType, cost } = req.body ?? {};
  if (!panelId || !date || !type) {
    res.status(400).json({ error: '太阳能板、日期、维护类型为必填项' });
    return;
  }
  const r = run(
    `INSERT INTO maintenance_record (panel_id, date, type, description, fault_type, cost)
     VALUES (?, ?, ?, ?, ?, ?)`,
    Number(panelId), String(date), String(type),
    description ?? null, faultType ?? null, Number(cost) || 0,
  );
  if (String(type) === 'repair') {
    run(`UPDATE panel SET status = 'fault' WHERE id = ?`, Number(panelId));
  } else if (String(type) === 'inverter_check' || String(type) === 'inspect') {
    run(`UPDATE panel SET status = 'active' WHERE id = ?`, Number(panelId));
  }
  const created = all<MaintenanceRow>('SELECT * FROM maintenance_record WHERE id = ?', Number(r.lastInsertRowid));
  res.status(201).json(created[0] ? mapMaintenance(created[0]) : null);
});

router.delete('/:id', (req: Request, res: Response) => {
  run('DELETE FROM maintenance_record WHERE id = ?', Number(req.params.id));
  res.json({ success: true });
});

router.get('/stats', (_req: Request, res: Response) => {
  const panels = all<PanelRow>('SELECT * FROM panel');
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const stats: MaintenanceStatsItem[] = panels.map((p) => {
    const repairs = all<{ date: string }>(
      `SELECT date FROM maintenance_record WHERE panel_id = ? AND type = 'repair' ORDER BY date ASC`,
      p.id,
    );
    const lastMaint = all<{ date: string }>(
      `SELECT date FROM maintenance_record WHERE panel_id = ? ORDER BY date DESC LIMIT 1`,
      p.id,
    );
    const costRow = all<{ total: number | null }>(
      `SELECT SUM(cost) AS total FROM maintenance_record WHERE panel_id = ? AND type = 'repair'`,
      p.id,
    );
    const install = p.install_date ? new Date(p.install_date) : new Date(p.created_at);
    const runDays = Math.max(1, Math.floor((today.getTime() - install.getTime()) / 86400000));

    const faultCount = repairs.length;
    let avgFaultInterval: number | null = null;
    if (repairs.length >= 2) {
      let sum = 0;
      for (let i = 1; i < repairs.length; i++) {
        sum += (new Date(repairs[i].date).getTime() - new Date(repairs[i - 1].date).getTime()) / 86400000;
      }
      avgFaultInterval = Math.round(sum / (repairs.length - 1));
    }

    return {
      panelId: p.id,
      brandModel: p.brand_model,
      runDays,
      faultCount,
      avgFaultIntervalDays: avgFaultInterval,
      totalRepairCost: costRow[0]?.total ?? 0,
      lastMaintenanceDate: lastMaint[0]?.date,
    };
  });

  void todayStr;
  res.json(stats);
});

export default router;
