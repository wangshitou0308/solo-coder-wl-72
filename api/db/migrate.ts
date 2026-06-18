import { db, run, get, all } from './database.js';
import type { WeatherType } from '../../shared/types.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS inverter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  model TEXT,
  location TEXT,
  install_date TEXT,
  rated_power_kw REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS panel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inverter_id INTEGER NOT NULL,
  brand_model TEXT NOT NULL,
  rated_power_w REAL NOT NULL,
  install_date TEXT,
  orientation TEXT,
  tilt_angle REAL DEFAULT 0,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (inverter_id) REFERENCES inverter(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS generation_record (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  panel_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  generation_kwh REAL NOT NULL,
  weather TEXT NOT NULL DEFAULT 'sunny',
  sunshine_hours REAL DEFAULT 0,
  temperature REAL DEFAULT 0,
  self_used_kwh REAL DEFAULT 0,
  grid_sold_kwh REAL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (panel_id) REFERENCES panel(id) ON DELETE CASCADE,
  UNIQUE (panel_id, date)
);

CREATE TABLE IF NOT EXISTS maintenance_record (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  panel_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  fault_type TEXT,
  cost REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (panel_id) REFERENCES panel(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tariff_setting (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_in_tariff REAL NOT NULL DEFAULT 0.4,
  self_use_tariff REAL NOT NULL DEFAULT 0.6,
  investment_cost REAL NOT NULL DEFAULT 0,
  self_use_ratio REAL NOT NULL DEFAULT 0.5,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_generation_date ON generation_record(date);
CREATE INDEX IF NOT EXISTS idx_generation_panel ON generation_record(panel_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_panel ON maintenance_record(panel_id);
`;

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pickWeather(rand: () => number, month: number): WeatherType {
  const roll = rand();
  if (month >= 6 && month <= 8) {
    if (roll < 0.55) return 'sunny';
    if (roll < 0.78) return 'cloudy';
    if (roll < 0.9) return 'overcast';
    if (roll < 0.98) return 'rainy';
    return 'foggy';
  }
  if (month >= 3 && month <= 5 || month >= 9 && month <= 11) {
    if (roll < 0.38) return 'sunny';
    if (roll < 0.66) return 'cloudy';
    if (roll < 0.82) return 'overcast';
    if (roll < 0.94) return 'rainy';
    return 'foggy';
  }
  if (roll < 0.22) return 'sunny';
  if (roll < 0.5) return 'cloudy';
  if (roll < 0.72) return 'overcast';
  if (roll < 0.85) return 'rainy';
  return 'snowy';
}

function weatherFactor(w: WeatherType): number {
  switch (w) {
    case 'sunny': return 1;
    case 'cloudy': return 0.72;
    case 'overcast': return 0.45;
    case 'rainy': return 0.28;
    case 'foggy': return 0.35;
    case 'snowy': return 0.15;
  }
}

function seasonFactor(month: number): number {
  const peak = [0.62, 0.68, 0.82, 0.95, 1, 1.08, 1.1, 1.05, 0.92, 0.78, 0.64, 0.58];
  return peak[(month - 1) % 12] ?? 1;
}

export function migrateAndSeed(): void {
  db.exec(SCHEMA);

  const existing = get<{ c: number }>('SELECT COUNT(*) AS c FROM inverter');
  if (existing && existing.c > 0) return;

  run(
    `INSERT INTO tariff_setting (feed_in_tariff, self_use_tariff, investment_cost, self_use_ratio)
     VALUES (?, ?, ?, ?)`,
    0.41, 0.62, 32000, 0.55,
  );

  const inverters = [
    { name: '屋顶主逆变器', model: 'Huawei SUN2000-5KTL', location: '主屋顶', ratedPowerKw: 5, installDate: '2023-03-15' },
    { name: '车库副逆变器', model: 'Goodwe GW3600D-ES', location: '车库顶', ratedPowerKw: 3.6, installDate: '2023-05-20' },
  ];
  const inverterIds: number[] = [];
  for (const inv of inverters) {
    const r = run(
      `INSERT INTO inverter (name, model, location, rated_power_kw, install_date) VALUES (?, ?, ?, ?, ?)`,
      inv.name, inv.model, inv.location, inv.ratedPowerKw, inv.installDate,
    );
    inverterIds.push(Number(r.lastInsertRowid));
  }

  const panelSpecs = [
    { inv: 0, brandModel: '隆基 Hi-MO 6', ratedW: 450, orientation: 'south', tilt: 30, location: '主屋顶-东侧' },
    { inv: 0, brandModel: '隆基 Hi-MO 6', ratedW: 450, orientation: 'south', tilt: 30, location: '主屋顶-中侧' },
    { inv: 0, brandModel: '隆基 Hi-MO 6', ratedW: 450, orientation: 'south', tilt: 30, location: '主屋顶-西侧' },
    { inv: 0, brandModel: '晶科 Tiger Neo', ratedW: 460, orientation: 'south_west', tilt: 28, location: '主屋顶-南西' },
    { inv: 1, brandModel: '天合至尊 210', ratedW: 455, orientation: 'south', tilt: 25, location: '车库顶-东侧' },
    { inv: 1, brandModel: '天合至尊 210', ratedW: 455, orientation: 'east', tilt: 20, location: '车库顶-西侧' },
  ];

  const panelIds: number[] = [];
  for (const p of panelSpecs) {
    const status = p.location.includes('西') ? 'active' : 'active';
    const r = run(
      `INSERT INTO panel (inverter_id, brand_model, rated_power_w, install_date, orientation, tilt_angle, location, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      inverterIds[p.inv], p.brandModel, p.ratedW, inverters[p.inv].installDate, p.orientation, p.tilt, p.location, status,
    );
    panelIds.push(Number(r.lastInsertRowid));
  }

  const insertGen = db.prepare(
    `INSERT OR IGNORE INTO generation_record
     (panel_id, date, generation_kwh, weather, sunshine_hours, temperature, self_used_kwh, grid_sold_kwh, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'csv')`,
  );

  const today = new Date();
  const days = 120;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const month = d.getMonth() + 1;
    const dateStr = d.toISOString().slice(0, 10);

    panelIds.forEach((panelId, idx) => {
      const rand = seededRandom(panelId * 97 + i * 13 + 7);
      const weather = pickWeather(rand, month);
      const wf = weatherFactor(weather);
      const sf = seasonFactor(month);
      const spec = panelSpecs[idx];
      const baseKw = spec.ratedW / 1000;
      const noise = 0.82 + rand() * 0.36;
      const generation = +(baseKw * 4.2 * wf * sf * noise).toFixed(2);
      const sunshine = +(wf * (6 + rand() * 5)).toFixed(1);
      const temp = +(seasonFactor(month) * 12 + 8 + rand() * 10 - 5).toFixed(1);
      const selfUsedRatio = 0.4 + rand() * 0.3;
      const selfUsed = +(generation * selfUsedRatio).toFixed(2);
      const gridSold = +(generation - selfUsed).toFixed(2);
      insertGen.run(panelId, dateStr, generation, weather, sunshine, temp, selfUsed, gridSold);
    });
  }

  const maintTypes = ['clean', 'inspect', 'inverter_check', 'repair'] as const;
  const faultTypes = ['接线松动', '热斑效应', '逆变器报错', '积灰严重', '旁路二极管失效'];
  panelIds.forEach((panelId, idx) => {
    const rand = seededRandom(panelId * 53 + 11);
    const cur = new Date(today);
    cur.setDate(cur.getDate() - 100);
    for (let k = 0; k < 3; k++) {
      cur.setDate(cur.getDate() + Math.floor(20 + rand() * 25));
      const isFault = k === 1 && idx % 2 === 0;
      const type = isFault ? 'repair' : maintTypes[Math.floor(rand() * 3)];
      const dateStr = cur.toISOString().slice(0, 10);
      const desc = isFault
        ? `检测到异常，更换部件并复测`
        : type === 'clean' ? '常规清洁表面灰尘与鸟粪' : type === 'inspect' ? '检查接线与接地状态' : '逆变器固件检查与日志导出';
      const cost = isFault ? Math.floor(120 + rand() * 380) : Math.floor(20 + rand() * 60);
      run(
        `INSERT INTO maintenance_record (panel_id, date, type, description, fault_type, cost) VALUES (?, ?, ?, ?, ?, ?)`,
        panelId, dateStr, type, desc, isFault ? faultTypes[idx % faultTypes.length] : null, cost,
      );
    }
  });

  // mark one panel as fault for demo
  if (panelIds.length > 3) {
    run(`UPDATE panel SET status = 'fault' WHERE id = ?`, panelIds[3]);
  }
}

export function listPanels() {
  return all<{ id: number; inverter_id: number; brand_model: string; rated_power_w: number }>(
    'SELECT id, inverter_id, brand_model, rated_power_w FROM panel',
  );
}
