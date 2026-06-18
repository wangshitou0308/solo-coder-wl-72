import type {
  InverterWithPanels,
  Panel,
  GenerationRecord,
  MaintenanceRecord,
  TariffSetting,
  DashboardSummary,
  TrendPoint,
  WeatherStat,
  PanelRankItem,
  RevenueSummary,
  PaybackProgress,
  CarbonSummary,
  MaintenanceStatsItem,
  AnnualReport,
  StatsQuery,
} from '../../shared/types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  dashboard: {
    summary: (date?: string) =>
      request<DashboardSummary>(`/dashboard/summary${date ? `?date=${date}` : ''}`),
  },
  inverters: {
    list: () => request<InverterWithPanels[]>('/inverters'),
    create: (data: Partial<InverterWithPanels>) =>
      request<InverterWithPanels>('/inverters', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<InverterWithPanels>) =>
      request<InverterWithPanels>(`/inverters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/inverters/${id}`, { method: 'DELETE' }),
  },
  panels: {
    create: (data: Partial<Panel>) =>
      request<Panel>('/panels', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Panel>) =>
      request<Panel>(`/panels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/panels/${id}`, { method: 'DELETE' }),
  },
  generation: {
    list: (params?: { panelId?: number; startDate?: string; endDate?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.panelId) qs.set('panelId', String(params.panelId));
      if (params?.startDate) qs.set('startDate', params.startDate);
      if (params?.endDate) qs.set('endDate', params.endDate);
      if (params?.limit) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return request<GenerationRecord[]>(`/generation${query ? `?${query}` : ''}`);
    },
    create: (data: Partial<GenerationRecord>) =>
      request<GenerationRecord>('/generation', { method: 'POST', body: JSON.stringify(data) }),
    importCsv: (content: string) =>
      request<{ imported: number; skipped: number; errors: string[] }>('/generation/import', {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    stats: (params: StatsQuery) => {
      const qs = new URLSearchParams();
      qs.set('dimension', params.dimension);
      if (params.startDate) qs.set('startDate', params.startDate);
      if (params.endDate) qs.set('endDate', params.endDate);
      if (params.panelId) qs.set('panelId', String(params.panelId));
      return request<{ trend: TrendPoint[]; weatherStats: WeatherStat[]; dimension: string }>(`/generation/stats?${qs}`);
    },
    panelRank: () => request<PanelRankItem[]>('/generation/panel-rank'),
    today: () => request<GenerationRecord[]>('/generation/today'),
  },
  revenue: {
    tariff: () => request<TariffSetting>('/revenue/tariff'),
    updateTariff: (data: Partial<TariffSetting>) =>
      request<TariffSetting>('/revenue/tariff', { method: 'PUT', body: JSON.stringify(data) }),
    summary: (date?: string) =>
      request<RevenueSummary>(`/revenue/summary${date ? `?date=${date}` : ''}`),
    payback: () => request<PaybackProgress>('/revenue/payback'),
    carbon: () => request<CarbonSummary>('/revenue/carbon'),
  },
  maintenance: {
    list: (panelId?: number) =>
      request<(MaintenanceRecord & { brandModel?: string })[]>(`/maintenance${panelId ? `?panelId=${panelId}` : ''}`),
    create: (data: Partial<MaintenanceRecord>) =>
      request<MaintenanceRecord>('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/maintenance/${id}`, { method: 'DELETE' }),
    stats: () => request<MaintenanceStatsItem[]>('/maintenance/stats'),
  },
  report: {
    annual: (year: number) =>
      request<AnnualReport>(`/report/annual?year=${year}`),
  },
};
