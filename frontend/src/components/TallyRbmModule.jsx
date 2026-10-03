import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Upload, 
  RefreshCw, 
  Play, 
  Download, 
  Search, 
  ChevronRight,
  ChevronDown,
  Database,
  Calendar,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { 
  fetchPeriods, 
  uploadRBMFile, 
  pullTallyRBM, 
  pullTallyGroupSummaries,
  fetchTallyGroupSummaries,
  runReco, 
  fetchRecoResults, 
  getExportUrl 
} from "../api";
import InteractivePeriodPicker from "./InteractivePeriodPicker";


const PRESET_MONTHS = [
  "April 2026",
  "May 2026",
  "June 2026",
  "July 2026",
  "August 2026",
  "September 2026",
  "October 2026",
  "November 2026",
  "December 2026",
  "January 2027",
  "February 2027",
  "March 2027"
];

const TARGET_GROUPS = [
  { id: "Purchase Accounts", label: "Purchase Accounts", icon: "🛒", color: "from-blue-600/20 to-indigo-600/20 border-blue-500/30 text-blue-500" },
  { id: "Head Office Stock Consumed by Branch", label: "HO Stock Consumed", icon: "🏢", color: "from-purple-600/20 to-pink-600/20 border-purple-500/30 text-purple-400" },
  { id: "Stock Consumed By Branch", label: "Stock Consumed By Branch", icon: "📦", color: "from-amber-600/20 to-orange-600/20 border-amber-500/30 text-amber-500" },
  { id: "Stock Transfers Branches", label: "Stock Transfers (IBT)", icon: "🔄", color: "from-teal-600/20 to-emerald-600/20 border-teal-500/30 text-teal-400" },
  { id: "Stock Discrepancy in Branches", label: "Stock Discrepancy", icon: "⚠️", color: "from-rose-600/20 to-red-600/20 border-rose-500/30 text-rose-400" },
  { id: "Damage Conversion Accounts", label: "Damage Conversion", icon: "💥", color: "from-orange-600/20 to-amber-600/20 border-orange-500/30 text-orange-400" }
];

function getMonthDates(periodLabel) {
  const months = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12"
  };
  const parts = periodLabel.toLowerCase().split(" ");
  const mName = parts[0];
  const yStr = parts[1] || "2026";
  const mNum = months[mName] || "08";
  
  // Last day of month
  const lastDay = new Date(parseInt(yStr, 10), parseInt(mNum, 10), 0).getDate();
  const padDay = String(lastDay).padStart(2, "0");
  return {
    from: `${yStr}-${mNum}-01`,
    to: `${yStr}-${mNum}-${padDay}`
  };
}

