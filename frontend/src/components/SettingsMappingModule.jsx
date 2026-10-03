import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Plus,
  Sparkles,
  Building2,
  Check,
  ChevronDown,
  ArrowRight,
  HelpCircle,
  FileSpreadsheet,
  AlertCircle,
  FolderTree,
  Tag,
  Trash2,
  Unlink
} from "lucide-react";
import {
  fetchLedgerMappings,
  saveLedgerMappings,
  deleteLedgerMapping,
  bulkAssignBranch,
  autoSuggestAllMappings,
  fetchMasterBranches,
  addMasterBranch,
  scanTallyForNewLedgers,
  verifyLedgerMapping,
  permanentlyDeleteLedger,
  permanentlyDeleteLedgersBulk
} from "../api";

export default function SettingsMappingModule({ theme, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    items: [],
    groups: [],
    master_branches: [],
    stats: { total_ledgers: 0, mapped_count: 0, unmapped_count: 0, groups_count: 0 }
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("ALL");
  const [filterMode, setFilterMode] = useState("all"); // "all" | "unmapped" | "mapped"

  // Selection & Editing
  const [selectedRows, setSelectedRows] = useState(new Set()); // Set of "group::ledger"
  const [editingKey, setEditingKey] = useState(null); // "group::ledger"
  const [editBranchValue, setEditBranchValue] = useState("");

  // Bulk Assign State
  const [bulkBranch, setBulkBranch] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // New Master Branch Modal / Input
  const [newBranchInput, setNewBranchInput] = useState("");
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);

  // Delete Ledger Confirm Modal State
  const [deleteLedgerTarget, setDeleteLedgerTarget] = useState(null); // { item }
  const [isDeletingLedger, setIsDeletingLedger] = useState(false);

  // Bulk Delete Modal State
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Status banners & loading states
  const [toast, setToast] = useState(null); // { type, badge, message, group, ledger, branch, id }
  const [isScanningTally, setIsScanningTally] = useState(false);
  const [isAutoSuggesting, setIsAutoSuggesting] = useState(false);
  const [isSavingSingle, setIsSavingSingle] = useState(false);

  useEffect(() => {
    loadMappings();
  }, []);

  async function loadMappings(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetchLedgerMappings();
      if (res.status === "ok") {
        setData(res);
      } else {
        showStatus("error", res.message || "Failed to load ledger mappings.");
      }
    } catch (err) {
      showStatus("error", err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function showCreativeToast(toastData) {
    const id = Date.now();
    setToast({ ...toastData, id });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4200);
  }

  function showStatus(type, text) {
    showCreativeToast({
      type,
      badge: type === "success" ? "Success" : type === "warning" ? "Notice" : "Alert",
      message: text
    });
  }

  // Filtered Items
  const filteredItems = useMemo(() => {
    return (data.items || []).filter((item) => {
      // Group filter
      if (selectedGroup !== "ALL" && item.group_name !== selectedGroup) {
        return false;
      }
      // Branch filter
      if (selectedBranchFilter !== "ALL" && item.branch_name !== selectedBranchFilter) {
        return false;
      }
      // Status filter
      if (filterMode === "unmapped" && item.is_mapped) {
        return false;
      }
      if (filterMode === "mapped" && !item.is_mapped) {
        return false;
      }
      if (filterMode === "unverified" && item.is_verified) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLedger = item.ledger_name.toLowerCase().includes(q);
        const matchBranch = (item.branch_name || "").toLowerCase().includes(q);
        const matchGroup = item.group_name.toLowerCase().includes(q);
        const matchSuggested = (item.suggested_branch || "").toLowerCase().includes(q);
        if (!matchLedger && !matchBranch && !matchGroup && !matchSuggested) {
          return false;
        }
      }
      return true;
    });
  }, [data.items, selectedGroup, selectedBranchFilter, filterMode, searchQuery]);

  // Selection helpers
  const allFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((it) => selectedRows.has(`${it.group_name}::${it.ledger_name}`));

  function toggleSelectAll() {
    const next = new Set(selectedRows);
    if (allFilteredSelected) {
      filteredItems.forEach((it) => next.delete(`${it.group_name}::${it.ledger_name}`));
    } else {
      filteredItems.forEach((it) => next.add(`${it.group_name}::${it.ledger_name}`));
    }
    setSelectedRows(next);
  }

  function toggleRow(key) {
    const next = new Set(selectedRows);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedRows(next);
  }

  // Save single row change (Optimistic update - NO scroll reset!)
  async function handleSaveSingle(item, newBranch) {
    if (!newBranch || !newBranch.trim()) {
      showStatus("error", "Please select or enter a branch name.");
      return;
    }
    const cleanBranch = newBranch.trim();
    setIsSavingSingle(true);

    // Optimistically update local data immediately so DOM stays intact & scroll NEVER jumps!
    setData((prev) => {
      const nextItems = (prev.items || []).map((it) => {
        if (it.group_name === item.group_name && it.ledger_name === item.ledger_name) {
          return {
            ...it,
            branch_name: cleanBranch,
            is_mapped: true,
            is_verified: true,
            is_new: false
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
          group_name: item.group_name,
          ledger_name: item.ledger_name,
          branch_name: cleanBranch,
          is_verified: true
        }
      ]);
      if (res.status === "ok") {
        showCreativeToast({
          type: "success",
          badge: "Branch Mapped",
          group: item.group_name,
          ledger: item.ledger_name,
          branch: cleanBranch
        });
        setEditingKey(null);
        await loadMappings(true); // Silent reload
      } else {
        showStatus("error", res.message || "Failed to save mapping.");
        await loadMappings(true);
      }
    } catch (err) {
      showStatus("error", err.message);
      await loadMappings(true);
    } finally {
      setIsSavingSingle(false);
    }
  }

  // Unmap single mapping (unlink branch)
  async function handleUnmapMapping(item) {
    // Optimistically update
    setData((prev) => {
      const nextItems = (prev.items || []).map((it) => {
        if (it.group_name === item.group_name && it.ledger_name === item.ledger_name) {
          return {
            ...it,
            branch_name: "",
            is_mapped: false,
            is_verified: false,
            is_new: true
          };
        }
        return it;
      });
      const mCount = nextItems.filter((i) => i.is_mapped).length;
      const unvCount = nextItems.filter((i) => !i.is_verified).length;
      return {
        ...prev,
        items: nextItems,
        stats: {
          ...prev.stats,
          mapped_count: mCount,
          unmapped_count: nextItems.length - mCount,
          unverified_count: unvCount
        }
      };
    });

    try {
      const res = await deleteLedgerMapping(item.group_name, item.ledger_name);
      if (res.status === "ok") {
        showCreativeToast({
          type: "warning",
          badge: "Branch Unlinked",
          group: item.group_name,
          ledger: item.ledger_name,
          branch: "Unmapped"
        });
        await loadMappings(true);
      } else {
        showStatus("error", res.message || "Failed to unlink branch.");
        await loadMappings(true);
      }
    } catch (err) {
      showStatus("error", err.message);
      await loadMappings(true);
    }
  }

  // Permanently Delete Single Ledger from PostgreSQL
  async function handlePermanentlyDeleteLedger(item) {
    if (!item) return;
    setIsDeletingLedger(true);

    // Optimistically remove from list
    setData((prev) => {
      const nextItems = (prev.items || []).filter(
        (it) => !(it.group_name === item.group_name && it.ledger_name === item.ledger_name)
      );
      const mCount = nextItems.filter((i) => i.is_mapped).length;
      const unvCount = nextItems.filter((i) => !i.is_verified).length;
      return {
        ...prev,
        items: nextItems,
        stats: {
          ...prev.stats,
          total_ledgers: nextItems.length,
          mapped_count: mCount,
          unmapped_count: nextItems.length - mCount,
          unverified_count: unvCount
        }
      };
    });

    try {
      const res = await permanentlyDeleteLedger(item.group_name, item.ledger_name);
      if (res.status === "ok") {
        showCreativeToast({
          type: "warning",
          badge: "Ledger Deleted",
          group: item.group_name,
          ledger: item.ledger_name,
          message: `Ledger "${item.ledger_name}" permanently deleted from database.`
        });
        setDeleteLedgerTarget(null);
        await loadMappings(true);
      } else {
        showStatus("error", res.message || "Failed to delete ledger.");
        await loadMappings(true);
      }
    } catch (err) {
      showStatus("error", err.message);
      await loadMappings(true);
    } finally {
      setIsDeletingLedger(false);
    }
  }

  // Permanently Delete Selected Ledgers in Bulk
  async function handleBulkDeleteLedgers() {
    if (selectedRows.size === 0) return;
    setIsBulkDeleting(true);

    const ledgersToDelete = Array.from(selectedRows).map((key) => {
      const [group_name, ledger_name] = key.split("::");
      return { group_name, ledger_name };
    });

    // Optimistically remove from list
    const keysToDelete = new Set(selectedRows);
    setData((prev) => {
      const nextItems = (prev.items || []).filter(
        (it) => !keysToDelete.has(`${it.group_name}::${it.ledger_name}`)
      );
      const mCount = nextItems.filter((i) => i.is_mapped).length;
      const unvCount = nextItems.filter((i) => !i.is_verified).length;
      return {
        ...prev,
        items: nextItems,
        stats: {
          ...prev.stats,
          total_ledgers: nextItems.length,
          mapped_count: mCount,
          unmapped_count: nextItems.length - mCount,
          unverified_count: unvCount
        }
      };
    });

    try {
      const res = await permanentlyDeleteLedgersBulk(ledgersToDelete);
      if (res.status === "ok") {
        showCreativeToast({
          type: "warning",
          badge: "Bulk Delete",
          message: `Successfully deleted ${res.deleted_count || ledgersToDelete.length} duplicate ledgers from database.`
        });
        setSelectedRows(new Set());
        setShowBulkDeleteModal(false);
        await loadMappings(true);
      } else {
        showStatus("error", res.message || "Failed to bulk delete ledgers.");
        await loadMappings(true);
      }
    } catch (err) {
      showStatus("error", err.message);
      await loadMappings(true);
    } finally {
      setIsBulkDeleting(false);
    }
  }

  // Quick Verify Mapping
  async function handleVerifyMapping(item) {
    // Optimistic update
    setData((prev) => {
      const nextItems = (prev.items || []).map((it) => {
        if (it.group_name === item.group_name && it.ledger_name === item.ledger_name) {
          return { ...it, is_verified: true, is_new: false };
        }
        return it;
      });
      const unvCount = nextItems.filter((i) => !i.is_verified).length;
      return {
        ...prev,
        items: nextItems,
        stats: {
          ...prev.stats,
          unverified_count: unvCount
        }
      };
    });

    try {
      const res = await verifyLedgerMapping(item.group_name, item.ledger_name, item.branch_name);
      if (res.status === "ok") {
        showCreativeToast({
          type: "success",
          badge: "Mapping Verified",
          group: item.group_name,
          ledger: item.ledger_name,
          branch: item.branch_name || "Verified"
        });
        await loadMappings(true);
      } else {
        showStatus("error", res.message || "Failed to verify mapping.");
        await loadMappings(true);
      }
    } catch (err) {
      showStatus("error", err.message);
      await loadMappings(true);
    }
  }

  // Bulk Assign (Optimistic update - NO scroll reset!)
  async function handleBulkAssign() {
    if (!bulkBranch) {
      showStatus("error", "Please select a branch to assign.");
      return;
    }
    if (selectedRows.size === 0) {
      showStatus("error", "No ledgers selected.");
      return;
    }

    const assignedCount = selectedRows.size;
    const targetBranch = bulkBranch;

    // Optimistically update local data
    setData((prev) => {
      const nextItems = (prev.items || []).map((it) => {
        const key = `${it.group_name}::${it.ledger_name}`;
        if (selectedRows.has(key)) {
          return {
            ...it,
            branch_name: targetBranch,
            is_mapped: true,
            is_verified: true,
            is_new: false
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

    setIsBulkSubmitting(true);
    try {
      const ledgersToAssign = Array.from(selectedRows).map((key) => {
        const [group_name, ledger_name] = key.split("::");
        return { group_name, ledger_name };
      });

      const res = await bulkAssignBranch(targetBranch, ledgersToAssign);
      if (res.status === "ok") {
        showCreativeToast({
          type: "success",
          badge: "Bulk Mapped",
          message: `Assigned ${assignedCount} ledgers across groups to "${targetBranch}"`,
          branch: targetBranch
        });
        setSelectedRows(new Set());
        setBulkBranch("");
        await loadMappings(true); // Silent reload
      } else {
        showStatus("error", res.message || "Failed to execute bulk assignment.");
        await loadMappings(true);
      }
    } catch (err) {
      showStatus("error", err.message);
      await loadMappings(true);
    } finally {
      setIsBulkSubmitting(false);
    }
  }

  // Auto-Suggest All Unmapped
  async function handleAutoSuggestAll() {
    setIsAutoSuggesting(true);
    try {
      const res = await autoSuggestAllMappings();
      if (res.status === "ok") {
        showStatus(
          "success",
          `Smart algorithm auto-mapped ${res.suggested_count} ledger(s) based on standardized branch names!`
        );
        await loadMappings();
      } else {
        showStatus("error", res.message || "Auto-suggest failed.");
      }
    } catch (err) {
      showStatus("error", err.message);
    } finally {
      setIsAutoSuggesting(false);
    }
  }

  // Scan Live Tally for New Ledgers
  async function handleScanTally() {
    setIsScanningTally(true);
    try {
      const res = await scanTallyForNewLedgers();
      if (res.status === "ok") {
        if (res.new_count > 0) {
          showStatus(
            "success",
            `Discovered ${res.new_count} new ledger(s) from Tally! They have been added below for mapping.`
          );
        } else {
          showStatus(
            "info",
            "Tally scan complete. All ledgers in Tally target groups are already accounted for."
          );
        }
        await loadMappings();
      } else if (res.status === "warn") {
        showStatus("warning", res.message);
      } else {
        showStatus("error", res.message || "Tally scan failed.");
      }
    } catch (err) {
      showStatus("error", err.message);
    } finally {
      setIsScanningTally(false);
    }
  }

  // Add Master Branch
  async function handleAddMasterBranch(e) {
    e.preventDefault();
    if (!newBranchInput.trim()) return;
    try {
      const res = await addMasterBranch(newBranchInput.trim());
      if (res.status === "ok") {
        showStatus("success", `Added new Master Branch: "${res.branch_name}"`);
        setNewBranchInput("");
        setShowAddBranchModal(false);
        await loadMappings();
      } else {
        showStatus("error", res.message || "Could not add master branch.");
      }
    } catch (err) {
      showStatus("error", err.message);
    }
  }

  // Group color accents
  const getGroupBadgeColor = (grp) => {
    switch (grp) {
      case "Purchase Accounts":
        return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
      case "Stock Transfers Branches":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
      case "Stock Consumed By Branch":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
      case "Head Office Stock Consumed by Branch":
        return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
      case "Stock Discrepancy in Branches":
        return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
      case "Damage Conversion Accounts":
        return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30";
      default:
        return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-28">
      {/* 🌟 Creative Floating Top "Dynamic Island" Toast - Centered on Viewport */}
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
              {/* Animated Icon Avatar */}
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
                    <AlertCircle size={20} />
                  )}
                </div>

                {/* Content details */}
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
                      {toast.badge || "Mapping Engine"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Auto-saved to DB</span>
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

              {/* Close Button */}
              <button
                onClick={() => setToast(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all flex-shrink-0"
                title="Dismiss"
              >
                ✕
              </button>
            </div>

            {/* Micro Auto-Dismiss Animated Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
              <div
                className={`h-full animate-shrinkWidth ${
                  toast.type === "success"
                    ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                    : toast.type === "warning"
                    ? "bg-gradient-to-r from-amber-400 to-orange-400"
                    : "bg-gradient-to-r from-rose-400 to-red-400"
                }`}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 dark:from-[#0d1424] dark:via-[#09101f] dark:to-[#070b14] border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-2">
              <FolderTree size={13} />
              <span>Standardization & Data Integrity Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Tally Ledger & Branch Mapping Engine
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Map and align varying Tally ledger names across all 6 Target Groups to standardized Master Branches. 
              Any newly created ledger or branch in Tally is instantly flagged for review.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleScanTally}
              disabled={isScanningTally}
              className="px-4 py-2.5 rounded-2xl btn-secondary-pazino flex items-center gap-2 text-xs font-bold hover:shadow transition-all disabled:opacity-50"
              title="Scan live Tally XML server to discover new ledgers"
            >
              <RefreshCw size={14} className={isScanningTally ? "animate-spin text-blue-500" : ""} />
              <span>{isScanningTally ? "Scanning Tally..." : "Scan Tally for New Ledgers"}</span>
            </button>

            <button
              onClick={handleAutoSuggestAll}
              disabled={isAutoSuggesting || data.stats.unmapped_count === 0}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Sparkles size={14} className={isAutoSuggesting ? "animate-spin" : ""} />
              <span>{isAutoSuggesting ? "Matching..." : "Auto-Suggest All"}</span>
            </button>

            <button
              onClick={() => setShowAddBranchModal(true)}
              className="px-4 py-2.5 rounded-2xl btn-primary-pazino flex items-center gap-2 text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              <Plus size={14} />
              <span>Add Master Branch</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mt-6">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-[#111827]/80 border border-slate-200/80 dark:border-white/5 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Groups
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {data.stats.groups_count || 6}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">Targeted</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-[#111827]/80 border border-slate-200/80 dark:border-white/5 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Identified Ledgers
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {data.stats.total_ledgers || 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">In Tally</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-500/20 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              Mapped & Verified
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {data.stats.mapped_count || 0}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                {data.stats.total_ledgers
                  ? `${Math.round((data.stats.mapped_count / data.stats.total_ledgers) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>

          <div
            onClick={() => setFilterMode("unverified")}
            className={`p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all border shadow-sm ${
              (data.stats.unverified_count || 0) > 0
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/40 hover:scale-[1.02]"
                : "bg-white/80 dark:bg-[#111827]/80 border-slate-200/80 dark:border-white/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                Needs Review / New
              </span>
              {(data.stats.unverified_count || 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-black ${
                  (data.stats.unverified_count || 0) > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {data.stats.unverified_count || 0}
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                {(data.stats.unverified_count || 0) > 0 ? "⚠️ Review" : "All Verified"}
              </span>
            </div>
          </div>

          {/* Group Total Value Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 shadow-sm">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block truncate">
              {selectedGroup === "ALL" ? "All Groups Total Value" : `${selectedGroup} Value`}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-indigo-900 dark:text-indigo-200 font-mono tracking-tight">
                {(() => {
                  let total = 0;
                  if (selectedGroup === "ALL") {
                    total = Object.values(data.group_totals || {}).reduce((acc, curr) => acc + (curr.total_closing || 0), 0);
                  } else {
                    total = data.group_totals?.[selectedGroup]?.total_closing || 0;
                  }
                  return `R ${Math.abs(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                })()}
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Tally Net</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unmapped Warning Callout Banner (if any unmapped) */}
      {data.stats.unmapped_count > 0 && filterMode !== "unmapped" && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <span className="font-extrabold text-sm block">
                Attention: {data.stats.unmapped_count} New / Unmapped Ledgers Detected!
              </span>
              <span className="text-xs text-amber-800 dark:text-amber-300/80">
                These ledgers will not aggregate into the correct branch COS calculations until assigned.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode("unmapped")}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5"
            >
              <span>View Unmapped Only</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white/95 dark:bg-[#0d121c]/90 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Tally Ledger name, Group, or Assigned Branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="ALL">All Groups ({data.stats.groups_count || 6})</option>
            {(data.groups || []).map((grp) => (
              <option key={grp} value={grp}>
                {grp}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="ALL">All Branches ({data.master_branches?.length || 0})</option>
            {(data.master_branches || []).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Status View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#162030] border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === "all"
                  ? "bg-white dark:bg-[#1f2937] text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All ({data.items?.length || 0})
            </button>
            <button
              onClick={() => setFilterMode("unmapped")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterMode === "unmapped"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              <span>Unmapped</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-600/30 text-white font-extrabold">
                {data.stats.unmapped_count || 0}
              </span>
            </button>
            <button
              onClick={() => setFilterMode("unverified")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterMode === "unverified"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              <span>⚠️ Needs Review</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-700/40 text-white font-extrabold">
                {data.stats.unverified_count || 0}
              </span>
            </button>
            <button
              onClick={() => setFilterMode("mapped")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === "mapped"
                  ? "bg-white dark:bg-[#1f2937] text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Mapped ({data.stats.mapped_count || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Main Mapping Table */}
      <div className="bg-white/95 dark:bg-[#0d121c]/90 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#111827]/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Group Name</th>
                <th className="p-4">Tally Ledger Name</th>
                <th className="p-4">Assigned Branch</th>
                <th className="p-4 text-right">Tally Balance</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Quick Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500">
                    <RefreshCw size={24} className="animate-spin mx-auto text-blue-500 mb-2" />
                    <span>Loading ledger and branch mapping data...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                    <span>No matching ledgers found for the current search or filters.</span>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const rowKey = `${item.group_name}::${item.ledger_name}`;
                  const isSelected = selectedRows.has(rowKey);
                  const isEditing = editingKey === rowKey;

                  return (
                    <tr
                      key={rowKey}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-blue-500/10 dark:bg-blue-600/10"
                          : item.is_new
                          ? "bg-amber-500/5 dark:bg-amber-500/5 hover:bg-amber-500/10"
                          : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(rowKey)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Group Name */}
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold border tracking-wide ${getGroupBadgeColor(
                            item.group_name
                          )}`}
                        >
                          {item.group_name}
                        </span>
                      </td>

                      {/* Tally Ledger Name */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {item.ledger_name}
                          </span>
                          {item.suggested_branch && !item.is_mapped && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1 font-medium">
                              <Sparkles size={10} />
                              Suggested: <b>{item.suggested_branch}</b>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Assigned Branch Name */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              list="master-branches-datalist"
                              value={editBranchValue}
                              onChange={(e) => setEditBranchValue(e.target.value)}
                              placeholder="Select or type branch..."
                              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#162030] border-2 border-blue-500 text-xs font-bold text-slate-900 dark:text-white focus:outline-none min-w-[190px] shadow-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveSingle(item, editBranchValue);
                                } else if (e.key === "Escape") {
                                  setEditingKey(null);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleSaveSingle(item, editBranchValue)}
                              disabled={isSavingSingle || !editBranchValue.trim()}
                              className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center"
                              title="Save Branch"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="p-1.5 rounded-lg btn-secondary-pazino text-xs"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {item.branch_name ? (
                              <span className="font-black text-slate-800 dark:text-slate-100 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                {item.branch_name}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 text-xs font-bold italic flex items-center gap-1">
                                <AlertTriangle size={12} />
                                Unmapped
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Tally Closing Balance */}
                      <td className="p-4 text-right">
                        <span className={`font-mono text-xs font-extrabold ${
                          (item.closing_balance || 0) < 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : (item.closing_balance || 0) > 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400"
                        }`}>
                          {item.closing_balance !== undefined && item.closing_balance !== null
                            ? `R ${Math.abs(item.closing_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "R 0.00"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {item.is_mapped ? (
                          item.is_verified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 size={11} />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                              <AlertTriangle size={11} />
                              <span>⚠️ Unverified</span>
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                            <AlertTriangle size={11} />
                            <span>⚠️ New / Unmapped</span>
                          </span>
                        )}
                      </td>

                      {/* Quick Edit Action */}
                      <td className="p-4 text-right">
                        {!isEditing && (
                          <div className="flex items-center justify-end gap-2">
                            {item.suggested_branch && !item.is_mapped && (
                              <button
                                onClick={() => handleSaveSingle(item, item.suggested_branch)}
                                className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-[11px] border border-amber-500/30 flex items-center gap-1"
                                title={`Accept suggestion: ${item.suggested_branch}`}
                              >
                                <Sparkles size={11} />
                                <span>Accept "{item.suggested_branch}"</span>
                              </button>
                            )}

                            {/* Verify Button for Mapped but Unverified items */}
                            {item.is_mapped && !item.is_verified && (
                              <button
                                onClick={() => handleVerifyMapping(item)}
                                className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-500/30 flex items-center gap-1 transition-colors shadow-sm"
                                title="Confirm and verify this branch mapping"
                              >
                                <Check size={12} />
                                <span>Verify</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setEditingKey(rowKey);
                                setEditBranchValue(item.branch_name || item.suggested_branch || "");
                              }}
                              className="px-2.5 py-1 rounded-xl btn-secondary-pazino text-xs font-bold hover:text-blue-500"
                            >
                              Edit
                            </button>

                            {/* Unmap Button (if currently mapped) */}
                            {item.is_mapped && (
                              <button
                                onClick={() => handleUnmapMapping(item)}
                                className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-colors"
                                title={`Unmap "${item.ledger_name}" from ${item.branch_name}`}
                              >
                                <Unlink size={13} />
                              </button>
                            )}

                            {/* Delete Ledger Button (Permanently delete duplicate/obsolete ledger) */}
                            <button
                              onClick={() => setDeleteLedgerTarget(item)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors"
                              title={`Permanently delete duplicate ledger "${item.ledger_name}" from database`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Datalist for autocomplete in inline editors */}
        <datalist id="master-branches-datalist">
          {(data.master_branches || []).map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </div>

      {/* Floating Bottom Sticky Bar for Bulk Assign */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4 animate-slideUp">
          <div className="p-4 rounded-3xl bg-slate-900/95 text-white shadow-2xl border border-white/20 backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-black text-sm">
                {selectedRows.size}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs">
                  {selectedRows.size} Ledgers Selected Across Groups
                </span>
                <span className="text-[10px] text-slate-300">
                  Assign all selected ledgers to a single Master Branch simultaneously.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={bulkBranch}
                onChange={(e) => setBulkBranch(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-initial"
              >
                <option value="">-- Choose Branch to Assign --</option>
                {(data.master_branches || []).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <button
                onClick={handleBulkAssign}
                disabled={isBulkSubmitting || !bulkBranch}
                className="px-4 py-2 rounded-xl btn-primary-pazino text-xs font-bold shadow-lg flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
              >
                <Save size={13} />
                <span>{isBulkSubmitting ? "Assigning..." : "Assign & Save"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(true)}
                disabled={isBulkSubmitting || isBulkDeleting}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 whitespace-nowrap transition-colors"
                title={`Delete ${selectedRows.size} selected duplicate ledgers`}
              >
                <Trash2 size={13} />
                <span>Delete Selected ({selectedRows.size})</span>
              </button>

              <button
                onClick={() => setSelectedRows(new Set())}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Master Branch Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#0d121c] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <Building2 size={18} />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Add Master Branch
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
              This will become available in the branch mapping selectors.
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
                  disabled={!newBranchInput.trim()}
                  className="px-4 py-2 rounded-xl btn-primary-pazino text-xs font-bold disabled:opacity-50"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanently Delete Single Ledger Confirmation Modal */}
      {deleteLedgerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#0d121c] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <Trash2 size={18} />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Delete Duplicate Ledger?
                </h3>
              </div>
              <button
                onClick={() => setDeleteLedgerTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to permanently delete this duplicate or obsolete ledger from the database?
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#162030] border border-slate-200 dark:border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Group:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{deleteLedgerTarget.group_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ledger Name:</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400">{deleteLedgerTarget.ledger_name}</span>
              </div>
              {deleteLedgerTarget.branch_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Branch:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{deleteLedgerTarget.branch_name}</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              ⚠️ This will remove the ledger from PostgreSQL mapping tables and clean up any historical summary records for this duplicate entry.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteLedgerTarget(null)}
                disabled={isDeletingLedger}
                className="px-4 py-2 rounded-xl btn-secondary-pazino text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePermanentlyDeleteLedger(deleteLedgerTarget)}
                disabled={isDeletingLedger}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                {isDeletingLedger ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                <span>{isDeletingLedger ? "Deleting Ledger..." : "Delete Ledger"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanently Delete Bulk Selected Ledgers Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#0d121c] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <Trash2 size={18} />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Delete {selectedRows.size} Selected Ledgers?
                </h3>
              </div>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to permanently delete all <b>{selectedRows.size}</b> selected ledgers from the database? This action cannot be undone.
            </p>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              ⚠️ Use this to quickly clean up multiple duplicate or wrongly pulled ledgers from the database.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkDeleting}
                className="px-4 py-2 rounded-xl btn-secondary-pazino text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteLedgers}
                disabled={isBulkDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                {isBulkDeleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                <span>{isBulkDeleting ? "Deleting..." : `Delete ${selectedRows.size} Ledgers`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
