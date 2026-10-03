import React, { useState, useRef, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  Check, 
  Database,
  Sparkles,
  X
} from "lucide-react";

const MONTH_NAMES = [
  { num: "01", short: "Jan", full: "January" },
  { num: "02", short: "Feb", full: "February" },
  { num: "03", short: "Mar", full: "March" },
  { num: "04", short: "Apr", full: "April" },
  { num: "05", short: "May", full: "May" },
  { num: "06", short: "Jun", full: "June" },
  { num: "07", short: "Jul", full: "July" },
  { num: "08", short: "Aug", full: "August" },
  { num: "09", short: "Sep", full: "September" },
  { num: "10", short: "Oct", full: "October" },
  { num: "11", short: "Nov", full: "November" },
  { num: "12", short: "Dec", full: "December" }
];

const AVAILABLE_YEARS = [2024, 2025, 2026, 2027, 2028];

export default function InteractivePeriodPicker({
  selectedPeriod,
  onSelectPeriod,
  fromDate,
  toDate,
  onDateRangeChange,
  dbSavedPeriods = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("month_year"); // "month_year" | "custom_range" | "shortcuts"
  
  // Extract initial year & month from selectedPeriod (e.g. "August 2026")
  const initialYear = (() => {
    const m = selectedPeriod.match(/\d{4}/);
    return m ? parseInt(m[0], 10) : 2026;
  })();
  
  const [viewYear, setViewYear] = useState(initialYear);
  const [customFrom, setCustomFrom] = useState(fromDate || "2026-08-01");
  const [customTo, setCustomTo] = useState(toDate || "2026-08-31");

  const popoverRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keep year in sync if selectedPeriod changes externally
  useEffect(() => {
    const m = selectedPeriod.match(/\d{4}/);
    if (m) {
      setViewYear(parseInt(m[0], 10));
    }
  }, [selectedPeriod]);

  // Calculate days for a month
  function handleSelectMonth(m) {
    const periodLabel = `${m.full} ${viewYear}`;
    const lastDay = new Date(viewYear, parseInt(m.num, 10), 0).getDate();
    const padDay = String(lastDay).padStart(2, "0");
    const newFrom = `${viewYear}-${m.num}-01`;
    const newTo = `${viewYear}-${m.num}-${padDay}`;

    onDateRangeChange(newFrom, newTo);
    onSelectPeriod(periodLabel);
    setIsOpen(false);
  }

  function handleApplyCustomRange() {
    if (!customFrom || !customTo) return;
    const fromParts = customFrom.split("-");
    const toParts = customTo.split("-");
    
    // Label for custom range
    const dFrom = new Date(customFrom);
    const dTo = new Date(customTo);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const customLabel = `${dFrom.getDate()} ${months[dFrom.getMonth()]} ${dFrom.getFullYear()} - ${dTo.getDate()} ${months[dTo.getMonth()]} ${dTo.getFullYear()}`;

    onDateRangeChange(customFrom, customTo);
    onSelectPeriod(customLabel);
    setIsOpen(false);
  }

  // Quick Preset Helper
  function applyPreset(presetType) {
    const today = new Date();
    const currYear = today.getFullYear();
    const currMonth = today.getMonth(); // 0-indexed

    if (presetType === "aug_2026") {
      onDateRangeChange("2026-08-01", "2026-08-31");
      onSelectPeriod("August 2026");
    } else if (presetType === "sep_2026") {
      onDateRangeChange("2026-09-01", "2026-09-30");
      onSelectPeriod("September 2026");
    } else if (presetType === "jul_2026") {
      onDateRangeChange("2026-07-01", "2026-07-31");
      onSelectPeriod("July 2026");
    } else if (presetType === "current_month") {
      const mNum = String(currMonth + 1).padStart(2, "0");
      const lastDay = new Date(currYear, currMonth + 1, 0).getDate();
      const mName = MONTH_NAMES[currMonth].full;
      onDateRangeChange(`${currYear}-${mNum}-01`, `${currYear}-${mNum}-${String(lastDay).padStart(2, "0")}`);
      onSelectPeriod(`${mName} ${currYear}`);
    } else if (presetType === "last_month") {
      const prevDate = new Date(currYear, currMonth - 1, 1);
      const pYear = prevDate.getFullYear();
      const pMonth = prevDate.getMonth();
      const mNum = String(pMonth + 1).padStart(2, "0");
      const lastDay = new Date(pYear, pMonth + 1, 0).getDate();
      const mName = MONTH_NAMES[pMonth].full;
      onDateRangeChange(`${pYear}-${mNum}-01`, `${pYear}-${mNum}-${String(lastDay).padStart(2, "0")}`);
      onSelectPeriod(`${mName} ${pYear}`);
    } else if (presetType === "fy_2025_26") {
      onDateRangeChange("2025-03-01", "2026-02-28");
      onSelectPeriod("FY 2025-26");
    }
    setIsOpen(false);
  }

  // Calculate day difference
  const diffDays = (() => {
    if (!customFrom || !customTo) return 0;
    const d1 = new Date(customFrom);
    const d2 = new Date(customTo);
    const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  })();

  return (
    <div className="relative inline-block z-40" ref={popoverRef}>
      {/* ── 1. TRIGGER BUTTON ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#162030] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white shadow-sm hover:border-[#006EB2] dark:hover:border-indigo-500 transition-all flex items-center gap-2.5 cursor-pointer active:scale-95"
      >
        <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center text-[#006EB2] dark:text-blue-400">
          <CalendarIcon size={14} />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-slate-900 dark:text-white">{selectedPeriod}</span>
            {dbSavedPeriods.includes(selectedPeriod) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Saved in PostgreSQL" />
            )}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block leading-tight">
            {fromDate && toDate ? `${fromDate} ➔ ${toDate}` : "Click to choose period"}
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* ── 2. INTERACTIVE POPOVER MODAL ───────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Backdrop overlay to ensure popover floats cleanly on top and dismisses on outside click */}
          <div
            className="fixed inset-0 z-[99] bg-black/15 dark:bg-black/40 backdrop-blur-[0.5px]"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute top-full left-0 mt-2 z-[100] w-[380px] sm:w-[440px] rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/15 shadow-2xl p-5 space-y-4 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">

          {/* Popover Header & Nav Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#162030] p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("month_year")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "month_year"
                    ? "bg-[#006EB2] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                🗓️ Month & Year
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("custom_range")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "custom_range"
                    ? "bg-[#006EB2] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                📅 Custom Dates
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shortcuts")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "shortcuts"
                    ? "bg-[#006EB2] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                ⚡ Quick
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <X size={15} />
            </button>
          </div>

          {/* ── TAB 1: INTERACTIVE 12-MONTH & YEAR PICKER ─────────────────── */}
          {activeTab === "month_year" && (
            <div className="space-y-4">
              {/* Year Selector Navigation Bar */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[#162030] p-2.5 rounded-2xl border border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y - 1)}
                  className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                  title="Previous Year"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-2">
                  <select
                    value={viewYear}
                    onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                    className="px-3 py-1 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-white/10 text-sm font-black text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:border-[#006EB2]"
                  >
                    {AVAILABLE_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    Calendar Year
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setViewYear((y) => y + 1)}
                  className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                  title="Next Year"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* 12-Month Interactive Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {MONTH_NAMES.map((m) => {
                  const monthLabel = `${m.full} ${viewYear}`;
                  const isSelected = selectedPeriod === monthLabel;
                  const hasDbData = dbSavedPeriods.includes(monthLabel);

                  return (
                    <button
                      key={m.num}
                      type="button"
                      onClick={() => handleSelectMonth(m)}
                      className={`relative p-3 rounded-2xl border text-left transition-all hover:scale-[1.03] active:scale-95 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-gradient-to-br from-[#006EB2] to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/30"
                          : "bg-slate-50 dark:bg-[#162030] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                          {m.short}
                        </span>
                        {hasDbData && (
                          <span
                            className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : "bg-emerald-500"}`}
                            title="Records exist in PostgreSQL"
                          />
                        )}
                      </div>

                      <div className="mt-1.5">
                        <span className={`text-xs font-black block truncate ${isSelected ? "text-white" : "text-slate-900 dark:text-white"}`}>
                          {m.full}
                        </span>
                        <span className={`text-[9px] font-semibold block ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                          {viewYear}
                        </span>
                      </div>

                      {hasDbData && (
                        <div className="mt-1 flex items-center gap-1">
                          <Database size={8} className={isSelected ? "text-white" : "text-emerald-500"} />
                          <span className={`text-[8px] font-extrabold ${isSelected ? "text-white" : "text-emerald-600 dark:text-emerald-400"}`}>
                            In DB
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB 2: CUSTOM DATE RANGE ─────────────────────────────────── */}
          {activeTab === "custom_range" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#006EB2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#006EB2]"
                  />
                </div>
              </div>

              {/* Duration info */}
              <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20 text-xs text-[#006EB2] dark:text-blue-300 font-bold flex items-center justify-between">
                <span>Selected Range:</span>
                <span className="font-mono">{diffDays} Days</span>
              </div>

              <button
                type="button"
                onClick={handleApplyCustomRange}
                className="w-full py-2.5 rounded-2xl btn-primary-pazino text-white text-xs font-bold shadow-md active:scale-95 transition-all"
              >
                Apply Custom Date Range
              </button>
            </div>
          )}

          {/* ── TAB 3: QUICK SHORTCUTS ──────────────────────────────────── */}
          {activeTab === "shortcuts" && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => applyPreset("aug_2026")}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/5 hover:border-[#006EB2] dark:hover:border-indigo-500 text-left transition-all active:scale-95"
              >
                <span className="font-black text-slate-900 dark:text-white block">August 2026</span>
                <span className="text-[10px] text-slate-400 font-medium">01 Aug - 31 Aug 2026</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset("sep_2026")}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/5 hover:border-[#006EB2] dark:hover:border-indigo-500 text-left transition-all active:scale-95"
              >
                <span className="font-black text-slate-900 dark:text-white block">September 2026</span>
                <span className="text-[10px] text-slate-400 font-medium">01 Sep - 30 Sep 2026</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset("jul_2026")}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/5 hover:border-[#006EB2] dark:hover:border-indigo-500 text-left transition-all active:scale-95"
              >
                <span className="font-black text-slate-900 dark:text-white block">July 2026</span>
                <span className="text-[10px] text-slate-400 font-medium">01 Jul - 31 Jul 2026</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset("fy_2025_26")}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/5 hover:border-[#006EB2] dark:hover:border-indigo-500 text-left transition-all active:scale-95"
              >
                <span className="font-black text-slate-900 dark:text-white block">Full FY 2025-26</span>
                <span className="text-[10px] text-slate-400 font-medium">Annual Financial Period</span>
              </button>
            </div>
          )}
        </div>
        </>
      )}
    </div>

  );
}
