import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Trash2,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  ArrowRight,
  Sparkles,
  Layers,
  Check,
  X,
  ExternalLink,
  Unlink
} from "lucide-react";
import {
  fetchLedgerMappings,
  saveLedgerMappings,
  deleteLedgerMapping,
  addMasterBranch,
  deleteMasterBranch,
  verifyLedgerMapping,
  permanentlyDeleteLedger
} from "../api";

export default function BranchLedgersModule({ theme, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    items: [],
    groups: [],
    master_branches: [],
    stats: { total_ledgers: 0, mapped_count: 0, unmapped_count: 0 }
  });

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedGroup, setSelectedGroup] = useState("ALL");

  // Add Branch Modal
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [newBranchInput, setNewBranchInput] = useState("");
  const [isAddingBranch, setIsAddingBranch] = useState(false);

  // Assign Ledger to Branch Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetBranch, setAssignTargetBranch] = useState("");
  const [selectedUnmappedLedgerKey, setSelectedUnmappedLedgerKey] = useState("");

  // Delete / Unmap confirmation dialog
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null); // { item, branch }
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete Branch Dialog
  const [deleteBranchTarget, setDeleteBranchTarget] = useState(null); // branchName string
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetchLedgerMappings();
      if (res.status === "ok") {
        setData(res);
      } else {
        showStatus("error", res.message || "Failed to load branch mappings.");
      }
    } catch (err) {
      showStatus("error", err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function showStatus(type, message, details = {}) {
    const id = Date.now();
    setToast({ type, message, ...details, id });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4200);
  }

  // Group mappings by branch name
  // Structure: { [branchName]: [ item1, item2, ... ] }
  const branchMap = useMemo(() => {
    const map = {};
    // Ensure all master branches exist in the map even if 0 ledgers are assigned yet
    (data.master_branches || []).forEach((b) => {
      map[b] = [];
    });

    (data.items || []).forEach((item) => {
      if (item.branch_name && item.branch_name.trim()) {
        const b = item.branch_name.trim();
        if (!map[b]) map[b] = [];
        map[b].push(item);
      }
    });

    return map;
  }, [data.master_branches, data.items]);

  // Distinct branch names list sorted
  const branchNames = useMemo(() => {
    return Object.keys(branchMap).sort((a, b) => a.localeCompare(b));
  }, [branchMap]);

  // Unmapped ledgers for quick assignment
  const unmappedLedgers = useMemo(() => {
    return (data.items || []).filter((it) => !it.branch_name || !it.branch_name.trim());
  }, [data.items]);

  // Filtered branches & ledgers
  const filteredBranches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return branchNames
      .filter((bName) => {
        if (selectedBranch !== "ALL" && bName !== selectedBranch) return false;

        const ledgers = branchMap[bName] || [];
        // If there's group filter
        if (selectedGroup !== "ALL") {
          const hasGroup = ledgers.some((l) => l.group_name === selectedGroup);
          if (!hasGroup) return false;
        }

        // If search query
        if (q) {
          const matchBranch = bName.toLowerCase().includes(q);
          const matchAnyLedger = ledgers.some(
            (l) =>
              l.ledger_name.toLowerCase().includes(q) ||
              l.group_name.toLowerCase().includes(q)
          );
          if (!matchBranch && !matchAnyLedger) return false;
        }

        return true;
      })
      .map((bName) => {
        let ledgers = branchMap[bName] || [];
        if (selectedGroup !== "ALL") {
          ledgers = ledgers.filter((l) => l.group_name === selectedGroup);
        }
        if (q) {
          ledgers = ledgers.filter(
            (l) =>
              bName.toLowerCase().includes(q) ||
              l.ledger_name.toLowerCase().includes(q) ||
              l.group_name.toLowerCase().includes(q)
          );
        }
        return {
          branchName: bName,
          ledgers
        };
      });
  }, [branchNames, branchMap, selectedBranch, selectedGroup, searchQuery]);

  // Stats
  const totalBranchesCount = branchNames.length;
  const branchesWithLedgers = branchNames.filter((b) => (branchMap[b] || []).length > 0).length;
  const mappedLedgersCount = data.stats?.mapped_count || 0;

  // Handle Delete / Unmap Mapping
  async function handleDeleteConfirm() {
    if (!deleteConfirmTarget) return;
    const { item, branch } = deleteConfirmTarget;
    setIsDeleting(true);

    // Optimistic UI update
    setData((prev) => {
      const nextItems = (prev.items || []).map((it) => {
        if (it.group_name === item.group_name && it.ledger_name === item.ledger_name) {
          return {
            ...it,
            branch_name: "",
            is_mapped: false,
            is_verified: false
          };
        }
        return it;
      });
      const mCount = nextItems.filter((i) => i.is_mapped).length;
      return {
        ...prev,
        items: nextItems,
        stats: {
          ...prev.stats,
          mapped_count: mCount,
          unmapped_count: nextItems.length - mCount
        }
      };
    });

    try {
      const res = await deleteLedgerMapping(item.group_name, item.ledger_name);
      if (res.status === "ok") {
        showStatus("success", `Unmapped "${item.ledger_name}" from "${branch}".`, {
          badge: "Mapping Removed",
          ledger: item.ledger_name,
          branch: "Unmapped"
        });
        setDeleteConfirmTarget(null);
        await loadData(true);
      } else {
        showStatus("error", res.message || "Failed to remove mapping.");
        await loadData(true);
      }
    } catch (err) {
      showStatus("error", err.message);
      await loadData(true);
    } finally {
      setIsDeleting(false);
    }
  }

  // Handle Permanent Delete Ledger (Duplicate cleanup from DB)
  async function handlePermanentlyDeleteLedgerConfirm() {
    if (!deleteConfirmTarget) return;
    const { item, branch } = deleteConfirmTarget;
    setIsDeleting(true);

    // Optimistic UI update
    setData((prev) => {
      const nextItems = (prev.items || []).filter(
        (it) => !(it.group_name === item.group_name && it.ledger_name === item.ledger_name)
      );
      const mCount = nextItems.filter((i) => i.is_mapped).length;
      return {
        ...prev,
        items: nextItems,
        stats: {
          ...prev.stats,
          total_ledgers: nextItems.length,
          mapped_count: mCount,
          unmapped_count: nextItems.length - mCount
        }
      };
    });

    try {
      const res = await permanentlyDeleteLedger(item.group_name, item.ledger_name);
      if (res.status === "ok") {
        showStatus("warning", `Ledger "${item.ledger_name}" permanently deleted from database.`, {
          badge: "Ledger Deleted",
          ledger: item.ledger_name,
          branch: "Deleted from DB"
        });
        setDeleteConfirmTarget(null);
        await loadData(true);
      } else {
        showStatus("error", res.message || "Failed to delete ledger.");
        await loadData(true);
      }
    } catch (err) {
      showStatus("error", err.message);
      await loadData(true);
    } finally {
      setIsDeleting(false);
    }
  }

  // Handle Add Master Branch
  async function handleAddMasterBranch(e) {
    e.preventDefault();
    const bName = newBranchInput.trim();
    if (!bName) return;
    setIsAddingBranch(true);
    try {
      const res = await addMasterBranch(bName);
      if (res.status === "ok") {
        showStatus("success", `Branch "${bName}" added to master list.`);
        setNewBranchInput("");
        setShowAddBranchModal(false);
        await loadData(true);
      } else {
        showStatus("error", res.message || "Failed to add branch.");
      }
    } catch (err) {
      showStatus("error", err.message);
    } finally {
      setIsAddingBranch(false);
    }
  }

  // Handle Delete Master Branch
  async function handleDeleteBranchConfirm() {
    if (!deleteBranchTarget) return;
    setIsDeletingBranch(true);
    try {
      const res = await deleteMasterBranch(deleteBranchTarget);
      if (res.status === "ok") {
        showStatus("success", `Branch "${deleteBranchTarget}" deleted. ${res.unmapped_count || 0} ledger(s) moved to Unmapped.`, {
          badge: "Branch Deleted",
          branch: deleteBranchTarget
        });
        setDeleteBranchTarget(null);
        await loadData(true);
      } else {
        showStatus("error", res.message || "Failed to delete branch.");
      }
    } catch (err) {
      showStatus("error", err.message);
    } finally {
      setIsDeletingBranch(false);
    }
  }

  // Handle Verify Single Ledger Mapping
  async function handleVerifyLedger(item) {
    try {
      const res = await verifyLedgerMapping(item.group_name, item.ledger_name, item.branch_name);
      if (res.status === "ok") {
        showStatus("success", `Verified mapping for "${item.ledger_name}".`, {
          badge: "Verified",
          ledger: item.ledger_name,
          branch: item.branch_name
        });
        await loadData(true);
      } else {
        showStatus("error", res.message || "Failed to verify mapping.");
      }
    } catch (err) {
      showStatus("error", err.message);
    }
  }

  // Handle Quick Assign Ledger to Branch
  async function handleQuickAssign(e) {
    e.preventDefault();
    if (!assignTargetBranch || !selectedUnmappedLedgerKey) return;
    const [grp, lname] = selectedUnmappedLedgerKey.split("::");

    // Optimistic update
    setData((prev) => {
      const nextItems = (prev.items || []).map((it) => {
        if (it.group_name === grp && it.ledger_name === lname) {
          return {
            ...it,
            branch_name: assignTargetBranch,
            is_mapped: true,
            is_verified: true
          };
        }
        return it;
      });
      const mCount = nextItems.filter((i) => i.is_mapped).length;
      return {
        ...prev,
        items: nextItems,
        stats: {
          ...prev.stats,
          mapped_count: mCount,
          unmapped_count: nextItems.length - mCount
        }
      };
    });

    try {
      const res = await saveLedgerMappings([
        {
          group_name: grp,
          ledger_name: lname,
          branch_name: assignTargetBranch,
          is_verified: true
        }
      ]);
      if (res.status === "ok") {
        showStatus("success", `Assigned "${lname}" to "${assignTargetBranch}".`, {
          badge: "Branch Assigned",
          ledger: lname,
          branch: assignTargetBranch
        });
        setShowAssignModal(false);
        setSelectedUnmappedLedgerKey("");
        await loadData(true);
      } else {
        showStatus("error", res.message || "Failed to assign ledger.");
        await loadData(true);
      }
    } catch (err) {
      showStatus("error", err.message);
      await loadData(true);
    }
  }

  const getGroupBadgeColor = (grp) => {
    switch (grp) {
      case "Purchase Accounts":
        return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
      case "HO Stock Consumed":
        return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
      case "Stock Consumed":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
      case "Inter Branch Transfers":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
      case "Stock Discrepancy":
        return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
      case "Damage Conversion Accounts":
        return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30";
      default:
        return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-28">
      {/* 🌟 Floating Dynamic Island Toast (Centered at Top) */}
      {toast && (
        <div className="fixed top-6 inset-x-0 z-[99999] flex justify-center items-start pointer-events-none px-4">
          <div className="pointer-events-auto relative w-full max-w-lg rounded-2xl p-3.5 bg-slate-900/95 dark:bg-[#0c1322]/95 border border-white/15 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-dynamicIsland overflow-hidden">
            {/* Glow Aura */}
            <div
              className={`absolute -inset-1 rounded-3xl blur-md opacity-40 transition-opacity pointer-events-none ${
                toast.type === "success"
                  ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500"
                  : toast.type === "warning"
                  ? "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500"
                  : "bg-gradient-to-r from-rose-500 via-red-500 to-pink-500"
              }`}
            ></div>

            <div className="relative flex items-center justify-between gap-3.5 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                    toast.type === "success"
                      ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 ring-4 ring-emerald-500/10"
                      : toast.type === "warning"
                      ? "bg-amber-500/25 text-amber-400 border border-amber-500/30 ring-4 ring-amber-500/10"
                      : "bg-rose-500/25 text-rose-400 border border-rose-500/30 ring-4 ring-rose-500/10"
                  }`}
                >
                  {toast.type === "success" ? (
                    <CheckCircle2 size={20} />
                  ) : toast.type === "warning" ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <X size={20} />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        toast.type === "success"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : toast.type === "warning"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {toast.badge || "Branch Engine"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">PostgreSQL Server</span>
                  </div>

                  {toast.ledger && toast.branch ? (
                    <div className="mt-1 flex items-center gap-1.5 text-xs overflow-hidden truncate">
                      <span className="font-extrabold text-slate-100 truncate max-w-[200px]" title={toast.ledger}>
                        {toast.ledger}
                      </span>
                      <ArrowRight size={13} className="text-emerald-400 flex-shrink-0" />
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/25 text-emerald-300 font-black border border-emerald-500/40 tracking-tight flex-shrink-0 shadow-sm">
                        {toast.branch}
                      </span>
                    </div>
                  ) : (
                    <span className="mt-1 text-xs font-semibold text-slate-100 truncate">
                      {toast.message}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setToast(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all flex-shrink-0"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 dark:from-[#0d1424] dark:via-[#09101f] dark:to-[#070b14] border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-2">
              <Building2 size={13} />
              <span>Canonical Branch Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Master Branches & Assigned Ledgers
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Inspect each Canonical Branch, review all assigned Tally Ledgers across groups, 
              and delete or unmap any misaligned ledgers directly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => loadData()}
              className="px-4 py-2.5 rounded-2xl btn-secondary-pazino flex items-center gap-2 text-xs font-bold hover:shadow transition-all"
              title="Refresh branch and ledger mappings"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-blue-500" : ""} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowAddBranchModal(true)}
              className="px-4 py-2.5 rounded-2xl btn-primary-pazino flex items-center gap-2 text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              <Plus size={14} />
              <span>Add Branch</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-[#111827]/80 border border-slate-200/80 dark:border-white/5 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Canonical Branches
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {totalBranchesCount}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">In DB</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-[#111827]/80 border border-slate-200/80 dark:border-white/5 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Active with Ledgers
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {branchesWithLedgers}
              </span>
              <span className="text-xs text-slate-500 font-medium">Of {totalBranchesCount}</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-500/20 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              Mapped Ledgers
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {mappedLedgersCount}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Assigned</span>
            </div>
          </div>

          <div
            onClick={() => onNavigate && onNavigate("settings_ledgers")}
            className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/20 shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
            title="Go to Ledger Mapping to map unassigned ledgers"
          >
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
              Unmapped Ledgers
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {unmappedLedgers.length}
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                Map now <ArrowRight size={11} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white/80 dark:bg-[#111827]/80 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branch name or ledger name..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dropdowns Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Branches ({branchNames.length})</option>
              {branchNames.map((b) => (
                <option key={b} value={b}>
                  {b} ({branchMap[b]?.length || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Group Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Group:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Groups</option>
              {(data.groups || []).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Branches List Cards */}
      {loading ? (
        <div className="p-16 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-slate-400">
          <RefreshCw size={28} className="animate-spin text-blue-500 mb-3" />
          <span className="text-sm font-bold">Loading branch directory...</span>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="p-16 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 text-center text-slate-500">
          <Building2 size={36} className="mx-auto text-slate-400 mb-2 opacity-50" />
          <h3 className="font-bold text-base text-slate-700 dark:text-slate-300">No branches match your filters</h3>
          <p className="text-xs text-slate-400 mt-1">Try resetting the branch or group dropdowns above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBranches.map(({ branchName, ledgers }) => (
            <div
              key={branchName}
              className="rounded-3xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/90 dark:border-white/10 shadow-sm overflow-hidden transition-all hover:shadow-md"
            >
              {/* Branch Header Row */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-slate-50/50 to-transparent dark:from-white/[0.03] dark:via-transparent border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black flex-shrink-0 border border-blue-500/20 shadow-sm">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        {branchName}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {ledgers.length} {ledgers.length === 1 ? "Ledger" : "Ledgers"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Standardized Canonical Branch Entity
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setAssignTargetBranch(branchName);
                      setShowAssignModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20 transition-colors flex items-center gap-1.5"
                    title={`Assign another ledger to ${branchName}`}
                  >
                    <Plus size={13} />
                    <span>Assign Ledger</span>
                  </button>

                  <button
                    onClick={() => setDeleteBranchTarget(branchName)}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20 transition-colors flex items-center gap-1.5"
                    title={`Delete branch "${branchName}" and unmap its ledgers`}
                  >
                    <Trash2 size={13} />
                    <span>Delete Branch</span>
                  </button>
                </div>
              </div>

              {/* Assigned Ledgers Table for this Branch */}
              {ledgers.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/40 dark:bg-white/[0.01]">
                  <p className="text-xs font-semibold text-slate-400">
                    No Tally ledgers currently assigned to <b className="text-slate-600 dark:text-slate-300">{branchName}</b>.
                  </p>
                  <button
                    onClick={() => {
                      setAssignTargetBranch(branchName);
                      setShowAssignModal(true);
                    }}
                    className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={12} /> Assign a ledger now
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.01] text-slate-500 font-bold">
                        <th className="py-2.5 px-4 w-48">Target Group</th>
                        <th className="py-2.5 px-4">Tally Ledger Name</th>
                        <th className="py-2.5 px-4 w-44">Verification Status</th>
                        <th className="py-2.5 px-4 w-28 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {ledgers.map((item) => (
                        <tr
                          key={`${item.group_name}::${item.ledger_name}`}
                          className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getGroupBadgeColor(
                                item.group_name
                              )}`}
                            >
                              {item.group_name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">
                              {item.ledger_name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {item.is_verified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 size={11} />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                                  <AlertTriangle size={10} />
                                  <span>New / Unverified</span>
                                </span>
                                <button
                                  onClick={() => handleVerifyLedger(item)}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30 flex items-center gap-0.5 transition-colors shadow-sm"
                                  title="Verify and confirm this branch mapping"
                                >
                                  <Check size={10} />
                                  <span>Verify</span>
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {/* Delete / Unmap Button */}
                            <button
                              onClick={() => setDeleteConfirmTarget({ item, branch: branchName })}
                              className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20 transition-all flex items-center gap-1.5 ml-auto"
                              title={`Delete mapping for ${item.ledger_name}`}
                            >
                              <Trash2 size={12} />
                              <span>Delete Map</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete / Unmap Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Remove or Delete Ledger?
                </h3>
                <span className="text-xs text-slate-500">Unlink from branch or permanently delete duplicate</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Tally Ledger:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {deleteConfirmTarget.item.ledger_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Group:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {deleteConfirmTarget.item.group_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Branch:</span>
                <span className="font-black text-blue-600 dark:text-blue-400">
                  {deleteConfirmTarget.branch}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose <b>Unlink</b> to keep the ledger for re-assignment, or <b>Delete Ledger</b> if this entry is a duplicate/mistake to remove it completely from PostgreSQL.
            </p>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl btn-secondary-pazino text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                title="Unlinks from branch, moves to Unmapped"
              >
                <Unlink size={13} />
                <span>Unlink from Branch</span>
              </button>
              <button
                type="button"
                onClick={handlePermanentlyDeleteLedgerConfirm}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5"
                title="Permanently removes duplicate ledger from DB"
              >
                {isDeleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                <span>Delete Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Branch Modal */}
      {deleteBranchTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Delete Branch "{deleteBranchTarget}"?
                </h3>
              </div>
              <button
                onClick={() => setDeleteBranchTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this branch from <code className="text-blue-500 font-mono">master_branches</code>? Any ledgers currently mapped to this branch will be safely moved to <b>Unmapped</b> so they can be re-assigned.
            </p>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              ⚠️ If this branch was a duplicate (e.g. casing difference or obsolete name), deleting it will clean up the master branch list.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteBranchTarget(null)}
                disabled={isDeletingBranch}
                className="px-4 py-2 rounded-xl btn-secondary-pazino text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBranchConfirm}
                disabled={isDeletingBranch}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                {isDeletingBranch ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                <span>{isDeletingBranch ? "Deleting Branch..." : "Delete Branch"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Master Branch Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Building2 size={20} />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Add Canonical Branch
                </h3>
              </div>
              <button
                onClick={() => setShowAddBranchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the standardized name for this branch (e.g. "Acornhoek", "Violetbank", "Warehouse BF"). 
              It will be saved into PostgreSQL <code className="text-blue-500 font-mono">master_branches</code>.
            </p>

            <form onSubmit={handleAddMasterBranch} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Msholozi"
                  value={newBranchInput}
                  onChange={(e) => setNewBranchInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 rounded-xl btn-secondary-pazino text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newBranchInput.trim() || isAddingBranch}
                  className="px-4 py-2 rounded-xl btn-primary-pazino text-xs font-bold disabled:opacity-50"
                >
                  {isAddingBranch ? "Saving..." : "Save Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Assign Ledger to {assignTargetBranch}
                  </h3>
                  <span className="text-xs text-slate-500">Pick an unmapped ledger to align</span>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {unmappedLedgers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                All identified Tally ledgers are already mapped!
              </div>
            ) : (
              <form onSubmit={handleQuickAssign} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Unmapped Ledger ({unmappedLedgers.length} available)
                  </label>
                  <select
                    value={selectedUnmappedLedgerKey}
                    onChange={(e) => setSelectedUnmappedLedgerKey(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Choose an unmapped ledger --</option>
                    {unmappedLedgers.map((it) => (
                      <option
                        key={`${it.group_name}::${it.ledger_name}`}
                        value={`${it.group_name}::${it.ledger_name}`}
                      >
                        [{it.group_name}] {it.ledger_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 rounded-xl btn-secondary-pazino text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedUnmappedLedgerKey}
                    className="px-4 py-2 rounded-xl btn-primary-pazino text-xs font-bold disabled:opacity-50"
                  >
                    Assign to {assignTargetBranch}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
