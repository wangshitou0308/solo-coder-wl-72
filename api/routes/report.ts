import { Router, type Request, type Response } from 'express';
import { all, get } from '../db/database.js';
import { type GenerationRow } from '../lib/mappers.js';
import type { WeatherType, TrendPoint, WeatherStat, AnnualReport } from '../../shared/types.js';
import { getTariff } from './revenue.js';

const router = Router();

const CARBON_FACTOR = 0.785;

router.get('/annual', (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const tariff = getTariff();

  const totals = get<{ gen: number | null; su: number | null; gs: number | null }>(
    `SELECT SUM(generation_kwh) AS gen, SUM(self_used_kwh) AS su, SUM(grid_sold_kwh) AS gs
     FROM generation_record WHERE strftime('%Y', date) = ?`,
    String(year),
  );
  const gen = totals?.gen ?? 0;
  const su = totals?.su ?? 0;
  const gs = totals?.gs ?? 0;
  const selfUseSaving = su * tariff.selfUseTariff;
  const gridIncome = gs * tariff.feedInTariff;

  const monthlyRows = all<{ label: string; generation_kwh: number | null }>(
    `SELECT strftime('%m', date) AS label, SUM(generation_kwh) AS generation_kwh
     FROM generation_record WHERE strftime('%Y', date) = ?
     GROUP BY label ORDER BY label ASC`,
    String(year),
  );
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const monthly: TrendPoint[] = monthNames.map((label, idx) => {
    const found = monthlyRows.find((r) => Number(r.label) === idx + 1);
    const g = found?.generation_kwh ?? 0;
    return {
      label,
      generationKwh: +g.toFixed(2),
      revenue: +(g * (tariff.selfUseRatio * tariff.selfUseTariff + (1 - tariff.selfUseRatio) * tariff.feedInTariff)).toFixed(2),
    };
  });

  const weatherRows = all<{ weather: string; count: number; avg_generation_kwh: number | null; total_kwh: number | null }>(
    `SELECT weather, COUNT(*) AS count, AVG(generation_kwh) AS avg_generation_kwh,
            SUM(generation_kwh) AS total_kwh
     FROM generation_record WHERE strftime('%Y', date) = ?
     GROUP BY weather ORDER BY avg_generation_kwh DESC`,
    String(year),
  );
  const weatherStats: WeatherStat[] = weatherRows.map((r) => ({
    weather: r.weather as WeatherType,
    count: r.count,
    avgGenerationKwh: +(r.avg_generation_kwh ?? 0).toFixed(2),
    totalKwh: +(r.total_kwh ?? 0).toFixed(2),
  }));

  const panelCount = get<{ c: number }>('SELECT COUNT(*) AS c FROM panel')?.c ?? 0;

  const report: AnnualReport = {
    year,
    totalGenerationKwh: +gen.toFixed(2),
    totalRevenue: +(selfUseSaving + gridIncome).toFixed(2),
    totalSelfUseSaving: +selfUseSaving.toFixed(2),
    totalGridIncome: +gridIncome.toFixed(2),
    carbonKg: +(gen * CARBON_FACTOR).toFixed(2),
    monthly,
    weatherStats,
    panelCount,
  };

  void all<GenerationRow>;
  res.json(report);
});

export default router;
