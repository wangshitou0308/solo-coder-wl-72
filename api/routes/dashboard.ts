import { Router, type Request, type Response } from 'express';
import { get } from '../db/database.js';
import { todayStr } from '../lib/mappers.js';
import type { DashboardSummary } from '../../shared/types.js';
import { getTariff } from './revenue.js';

const router = Router();

const CARBON_FACTOR = 0.785;

router.get('/summary', (req: Request, res: Response) => {
  const tariff = getTariff();
  const date = (req.query.date as string) || todayStr();

  const today = get<{ gen: number | null; su: number | null; gs: number | null }>(
    `SELECT SUM(generation_kwh) AS gen, SUM(self_used_kwh) AS su, SUM(grid_sold_kwh) AS gs
     FROM generation_record WHERE date = ?`,
    date,
  );
  const todayGen = today?.gen ?? 0;
  const todaySu = today?.su ?? 0;
  const todayGs = today?.gs ?? 0;

  const total = get<{ gen: number | null; su: number | null; gs: number | null }>(
    `SELECT SUM(generation_kwh) AS gen, SUM(self_used_kwh) AS su, SUM(grid_sold_kwh) AS gs
     FROM generation_record`,
  );
  const totalGen = total?.gen ?? 0;
  const totalSu = total?.su ?? 0;
  const totalGs = total?.gs ?? 0;

  const panelCounts = get<{ total: number | null; active: number | null }>(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active FROM panel`,
  );

  const summary: DashboardSummary = {
    todayGenerationKwh: +todayGen.toFixed(2),
    todayRevenue: +(todaySu * tariff.selfUseTariff + todayGs * tariff.feedInTariff).toFixed(2),
    todaySaving: +(todaySu * tariff.selfUseTariff).toFixed(2),
    todayCarbonKg: +(todayGen * CARBON_FACTOR).toFixed(2),
    totalGenerationKwh: +totalGen.toFixed(2),
    totalRevenue: +(totalSu * tariff.selfUseTariff + totalGs * tariff.feedInTariff).toFixed(2),
    totalCarbonKg: +(totalGen * CARBON_FACTOR).toFixed(2),
    panelCount: panelCounts?.total ?? 0,
    activePanelCount: panelCounts?.active ?? 0,
  };

  res.json(summary);
});

export default router;
