export type Orientation =
  | 'south'
  | 'south_east'
  | 'south_west'
  | 'east'
  | 'west'
  | 'north';

export type WeatherType =
  | 'sunny'
  | 'cloudy'
  | 'overcast'
  | 'rainy'
  | 'snowy'
  | 'foggy';

export type PanelStatus = 'active' | 'fault' | 'offline';

export type MaintenanceType =
  | 'clean'
  | 'inspect'
  | 'repair'
  | 'inverter_check';

export type GenerationSource = 'manual' | 'csv';

export interface Inverter {
  id: number;
  name: string;
  model?: string;
  location?: string;
  installDate?: string;
  ratedPowerKw?: number;
  createdAt: string;
}

export interface Panel {
  id: number;
  inverterId: number;
  brandModel: string;
  ratedPowerW: number;
  installDate?: string;
  orientation: string;
  tiltAngle: number;
  location?: string;
  status: PanelStatus;
  createdAt: string;
}

export interface GenerationRecord {
  id: number;
  panelId: number;
  date: string;
  generationKwh: number;
  weather: WeatherType;
  sunshineHours: number;
  temperature: number;
  selfUsedKwh: number;
  gridSoldKwh: number;
  source: GenerationSource;
  createdAt: string;
}

export interface MaintenanceRecord {
  id: number;
  panelId: number;
  date: string;
  type: MaintenanceType;
  description: string;
  faultType?: string;
  cost: number;
  createdAt: string;
}

export interface TariffSetting {
  id: number;
  feedInTariff: number;
  selfUseTariff: number;
  investmentCost: number;
  selfUseRatio: number;
  updatedAt: string;
}

export interface InverterWithPanels extends Inverter {
  panels: Panel[];
  totalRatedPowerW: number;
  panelCount: number;
}

export interface PanelWithStats extends Panel {
  inverterName?: string;
  avgDailyKwh: number;
  totalKwh: number;
  kwhPerKw: number;
  recordCount: number;
  runDays: number;
  faultCount: number;
  lastMaintenanceDate?: string;
}

export interface DashboardSummary {
  todayGenerationKwh: number;
  todayRevenue: number;
  todaySaving: number;
  todayCarbonKg: number;
  totalGenerationKwh: number;
  totalRevenue: number;
  totalCarbonKg: number;
  panelCount: number;
  activePanelCount: number;
}

export interface TrendPoint {
  label: string;
  generationKwh: number;
  revenue: number;
}

export interface WeatherStat {
  weather: WeatherType;
  count: number;
  avgGenerationKwh: number;
  totalKwh: number;
}

export interface PanelRankItem {
  panelId: number;
  brandModel: string;
  location?: string;
  avgDailyKwh: number;
  kwhPerKw: number;
  totalKwh: number;
}

export interface RevenueSummary {
  todayGenerationKwh: number;
  todaySelfUsedKwh: number;
  todayGridSoldKwh: number;
  todaySelfUseSaving: number;
  todayGridIncome: number;
  todayRevenue: number;
}

export interface PaybackProgress {
  totalRevenue: number;
  investmentCost: number;
  recoveredRatio: number;
  remainingAmount: number;
  estimatedMonths: number | null;
  monthlyTrend: TrendPoint[];
}

export interface CarbonSummary {
  totalGenerationKwh: number;
  carbonKg: number;
  carbonTon: number;
  equivalentTrees: number;
  equivalentCoalKg: number;
}

export interface MaintenanceStatsItem {
  panelId: number;
  brandModel: string;
  runDays: number;
  faultCount: number;
  avgFaultIntervalDays: number | null;
  totalRepairCost: number;
  lastMaintenanceDate?: string;
}

export interface AnnualReport {
  year: number;
  totalGenerationKwh: number;
  totalRevenue: number;
  totalSelfUseSaving: number;
  totalGridIncome: number;
  carbonKg: number;
  monthly: TrendPoint[];
  weatherStats: WeatherStat[];
  panelCount: number;
}

export interface StatsQuery {
  dimension: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
  panelId?: number;
}

export interface CsvRow {
  date: string;
  panelId?: number;
  brandModel?: string;
  generationKwh: number;
  weather?: WeatherType;
  sunshineHours?: number;
  temperature?: number;
}
