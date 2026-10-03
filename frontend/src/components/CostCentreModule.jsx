import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Square, 
  RefreshCw, 
  Building, 
  Cloud, 
  Server, 
  FileText, 
  Activity, 
  Copy, 
  Download, 
  Search,
  ChevronDown,
  ArrowRight,
  Layers
} from "lucide-react";
import confetti from "canvas-confetti";
import { 
  fetchConfig, 
  saveConfig, 
  checkPing, 
  detectCompany, 
  fetchBranchMappings, 
  startSync, 
  stopSync, 
  fetchSyncStatus 
} from "../api";

export default function CostCentreModule() {
  const [config, setConfig] = useState(null);
  const [ping, setPing] = useState(null);
  const [branchMappings, setBranchMappings] = useState({});
  const [branches, setBranches] = useState(["ALL BRANCHES"]);
  const [syncStatus, setSyncStatus] = useState(null);

  // Form selections
  const [companyName, setCompanyName] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("ALL BRANCHES");
  const [fromDate, setFromDate] = useState("2026-09-01");
  const [toDate, setToDate] = useState("2026-09-26");
  const [tallyEnv, setTallyEnv] = useState("server");
  const [supabaseEnv, setSupabaseEnv] = useState("live");

  // UI Modals
  const [branchSearchOpen, setBranchSearchOpen] = useState(false);
  const [branchFilterQuery, setBranchFilterQuery] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Terminal box ref - FIXED SCROLL ISSUE: ONLY scrolls internal container, NOT whole page
  const terminalBoxRef = useRef(null);

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(pollSync, 1000);
    return () => clearInterval(interval);
  }, []);

  // FIXED AUTO-SCROLL: only scroll the terminal div, never call window/page scrollIntoView
  useEffect(() => {
    if (terminalBoxRef.current) {
      terminalBoxRef.current.scrollTop = terminalBoxRef.current.scrollHeight;
    }
  }, [syncStatus?.logs?.length]);

  async function loadInitialData() {
    try {
      const cfg = await fetchConfig();
      setConfig(cfg);
      setCompanyName(cfg.company_name || "");
      setSelectedBranch(cfg.selected_branch || "ALL BRANCHES");
      setFromDate(cfg.from_date || "2026-09-01");
      setToDate(cfg.to_date || "2026-09-26");
      setTallyEnv(cfg.tally_env || "server");
      setSupabaseEnv(cfg.supabase_env || "live");

      const p = await checkPing();
      setPing(p);

      const bm = await fetchBranchMappings();
      if (bm?.status === "ok") {
        setBranchMappings(bm.mappings);
        setBranches(bm.branches);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Confetti pop limiter (max 3 pops on sync completion)
  const confettiCountRef = useRef(0);

  async function pollSync() {
    try {
      const st = await fetchSyncStatus();
      setSyncStatus(st);
      if (st?.is_syncing) {
        confettiCountRef.current = 0; // reset for next transfer
      } else if (st?.progress === 1.0 && (st?.total_vouchers > 0 || st?.matches > 0) && confettiCountRef.current < 3) {
        confettiCountRef.current += 1;
        confetti({ 
          particleCount: 55, 
          spread: 75, 
          origin: { y: 0.6 } 
        });
      }
    } catch (e) {}
  }

  async function handleAutoDetect() {
    const res = await detectCompany();
    if (res.status === "ok") {
      setCompanyName(res.company);
      await saveConfig({ company_name: res.company });
    }
  }

  async function handlePingTest() {
    const p = await checkPing();
    setPing(p);
  }

  async function handleEnvChange(env) {
    setTallyEnv(env);
    await saveConfig({ tally_env: env });
    handlePingTest();
  }

  async function handleSupabaseChange(env) {
    setSupabaseEnv(env);
    await saveConfig({ supabase_env: env });
  }

  async function handleBranchSelect(br) {
    setSelectedBranch(br);
    await saveConfig({ selected_branch: br });
    setBranchSearchOpen(false);
  }

  async function handlePresetClick(type) {
    const now = new Date();
    let f = "";
    let t = now.toISOString().split("T")[0];

    if (type === "today") {
      f = t;
    } else if (type === "last_7_days") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      f = d.toISOString().split("T")[0];
    } else if (type === "this_month") {
      f = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    } else if (type === "prev_month") {
      const prevM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      f = prevM.toISOString().split("T")[0];
      t = prevEnd.toISOString().split("T")[0];
    }
    setFromDate(f);
    setToDate(t);
    await saveConfig({ from_date: f, to_date: t });
  }

  async function handleStartSync() {
    confettiCountRef.current = 0;
    await saveConfig({
      company_name: companyName,
      from_date: fromDate,
      to_date: toDate,
      selected_branch: selectedBranch,
      tally_env: tallyEnv,
      supabase_env: supabaseEnv
    });
    await startSync();
  }

  async function handleStopSync() {
    await stopSync();
  }

  function getEstimatedDays() {
    try {
      const d1 = new Date(fromDate);
      const d2 = new Date(toDate);
      const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
      return isNaN(diff) || diff < 1 ? 1 : diff;
    } catch {
      return 1;
    }
  }

  function handleCopyLog() {
    navigator.clipboard.writeText(syncStatus?.logs?.map(l => `[${l.time}] ${l.message}`).join("\n") || "");
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  const daysCount = getEstimatedDays();
  const isSyncing = syncStatus?.is_syncing || false;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto scroll-smooth">
      {/* ── 1. MODULE HERO BANNER ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-white dark:bg-gradient-to-r dark:from-[#121826]/90 dark:via-[#182338]/90 dark:to-[#121826]/90 border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-600/10 dark:to-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl btn-primary-pazino flex items-center justify-center text-white text-2xl font-bold shadow-lg border border-white/20">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-black pazino-title tracking-tight">
                  Cost Centre Reconciliation Engine
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] border border-emerald-500/30 shadow-sm">
                  LIVE PIPELINE
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                Automated Cash Voucher Extraction & Multi-Branch Universal Cost Centre Allocation
              </p>
            </div>
          </div>

          {/* Connection Status Pill & Ping Button */}
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2.5 border shadow-sm backdrop-blur-md ${
              ping?.tally?.connected 
                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300" 
                : "bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-300"
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${ping?.tally?.connected ? "bg-emerald-500 animate-pulse shadow-sm" : "bg-red-500"}`} />
              <span>{ping?.tally?.connected ? `Tally Connected (${ping.tally.latency_ms} ms)` : "Tally Offline"}</span>
            </div>
            <button
              onClick={handlePingTest}
              className="p-2.5 rounded-2xl btn-secondary-pazino flex items-center justify-center shadow-sm"
              title="Ping Tally Connection"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. ROW 1: TALLY SOURCE & SUPABASE DESTINATION CARDS ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Tally Source Card */}
        <div className="lg:col-span-7 p-5 rounded-3xl bg-white dark:bg-[#111827]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider pazino-title flex items-center gap-2">
              <Server size={14} className="text-[#006EB2] dark:text-[#38BDF8]" />
              Tally Source Connection
            </span>
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#162030] px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/5 font-semibold">
              Port 9000
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Local */}
            <button
              onClick={() => handleEnvChange("local")}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                tallyEnv === "local"
                  ? "btn-primary-pazino text-white font-bold"
                  : "btn-secondary-pazino"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>💻 Local Test</span>
                <span className={`w-2 h-2 rounded-full ${tallyEnv === "local" ? "bg-white shadow-sm" : "bg-slate-400"}`} />
              </div>
              <p className={`text-[10px] font-mono mt-1.5 ${tallyEnv === "local" ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>127.0.0.1:9000</p>
            </button>

            {/* Server */}
            <button
              onClick={() => handleEnvChange("server")}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                tallyEnv === "server"
                  ? "btn-primary-pazino text-white font-bold"
                  : "btn-secondary-pazino"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>🏢 Server (LAN)</span>
                <span className={`w-2 h-2 rounded-full ${tallyEnv === "server" ? "bg-white shadow-sm" : "bg-slate-400"}`} />
              </div>
              <p className={`text-[10px] font-mono mt-1.5 ${tallyEnv === "server" ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>192.168.10.237</p>
            </button>

            {/* Custom */}
            <button
              onClick={() => handleEnvChange("custom")}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                tallyEnv === "custom"
                  ? "btn-primary-pazino text-white font-bold"
                  : "btn-secondary-pazino"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>⚙️ Custom Host</span>
                <span className={`w-2 h-2 rounded-full ${tallyEnv === "custom" ? "bg-white shadow-sm" : "bg-slate-400"}`} />
              </div>
              <p className={`text-[10px] font-mono mt-1.5 ${tallyEnv === "custom" ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>Custom IP/Port</p>
            </button>
          </div>
        </div>

        {/* Supabase Cloud Card */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white dark:bg-[#111827]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider pazino-title flex items-center gap-2">
              <Cloud size={14} className="text-emerald-500 dark:text-emerald-400" />
              Supabase Cloud Destination
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
              {supabaseEnv === "live" ? "Live Target" : "Staging Test"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSupabaseChange("test")}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                supabaseEnv === "test"
                  ? "btn-primary-pazino text-white font-bold"
                  : "btn-secondary-pazino"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>🧪 Test Database</span>
                <span className={`w-2 h-2 rounded-full ${supabaseEnv === "test" ? "bg-white shadow-sm" : "bg-slate-400"}`} />
              </div>
              <p className={`text-[10px] mt-1.5 ${supabaseEnv === "test" ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>Staging & Verification</p>
            </button>

            <button
              onClick={() => handleSupabaseChange("live")}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                supabaseEnv === "live"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/20 border border-emerald-400/30"
                  : "btn-secondary-pazino"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>🌐 Live Production</span>
                <span className={`w-2 h-2 rounded-full ${supabaseEnv === "live" ? "bg-white shadow-sm" : "bg-slate-400"}`} />
              </div>
              <p className={`text-[10px] mt-1.5 ${supabaseEnv === "live" ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"}`}>Enterprise Cloud Target</p>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. ROW 2: FILTERS & TRANSFER SUMMARY ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Filters Card */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-[#111827]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-md space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider pazino-title flex items-center gap-2">
            <Layers size={14} className="text-[#006EB2] dark:text-[#38BDF8]" />
            Reconciliation Parameters
          </h2>

          {/* Company Row */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Tally Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-semibold text-xs focus:outline-none focus:border-[#006EB2] dark:focus:border-blue-500 transition-all shadow-sm"
                placeholder="Enter Tally Company..."
              />
            </div>
            <button
              onClick={handleAutoDetect}
              className="mt-5 px-4 py-2.5 rounded-2xl btn-secondary-pazino font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <RefreshCw size={13} />
              Auto-Detect
            </button>
          </div>

          {/* Branch Filter Selector */}
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Filter Branch (Strict Filter)</label>
            <button
              onClick={() => setBranchSearchOpen(!branchSearchOpen)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold flex items-center justify-between hover:border-[#006EB2] dark:hover:border-blue-500/50 transition-all text-left shadow-sm"
            >
              <span className="flex items-center gap-2.5">
                <Building size={15} className="text-[#006EB2] dark:text-blue-400" />
                <span>{selectedBranch}</span>
              </span>
              <ChevronDown size={15} className="text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {branchSearchOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 p-3 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/15 shadow-2xl space-y-2.5 max-h-64 overflow-y-auto">
                <div className="relative">
                  <Search size={13} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={branchFilterQuery}
                    onChange={(e) => setBranchFilterQuery(e.target.value)}
                    placeholder="Search branch name or cost centre..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#006EB2]"
                  />
                </div>
                <div className="space-y-1">
                  {branches
                    .filter((b) => !branchFilterQuery || b.toLowerCase().includes(branchFilterQuery.toLowerCase()))
                    .map((b) => (
                      <button
                        key={b}
                        onClick={() => handleBranchSelect(b)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                          selectedBranch === b ? "btn-primary-pazino font-bold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162030]"
                        }`}
                      >
                        <span>{b}</span>
                        {branchMappings[b.toLowerCase()] && (
                          <span className={`text-[10px] font-mono ${selectedBranch === b ? "text-blue-100" : "text-emerald-600 dark:text-emerald-400"}`}>
                            ➔ {branchMappings[b.toLowerCase()]}
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Date Period & Presets */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Reconciliation Date Range</label>
            <div className="flex items-center gap-2.5">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-[#006EB2]"
              />
              <ArrowRight size={14} className="text-slate-400" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-[#006EB2]"
              />
            </div>

            {/* Presets Strip */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {[
                { id: "today", label: "Today" },
                { id: "last_7_days", label: "Last 7 Days" },
                { id: "this_month", label: "This Month" },
                { id: "prev_month", label: "Previous Month" }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetClick(p.id)}
                  className="px-3.5 py-1.5 rounded-xl btn-secondary-pazino text-[11px] font-bold shadow-sm"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transfer Summary Card */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-[#111827]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-md flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider pazino-title mb-3.5 flex items-center gap-2">
              <FileText size={14} className="text-[#006EB2] dark:text-[#38BDF8]" />
              Transfer Execution Summary
            </h2>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Target Company:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{companyName || "-"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Date Range:</span>
                <span className="font-bold text-[#006EB2] dark:text-blue-400">{fromDate} ➔ {toDate} ({daysCount} days)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Branch Filter:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedBranch}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">Destination Cloud:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {supabaseEnv === "live" ? "Live Production" : "Test Database"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {/* Primary Action Button using Pazino Gradient */}
            <button
              onClick={handleStartSync}
              disabled={isSyncing}
              className={`flex-1 py-4 px-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all ${
                isSyncing
                  ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-300 dark:border-white/5"
                  : "btn-primary-pazino shadow-xl active:scale-[0.98]"
              }`}
            >
              <Play size={16} className="fill-white text-white" />
              {isSyncing ? "Transferring Vouchers..." : "Run Reconciliation & Sync"}
            </button>

            {/* Secondary Button */}
            <button
              onClick={handleStopSync}
              disabled={!isSyncing}
              className={`py-4 px-6 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                isSyncing
                  ? "bg-red-50 dark:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-500/40 hover:bg-red-100 shadow-md"
                  : "btn-secondary-pazino opacity-50 cursor-not-allowed"
              }`}
            >
              <Square size={14} className="fill-current" />
              Stop
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. ROW 3: TRANSFER PROGRESS & 4 KPI TILES ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Progress Card */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-[#111827]/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider pazino-title flex items-center gap-2">
              <Activity size={14} className="text-[#006EB2] dark:text-[#38BDF8]" />
              Live Transfer Telemetry
            </span>
            <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
              isSyncing 
                ? "bg-blue-50 dark:bg-blue-500/15 text-[#006EB2] dark:text-blue-300 border-blue-300 dark:border-blue-500/30 animate-pulse" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5"
            }`}>
              {isSyncing ? "SYNC IN PROGRESS" : "STANDBY"}
            </span>
          </div>

          <div className="flex items-center gap-5">
            {/* Circular Progress Indicator */}
            <div className="w-18 h-18 rounded-full bg-slate-100 dark:bg-[#162232] border-3 border-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {Math.round((syncStatus?.progress || 0) * 100)}%
              </span>
            </div>
            <div className="flex-1 space-y-1.5">
              <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                {syncStatus?.status_title || "Ready to Transfer"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {syncStatus?.status_subtitle || "Click Run Reconciliation to initiate."}
              </p>
              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-[#162030] overflow-hidden p-0.5 border border-slate-200 dark:border-white/5">
                <div 
                  className="h-full rounded-full btn-primary-pazino transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.round((syncStatus?.progress || 0) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Telemetry Stats Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-[#162030]/80 border border-slate-200 dark:border-white/5 text-center text-xs font-mono">
            <div>
              <span className="text-[9px] font-extrabold text-slate-500 block uppercase">Duration</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {new Date((syncStatus?.duration_seconds || 0) * 1000).toISOString().substr(11, 8)}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-slate-500 block uppercase">Speed</span>
              <span className="font-bold text-[#006EB2] dark:text-blue-400">{syncStatus?.speed || 0} vch/s</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-slate-500 block uppercase">Current Date</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 truncate block">
                {syncStatus?.current_date || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Metric Tiles */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Tile 1 */}
          <div className="p-5 rounded-3xl bg-blue-50/80 dark:bg-gradient-to-br dark:from-[#121a28] dark:to-[#0f1522] border border-blue-200 dark:border-blue-500/20 shadow-md flex flex-col justify-between hover:border-[#006EB2] dark:hover:border-blue-500/40 transition-all">
            <span className="text-[10px] font-extrabold uppercase tracking-wider pazino-title">Total Processed</span>
            <span className="text-3xl font-black text-[#006EB2] dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-blue-400 dark:to-blue-200 my-1">
              {syncStatus?.total_vouchers?.toLocaleString() || "0"}
            </span>
            <span className="text-[10px] text-slate-600 dark:text-slate-500 font-medium">Vouchers Transferred</span>
          </div>

          {/* Tile 2 */}
          <div className="p-5 rounded-3xl bg-emerald-50/80 dark:bg-gradient-to-br dark:from-[#0e2118] dark:to-[#0c1a14] border border-emerald-200 dark:border-emerald-500/20 shadow-md flex flex-col justify-between hover:border-emerald-400 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-slate-400">Matched CC</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                {syncStatus?.total_vouchers ? Math.round((syncStatus.matches / syncStatus.total_vouchers) * 100) : 0}%
              </span>
            </div>
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 my-1">
              {syncStatus?.matches?.toLocaleString() || "0"}
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400/70 font-medium">Universal Allocation OK</span>
          </div>

          {/* Tile 3 */}
          <div className="p-5 rounded-3xl bg-red-50/80 dark:bg-gradient-to-br dark:from-[#241214] dark:to-[#1c0e10] border border-red-200 dark:border-red-500/20 shadow-md flex flex-col justify-between hover:border-red-400 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-800 dark:text-slate-400">Discrepancies</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">
                {syncStatus?.total_vouchers ? Math.round((syncStatus.mismatches / syncStatus.total_vouchers) * 100) : 0}%
              </span>
            </div>
            <span className="text-3xl font-black text-red-600 dark:text-red-400 my-1">
              {syncStatus?.mismatches?.toLocaleString() || "0"}
            </span>
            <span className="text-[10px] text-red-700 dark:text-red-400/70 font-medium">Unmapped / Split Error</span>
          </div>

          {/* Tile 4 */}
          <div className="p-5 rounded-3xl bg-purple-50/80 dark:bg-gradient-to-br dark:from-[#1d1427] dark:to-[#150f1d] border border-purple-200 dark:border-purple-500/20 shadow-md flex flex-col justify-between hover:border-purple-400 transition-all">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 dark:text-slate-400">New Masters</span>
            <span className="text-3xl font-black text-purple-600 dark:text-purple-400 my-1">
              {syncStatus?.new_masters?.toLocaleString() || "0"}
            </span>
            <span className="text-[10px] text-purple-700 dark:text-purple-400/70 font-medium">Queued for Review</span>
          </div>
        </div>
      </div>

      {/* ── 5. ROW 4: OPERATION LOG TERMINAL (FIXED INDEPENDENT SCROLL) ──────── */}
      <div className="rounded-3xl bg-white dark:bg-[#111827]/90 border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl backdrop-blur-2xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#162030]/80">
          <div className="flex items-center gap-2.5">
            <Activity size={16} className="text-[#006EB2] dark:text-blue-400" />
            <span className="text-xs font-black uppercase tracking-wider pazino-title">
              Live Operation Terminal Log
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLog}
              className="px-3 py-1.5 rounded-xl btn-secondary-pazino text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Copy size={13} />
              {copySuccess ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={() => {
                const blob = new Blob([syncStatus?.logs?.map(l => `[${l.time}] ${l.message}`).join("\n") || ""], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `tally_bridge_log_${Date.now()}.txt`;
                a.click();
              }}
              className="px-3 py-1.5 rounded-xl btn-secondary-pazino text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Download size={13} />
              Export
            </button>
          </div>
        </div>

        {/* Terminal Box - Isolated scroll with crisp dark console look in both themes */}
        <div 
          ref={terminalBoxRef}
          className="p-5 bg-slate-950 dark:bg-[#080c14] font-mono text-xs h-64 overflow-y-auto space-y-1.5 select-text border-t border-slate-800"
        >
          {syncStatus?.logs?.map((l, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-slate-500 flex-shrink-0">[{l.time}]</span>
              <span
                className={
                  l.level === "SUCCESS"
                    ? "text-emerald-400 font-semibold"
                    : l.level === "ERROR"
                    ? "text-red-400 font-bold"
                    : l.level === "WARN"
                    ? "text-amber-400 font-semibold"
                    : l.level === "STOP"
                    ? "text-red-500 font-extrabold"
                    : "text-slate-300"
                }
              >
                {l.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
