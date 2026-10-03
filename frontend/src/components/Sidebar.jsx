import React from "react";
import { 
  Building2, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Sun, 
  Moon, 
  GitBranch, 
  Sparkles, 
  Server, 
  Zap, 
  Home, 
  Sliders, 
  AlertTriangle 
} from "lucide-react";
import logoImg from "../assets/logo.png";

export default function Sidebar({
  activeNav,
  setActiveNav,
  collapsed,
  setCollapsed,
  theme,
  setTheme,
  pingData,
  updateInfo,
  onOpenUpdateModal,
  unmappedCount = 0
}) {
  return (
    <aside
      className={`transition-all duration-300 flex flex-col justify-between border-r border-slate-200 dark:border-[#1f2937]/70 bg-white/95 dark:bg-[#0d121c]/90 backdrop-blur-2xl ${
        collapsed ? "w-20" : "w-64"
      } h-screen select-none relative z-40`}
    >
      {/* Top Branding */}
      <div>
        <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-[#1f2937]/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative flex-shrink-0 group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-300"></div>
              <img
                src={logoImg}
                alt="Tally Bridge Logo"
                className="relative w-10 h-10 rounded-xl object-contain bg-slate-50 dark:bg-[#111827] p-1 border border-slate-200 dark:border-white/10 shadow-md"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
                  Tally Bridge
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full btn-primary-pazino font-bold tracking-wider shadow-sm">
                    SaaS
                  </span>
                </span>
                <span className="text-[9px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400 tracking-wider">
                  SYNC • PROCESS • VISUALISE
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-xl btn-secondary-pazino flex items-center justify-center"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* GitHub Updates Banner (if available) */}
        {!collapsed && updateInfo?.update_available && (
          <div 
            onClick={onOpenUpdateModal}
            className="mx-3 mt-3 p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 cursor-pointer hover:border-amber-400/80 transition-all flex items-center gap-2.5 shadow-md group"
          >
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Sparkles size={14} className="animate-spin text-amber-500 dark:text-amber-400" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                New Update v{updateInfo.latest_version}
              </span>
              <span className="text-[10px] text-amber-600 dark:text-slate-400 truncate">Click to install from GitHub</span>
            </div>
          </div>
        )}

        {/* Module Navigation */}
        <nav className="p-3 space-y-2 mt-2">
          {!collapsed && (
            <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider pazino-title flex items-center gap-1.5">
              <Zap size={11} className="text-[#006EB2] dark:text-[#38BDF8]" />
              <span>Workspace Modules</span>
            </div>
          )}

          {/* Module 0: Home / Dashboard */}
          <button
            onClick={() => setActiveNav("home")}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all text-left relative overflow-hidden group ${
              activeNav === "home"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162030] hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/5"
            }`}
          >
            <div className={`p-2 rounded-xl flex-shrink-0 transition-colors ${
              activeNav === "home" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-[#162030] text-[#006EB2] dark:text-blue-400 group-hover:bg-blue-600/20"
            }`}>
              <Home size={17} />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="tracking-tight text-xs font-bold">Home</span>
                <span className={`text-[10px] font-medium ${activeNav === "home" ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
                  Dashboard & System Hub
                </span>
              </div>
            )}
          </button>

          {/* Module 1: Cost Centre Reco */}
          <button
            onClick={() => setActiveNav("cost_centre")}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all text-left relative overflow-hidden group ${
              activeNav === "cost_centre"
                ? "btn-primary-pazino font-bold shadow-lg shadow-blue-500/30"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162030] hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/5"
            }`}
          >
            <div className={`p-2 rounded-xl flex-shrink-0 transition-colors ${
              activeNav === "cost_centre" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-[#162030] text-[#006EB2] dark:text-blue-400 group-hover:bg-blue-600/20"
            }`}>
              <Building2 size={17} />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="tracking-tight text-xs font-bold">Cost Centre Reco</span>
                <span className={`text-[10px] font-medium ${activeNav === "cost_centre" ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
                  Tally ➔ Supabase Sync
                </span>
              </div>
            )}
          </button>

          {/* Module 2: Tally vs RBM Reco */}
          <button
            onClick={() => setActiveNav("tally_vs_rbm")}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all text-left relative overflow-hidden group ${
              activeNav === "tally_vs_rbm"
                ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 font-bold border border-indigo-400/30"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162030] hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/5"
            }`}
          >
            <div className={`p-2 rounded-xl flex-shrink-0 transition-colors ${
              activeNav === "tally_vs_rbm" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-[#162030] text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-600/20"
            }`}>
              <BarChart3 size={17} />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="tracking-tight text-xs font-bold">Tally vs RBM Reco</span>
                <span className={`text-[10px] font-medium ${activeNav === "tally_vs_rbm" ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"}`}>
                  PostgreSQL COS Variance
                </span>
              </div>
            )}
          </button>

          {/* Module 3: Settings with Submenus (Ledger Mapping & Branches) */}
          <div className="space-y-1">
            <button
              onClick={() => {
                if (activeNav !== "settings_ledgers" && activeNav !== "settings_branches") {
                  setActiveNav("settings_ledgers");
                }
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-medium text-sm transition-all text-left relative overflow-hidden group ${
                activeNav.startsWith("settings")
                  ? "bg-slate-100 dark:bg-[#162030] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162030] hover:text-slate-900 dark:hover:text-white border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl flex-shrink-0 transition-colors relative ${
                  activeNav.startsWith("settings")
                    ? "bg-amber-500/20 text-amber-500 dark:text-amber-400"
                    : "bg-slate-100 dark:bg-[#162030] text-slate-500 group-hover:text-amber-500"
                }`}>
                  <Sliders size={17} />
                  {unmappedCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-[#0d121c] animate-pulse"></span>
                  )}
                </div>
                {!collapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="tracking-tight text-xs font-bold">Settings</span>
                    <span className="text-[10px] text-slate-400 font-medium">Mapping & Branches</span>
                  </div>
                )}
              </div>

              {!collapsed && (
                <div className="flex items-center gap-1.5">
                  {unmappedCount > 0 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-extrabold shadow-sm">
                      {unmappedCount}
                    </span>
                  )}
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform ${
                      activeNav.startsWith("settings") ? "rotate-0 text-amber-500" : "-rotate-90"
                    }`}
                  />
                </div>
              )}
            </button>

            {/* Sub-menus */}
            {!collapsed && (
              <div className="pl-4 pr-1 py-1 space-y-1">
                {/* Sub-menu 1: Ledger Mapping */}
                <button
                  onClick={() => setActiveNav("settings_ledgers")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                    activeNav === "settings_ledgers" || activeNav === "settings"
                      ? "btn-primary-pazino font-bold shadow-md shadow-blue-500/20"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GitBranch size={14} className={activeNav === "settings_ledgers" || activeNav === "settings" ? "text-white" : "text-[#006EB2] dark:text-blue-400"} />
                    <span className="truncate">Ledger Mapping</span>
                  </div>
                  {unmappedCount > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      activeNav === "settings_ledgers" || activeNav === "settings"
                        ? "bg-white/20 text-white"
                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    }`}>
                      {unmappedCount}
                    </span>
                  )}
                </button>

                {/* Sub-menu 2: Branches */}
                <button
                  onClick={() => setActiveNav("settings_branches")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                    activeNav === "settings_branches"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2 size={14} className={activeNav === "settings_branches" ? "text-white" : "text-emerald-500 dark:text-emerald-400"} />
                    <span className="truncate">Branches</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
                    activeNav === "settings_branches" ? "bg-white/20 text-white" : "text-slate-400"
                  }`}>
                    Directory
                  </span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Bottom Network Status & Theme Switcher */}
      <div className="p-3 space-y-3 border-t border-slate-200 dark:border-[#1f2937]/70 bg-slate-50/90 dark:bg-[#090d14]/70">
        {/* Network Server Status Badges */}
        {!collapsed && (
          <div className="p-3 rounded-2xl bg-white dark:bg-[#111827]/80 border border-slate-200 dark:border-[#1f2937] space-y-2.5 text-[11px] shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider pazino-title">
              <span>Cloud & LAN Servers</span>
              <Server size={12} className="text-[#006EB2] dark:text-[#38BDF8]" />
            </div>

            {/* Tally */}
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                <span className={`w-2 h-2 rounded-full ${pingData?.tally?.connected ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-red-500"}`} />
                Tally Server
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                {pingData?.tally?.connected ? `${pingData.tally.latency_ms}ms` : "Offline"}
              </span>
            </div>

            {/* PostgreSQL */}
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                <span className={`w-2 h-2 rounded-full ${pingData?.postgres?.connected ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-red-500"}`} />
                PostgreSQL (LAN)
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">192.168.10.237</span>
            </div>

            {/* Supabase */}
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Supabase Cloud
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Live Prod</span>
            </div>
          </div>
        )}

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-between gap-2">
          {/* GitHub Version Trigger */}
          <button
            onClick={onOpenUpdateModal}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold shadow-sm transition-all relative group ${
              updateInfo?.update_available
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 animate-pulse"
                : "btn-secondary-pazino"
            }`}
            title={updateInfo?.update_available ? `Update available: v${updateInfo.latest_version} (Click to update)` : "Check for GitHub Updates"}
          >
            <GitBranch size={14} className={updateInfo?.update_available ? "text-amber-500" : "text-[#006EB2] dark:text-blue-400 group-hover:rotate-12 transition-transform"} />
            {!collapsed && (
              <span>
                v{updateInfo?.current_version || "1.0.0"}
                {updateInfo?.update_available && <span className="ml-1.5 text-[10px] text-amber-500 font-extrabold">• UPGRADE</span>}
              </span>
            )}
            {collapsed && updateInfo?.update_available && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-[#121820]" />
            )}
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2.5 rounded-xl btn-secondary-pazino flex items-center justify-center shadow-sm"
            title="Toggle Dark / Light Mode"
          >
            {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-[#006EB2]" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
