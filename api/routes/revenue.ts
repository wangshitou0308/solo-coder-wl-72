import { Router, type Request, type Response } from 'express';
import { all, get, run } from '../db/database.js';
import { mapTariff, todayStr, type TariffRow } from '../lib/mappers.js';
import type {
  TariffSetting, RevenueSummary, PaybackProgress, CarbonSummary, TrendPoint,
} from '../../shared/types.js';

const router = Router();

const CARBON_FACTOR_KG_PER_KWH = 0.785;
const TREE_CO2_KG_PER_YEAR = 22;
const COAL_KG_PER_KWH = 0.4;

export function getTariff(): TariffSetting {
  const row = get<TariffRow>('SELECT * FROM tariff_setting ORDER BY id DESC LIMIT 1');
  if (!row) {
    run(`INSERT INTO tariff_setting (feed_in_tariff, self_use_tariff, investment_cost, self_use_ratio)
         VALUES (0.41, 0.62, 32000, 0.55)`);
    const fresh = get<TariffRow>('SELECT * FROM tariff_setting ORDER BY id DESC LIMIT 1')!;
    return mapTariff(fresh);
  }
  return mapTariff(row);
}

router.get('/tariff', (_req: Request, res: Response) => {
  res.json(getTariff());
});

router.put('/tariff', (req: Request, res: Response) => {
  const { feedInTariff, selfUseTariff, investmentCost, selfUseRatio } = req.body ?? {};
  const current = getTariff();
  run(
    `UPDATE tariff_setting SET
       feed_in_tariff = ?, self_use_tariff = ?, investment_cost = ?, self_use_ratio = ?,
       updated_at = datetime('now') WHERE id = ?`,
    feedInTariff ?? current.feedInTariff,
    selfUseTariff ?? current.selfUseTariff,
    investmentCost ?? current.investmentCost,
    selfUseRatio ?? current.selfUseRatio,
    current.id,
  );
  res.json(getTariff());
});

router.get('/summary', (req: Request, res: Response) => {
  const tariff = getTariff();
  const date = (req.query.date as string) || todayStr();
  const row = get<{ gen: number | null; su: number | null; gs: number | null }>(
    `SELECT SUM(generation_kwh) AS gen, SUM(self_used_kwh) AS su, SUM(grid_sold_kwh) AS gs
     FROM generation_record WHERE date = ?`,
    date,
  );
  const gen = row?.gen ?? 0;
  const su = row?.su ?? 0;
  const gs = row?.gs ?? 0;
  const selfUseSaving = su * tariff.selfUseTariff;
  const gridIncome = gs * tariff.feedInTariff;
  const summary: RevenueSummary = {
    todayGenerationKwh: +gen.toFixed(2),
    todaySelfUsedKwh: +su.toFixed(2),
    todayGridSoldKwh: +gs.toFixed(2),
    todaySelfUseSaving: +selfUseSaving.toFixed(2),
    todayGridIncome: +gridIncome.toFixed(2),
    todayRevenue: +(selfUseSaving + gridIncome).toFixed(2),
  };
  res.json(summary);
});

router.get('/payback', (_req: Request, res: Response) => {
  const tariff = getTariff();
  const total = get<{ total_revenue: number | null; total_kwh: number | null }>(
    `SELECT SUM(self_used_kwh * ? + grid_sold_kwh * ?) AS total_revenue,
            SUM(generation_kwh) AS total_kwh FROM generation_record`,
    tariff.selfUseTariff, tariff.feedInTariff,
  );
  const totalRevenue = total?.total_revenue ?? 0;
  const investmentCost = tariff.investmentCost || 0;

  const monthlyRows = all<{ label: string; revenue: number | null }>(
    `SELECT strftime('%Y-%m', date) AS label,
            SUM(self_used_kwh * ? + grid_sold_kwh * ?) AS revenue
     FROM generation_record
     GROUP BY label ORDER BY label DESC LIMIT 12`,
    tariff.selfUseTariff, tariff.feedInTariff,
  );
  const monthlyTrend: TrendPoint[] = monthlyRows.reverse().map((r) => ({
    label: r.label,
    generationKwh: 0,
    revenue: +(r.revenue ?? 0).toFixed(2),
  }));

  const avgMonthly = monthlyTrend.length
    ? monthlyTrend.reduce((s, m) => s + m.revenue, 0) / monthlyTrend.length
    : 0;

  const recoveredRatio = investmentCost > 0 ? +(totalRevenue / investmentCost).toFixed(4) : 0;
  const remainingAmount = Math.max(0, investmentCost - totalRevenue);
  const estimatedMonths = avgMonthly > 0 ? Math.ceil(remainingAmount / avgMonthly) : null;

  const progress: PaybackProgress = {
    totalRevenue: +totalRevenue.toFixed(2),
    investmentCost,
    recoveredRatio,
    remainingAmount: +remainingAmount.toFixed(2),
    estimatedMonths,
    monthlyTrend,
  };
  res.json(progress);
});

router.get('/carbon', (_req: Request, res: Response) => {
  const total = get<{ total_kwh: number | null }>(
    `SELECT SUM(generation_kwh) AS total_kwh FROM generation_record`,
  );
  const totalKwh = total?.total_kwh ?? 0;
  const carbonKg = totalKwh * CARBON_FACTOR_KG_PER_KWH;
  const summary: CarbonSummary = {
    totalGenerationKwh: +totalKwh.toFixed(2),
    carbonKg: +carbonKg.toFixed(2),
    carbonTon: +(carbonKg / 1000).toFixed(2),
    equivalentTrees: +Math.ceil(carbonKg / TREE_CO2_KG_PER_YEAR).toFixed(0),
    equivalentCoalKg: +(totalKwh * COAL_KG_PER_KWH).toFixed(2),
  };
  res.json(summary);
});

export default router;
