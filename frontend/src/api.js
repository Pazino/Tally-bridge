const BASE_URL = "";

async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    if (!text || !text.trim()) {
      if (!res.ok) {
        return {
          status: "error",
          message: `Backend server error (${res.status} ${res.statusText || "No response"}). Please ensure python backend.py is running on port 19876.`
        };
      }
      return { status: "ok" };
    }
    try {
      return JSON.parse(text);
    } catch {
      return {
        status: "error",
        message: `Server returned non-JSON response (${res.status}): ${text.slice(0, 180)}`
      };
    }
  } catch (err) {
    return {
      status: "error",
      message: `Failed to connect to backend server: ${err.message}. Ensure 'python backend.py' is running.`
    };
  }
}

export async function fetchConfig() {
  return safeFetchJson(`${BASE_URL}/api/config`);
}

export async function saveConfig(cfg) {
  return safeFetchJson(`${BASE_URL}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cfg),
  });
}

export async function checkPing() {
  return safeFetchJson(`${BASE_URL}/api/ping`);
}

export async function detectCompany() {
  return safeFetchJson(`${BASE_URL}/api/detect-company`, { method: "POST" });
}

export async function fetchBranchMappings() {
  return safeFetchJson(`${BASE_URL}/api/branch-mappings`);
}

export async function startSync() {
  return safeFetchJson(`${BASE_URL}/api/cost-centre-sync/start`, { method: "POST" });
}

export async function stopSync() {
  return safeFetchJson(`${BASE_URL}/api/cost-centre-sync/stop`, { method: "POST" });
}

export async function fetchSyncStatus() {
  return safeFetchJson(`${BASE_URL}/api/cost-centre-sync/status`);
}

// RBM APIs
export async function fetchPeriods() {
  return safeFetchJson(`${BASE_URL}/api/rbm/periods`);
}

export async function uploadRBMFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  return safeFetchJson(`${BASE_URL}/api/rbm/upload`, {
    method: "POST",
    body: formData,
  });
}

export async function pullTallyRBM(period, fromDate, toDate) {
  const formData = new FormData();
  formData.append("period", period);
  if (fromDate) formData.append("from_date", fromDate);
  if (toDate) formData.append("to_date", toDate);
  return safeFetchJson(`${BASE_URL}/api/rbm/pull-tally-groups`, {
    method: "POST",
    body: formData,
  });
}

export async function pullTallyGroupSummaries(period, fromDate, toDate) {
  const formData = new FormData();
  formData.append("period", period);
  if (fromDate) formData.append("from_date", fromDate);
  if (toDate) formData.append("to_date", toDate);
  return safeFetchJson(`${BASE_URL}/api/rbm/pull-tally-groups`, {
    method: "POST",
    body: formData,
  });
}

export async function fetchTallyGroupSummaries(period) {
  return safeFetchJson(`${BASE_URL}/api/rbm/tally-groups-data?period=${encodeURIComponent(period)}`);
}

export async function runReco(period, fromDate, toDate) {
  const formData = new FormData();
  formData.append("period", period);
  if (fromDate) formData.append("from_date", fromDate);
  if (toDate) formData.append("to_date", toDate);
  return safeFetchJson(`${BASE_URL}/api/rbm/reconcile`, {
    method: "POST",
    body: formData,
  });
}

export async function fetchRecoResults(period) {
  return safeFetchJson(`${BASE_URL}/api/rbm/results?period=${encodeURIComponent(period)}`);
}


export function getExportUrl(period) {
  return `${BASE_URL}/api/rbm/export?period=${encodeURIComponent(period)}`;
}

// GitHub Auto-Updater APIs
export async function checkGitHubUpdates() {
  return safeFetchJson(`${BASE_URL}/api/updates/check`);
}

export async function downloadUpdatePackage(downloadUrl, version) {
  return safeFetchJson(`${BASE_URL}/api/updates/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ download_url: downloadUrl, version }),
  });
}

export async function fetchUpdateProgress() {
  return safeFetchJson(`${BASE_URL}/api/updates/progress`);
}

export async function applyUpdateNow() {
  return safeFetchJson(`${BASE_URL}/api/updates/apply`, {
    method: "POST",
  });
}

// Ledger & Branch Mapping APIs
export async function fetchLedgerMappings() {
  return safeFetchJson(`${BASE_URL}/api/mappings/ledgers`);
}

export async function saveLedgerMappings(mappings) {
  return safeFetchJson(`${BASE_URL}/api/mappings/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mappings }),
  });
}

export async function deleteLedgerMapping(groupName, ledgerName) {
  return safeFetchJson(`${BASE_URL}/api/mappings/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group_name: groupName, ledger_name: ledgerName }),
  });
}

export async function permanentlyDeleteLedger(groupName, ledgerName) {
  return safeFetchJson(`${BASE_URL}/api/mappings/ledger/permanent-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group_name: groupName, ledger_name: ledgerName }),
  });
}

export async function permanentlyDeleteLedgersBulk(ledgers) {
  return safeFetchJson(`${BASE_URL}/api/mappings/ledger/permanent-delete-bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ledgers }),
  });
}

export async function bulkAssignBranch(branchName, ledgers) {
  return safeFetchJson(`${BASE_URL}/api/mappings/bulk-assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branch_name: branchName, ledgers }),
  });
}

export async function autoSuggestAllMappings() {
  return safeFetchJson(`${BASE_URL}/api/mappings/auto-suggest-all`, {
    method: "POST",
  });
}

export async function fetchMasterBranches() {
  return safeFetchJson(`${BASE_URL}/api/mappings/master-branches`);
}

export async function addMasterBranch(branchName) {
  return safeFetchJson(`${BASE_URL}/api/mappings/master-branches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branch_name: branchName }),
  });
}

export async function deleteMasterBranch(branchName) {
  return safeFetchJson(`${BASE_URL}/api/mappings/master-branches/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branch_name: branchName }),
  });
}

export async function verifyLedgerMapping(groupName, ledgerName, branchName = null) {
  return safeFetchJson(`${BASE_URL}/api/mappings/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      group_name: groupName,
      ledger_name: ledgerName,
      branch_name: branchName,
    }),
  });
}

export async function scanTallyForNewLedgers() {
  return safeFetchJson(`${BASE_URL}/api/mappings/scan-tally`, {
    method: "POST",
  });
}