export default function TallyRbmModule() {
  const [selectedPeriod, setSelectedPeriod] = useState("August 2026");
  const [dbSavedPeriods, setDbSavedPeriods] = useState(["August 2026"]);
  const [fromDate, setFromDate] = useState("2026-08-01");
  const [toDate, setToDate] = useState("2026-08-31");

  // Tab View: "reco" | "tally_groups"
  const [activeTab, setActiveTab] = useState("reco");

  // Reco results state
  const [recoResults, setRecoResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Search & Filter for Reco
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [selectedRowDetail, setSelectedRowDetail] = useState(null);

  // Tally Group Summaries state
  const [tallyGroupData, setTallyGroupData] = useState({
    has_data: false,
    source: null,
    updated_at: null,
    groups_summary: {},
    items: [],
    total_ledgers: 0
  });
  const [groupFilter, setGroupFilter] = useState("all");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [expandedBranches, setExpandedBranches] = useState(new Set());

  useEffect(() => {
    loadPeriodsAndResults();
  }, []);

  async function loadPeriodsAndResults() {
    try {
      const pRes = await fetchPeriods();
      const loaded = pRes?.periods?.length ? pRes.periods : ["August 2026"];
      setDbSavedPeriods(loaded);
      const initial = loaded.includes("August 2026") ? "August 2026" : loaded[0];
      setSelectedPeriod(initial);
      const dates = getMonthDates(initial);
      setFromDate(dates.from);
      setToDate(dates.to);
      loadResultsForPeriod(initial);
      loadDbTallyData(initial);
    } catch (e) {
      console.error(e);
    }
  }


  async function loadResultsForPeriod(period) {
    setLoading(true);
    try {
      const r = await fetchRecoResults(period);
      if (r?.status === "ok") {
        setRecoResults(r.results || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadDbTallyData(period) {
    try {
      const res = await fetchTallyGroupSummaries(period);
      if (res?.status === "ok" && res.has_data) {
        setTallyGroupData({
          has_data: true,
          source: "database",
          updated_at: res.updated_at,
          groups_summary: res.groups_summary || {},
          items: res.items || [],
          total_ledgers: res.total_ledgers || (res.items || []).length
        });
      }
    } catch (e) {
      console.error("Error loading DB tally data:", e);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const res = await uploadRBMFile(file);
      if (res.status === "ok") {
        setMessage({
          type: "success",
          text: `Loaded RBM file '${res.filename}': ${res.trading_rows} trading account rows & ${res.branch_rows} branch report rows.`
        });
      } else {
        setMessage({ type: "error", text: res.message });
      }
    } catch (e) {
      setMessage({ type: "error", text: String(e) });
    } finally {
      setLoading(false);
    }
  }

  // 1. Pull Fresh from Tally
  async function handlePullTally() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await pullTallyGroupSummaries(selectedPeriod, fromDate, toDate);
      if (res.status === "ok") {
        setTallyGroupData({
          has_data: true,
          source: "tally_live",
          updated_at: new Date().toLocaleTimeString(),
          groups_summary: res.groups_summary || {},
          items: res.items || [],
          total_ledgers: res.total_ledgers || (res.items || []).length
        });
        setActiveTab("tally_groups");
        setMessage({
          type: "success",
          text: `Extracted ${res.total_ledgers || res.items?.length || 0} ledgers across 6 groups from Tally (${fromDate} to ${toDate}) and saved to PostgreSQL server!`
        });
      } else if (res.status === "warn") {
        if (res.items?.length) {
          setTallyGroupData({
            has_data: true,
            source: res.source || "database",
            updated_at: res.updated_at,
            groups_summary: res.groups_summary || {},
            items: res.items || [],
            total_ledgers: res.total_ledgers
          });
        }
        setMessage({ type: "warn", text: res.message });
      } else {
        setMessage({ type: "error", text: res.message });
      }
    } catch (e) {
      setMessage({ type: "error", text: String(e) });
    } finally {
      setLoading(false);
    }
  }

  // 2. View Already Existing Data from DB
  async function handleViewDbData() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetchTallyGroupSummaries(selectedPeriod);
      if (res?.status === "ok" && res.has_data) {
        setTallyGroupData({
          has_data: true,
          source: "database",
          updated_at: res.updated_at,
          groups_summary: res.groups_summary || {},
          items: res.items || [],
          total_ledgers: res.total_ledgers || (res.items || []).length
        });
        setActiveTab("tally_groups");
        setMessage({
          type: "success",
          text: `Loaded ${res.total_ledgers} saved group summary records from PostgreSQL for '${selectedPeriod}'.`
        });
      } else {
        setMessage({
          type: "warn",
          text: `No saved Tally group summaries found in the database for '${selectedPeriod}'. Click 'Pull Fresh from Tally' to extract.`
        });
      }
    } catch (e) {
      setMessage({ type: "error", text: String(e) });
    } finally {
      setLoading(false);
    }
  }

  // 3. Run Reco
  async function handleRunReco() {
    setLoading(true);
    try {
      const res = await runReco(selectedPeriod, fromDate, toDate);
      if (res.status === "ok") {
        setRecoResults(res.results || []);
        setActiveTab("reco");
        setMessage({
          type: "success",
          text: `Reconciliation Completed & Saved to PostgreSQL! ${res.total_branches} stores audited (${res.flagged_count} discrepancies flagged).`
        });
      } else {
        setMessage({ type: "error", text: res.message });
      }
    } catch (e) {
      setMessage({ type: "error", text: String(e) });
    } finally {
      setLoading(false);
    }
  }

  // CSV Export for Tally Group Summaries
  function exportGroupSummariesCsv() {
    if (!tallyGroupData.items?.length) return;
    const headers = ["Group Name", "Ledger Name", "Branch Name", "Opening Balance", "Debit Amount", "Credit Amount", "Closing Balance"];
    const rows = tallyGroupData.items.map((it) => [
      `"${it.group_name}"`,
      `"${it.ledger_name}"`,
      `"${it.branch_name || ''}"`,
      it.opening_balance,
      it.debit_amount,
      it.credit_amount,
      it.closing_balance
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tally_Group_Summaries_${selectedPeriod.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Summary Metrics for Reco
  const totalStores = recoResults.length;
  const flaggedStores = recoResults.filter((r) => r.is_flagged).length;
  const matchedStores = totalStores - flaggedStores;
  const netVariance = recoResults.reduce((acc, r) => acc + (r.diff_reports_vs_sales || 0), 0);

  // Filtered rows for Reco
  const filteredRecoRows = recoResults.filter((r) => {
    const matchesSearch = !searchQuery || r.branch_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterMode === "flagged") return r.is_flagged;
    if (filterMode === "matched") return !r.is_flagged;
    return true;
  });

  // Filtered rows for Tally Group Summaries
  const filteredGroupItems = (tallyGroupData.items || []).filter((it) => {
    if (groupFilter !== "all" && it.group_name !== groupFilter) return false;
    if (groupSearchQuery) {
      const q = groupSearchQuery.toLowerCase();
      const mName = it.ledger_name?.toLowerCase().includes(q);
      const mBranch = it.branch_name?.toLowerCase().includes(q);
      const mGrp = it.group_name?.toLowerCase().includes(q);
      if (!mName && !mBranch && !mGrp) return false;
    }
    return true;
  });

  // Grouped by Branch for clean single-line view
  const groupedBranchData = React.useMemo(() => {
    const map = {};
    for (const it of filteredGroupItems) {
      const grp = it.group_name || "Unknown Group";
      const branch = (it.branch_name && it.branch_name.trim()) ? it.branch_name.trim() : "Unassigned / Unmapped";
      const key = `${grp}__${branch}`;
      if (!map[key]) {
        map[key] = {
          key,
          group_name: grp,
          branch_name: branch,
          is_unmapped: branch === "Unassigned / Unmapped" || branch.toUpperCase() === "UNMAPPED",
          total_opening: 0,
          total_debit: 0,
          total_credit: 0,
          total_closing: 0,
          ledgers: []
        };
      }
      map[key].total_opening += (it.opening_balance || 0);
      map[key].total_debit += (it.debit_amount || 0);
      map[key].total_credit += (it.credit_amount || 0);
      map[key].total_closing += (it.closing_balance || 0);
      map[key].ledgers.push(it);
    }
    return Object.values(map).sort((a, b) => {
      if (a.group_name !== b.group_name) return a.group_name.localeCompare(b.group_name);
      if (a.is_unmapped) return 1;
      if (b.is_unmapped) return -1;
      return a.branch_name.localeCompare(b.branch_name);
    });
  }, [filteredGroupItems]);

  const toggleBranchExpand = (key) => {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedBranches(new Set(groupedBranchData.map((g) => g.key)));
  };

  const collapseAll = () => {
    setExpandedBranches(new Set());
  };

  // Group Totals
  const totalGroupDebits = Object.values(tallyGroupData.groups_summary || {}).reduce((acc, g) => acc + (g.total_debit || 0), 0);
  const totalGroupCredits = Object.values(tallyGroupData.groups_summary || {}).reduce((acc, g) => acc + (g.total_credit || 0), 0);
  const totalGroupClosing = Object.values(tallyGroupData.groups_summary || {}).reduce((acc, g) => acc + (g.total_closing || 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto scroll-smooth">
      {/* ── 1. MODULE HERO BANNER & CONTROL BAR ──────────────────────────── */}
      <div className="relative z-30 p-6 rounded-3xl bg-white dark:bg-gradient-to-r dark:from-[#121826]/90 dark:via-[#1e1e38]/90 dark:to-[#121826]/90 border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-2xl">
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-600/15 dark:to-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="relative z-30 flex flex-wrap items-center justify-between gap-5">


          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl btn-primary-pazino flex items-center justify-center text-white text-2xl font-bold shadow-lg border border-white/20">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black pazino-title tracking-tight">
                  Tally Vs RBM Reconciliation Engine
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-extrabold text-[10px] border border-indigo-500/30 shadow-sm">
                  POSTGRESQL AUDIT
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-extrabold text-[10px] border border-emerald-500/30 shadow-sm flex items-center gap-1">
                  <span>●</span> 6 Tally Groups Auto-Summary
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                Purchase, HO Stock Consumed, Branch Consumed, Transfers (IBT), Discrepancy & Damage Accounts
              </p>
            </div>
          </div>

          {/* Interactive Period, Year & Calendar Range Picker */}
          <div className="flex items-center gap-3 flex-wrap">
            <InteractivePeriodPicker
              selectedPeriod={selectedPeriod}
              onSelectPeriod={(newPeriod) => {
                setSelectedPeriod(newPeriod);
                loadResultsForPeriod(newPeriod);
                loadDbTallyData(newPeriod);
              }}
              fromDate={fromDate}
              toDate={toDate}
              onDateRangeChange={(newFrom, newTo) => {
                setFromDate(newFrom);
                setToDate(newTo);
              }}
              dbSavedPeriods={dbSavedPeriods}
            />


            {/* Action 1: Pull Fresh from Tally */}
            <button
              onClick={handlePullTally}
              disabled={loading}
              className="px-4 py-2.5 rounded-2xl btn-secondary-pazino text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 border-blue-400 dark:border-blue-500/40"
              title="Pull fresh group summaries directly from Tally XML Server"
            >
              <RefreshCw size={14} className={`text-[#006EB2] dark:text-indigo-400 ${loading ? "animate-spin" : ""}`} />
              <span>Pull from Tally</span>
            </button>

            {/* Action 2: View Stored Data from DB */}
            <button
              onClick={handleViewDbData}
              disabled={loading}
              className="px-4 py-2.5 rounded-2xl btn-secondary-pazino text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 border-purple-400 dark:border-purple-500/40"
              title="Load existing group summaries already saved in PostgreSQL database"
            >
              <Database size={14} className="text-purple-600 dark:text-purple-400" />
              <span>View DB Data</span>
            </button>

            {/* Upload Excel Button */}
            <label className="cursor-pointer px-4 py-2.5 rounded-2xl btn-secondary-pazino text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95">
              <Upload size={14} className="text-[#006EB2] dark:text-blue-400" />
              <span>Upload RBM</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>

            {/* Run Reconciliation - PRIMARY ACTION BUTTON */}
            <button
              onClick={handleRunReco}
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl btn-primary-pazino text-xs font-extrabold text-white shadow-lg transition-all flex items-center gap-2 active:scale-95"
            >
              <Play size={14} className="fill-white text-white" />
              <span>Run Reco</span>
            </button>

            {/* Export Excel */}
            <a
              href={getExportUrl(selectedPeriod)}
              download
              className="px-4 py-2.5 rounded-2xl btn-secondary-pazino text-xs font-bold border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Download size={14} />
              <span>Export</span>
            </a>
          </div>
        </div>

        {/* ── HIGH-LEVEL MODULE NAVIGATION TABS ─────────────────────────── */}
        <div className="relative z-0 flex items-center gap-3 mt-6 pt-5 border-t border-slate-200 dark:border-white/10">

          <button
            onClick={() => setActiveTab("reco")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2.5 transition-all ${
              activeTab === "reco"
                ? "bg-[#006EB2] text-white shadow-lg shadow-blue-500/25"
                : "bg-slate-100 dark:bg-[#162030] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BarChart3 size={15} />
            <span>COS Reconciliation Matrix</span>
            {totalStores > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === "reco" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-white/10"}`}>
                {totalStores} Stores
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("tally_groups")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2.5 transition-all ${
              activeTab === "tally_groups"
                ? "bg-[#006EB2] text-white shadow-lg shadow-blue-500/25"
                : "bg-slate-100 dark:bg-[#162030] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers size={15} />
            <span>Tally Group Summaries (6 Groups)</span>
            {tallyGroupData.total_ledgers > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === "tally_groups" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-white/10"}`}>
                {tallyGroupData.total_ledgers} Ledgers
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg backdrop-blur-md ${
          message.type === "success" 
            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30" 
            : message.type === "warn"
            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30"
            : "bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-500/30"
        }`}>
          <div className="flex items-center gap-2">
            {message.type === "success" && <CheckCircle2 size={16} className="text-emerald-500" />}
            {message.type === "warn" && <AlertTriangle size={16} className="text-amber-500" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-black ml-4">✕</button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: RECONCILIATION AUDIT MATRIX ───────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "reco" && (
        <>
          {/* Summary KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-blue-50/80 dark:bg-gradient-to-br dark:from-[#121826] dark:to-[#0f1422] border border-blue-200 dark:border-blue-500/20 shadow-md flex flex-col justify-between hover:border-[#006EB2] dark:hover:border-blue-500/40 transition-all">
              <span className="text-[10px] font-extrabold uppercase tracking-wider pazino-title">Stores Audited</span>
              <div className="my-2">
                <span className="text-3xl font-black text-[#006EB2] dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-blue-400 dark:to-indigo-200">
                  {totalStores}
                </span>
                <span className="text-xs text-slate-500 ml-2 font-semibold">Total Branches</span>
              </div>
              <span className="text-[10px] text-[#006EB2] dark:text-blue-400 font-bold">PostgreSQL Server Connected</span>
            </div>

            <div className="p-5 rounded-3xl bg-emerald-50/80 dark:bg-gradient-to-br dark:from-[#0e2118] dark:to-[#0c1a14] border border-emerald-200 dark:border-emerald-500/20 shadow-md flex flex-col justify-between hover:border-emerald-400 transition-all">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-slate-400">Matched Stores</span>
              <div className="my-2">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{matchedStores}</span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400/80 ml-2 font-bold">
                  ({totalStores ? Math.round((matchedStores / totalStores) * 100) : 0}%)
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Zero Discrepancy Found</span>
            </div>

            <div className="p-5 rounded-3xl bg-red-50/80 dark:bg-gradient-to-br dark:from-[#241214] dark:to-[#1c0e10] border border-red-200 dark:border-red-500/20 shadow-md flex flex-col justify-between hover:border-red-400 transition-all">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-800 dark:text-slate-400">Discrepancies Flagged</span>
              <div className="my-2">
                <span className="text-3xl font-black text-red-600 dark:text-red-400">{flaggedStores}</span>
                <span className="text-xs text-red-700 dark:text-red-400/80 ml-2 font-bold">
                  ({totalStores ? Math.round((flaggedStores / totalStores) * 100) : 0}%)
                </span>
              </div>
              <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">Variance &gt; R 1.00 Threshold</span>
            </div>

            <div className="p-5 rounded-3xl bg-amber-50/80 dark:bg-gradient-to-br dark:from-[#241a10] dark:to-[#1a130c] border border-amber-200 dark:border-amber-500/20 shadow-md flex flex-col justify-between hover:border-amber-400 transition-all">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-slate-400">Net COS Variance</span>
              <div className="my-2">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  R {netVariance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Reports vs Sales Cost Diff</span>
            </div>
          </div>

          {/* Search, Filters & Data Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#111827]/90 border border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[280px]">
                <Search size={15} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search branch name (e.g. Bochum, Jane Furse, Tzaneen)..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#006EB2] dark:focus:border-indigo-500 font-semibold shadow-sm"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-[#162030] border border-slate-200 dark:border-white/10">
                <button
                  onClick={() => setFilterMode("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    filterMode === "all" ? "btn-primary-pazino shadow-md" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All Stores ({totalStores})
                </button>
                <button
                  onClick={() => setFilterMode("flagged")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    filterMode === "flagged" ? "bg-red-600 text-white shadow-md shadow-red-600/30" : "text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  }`}
                >
                  ⚠️ Flagged ({flaggedStores})
                </button>
                <button
                  onClick={() => setFilterMode("matched")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    filterMode === "matched" ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                  }`}
                >
                  ✅ Matched ({matchedStores})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#162030] text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-white/10 sticky top-0">
                  <tr>
                    <th className="py-4 px-4">Branch Name</th>
                    <th className="py-4 px-4 text-right">COS (Branch Reports)</th>
                    <th className="py-4 px-4 text-right">COS (Trading Acc)</th>
                    <th className="py-4 px-4 text-right">COS (Sales Cost)</th>
                    <th className="py-4 px-4 text-right">COS (Tally)</th>
                    <th className="py-4 px-4 text-right">Diff (Reports vs Sales)</th>
                    <th className="py-4 px-4 text-right">Diff (Reports vs Tally)</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-3 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredRecoRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400 font-bold">
                        No matching branch records found for {selectedPeriod}. Click 'Run Reco' or upload RBM Excel.
                      </td>
                    </tr>
                  ) : (
                    filteredRecoRows.map((r, i) => (
                      <tr
                        key={r.branch_name}
                        className={`hover:bg-slate-100 dark:hover:bg-[#162030]/80 transition-colors ${
                          i % 2 === 0 ? "bg-white dark:bg-[#111827]/40" : "bg-slate-50/50 dark:bg-[#162030]/20"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="text-slate-400">🏢</span>
                          {r.branch_name}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                          R {r.cos_branch_reports.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                          R {r.cos_trading_account.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                          R {r.cos_sales_report.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                          R {r.cos_tally.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                          Math.abs(r.diff_reports_vs_sales) > 1.0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          R {r.diff_reports_vs_sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                          Math.abs(r.diff_reports_vs_tally) > 1.0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          R {r.diff_reports_vs_tally.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold ${
                            r.is_flagged
                              ? "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30"
                              : "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30"
                          }`}>
                            {r.is_flagged ? "⚠️ MISMATCH" : "✅ MATCH"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => setSelectedRowDetail(r)}
                            className="p-1.5 rounded-xl btn-secondary-pazino flex items-center justify-center mx-auto"
                            title="View Detailed Breakdown"
                          >
                            <ChevronRight size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: TALLY GROUP SUMMARIES (6 GROUPS) ───────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "tally_groups" && (
        <div className="space-y-6">
          {/* Header Status & Sync Bar */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-[#111827]/90 border border-slate-200 dark:border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                tallyGroupData.source === "tally_live"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : tallyGroupData.source === "database"
                  ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                  : "bg-slate-200 dark:bg-white/10 text-slate-500"
              }`}>
                <span>●</span>
                <span>
                  {tallyGroupData.source === "tally_live" 
                    ? "Live Extracted from Tally" 
                    : tallyGroupData.source === "database" 
                    ? "Loaded from PostgreSQL DB" 
                    : "No Data Loaded"}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Range: <strong className="text-slate-800 dark:text-slate-200">{fromDate}</strong> to <strong className="text-slate-800 dark:text-slate-200">{toDate}</strong>
              </span>
              {tallyGroupData.updated_at && (
                <span className="text-[11px] text-slate-400 font-mono">
                  (Updated: {tallyGroupData.updated_at})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportGroupSummariesCsv}
                disabled={!tallyGroupData.items?.length}
                className="px-3.5 py-1.5 rounded-xl btn-secondary-pazino text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <FileSpreadsheet size={13} className="text-emerald-500" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handlePullTally}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-xl btn-primary-pazino text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                <span>Re-Pull from Tally</span>
              </button>
            </div>
          </div>

          {/* 6 Group Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TARGET_GROUPS.map((grp) => {
              const summary = tallyGroupData.groups_summary?.[grp.id] || { total_debit: 0, total_credit: 0, total_closing: 0, ledger_count: 0 };
              const isSelected = groupFilter === grp.id;
              return (
                <div
                  key={grp.id}
                  onClick={() => setGroupFilter(isSelected ? "all" : grp.id)}
                  className={`p-5 rounded-3xl bg-white dark:bg-[#111827] border cursor-pointer transition-all hover:scale-[1.01] shadow-md flex flex-col justify-between ${
                    isSelected
                      ? "ring-2 ring-[#006EB2] border-[#006EB2] bg-blue-50/50 dark:bg-blue-950/20"
                      : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{grp.icon}</span>
                      <h3 className="text-xs font-black text-slate-800 dark:text-white line-clamp-1" title={grp.label}>
                        {grp.label}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#162030] text-[10px] font-black text-slate-500 border border-slate-200 dark:border-white/10">
                      {summary.ledger_count} Ledgers
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-3 pt-2 border-t border-slate-100 dark:border-white/5 text-center">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Total Dr</span>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        R {summary.total_debit?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Total Cr</span>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        R {summary.total_credit?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Closing</span>
                      <span className={`text-xs font-mono font-bold ${summary.total_closing < 0 ? "text-amber-500" : "text-emerald-500"}`}>
                        R {summary.total_closing?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1">
                    <span>{isSelected ? "Filter Active (Click to reset)" : "Click to view ledgers"}</span>
                    <ChevronRight size={13} className={isSelected ? "rotate-90 text-[#006EB2]" : ""} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Group Summaries Data Table Container */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#111827]/90 border border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-xl space-y-4">
            {/* Table Filters & Expand/Collapse Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[280px]">
                <Search size={15} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  placeholder="Search branch name or ledger (e.g. Acornhoek, Stahlex, Control, Cash Purchase)..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#006EB2] dark:focus:border-indigo-500 font-semibold shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Group Dropdown Filter */}
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#006EB2] dark:focus:border-indigo-500 cursor-pointer shadow-sm"
                >
                  <option value="all">📂 All 6 Groups ({tallyGroupData.total_ledgers} Ledgers)</option>
                  {TARGET_GROUPS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.icon} {g.label} ({tallyGroupData.groups_summary?.[g.id]?.ledger_count || 0})
                    </option>
                  ))}
                </select>

                {/* Expand All / Collapse All Buttons */}
                <div className="flex items-center rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#162030] p-1 shadow-sm">
                  <button
                    onClick={expandAll}
                    type="button"
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-colors flex items-center gap-1"
                    title="Expand all branches to view splits"
                  >
                    <ChevronDown size={13} className="text-[#006EB2] dark:text-blue-400" />
                    <span>Expand All</span>
                  </button>
                  <button
                    onClick={collapseAll}
                    type="button"
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-colors flex items-center gap-1"
                    title="Collapse all branches to clean single line view"
                  >
                    <ChevronRight size={13} className="text-slate-400" />
                    <span>Collapse All</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Ledgers Grouped by Branch Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#162030] text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-white/10 sticky top-0 z-10">
                  <tr>
                    <th className="py-4 px-4 w-[190px]">Group Name</th>
                    <th className="py-4 px-4 min-w-[240px]">Branch Name</th>
                    <th className="py-4 px-4 min-w-[220px]">Ledgers / Split Overview</th>
                    <th className="py-4 px-4 text-right">Opening Balance</th>
                    <th className="py-4 px-4 text-right">Debit Amount (Dr)</th>
                    <th className="py-4 px-4 text-right">Credit Amount (Cr)</th>
                    <th className="py-4 px-4 text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/5">
                  {groupedBranchData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400 font-bold">
                        {tallyGroupData.items?.length === 0 
                          ? "No Tally group summary records loaded yet. Click 'Pull from Tally' or 'View DB Data' above."
                          : "No branches matching the current group and search filter."}
                      </td>
                    </tr>
                  ) : (
                    groupedBranchData.map((b, idx) => {
                      const isExpanded = expandedBranches.has(b.key) || (groupSearchQuery && groupSearchQuery.trim() !== "");
                      const hasSplit = b.ledgers.length > 1;
                      const hasUnverified = b.ledgers.some((l) => !l.is_verified || !l.is_mapped);

                      return (
                        <React.Fragment key={b.key}>
                          {/* Parent Branch Summary Row */}
                          <tr
                            onClick={() => toggleBranchExpand(b.key)}
                            className={`cursor-pointer transition-colors border-b border-slate-200/80 dark:border-white/5 select-none ${
                              isExpanded
                                ? "bg-blue-50/70 dark:bg-blue-950/25"
                                : idx % 2 === 0
                                ? "bg-white dark:bg-[#111827]/40 hover:bg-slate-100/70 dark:hover:bg-[#162030]/80"
                                : "bg-slate-50/50 dark:bg-[#162030]/20 hover:bg-slate-100/70 dark:hover:bg-[#162030]/80"
                            }`}
                          >
                            {/* Group Badge */}
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#162030] text-[10px] font-extrabold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 whitespace-nowrap">
                                {b.group_name}
                              </span>
                            </td>

                            {/* Branch Name with Expand button */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBranchExpand(b.key);
                                  }}
                                  className={`p-1 rounded-lg transition-all ${
                                    hasSplit
                                      ? "hover:bg-blue-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
                                      : "text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
                                  }`}
                                  title={isExpanded ? "Collapse" : "Expand to view split"}
                                >
                                  {isExpanded ? (
                                    <ChevronDown size={15} className="text-[#006EB2] dark:text-blue-400 font-bold" />
                                  ) : (
                                    <ChevronRight size={15} className={hasSplit ? "text-[#006EB2] dark:text-blue-400 font-bold" : "text-slate-400"} />
                                  )}
                                </button>

                                <span className={`font-black text-xs ${b.is_unmapped ? "text-amber-600 dark:text-amber-400 italic" : "text-slate-900 dark:text-white"}`}>
                                  🏢 {b.branch_name}
                                </span>

                                {hasUnverified && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1" title="Contains new or unverified ledgers">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    <span>⚠️ Review</span>
                                  </span>
                                )}

                                {hasSplit ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-900/40 text-[#006EB2] dark:text-blue-300 border border-blue-200 dark:border-blue-700/30 flex items-center gap-1">
                                    <span>{b.ledgers.length} ledgers</span>
                                    <span className="text-[9px] font-normal">{isExpanded ? "▲" : "▼"}</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                    (1 ledger)
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Split Overview / Single Ledger Name */}
                            <td className="py-3 px-4 text-xs">
                              {hasSplit ? (
                                <span className="text-[11px] font-bold text-[#006EB2] dark:text-blue-400 hover:underline flex items-center gap-1">
                                  {isExpanded ? "▲ Hide split details" : `▼ View split (${b.ledgers.length} ledgers)`}
                                </span>
                              ) : (
                                <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[280px] block" title={b.ledgers[0]?.ledger_name}>
                                  {b.ledgers[0]?.ledger_name}
                                </span>
                              )}
                            </td>

                            {/* Opening Balance */}
                            <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                              R {b.total_opening.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Debit Amount */}
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-200">
                              R {b.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Credit Amount */}
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-200">
                              R {b.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Closing Balance */}
                            <td className={`py-3 px-4 text-right font-mono font-black ${
                              b.total_closing < 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                            }`}>
                              R {b.total_closing.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>

                          {/* Child Split Rows (when expanded) */}
                          {isExpanded && b.ledgers.map((l, cIdx) => (
                            <tr
                              key={`${b.key}_ledger_${l.ledger_name}_${cIdx}`}
                              className="bg-slate-50/90 dark:bg-[#162030]/70 border-b border-slate-200/50 dark:border-white/5 hover:bg-slate-100/90 dark:hover:bg-[#1b263b] transition-colors"
                            >
                              <td className="py-2.5 px-4 text-right text-slate-400 dark:text-slate-500 font-mono text-xs">
                                <span className="text-[11px] font-bold text-slate-400">↳</span>
                              </td>
                              <td className="py-2.5 px-4 pl-10" colSpan={2}>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                    {l.ledger_name}
                                  </span>
                                  {l.is_mapped ? (
                                    l.is_verified ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                                        ✓ verified
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                        ⚠️ unverified
                                      </span>
                                    )
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                                      ⚠️ new / unmapped
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                R {l.opening_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                R {l.debit_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                R {l.credit_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`py-2.5 px-4 text-right font-mono text-[11px] font-bold ${
                                l.closing_balance < 0 ? "text-amber-600/90 dark:text-amber-400/90" : "text-emerald-600/90 dark:text-emerald-400/90"
                              }`}>
                                R {l.closing_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
                {groupedBranchData.length > 0 && (
                  <tfoot className="bg-slate-100 dark:bg-[#162030] font-black text-xs border-t-2 border-slate-300 dark:border-white/20 sticky bottom-0">
                    <tr>
                      <td colSpan={3} className="py-3.5 px-4 uppercase tracking-wider text-slate-800 dark:text-white font-extrabold">
                        Grand Total ({groupedBranchData.length} Branches, {filteredGroupItems.length} Ledgers)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        R {filteredGroupItems.reduce((acc, it) => acc + (it.opening_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-900 dark:text-white">
                        R {filteredGroupItems.reduce((acc, it) => acc + (it.debit_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-900 dark:text-white">
                        R {filteredGroupItems.reduce((acc, it) => acc + (it.credit_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-900 dark:text-white">
                        R {filteredGroupItems.reduce((acc, it) => acc + (it.closing_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ROW DRILL-DOWN MODAL ────────────────────────────────────────── */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-base font-black pazino-title flex items-center gap-2">
                  🏢 {selectedRowDetail.branch_name} Detailed COS Breakdown
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">Reconciliation Period: {selectedPeriod}</span>
              </div>
              <button
                onClick={() => setSelectedRowDetail(null)}
                className="p-2 rounded-xl btn-secondary-pazino text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Breakdown Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#162030] space-y-2 border border-slate-200 dark:border-white/5">
                <h4 className="font-extrabold pazino-title uppercase text-[10px]">Branch Reports COS Breakdown</h4>
                <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between"><span>Opening Stock:</span> <span className="font-mono">R {selectedRowDetail.details?.branch_reports?.opening_stock?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Purchases:</span> <span className="font-mono">R {selectedRowDetail.details?.branch_reports?.total_purchase?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>IBT In:</span> <span className="font-mono">R {selectedRowDetail.details?.branch_reports?.ibt_in?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>IBT Out:</span> <span className="font-mono">R {selectedRowDetail.details?.branch_reports?.ibt_out?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Stock Consumption:</span> <span className="font-mono">R {selectedRowDetail.details?.branch_reports?.stock_consumption?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Closing Stock:</span> <span className="font-mono">R {selectedRowDetail.details?.branch_reports?.closing_stock?.toLocaleString()}</span></div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#162030] space-y-2 border border-slate-200 dark:border-white/5">
                <h4 className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">Trading Account Breakdown</h4>
                <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between"><span>Sales Cost:</span> <span className="font-mono">R {selectedRowDetail.details?.trading_account?.sales_cost?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Sales Return Cost:</span> <span className="font-mono">R {selectedRowDetail.details?.trading_account?.sales_rtn_cost?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Net Sales Cost:</span> <span className="font-mono">R {selectedRowDetail.details?.trading_account?.net_sales_cost?.toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRowDetail(null)}
                className="px-5 py-2.5 rounded-2xl btn-primary-pazino font-bold text-xs shadow-md"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
