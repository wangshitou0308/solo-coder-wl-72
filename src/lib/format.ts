export function formatKwh(v: number): string {
  if (v >= 10000) return (v / 1000).toFixed(1) + ' MWh';
  return v.toFixed(2) + ' kWh';
}

export function formatYuan(v: number): string {
  return '\u00a5' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

export function formatCarbon(v: number): string {
  if (v >= 1000) return (v / 1000).toFixed(2) + ' 吨';
  return v.toFixed(2) + ' kg';
}

export function formatDate(d: string): string {
  return d;
}

export function weatherLabel(w: string): string {
  const map: Record<string, string> = {
    sunny: '晴天', cloudy: '多云', overcast: '阴天',
    rainy: '雨天', snowy: '雪天', foggy: '雾天',
  };
  return map[w] || w;
}

export function weatherIcon(w: string): string {
  const map: Record<string, string> = {
    sunny: '\u2600\ufe0f', cloudy: '\u26c5', overcast: '\u2601\ufe0f',
    rainy: '\ud83c\udf27\ufe0f', snowy: '\u2744\ufe0f', foggy: '\ud83c\udf2b\ufe0f',
  };
  return map[w] || '';
}

export function maintenanceTypeLabel(t: string): string {
  const map: Record<string, string> = {
    clean: '清洁', inspect: '检查接线', repair: '故障维修', inverter_check: '逆变器检查',
  };
  return map[t] || t;
}

export function orientationLabel(o: string): string {
  const map: Record<string, string> = {
    south: '南', south_east: '东南', south_west: '西南',
    east: '东', west: '西', north: '北',
  };
  return map[o] || o;
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    active: '运行中', fault: '故障', offline: '离线',
  };
  return map[s] || s;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
