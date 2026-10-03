import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Download, CheckCircle2, RefreshCw, GitBranch, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { downloadUpdatePackage, fetchUpdateProgress, applyUpdateNow } from "../api";

export default function UpdateModal({ isOpen, onClose, updateInfo, onRefresh }) {
  const [checking, setChecking] = useState(false);
  const [stage, setStage] = useState("idle"); // "idle" | "downloading" | "ready" | "installing" | "error"
  const [progress, setProgress] = useState(0);
  const [mbInfo, setMbInfo] = useState({ downloaded: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState("");
  const pollTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  async function handleCheckNow() {
    setChecking(true);
    setErrorMessage("");
    await onRefresh();
    setChecking(false);
  }

  async function handleStartUpdate() {
    if (!updateInfo?.download_url) {
      const repo = updateInfo?.repo || "Pazino/Tally-Bridge";
      window.open(`https://github.com/${repo}/releases`, "_blank");
      return;
    }

    try {
      setStage("downloading");
      setProgress(0);
      setErrorMessage("");

      const startRes = await downloadUpdatePackage(updateInfo.download_url, updateInfo.latest_version);
      if (startRes.status === "error") {
        setStage("error");
        setErrorMessage(startRes.message || "Failed to initiate update download.");
        return;
      }

      // Poll progress every 400ms
      pollTimerRef.current = setInterval(async () => {
        try {
          const prog = await fetchUpdateProgress();
          if (prog) {
            setProgress(prog.progress || 0);
            if (prog.total_bytes > 0) {
              setMbInfo({
                downloaded: (prog.downloaded_bytes / (1024 * 1024)).toFixed(1),
                total: (prog.total_bytes / (1024 * 1024)).toFixed(1)
              });
            }

            if (prog.status === "completed") {
              clearInterval(pollTimerRef.current);
              setProgress(100);
              setStage("installing");
              // Trigger atomic apply update
              setTimeout(async () => {
                try {
                  await applyUpdateNow();
                } catch (applyErr) {
                  setStage("error");
                  setErrorMessage(applyErr.message || "Could not launch auto-updater.");
                }
              }, 1000);
            } else if (prog.status === "error") {
              clearInterval(pollTimerRef.current);
              setStage("error");
              setErrorMessage(prog.error_message || "Download failed. Please check network.");
            }
          }
        } catch (err) {
          console.error("Progress poll error:", err);
        }
      }, 400);

    } catch (err) {
      setStage("error");
      setErrorMessage(err.message || "Failed to start update.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#121820] border border-slate-200 dark:border-[#283344] rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#283344] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-[#006EB2] dark:text-blue-400">
              <GitBranch size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold pazino-title flex items-center gap-2">
                Tally Bridge Auto-Updater
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Current: <span className="font-mono text-[#006EB2] dark:text-blue-400 font-bold">v{updateInfo?.current_version || "1.0.0"}</span>
                {updateInfo?.repo && <span className="ml-2 text-slate-400 font-mono">({updateInfo.repo})</span>}
              </p>
            </div>
          </div>
          {stage !== "downloading" && stage !== "installing" && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl btn-secondary-pazino text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Update Status Banner */}
        {updateInfo?.update_available ? (
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-gradient-to-r dark:from-blue-600/15 dark:via-indigo-600/15 dark:to-purple-600/15 border border-blue-200 dark:border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#006EB2] dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500 dark:text-amber-400 animate-spin" />
                New Release Available: v{updateInfo.latest_version}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-[#006EB2] dark:text-blue-300 font-bold border border-blue-500/30">
                Official Release
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {updateInfo.release_name || "Cost Centre Reco improvements and fixes."}
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <div>
              <p>You are running the latest version (v{updateInfo?.current_version || "1.0.0"}).</p>
              {updateInfo?.message && <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">{updateInfo.message}</p>}
            </div>
          </div>
        )}

        {/* Release Notes */}
        {updateInfo?.release_notes && updateInfo?.update_available && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Release Highlights</span>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161e29] border border-slate-200 dark:border-[#283344] text-xs text-slate-700 dark:text-slate-300 font-mono max-h-36 overflow-y-auto leading-relaxed whitespace-pre-line">
              {updateInfo.release_notes}
            </div>
          </div>
        )}

        {/* Progress Display */}
        {stage === "downloading" && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161e29] border border-slate-200 dark:border-[#283344] space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-[#006EB2] dark:text-blue-400" />
                Downloading Update Package...
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                {mbInfo.total > 0 ? `${mbInfo.downloaded} MB / ${mbInfo.total} MB` : ""} ({progress}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-[#1c2430] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Your existing configuration and database settings will be completely preserved.
            </p>
          </div>
        )}

        {/* Installing / Restarting Display */}
        {stage === "installing" && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 space-y-2 text-center animate-pulse">
            <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              <Loader2 size={18} className="animate-spin" />
              Restarting Tally Bridge...
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              The application is restarting to apply version <strong className="font-mono">v{updateInfo?.latest_version}</strong>. Please hold on...
            </p>
          </div>
        )}

        {/* Error Display */}
        {stage === "error" && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3 text-red-700 dark:text-red-400 text-xs">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Update Failed</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {stage !== "downloading" && stage !== "installing" && (
            <button
              onClick={handleCheckNow}
              disabled={checking}
              className="px-4 py-2.5 rounded-xl btn-secondary-pazino text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
              Check GitHub Now
            </button>
          )}

          {updateInfo?.update_available && stage === "idle" && (
            <button
              onClick={handleStartUpdate}
              className="flex-1 py-2.5 px-4 rounded-xl btn-primary-pazino text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Download size={14} />
              Install Update (v{updateInfo.latest_version})
            </button>
          )}

          {stage === "error" && (
            <button
              onClick={handleStartUpdate}
              className="flex-1 py-2.5 px-4 rounded-xl btn-primary-pazino text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              Retry Update
            </button>
          )}

          {!updateInfo?.update_available && stage === "idle" && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl btn-primary-pazino text-xs font-bold text-white shadow-md ml-auto"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
