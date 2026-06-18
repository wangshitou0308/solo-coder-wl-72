import { Router, type Request, type Response } from 'express';
import { all, get, run } from '../db/database.js';
import {
  mapInverter,
  mapPanel,
  type InverterRow,
  type PanelRow,
} from '../lib/mappers.js';
import type { InverterWithPanels } from '../../shared/types.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const inverters = all<InverterRow>('SELECT * FROM inverter ORDER BY id');
  const panels = all<PanelRow>('SELECT * FROM panel ORDER BY id');
  const result: InverterWithPanels[] = inverters.map((inv) => {
    const panelsOfInv = panels.filter((p) => p.inverter_id === inv.id).map(mapPanel);
    const totalRatedPowerW = panelsOfInv.reduce((s, p) => s + p.ratedPowerW, 0);
    return {
      ...mapInverter(inv),
      panels: panelsOfInv,
      totalRatedPowerW,
      panelCount: panelsOfInv.length,
    };
  });
  res.json(result);
});

router.post('/', (req: Request, res: Response) => {
  const { name, model, location, installDate, ratedPowerKw } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: '逆变器名称不能为空' });
    return;
  }
  const r = run(
    `INSERT INTO inverter (name, model, location, install_date, rated_power_kw) VALUES (?, ?, ?, ?, ?)`,
    name, model ?? null, location ?? null, installDate ?? null, ratedPowerKw ?? 0,
  );
  const created = get<InverterRow>('SELECT * FROM inverter WHERE id = ?', Number(r.lastInsertRowid));
  res.status(201).json(created ? mapInverter(created) : null);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, model, location, installDate, ratedPowerKw } = req.body ?? {};
  run(
    `UPDATE inverter SET name = COALESCE(?, name), model = COALESCE(?, model),
     location = COALESCE(?, location), install_date = COALESCE(?, install_date),
     rated_power_kw = COALESCE(?, rated_power_kw) WHERE id = ?`,
    name ?? null, model ?? null, location ?? null, installDate ?? null, ratedPowerKw ?? null, id,
  );
  const updated = get<InverterRow>('SELECT * FROM inverter WHERE id = ?', id);
  res.json(updated ? mapInverter(updated) : null);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  run('DELETE FROM inverter WHERE id = ?', id);
  res.json({ success: true });
});

export default router;
