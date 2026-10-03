import React from "react";
import {
  Building2,
  BarChart3,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Server,
  Zap,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  RefreshCw,
  FolderTree,
  Lightbulb,
  PieChart,
  Activity,
  Clock,
  ExternalLink
} from "lucide-react";
import logoImg from "../assets/logo.png";

export default function HomePage({ theme, pingData, onNavigate }) {
  const tallyOnline = pingData?.tally?.connected;
  const pgOnline = pingData?.postgres?.connected;
  const supaOnline = pingData?.supabase?.connected;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn pb-24">
      {/* Hero Branding Section with Logo */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-white/95 via-blue-50/50 to-indigo-50/40 dark:from-[#0d1424] dark:via-[#0a1122] dark:to-[#070b14] border border-slate-200 dark:border-white/10 shadow-2xl backdrop-blur-2xl">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-indigo-500/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          {/* Logo with Glow Ring */}
          <div className="relative group flex-shrink-0">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-3xl blur-lg opacity-60 group-hover:opacity-90 transition duration-500"></div>
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white dark:bg-[#0f172a] p-3 border border-white/20 shadow-2xl flex items-center justify-center">
              <img
                src={logoImg}
                alt="Tally Bridge Enterprise"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 mb-3 shadow-sm">
              <Sparkles size={13} className="text-blue-500" />
              <span>PAZINO FINANCIAL PLATFORM • V1.0</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Tally Bridge Modern Hub
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl font-medium">
              Unified Financial Synchronization, Cost Centre Alignment & Cost of Sales (COS) Reconciliation Engine for Laduma Hardware.
            </p>

            {/* Quick System Badge Pills */}
            <div className="flex flex-wrap items-center gap-3 mt-4 justify-center md:justify-start">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-sm">
                <span className={`w-2 h-2 rounded-full ${tallyOnline ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                Tally Prime: {tallyOnline ? "Connected (Port 9000)" : "Offline / Standby"}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-sm">
                <span className={`w-2 h-2 rounded-full ${pgOnline ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                PostgreSQL COS: {pgOnline ? "Online (192.168.10.237)" : "Disconnected"}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-sm">
                <span className={`w-2 h-2 rounded-full ${supaOnline ? "bg-emerald-500" : "bg-emerald-500"}`}></span>
                Supabase: Live Cloud Production
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Module Launchpad Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-blue-500" />
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              Operational Modules & Tools
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Select a module to begin workflows
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Cost Centre Reco */}
          <div
            onClick={() => onNavigate("cost_centre")}
            className="group relative p-6 rounded-3xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-2xl hover:border-blue-500/50 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 group-hover:bg-blue-500/10 rounded-full blur-2xl transition-all"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Building2 size={24} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Cost Centre Reco
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Automated synchronization of Tally Daybook vouchers directly into Supabase. Flags missing cost centres and cash ledger mismatches.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Launch Daybook Sync</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Tally vs RBM Reco */}
          <div
            onClick={() => onNavigate("tally_vs_rbm")}
            className="group relative p-6 rounded-3xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-2xl hover:border-indigo-500/50 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 group-hover:bg-indigo-500/10 rounded-full blur-2xl transition-all"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Tally vs RBM Reco
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                3-Way Cost of Sales variance reconciliation between RBM Branch Reports, Trading Accounts, and live Tally Target Group ledgers.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>Launch COS Variance Audit</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Settings & Mappings */}
          <div
            onClick={() => onNavigate("settings")}
            className="group relative p-6 rounded-3xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-2xl hover:border-amber-500/50 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 group-hover:bg-amber-500/10 rounded-full blur-2xl transition-all"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sliders size={24} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Ledger & Branch Mapping
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Standardize branch names across all Tally groups. Review and assign branches, map in bulk, and monitor newly discovered ledgers.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
              <span>Manage Branch Mappings</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Blueprint & Future Dashboard Ideas Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-[#0a0f18] border border-slate-200 dark:border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Lightbulb size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Dashboard Concept Blueprint & Recommended Widgets
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Proposed visual modules for our future central executive dashboard
              </p>
            </div>
          </div>
          <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 w-fit">
            Future Dashboard Preview
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Idea 1: Executive KPI Summary */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <PieChart size={14} />
                Executive COS Variance KPI
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 font-bold">
                Idea #1
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              High-level cards showing <b>Total Monthly Purchases</b>, <b>Total IBT Transfers</b>, and <b>Net COS Variance</b> across all 30 branches. Gives management an instant pulse on financial balance.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/5">
              💡 <i>Shows RBM COS vs Tally COS difference with percentage deviation tags.</i>
            </div>
          </div>

          {/* Idea 2: Branch Health Matrix */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} />
                30-Branch Health Matrix
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold">
                Idea #2
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Visual grid/heatmap of all 30 branches with color-coded status badges: <b>Green (Matched)</b> vs <b>Red (Discrepancy &gt; R100)</b>. Clicking any branch drills directly into its ledger breakdown.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/5">
              💡 <i>Immediately highlights which branches (e.g. Bushbuckridge, Driekop) need attention.</i>
            </div>
          </div>

          {/* Idea 3: Unmapped Exception Radar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} />
                Unmapped Ledger Alert Radar
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-bold">
                Idea #3
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Real-time counter badge alerting the finance team whenever Tally accountants create a new ledger under any of the 6 target groups that hasn't been assigned to a branch yet.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/5">
              💡 <i>Prevents month-end reconciliation errors before reports are finalized.</i>
            </div>
          </div>

          {/* Idea 4: Sync & Audit Log Timeline */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} />
                Sync Audit & Activity Feed
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 font-bold">
                Idea #4
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Interactive timeline showing the latest Daybook sync runs, timestamps, total vouchers processed, speed, and any connection errors encountered.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/5">
              💡 <i>Provides complete transparency on when data was last updated from Tally.</i>
            </div>
          </div>

          {/* Idea 5: Discrepancy Trend Sparklines */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={14} />
                Multi-Month Variance Trends
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-500 font-bold">
                Idea #5
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Comparison chart showing variance trends month-over-month (e.g. July vs August vs September). Helps track whether discrepancy margins are improving over time.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/5">
              💡 <i>Historical audit trail demonstrating month-over-month variance reduction.</i>
            </div>
          </div>

          {/* Idea 6: One-Click Excel Packager */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet size={14} />
                1-Click Executive Excel Export
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold">
                Idea #6
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Direct button from the dashboard to download the fully formatted, color-coded COS Discrepancy Excel workbook for the current active month with zero clicks needed.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/5">
              💡 <i>Ready-to-email spreadsheet matching the executive Laduma reporting format.</i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
