import { Router, type Request, type Response } from 'express';
import { get, run } from '../db/database.js';
import { mapPanel, type PanelRow } from '../lib/mappers.js';
import type { Panel } from '../../shared/types.js';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const {
    inverterId, brandModel, ratedPowerW, installDate, orientation, tiltAngle, location, status,
  } = req.body ?? {};
  if (!inverterId || !brandModel || !ratedPowerW) {
    res.status(400).json({ error: '逆变器、品牌型号、额定功率为必填项' });
    return;
  }
  const r = run(
    `INSERT INTO panel (inverter_id, brand_model, rated_power_w, install_date, orientation, tilt_angle, location, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    inverterId, brandModel, ratedPowerW, installDate ?? null,
    orientation ?? 'south', tiltAngle ?? 0, location ?? null, status ?? 'active',
  );
  const created = get<PanelRow>('SELECT * FROM panel WHERE id = ?', Number(r.lastInsertRowid));
  res.status(201).json(created ? mapPanel(created) : null);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const {
    inverterId, brandModel, ratedPowerW, installDate, orientation, tiltAngle, location, status,
  } = req.body ?? {};
  run(
    `UPDATE panel SET
       inverter_id = COALESCE(?, inverter_id),
       brand_model = COALESCE(?, brand_model),
       rated_power_w = COALESCE(?, rated_power_w),
       install_date = COALESCE(?, install_date),
       orientation = COALESCE(?, orientation),
       tilt_angle = COALESCE(?, tilt_angle),
       location = COALESCE(?, location),
       status = COALESCE(?, status)
     WHERE id = ?`,
    inverterId ?? null, brandModel ?? null, ratedPowerW ?? null, installDate ?? null,
    orientation ?? null, tiltAngle ?? null, location ?? null, status ?? null, id,
  );
  const updated = get<PanelRow>('SELECT * FROM panel WHERE id = ?', id);
  res.json(updated ? mapPanel(updated) : null);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  run('DELETE FROM panel WHERE id = ?', id);
  res.json({ success: true });
});

export default router;

export function findPanel(id: number): Panel | undefined {
  const row = get<PanelRow>('SELECT * FROM panel WHERE id = ?', id);
  return row ? mapPanel(row) : undefined;
}
