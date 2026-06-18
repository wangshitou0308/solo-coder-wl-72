import { Router, type Request, type Response } from 'express';
import Papa from 'papaparse';
import { all, get, run, type SqlParam } from '../db/database.js';
import { mapGeneration, todayStr, type GenerationRow, type PanelRow } from '../lib/mappers.js';
import type {
  WeatherType, TrendPoint, WeatherStat, PanelRankItem, StatsQuery,
} from '../../shared/types.js';
import { getTariff } from './revenue.js';

const router = Router();

const VALID_WEATHERS = new Set<WeatherType>(['sunny', 'cloudy', 'overcast', 'rainy', 'snowy', 'foggy']);

function normalizeWeather(raw: unknown): WeatherType {
  const v = String(raw ?? '').toLowerCase().trim();
  if (VALID_WEATHERS.has(v as WeatherType)) return v as WeatherType;
  const map: Record<string, WeatherType> = {
    晴: 'sunny', 晴天: 'sunny', 多云: 'cloudy', 阴: 'overcast', 阴天: 'overcast',
    雨: 'rainy', 下雨: 'rainy', 小雨: 'rainy', 雪: 'snowy', 下雪: 'snowy', 雾: 'foggy',
  };
  return map[v] ?? 'sunny';
}

router.get('/', (req: Request, res: Response) => {
  const { panelId, startDate, endDate, limit } = req.query;
  const conditions: string[] = [];
  const params: SqlParam[] = [];
  if (panelId) { conditions.push('panel_id = ?'); params.push(Number(panelId)); }
  if (startDate) { conditions.push('date >= ?'); params.push(String(startDate)); }
  if (endDate) { conditions.push('date <= ?'); params.push(String(endDate)); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM generation_record ${where} ORDER BY date DESC, id DESC LIMIT ?`;
  params.push(Number(limit) || 365);
  const rows = all<GenerationRow>(sql, ...params);
  res.json(rows.map(mapGeneration));
});

router.post('/', (req: Request, res: Response) => {
  const {
    panelId, date, generationKwh, weather, sunshineHours, temperature, selfUsedKwh, gridSoldKwh,
  } = req.body ?? {};
  if (!panelId || !date || generationKwh == null) {
    res.status(400).json({ error: '太阳能板、日期、发电量为必填项' });
    return;
  }
  const panel = get<PanelRow>('SELECT id FROM panel WHERE id = ?', Number(panelId));
  if (!panel) {
    res.status(404).json({ error: '太阳能板不存在' });
    return;
  }
  const gen = Number(generationKwh);
  const selfRatio = 0.55;
  const selfUsed = selfUsedKwh != null ? Number(selfUsedKwh) : +(gen * selfRatio).toFixed(2);
  const gridSold = gridSoldKwh != null ? Number(gridSoldKwh) : +(gen - selfUsed).toFixed(2);
  const r = run(
    `INSERT INTO generation_record (panel_id, date, generation_kwh, weather, sunshine_hours, temperature, self_used_kwh, grid_sold_kwh, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual')
     ON CONFLICT(panel_id, date) DO UPDATE SET
       generation_kwh = excluded.generation_kwh, weather = excluded.weather,
       sunshine_hours = excluded.sunshine_hours, temperature = excluded.temperature,
       self_used_kwh = excluded.self_used_kwh, grid_sold_kwh = excluded.grid_sold_kwh, source = 'manual'`,
    Number(panelId), String(date), gen, normalizeWeather(weather),
    Number(sunshineHours) || 0, Number(temperature) || 0, selfUsed, gridSold,
  );
  const created = get<GenerationRow>('SELECT * FROM generation_record WHERE id = ?', Number(r.lastInsertRowid));
  res.status(201).json(created ? mapGeneration(created) : null);
});

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_-]/g, '');
}

router.post('/import', (req: Request, res: Response) => {
  const { content } = req.body ?? {};
  if (!content) {
    res.status(400).json({ error: 'CSV 内容不能为空' });
    return;
  }
  const parsed = Papa.parse<Record<string, string>>(String(content), {
    header: true, skipEmptyLines: true,
  });
  if (!parsed.data.length) {
    res.status(400).json({ error: 'CSV 中未解析到数据行' });
    return;
  }

  const panels = all<PanelRow>('SELECT * FROM panel');
  const byBrand = new Map<string, number>();
  panels.forEach((p) => byBrand.set(p.brand_model, p.id));

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  const insertStmt = (() => {
    return (panelId: number, date: string, gen: number, weather: WeatherType,
      sun: number, temp: number, selfUsed: number, gridSold: number) => {
      const selfRatio = 0.55;
      const su = selfUsed || +(gen * selfRatio).toFixed(2);
      const gs = gridSold || +(gen - su).toFixed(2);
      run(
        `INSERT INTO generation_record (panel_id, date, generation_kwh, weather, sunshine_hours, temperature, self_used_kwh, grid_sold_kwh, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'csv')
         ON CONFLICT(panel_id, date) DO UPDATE SET
           generation_kwh = excluded.generation_kwh, weather = excluded.weather,
           sunshine_hours = excluded.sunshine_hours, temperature = excluded.temperature,
           self_used_kwh = excluded.self_used_kwh, grid_sold_kwh = excluded.grid_sold_kwh, source = 'csv'`,
        panelId, date, gen, weather, sun, temp, su, gs,
      );
    };
  })();

  for (const [i, row] of parsed.data.entries()) {
    const norm: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      norm[normalizeHeader(k)] = String(v ?? '').trim();
    }
    const date = norm.date || norm['日期'];
    const generationKwh = parseFloat(norm.generationkwh || norm.generation || norm.kwh || norm['发电量'] || norm['发电']);
    if (!date || isNaN(generationKwh)) {
      skipped++;
      errors.push(`第 ${i + 2} 行：日期或发电量缺失`);
      continue;
    }
    const panelIdRaw = norm.panelid || norm.panel || norm['板id'];
    const brandRaw = norm.brandmodel || norm.brand || norm.model || norm['型号'] || norm['品牌型号'];
    let panelId = panelIdRaw ? Number(panelIdRaw) : NaN;
    if (!panelId || isNaN(panelId)) {
      panelId = brandRaw ? (byBrand.get(brandRaw) ?? NaN) : NaN;
    }
    if (!panelId || isNaN(panelId)) {
      panelId = panels[0]?.id ?? NaN;
    }
    if (!panelId || isNaN(panelId)) {
      skipped++;
      errors.push(`第 ${i + 2} 行：未匹配到太阳能板`);
      continue;
    }
    const weather = normalizeWeather(norm.weather || norm['天气'] || 'sunny');
    const sun = parseFloat(norm.sunshinehours || norm.sunshine || norm['日照'] || '0') || 0;
    const temp = parseFloat(norm.temperature || norm.temp || norm['温度'] || '0') || 0;
    insertStmt(panelId, date, +generationKwh.toFixed(2), weather, sun, temp, 0, 0);
    imported++;
  }

  res.json({ imported, skipped, errors: errors.slice(0, 20) });
});

function periodExpr(dimension: StatsQuery['dimension']): string {
  switch (dimension) {
    case 'day': return "strftime('%Y-%m-%d', date)";
    case 'week': return "strftime('%Y-W%W', date)";
    case 'month': return "strftime('%Y-%m', date)";
    case 'year': return "strftime('%Y', date)";
  }
}

router.get('/stats', (req: Request, res: Response) => {
  const dimension = (req.query.dimension as StatsQuery['dimension']) || 'month';
  const { startDate, endDate, panelId } = req.query;
  const conditions: string[] = [];
  const params: SqlParam[] = [];
  if (startDate) { conditions.push('date >= ?'); params.push(String(startDate)); }
  if (endDate) { conditions.push('date <= ?'); params.push(String(endDate)); }
  if (panelId) { conditions.push('panel_id = ?'); params.push(Number(panelId)); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const expr = periodExpr(dimension);
  const tariff = getTariff();
  const blended = tariff.selfUseRatio * tariff.selfUseTariff + (1 - tariff.selfUseRatio) * tariff.feedInTariff;

  const trendRows = all<{ label: string; generation_kwh: number; self_used_kwh: number; grid_sold_kwh: number }>(
    `SELECT ${expr} AS label, SUM(generation_kwh) AS generation_kwh,
            SUM(self_used_kwh) AS self_used_kwh, SUM(grid_sold_kwh) AS grid_sold_kwh
     FROM generation_record ${where}
     GROUP BY ${expr} ORDER BY label ASC`,
    ...params,
  );
  const trend: TrendPoint[] = trendRows.map((r) => ({
    label: r.label,
    generationKwh: +r.generation_kwh.toFixed(2),
    revenue: +(r.generation_kwh * blended).toFixed(2),
  }));

  const weatherRows = all<{ weather: string; count: number; avg_generation_kwh: number; total_kwh: number }>(
    `SELECT weather, COUNT(*) AS count, AVG(generation_kwh) AS avg_generation_kwh,
            SUM(generation_kwh) AS total_kwh
     FROM generation_record ${where}
     GROUP BY weather ORDER BY avg_generation_kwh DESC`,
    ...params,
  );
  const weatherStats: WeatherStat[] = weatherRows.map((r) => ({
    weather: r.weather as WeatherType,
    count: r.count,
    avgGenerationKwh: +r.avg_generation_kwh.toFixed(2),
    totalKwh: +r.total_kwh.toFixed(2),
  }));

  res.json({ trend, weatherStats, dimension });
});

router.get('/panel-rank', (_req: Request, res: Response) => {
  const rows = all<{
    panel_id: number; brand_model: string; location: string | null;
    rated_power_w: number; total_kwh: number; record_count: number; first_date: string; last_date: string;
  }>(
    `SELECT p.id AS panel_id, p.brand_model, p.location, p.rated_power_w,
            COALESCE(SUM(g.generation_kwh), 0) AS total_kwh,
            COUNT(g.id) AS record_count,
            MIN(g.date) AS first_date, MAX(g.date) AS last_date
     FROM panel p LEFT JOIN generation_record g ON g.panel_id = p.id
     GROUP BY p.id ORDER BY total_kwh DESC`,
  );
  const rank: PanelRankItem[] = rows.map((r) => {
    const kw = r.rated_power_w / 1000;
    const days = r.record_count || 1;
    return {
      panelId: r.panel_id,
      brandModel: r.brand_model,
      location: r.location ?? undefined,
      avgDailyKwh: +(r.total_kwh / days).toFixed(2),
      kwhPerKw: kw > 0 ? +(r.total_kwh / kw).toFixed(2) : 0,
      totalKwh: +r.total_kwh.toFixed(2),
    };
  });
  res.json(rank);
});

router.get('/today', (_req: Request, res: Response) => {
  const rows = all<GenerationRow>(
    `SELECT * FROM generation_record WHERE date = ? ORDER BY id`, todayStr(),
  );
  res.json(rows.map(mapGeneration));
});

export default router;
