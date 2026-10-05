import React from "react";
import {
  Building2,
  BarChart3,
  Sliders,
  ArrowRight,
  Zap,
  Sparkles,
  Construction,
  CheckCircle2,
  Layers,
  Database,
  Server,
  Activity,
  ShieldCheck,
  Clock,
  ExternalLink
} from "lucide-react";
import logoImg from "../assets/logo.png";

export default function HomePage({ theme, pingData, onNavigate, unmappedCount = 0, updateInfo }) {
  const tallyOnline = pingData?.tally?.connected;
  const pgOnline = pingData?.postgres?.connected;
  const supaOnline = pingData?.supabase?.connected ?? true;
  const appVersion = updateInfo?.current_version || "1.0.3";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn pb-24 text-slate-900 dark:text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-12 bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 dark:from-[#0d1424] dark:via-[#090f1d] dark:to-[#050811] border border-slate-200/90 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none backdrop-blur-2xl">
        {/* Ambient mesh glow accents */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-[420px] h-[420px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-[420px] h-[420px] bg-indigo-500/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          {/* Logo with Modern 3D Glow Ring */}
          <div className="relative group flex-shrink-0">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-3xl blur-lg opacity-60 group-hover:opacity-90 transition duration-500"></div>
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white dark:bg-[#0f172a] p-3 border border-white/40 dark:border-white/15 shadow-2xl flex items-center justify-center">
              <img
                src={logoImg}
                alt="Tally Bridge Enterprise"
                className="w-full h-full object-contain filter drop-shadow hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          {/* Title & Platform Summary */}
          <div className="text-center md:text-left flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 mb-3 shadow-sm">
              <Sparkles size={13} className="text-blue-500 animate-pulse" />
              <span>PAZINO FINANCIAL PLATFORM • V{appVersion}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Tally Bridge <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">Modern Hub</span>
            </h1>

            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl font-medium leading-relaxed">
              Unified Financial Synchronization, Cost Centre Alignment &amp; Cost of Sales (COS) Reconciliation Engine for Laduma Hardware.
            </p>

            {/* Dynamic System Badge Pills */}
            <div className="flex flex-wrap items-center gap-3 mt-5 justify-center md:justify-start">
              {/* Tally Status */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/90 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${tallyOnline ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${tallyOnline ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                </span>
                <span>
                  Tally Prime: <strong className={tallyOnline ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                    {tallyOnline ? `Online (${pingData?.tally?.latency_ms || 25}ms)` : "Offline / Standby"}
                  </strong>
                </span>
              </div>

              {/* Postgres Status */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/90 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pgOnline ? "bg-emerald-400" : "bg-rose-400"}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${pgOnline ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                </span>
                <span>
                  PostgreSQL COS: <strong className={pgOnline ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                    {pgOnline ? "Online (192.168.10.237)" : "Disconnected"}
                  </strong>
                </span>
              </div>

              {/* Supabase Status */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/90 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>
                  Supabase: <strong className="text-emerald-600 dark:text-emerald-400">Live Cloud Production</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Modules & Workspaces Launchpad */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#006EB2] dark:text-blue-400 flex items-center justify-center">
              <Zap size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Operational Modules &amp; Tools
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Select a workspace module to begin audit and synchronization routines
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
            3 Modules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Cost Centre Reco (Production Core) */}
          <div
            onClick={() => onNavigate("cost_centre")}
            className="group relative p-7 rounded-3xl bg-white dark:bg-[#0d121c] border border-slate-200/90 dark:border-white/10 shadow-lg hover:shadow-2xl hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 group-hover:bg-blue-500/10 rounded-full blur-2xl transition-all"></div>
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-[#006EB2] dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Building2 size={24} />
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  Live Sync
                </span>
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-[#006EB2] dark:group-hover:text-blue-400 transition-colors">
                Cost Centre Reco
              </h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                Automated synchronization of Tally Daybook vouchers directly into Supabase. Audits cost centre allocations and flags missing cash ledger mappings.
              </p>

              {/* Feature Highlights */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  <span>Tally XML Daybook Voucher Ingestion</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  <span>Multi-CC Split Allocation Audit</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  <span>Automated Master Discovery Queue</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-[#006EB2] dark:text-blue-400">
              <span>Launch Daybook Sync</span>
              <ArrowRight size={15} className="group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Tally vs RBM Reco (UNDER DEVELOPMENT TAG) */}
          <div
            onClick={() => onNavigate("tally_vs_rbm")}
            className="group relative p-7 rounded-3xl bg-white dark:bg-[#0d121c] border border-amber-500/30 dark:border-amber-500/20 shadow-lg hover:shadow-2xl hover:border-amber-500/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 group-hover:bg-amber-500/10 rounded-full blur-2xl transition-all"></div>
            <div>
              {/* Header Badge: Prominent Under Development Tag */}
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <BarChart3 size={24} />
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 shadow-sm">
                  <Construction size={11} className="text-amber-500 animate-pulse" />
                  Under Development
                </span>
              </div>

              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Tally vs RBM Reco
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Preview
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                3-Way Cost of Sales variance reconciliation between RBM Branch Reports, Trading Accounts, and live Tally Target Group ledgers.
              </p>

              {/* Feature Highlights */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>PostgreSQL COS Engine (192.168.10.237)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>3-Way Audit Algorithm: In Active Build</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>Branch Discrepancy &amp; Threshold Reporting</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <span>Open Preview Module</span>
              </span>
              <ArrowRight size={15} className="group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>

          {/* Card 3: Settings & Mappings */}
          <div
            onClick={() => onNavigate("settings")}
            className="group relative p-7 rounded-3xl bg-white dark:bg-[#0d121c] border border-slate-200/90 dark:border-white/10 shadow-lg hover:shadow-2xl hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 group-hover:bg-blue-500/10 rounded-full blur-2xl transition-all"></div>
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Sliders size={24} />
                </div>
                {unmappedCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                    {unmappedCount} Unmapped
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25">
                    Master Rules
                  </span>
                )}
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-[#006EB2] dark:group-hover:text-blue-400 transition-colors">
                Ledger &amp; Branch Mapping
              </h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                Standardize branch names across all Tally groups. Review and assign branches, map in bulk, and monitor newly discovered ledgers.
              </p>

              {/* Feature Highlights */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Branch Name Normalization Rules</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Bulk Cash Ledger Assignment Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Master Synchronization to Supabase</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-[#006EB2] dark:text-blue-400">
              <span>Manage Branch Mappings</span>
              <ArrowRight size={15} className="group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* System Architecture & Overview Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#0d121c]/70 border border-slate-200/80 dark:border-white/5 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#006EB2] dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Server size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tally Prime Protocol</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">HTTP/XML 9000 • Direct Export</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#0d121c]/70 border border-slate-200/80 dark:border-white/5 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Database size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cloud Storage Tier</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Supabase REST • PostgreSQL 5432</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#0d121c]/70 border border-slate-200/80 dark:border-white/5 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reconciliation Scope</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Laduma Hardware • 30+ Branches</div>
          </div>
        </div>
      </div>
    </div>
  );
}
