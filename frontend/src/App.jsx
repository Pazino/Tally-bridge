import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import HomePage from "./components/HomePage";
import CostCentreModule from "./components/CostCentreModule";
import TallyRbmModule from "./components/TallyRbmModule";
import SettingsMappingModule from "./components/SettingsMappingModule";
import BranchLedgersModule from "./components/BranchLedgersModule";
import UpdateModal from "./components/UpdateModal";
import { checkPing, checkGitHubUpdates, fetchLedgerMappings } from "./api";

export default function App() {
  const [activeNav, setActiveNav] = useState("home"); // "home" | "cost_centre" | "tally_vs_rbm" | "settings_ledgers" | "settings_branches"
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [pingData, setPingData] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [unmappedCount, setUnmappedCount] = useState(0);

  useEffect(() => {
    // Keep <html> dark class synced with theme state
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    // Initial ping and GitHub update check
    refreshPing();
    refreshUpdates();
    refreshMappingsStats();

    const pingInterval = setInterval(() => {
      refreshPing();
      refreshMappingsStats();
    }, 15000);
    return () => clearInterval(pingInterval);
  }, []);

  async function refreshPing() {
    try {
      const p = await checkPing();
      setPingData(p);
    } catch {}
  }

  async function refreshUpdates() {
    try {
      const u = await checkGitHubUpdates();
      setUpdateInfo(u);
    } catch {}
  }

  async function refreshMappingsStats() {
    try {
      const res = await fetchLedgerMappings();
      if (res?.stats?.unmapped_count !== undefined) {
        setUnmappedCount(res.stats.unmapped_count);
      }
    } catch {}
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === "dark" ? "bg-[#090d13] text-[#f0f6fc]" : "bg-slate-100 text-slate-900"}`}>
      {/* Collapsible Modern Sidebar */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        theme={theme}
        setTheme={setTheme}
        pingData={pingData}
        updateInfo={updateInfo}
        onOpenUpdateModal={() => setUpdateModalOpen(true)}
        unmappedCount={unmappedCount}
      />

      {/* Main Module Content Area - Responsive theme background */}
      <main className="flex-1 h-screen overflow-y-auto relative bg-slate-100 dark:bg-[#090d13] text-slate-900 dark:text-[#f0f6fc] transition-colors duration-300 flex flex-col">
        {updateInfo?.update_available && (
          <div className="sticky top-0 z-30 bg-gradient-to-r from-[#006EB2] via-blue-600 to-indigo-600 text-white px-4 py-2 flex items-center justify-between shadow-md text-xs font-semibold animate-in slide-in-from-top duration-300 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
              </span>
              <span>
                New version <strong className="font-mono">v{updateInfo.latest_version}</strong> is available! (Current: v{updateInfo.current_version})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUpdateModalOpen(true)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold transition-all text-xs shadow-sm hover:scale-105 active:scale-95"
              >
                Install Update
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
        {activeNav === "home" && (
          <HomePage 
            theme={theme} 
            pingData={pingData} 
            onNavigate={setActiveNav} 
            unmappedCount={unmappedCount}
            updateInfo={updateInfo}
          />
        )}
        {activeNav === "cost_centre" && (
          <CostCentreModule theme={theme} />
        )}
        {activeNav === "tally_vs_rbm" && (
          <TallyRbmModule theme={theme} />
        )}
        {(activeNav === "settings" || activeNav === "settings_ledgers") && (
          <SettingsMappingModule theme={theme} onNavigate={setActiveNav} />
        )}
        {activeNav === "settings_branches" && (
          <BranchLedgersModule theme={theme} onNavigate={setActiveNav} />
        )}
        </div>
      </main>

      {/* GitHub Releases Auto-Updater Modal */}
      <UpdateModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        updateInfo={updateInfo}
        onRefresh={refreshUpdates}
        theme={theme}
      />
    </div>
  );
}
