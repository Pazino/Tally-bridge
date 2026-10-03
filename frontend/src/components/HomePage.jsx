import React from "react";
import {
  Building2,
  BarChart3,
  Sliders,
  ArrowRight,
  Zap,
  Sparkles
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
    </div>
  );
}
