import type {
  Inverter,
  Panel,
  GenerationRecord,
  MaintenanceRecord,
  TariffSetting,
} from '../../shared/types.js';

export interface InverterRow {
  id: number;
  name: string;
  model: string | null;
  location: string | null;
  install_date: string | null;
  rated_power_kw: number | null;
  created_at: string;
}

export interface PanelRow {
  id: number;
  inverter_id: number;
  brand_model: string;
  rated_power_w: number;
  install_date: string | null;
  orientation: string | null;
  tilt_angle: number;
  location: string | null;
  status: string;
  created_at: string;
}

export interface GenerationRow {
  id: number;
  panel_id: number;
  date: string;
  generation_kwh: number;
  weather: string;
  sunshine_hours: number;
  temperature: number;
  self_used_kwh: number;
  grid_sold_kwh: number;
  source: string;
  created_at: string;
}

export interface MaintenanceRow {
  id: number;
  panel_id: number;
  date: string;
  type: string;
  description: string | null;
  fault_type: string | null;
  cost: number;
  created_at: string;
}

export interface TariffRow {
  id: number;
  feed_in_tariff: number;
  self_use_tariff: number;
  investment_cost: number;
  self_use_ratio: number;
  updated_at: string;
}

export function mapInverter(r: InverterRow): Inverter {
  return {
    id: r.id,
    name: r.name,
    model: r.model ?? undefined,
    location: r.location ?? undefined,
    installDate: r.install_date ?? undefined,
    ratedPowerKw: r.rated_power_kw ?? undefined,
    createdAt: r.created_at,
  };
}

export function mapPanel(r: PanelRow): Panel {
  return {
    id: r.id,
    inverterId: r.inverter_id,
    brandModel: r.brand_model,
    ratedPowerW: r.rated_power_w,
    installDate: r.install_date ?? undefined,
    orientation: r.orientation ?? 'south',
    tiltAngle: r.tilt_angle,
    location: r.location ?? undefined,
    status: r.status as Panel['status'],
    createdAt: r.created_at,
  };
}

export function mapGeneration(r: GenerationRow): GenerationRecord {
  return {
    id: r.id,
    panelId: r.panel_id,
    date: r.date,
    generationKwh: r.generation_kwh,
    weather: r.weather as GenerationRecord['weather'],
    sunshineHours: r.sunshine_hours,
    temperature: r.temperature,
    selfUsedKwh: r.self_used_kwh,
    gridSoldKwh: r.grid_sold_kwh,
    source: r.source as GenerationRecord['source'],
    createdAt: r.created_at,
  };
}

export function mapMaintenance(r: MaintenanceRow): MaintenanceRecord {
  return {
    id: r.id,
    panelId: r.panel_id,
    date: r.date,
    type: r.type as MaintenanceRecord['type'],
    description: r.description ?? '',
    faultType: r.fault_type ?? undefined,
    cost: r.cost,
    createdAt: r.created_at,
  };
}

export function mapTariff(r: TariffRow): TariffSetting {
  const safe = (v: number, fallback: number) =>
    typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v) ? v : fallback;
  return {
    id: r.id,
    feedInTariff: safe(r.feed_in_tariff, 0.41),
    selfUseTariff: safe(r.self_use_tariff, 0.62),
    investmentCost: safe(r.investment_cost, 32000),
    selfUseRatio: safe(r.self_use_ratio, 0.55),
    updatedAt: r.updated_at,
  };
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
