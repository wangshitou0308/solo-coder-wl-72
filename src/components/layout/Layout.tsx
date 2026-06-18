import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Sun,
  Zap,
  DollarSign,
  Wrench,
  FileText,
} from 'lucide-react';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: '数据看板' },
  { to: '/panels', icon: Sun, label: '太阳能板' },
  { to: '/generation', icon: Zap, label: '发电记录' },
  { to: '/revenue', icon: DollarSign, label: '收益分析' },
  { to: '/maintenance', icon: Wrench, label: '设备维护' },
  { to: '/report', icon: FileText, label: '报告导出' },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-midnight-light border-r border-midnight-border flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-5 py-6 flex items-center gap-3 border-b border-midnight-border">
          <div className="w-9 h-9 rounded-lg bg-amber/15 flex items-center justify-center">
            <Sun className="w-5 h-5 text-amber" />
          </div>
          <div>
            <h1 className="font-sora font-bold text-sm text-white tracking-tight">SolarVault</h1>
            <p className="font-manrope text-[10px] text-slate-500">家庭光伏管理系统</p>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-manrope transition-all duration-200 ${
                  isActive
                    ? 'bg-amber/10 text-amber border border-amber/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-midnight-lighter'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-midnight-border">
          <p className="text-[10px] text-slate-600 font-mono">v1.0.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
