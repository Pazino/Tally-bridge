import os
import sys
import re
import time
import json
import socket
import threading
import tempfile
import zipfile
import shutil
import subprocess
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
import psycopg2
import openpyxl

from tally_rbm_module import (
    get_pg_connection, RBMExcelReader, calculate_reconciliation,
    generate_reconciled_excel, clean_num, clean_text,
    TALLY_TARGET_GROUPS, pull_tally_group_summaries,
    save_tally_group_summaries, get_tally_group_summaries_from_db,
    smart_match_branch, get_ledger_branch_mappings
)


APP_VERSION = "1.0.0"
GITHUB_REPO = "Pazino/Tally-Bridge" # Configured default repository for distribution

if getattr(sys, 'frozen', False):
    EXE_DIR = os.path.dirname(sys.executable)
    BUNDLE_DIR = getattr(sys, '_MEIPASS', os.path.join(EXE_DIR, "_internal"))
else:
    EXE_DIR = os.path.dirname(os.path.abspath(__file__))
    BUNDLE_DIR = EXE_DIR

APP_DIR = EXE_DIR
CONFIG_FILE = os.path.join(EXE_DIR, "config.json")

# Ensure config.json is present in root directory next to executable
if not os.path.exists(CONFIG_FILE) and os.path.exists(os.path.join(BUNDLE_DIR, "config.json")):
    try:
        shutil.copyfile(os.path.join(BUNDLE_DIR, "config.json"), CONFIG_FILE)
    except Exception:
        pass

DEFAULT_CONFIG = {
    "app_version": APP_VERSION,
    "github_repo": "Pazino/Tally-Bridge",
    "tally_env": "server",
    "local_ip": "127.0.0.1",
    "local_port": 9000,
    "server_ip": "192.168.10.237",
    "server_port": 9000,
    "custom_ip": "192.168.10.237",
    "custom_port": 9000,
    "supabase_env": "live",
    "supabase_test_url": "https://hfoumqcdpmoihfdwstfa.supabase.co/rest/v1",
    "supabase_test_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhmb3VtcWNkcG1vaWhmZHdzdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzg5NTY5NiwiZXhwIjoyMDkzNDcxNjk2fQ.ovosRwDJEn80WzKijEUQRjNU4WTptKcjlJpWznHONBA",
    "supabase_live_url": "https://tdilgvruzrbjbvwtxhgv.supabase.co/rest/v1",
    "supabase_live_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkaWxndnJ1enJiamJ2d3R4aGd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTMyMzI5OSwiZXhwIjoyMDg2ODk5Mjk5fQ.097pdzmG4_VmZ0GVPYyV6LtIPnKTfNWpNDggi70OLy4",
    "company_name": "LADUMA HARDWARE & BRICKS CC 2025-26",
    "from_date": "2026-09-01",
    "to_date": "2026-09-26",
    "selected_branch": "ALL BRANCHES",
    "postgres_host": "192.168.10.237",
    "postgres_port": 5432,
    "postgres_db": "tally_reconciliation_db",
    "postgres_user": "postgres",
    "postgres_pass": "Laduma@2026"
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                cfg = DEFAULT_CONFIG.copy()
                cfg.update(data)
                return cfg
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print(f"Error saving config: {e}")

def get_tally_url(cfg):
    env = cfg.get("tally_env", "server")
    if env == "local":
        return f"http://{cfg.get('local_ip', '127.0.0.1')}:{cfg.get('local_port', 9000)}"
    elif env == "server":
        return f"http://{cfg.get('server_ip', '192.168.10.237')}:{cfg.get('server_port', 9000)}"
    else:
        return f"http://{cfg.get('custom_ip', '192.168.10.237')}:{cfg.get('custom_port', 9000)}"

def get_supabase_details(cfg):
    env = cfg.get("supabase_env", "live")
    if env == "live":
        return cfg.get("supabase_live_url"), cfg.get("supabase_live_key"), "Live Production"
    else:
        return cfg.get("supabase_test_url"), cfg.get("supabase_test_key"), "Test Database"

def is_pnl_ledger(name):
    if not name:
        return False
    n = name.strip().lower()
    if "advance from customer" in n or "adv from customer" in n or "customer advance" in n:
        return False
    if "card control" in n or "float money" in n or "airtime" in n or "take a lot" in n:
        return False
    if "cash connect" in n or "bank" in n or "fnb" in n or "absa" in n or "nedbank" in n or "standard bank" in n:
        return False
    if "vat" in n or "tax" in n or "deposit" in n or "loan" in n or "debtor" in n or "creditor" in n or "payable" in n or "receivable" in n:
        return False
    if "capital" in n or "drawings" in n or "retained" in n or "inter-branch" in n or "inter branch" in n or "transfer" in n:
        return False
    return True

# ── FastAPI App Instance ───────────────────────────────────────────────────
app = FastAPI(title="Tally Bridge Backend", version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared in-memory state for Cost Centre Sync
sync_state = {
    "is_syncing": False,
    "stop_requested": False,
    "progress": 0.0,
    "current_date": "",
    "total_vouchers": 0,
    "matches": 0,
    "mismatches": 0,
    "new_masters": 0,
    "duration_seconds": 0,
    "speed": 0.0,
    "status_title": "Ready",
    "status_subtitle": "Select date range and click Run Sync.",
    "logs": []
}

def add_log(msg: str, level: str = "INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    entry = {"time": ts, "message": msg, "level": level}
    sync_state["logs"].append(entry)
    if len(sync_state["logs"]) > 2000:
        sync_state["logs"] = sync_state["logs"][-2000:]

# Shared in-memory cache for Tally vs RBM
rbm_state = {
    "trading_data": [],
    "branch_data": [],
    "tally_extracted": {},
    "reco_results": []
}

# ── API ENDPOINTS ──────────────────────────────────────────────────────────

@app.get("/api/config")
def api_get_config():
    return load_config()

@app.post("/api/config")
def api_save_config(data: dict):
    cfg = load_config()
    cfg.update(data)
    save_config(cfg)
    return {"status": "ok", "config": cfg}

@app.get("/api/ping")
def api_ping():
    cfg = load_config()
    t_url = get_tally_url(cfg)
    host = t_url.replace("http://", "").split(":")[0]
    port = int(t_url.replace("http://", "").split(":")[1]) if ":" in t_url.replace("http://", "") else 9000

    t0 = time.time()
    is_open = False
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2.0)
        s.connect((host, port))
        s.close()
        is_open = True
    except Exception:
        is_open = False
    latency_ms = int((time.time() - t0) * 1000)

    # Also ping Postgres
    pg_ok = False
    try:
        conn = get_pg_connection(cfg)
        conn.close()
        pg_ok = True
    except Exception:
        pg_ok = False

    return {
        "tally": {
            "url": t_url,
            "connected": is_open,
            "latency_ms": latency_ms if is_open else None
        },
        "postgres": {
            "host": cfg.get("postgres_host", "192.168.10.237"),
            "connected": pg_ok
        }
    }

@app.post("/api/detect-company")
def api_detect_company():
    cfg = load_config()
    url = get_tally_url(cfg)
    req_xml = """<ENVELOPE>
      <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>CurrentCompany</ID></HEADER>
      <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><REPORT NAME="CurrentCompany"><FORMS>CurrentCompanyForm</FORMS></REPORT><FORM NAME="CurrentCompanyForm"><PARTS>CurrentCompanyPart</PARTS></FORM><PART NAME="CurrentCompanyPart"><LINES>CurrentCompanyLine</LINES></PART><LINE NAME="CurrentCompanyLine"><FIELDS>CurrentCompanyField</FIELDS></LINE><FIELD NAME="CurrentCompanyField"><SET>$$CurrentCompany</SET></FIELD></TDLMESSAGE></TDL></DESC></BODY>
    </ENVELOPE>"""
    try:
        r = requests.post(url, data=req_xml.encode('utf-8'), headers={'Connection': 'close', 'Content-Type': 'text/xml'}, timeout=5)
        root = ET.fromstring(r.text)
        res = root.findtext(".//RESULT", "")
        detected = res.strip() if res else ""
        if not detected:
            req_xml2 = """<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>ListofCompanies</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="ListofCompanies"><TYPE>Company</TYPE><FETCH>NAME</FETCH></COLLECTION></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
            r2 = requests.post(url, data=req_xml2.encode('utf-8'), headers={'Connection': 'close', 'Content-Type': 'text/xml'}, timeout=5)
            root2 = ET.fromstring(r2.text)
            for c in root2.findall(".//COMPANY"):
                c_name = c.findtext("NAME", "")
                if c_name and c_name.strip():
                    detected = c_name.strip()
                    break
        if detected:
            cfg["company_name"] = detected
            save_config(cfg)
            return {"status": "ok", "company": detected}
        return {"status": "warn", "message": "No open company returned by Tally."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/branch-mappings")
def api_get_branch_mappings():
    cfg = load_config()
    supa_url, key, _ = get_supabase_details(cfg)
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    try:
        r = requests.get(f"{supa_url}/tally_branch_mappings?is_active=eq.true", headers=headers, timeout=8)
        data = r.json()
        mappings = {}
        unique_branches = set()
        comp_name = cfg.get("company_name", "")
        for row in data:
            c_name = row["cash_ledger_name"].strip()
            unique_branches.add(c_name)
            if row.get("company_name") == comp_name or c_name.lower() not in mappings:
                mappings[c_name.lower()] = row["expected_cost_centre"].strip().upper()
        return {
            "status": "ok",
            "mappings": mappings,
            "branches": ["ALL BRANCHES"] + sorted(list(unique_branches))
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "mappings": {}, "branches": ["ALL BRANCHES"]}

# ── COST CENTRE RECONCILIATION ENGINE ─────────────────────────────────────

def run_cost_centre_sync_worker(company, from_date_str, to_date_str, selected_branch):
    global sync_state
    cfg = load_config()
    supa_url, key, dest_label = get_supabase_details(cfg)
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal,resolution=merge-duplicates"
    }
    tally_url = get_tally_url(cfg)
    canonical_company = "LADUMA HARDWARE & BRICKS CC"

    # Pre-flight check on Tally connection
    t_host = tally_url.replace("http://", "").replace("https://", "").split(":")[0]
    t_port = int(tally_url.split(":")[-1].replace("/", "")) if ":" in tally_url.replace("http://", "").replace("https://", "") else 9000
    
    is_connected = False
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(2.0)
            s.connect((t_host, t_port))
            is_connected = True
    except Exception:
        is_connected = False

    if not is_connected:
        # Check if local Tally (127.0.0.1:9000) is running
        local_available = False
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1.0)
                s.connect(('127.0.0.1', 9000))
                local_available = True
        except Exception:
            local_available = False

        if local_available and tally_url != "http://127.0.0.1:9000":
            add_log(f"Notice: Server {tally_url} unreachable. Automatically routing sync to active local Tally (http://127.0.0.1:9000)...", "WARN")
            tally_url = "http://127.0.0.1:9000"
        else:
            add_log(f"Connection Failed: Could not reach Tally on {tally_url}. Port {t_port} timed out.", "ERROR")
            if local_available:
                add_log("Local Tally is running! Click 'Local Test' in Tally Source to connect directly.", "INFO")
            else:
                add_log("Please ensure TallyPrime is open with ODBC/XML Server enabled on port 9000.", "WARN")
            sync_state["is_syncing"] = False
            sync_state["status_title"] = "Connection Failed"
            sync_state["status_subtitle"] = f"Could not reach Tally on {t_host}:{t_port}"
            return

    d_start = datetime.strptime(from_date_str, "%Y-%m-%d").date()
    d_end = datetime.strptime(to_date_str, "%Y-%m-%d").date()

    chunks = []
    cur_d = d_start
    while cur_d <= d_end:
        d_str = cur_d.strftime("%Y%m%d")
        lbl = cur_d.strftime("%d %b %Y")
        chunks.append({"from_str": d_str, "to_str": d_str, "label": lbl})
        cur_d += timedelta(days=1)

    # Fetch branch mappings
    bm_res = api_get_branch_mappings()
    branch_mappings = bm_res.get("mappings", {})

    t_start = time.time()
    total_vchs = 0
    total_matches = 0
    total_mismatches = 0
    total_masters = 0

    sync_state["is_syncing"] = True
    sync_state["stop_requested"] = False
    sync_state["status_title"] = "Transferring Vouchers"
    sync_state["status_subtitle"] = f"Syncing {len(chunks)} daily chunks to {dest_label}..."
    add_log(f"Starting Data Transfer for '{company}' ({from_date_str} to {to_date_str}) via {tally_url} ➔ {dest_label}", "INFO")

    try:
        for idx, chunk in enumerate(chunks, 1):
            if sync_state["stop_requested"]:
                break

            f_date = chunk["from_str"]
            t_date = chunk["to_str"]
            chunk_label = chunk["label"]
            sync_state["current_date"] = f"{f_date[:4]}-{f_date[4:6]}-{f_date[6:]}"
            sync_state["status_title"] = f"Day {idx}/{len(chunks)}: {chunk_label}"

            clean_comp = company.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            req_xml = f"""<ENVELOPE>
              <HEADER>
                <VERSION>1</VERSION>
                <TALLYREQUEST>Export</TALLYREQUEST>
                <TYPE>Collection</TYPE>
                <ID>DayVouchers</ID>
              </HEADER>
              <BODY>
                <DESC>
                  <STATICVARIABLES>
                    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                    <SVFROMDATE TYPE="Date">{f_date}</SVFROMDATE>
                    <SVTODATE TYPE="Date">{t_date}</SVTODATE>
                  </STATICVARIABLES>
                  <TDL>
                    <TDLMESSAGE>
                      <COLLECTION NAME="DayVouchers">
                        <TYPE>Voucher</TYPE>
                        <FETCH>DATE, GUID, REMOTEID, VOUCHERNUMBER, VOUCHERTYPENAME, VCHTYPE, NARRATION, ALLLEDGERENTRIES.LIST, LEDGERENTRIES.LIST</FETCH>
                      </COLLECTION>
                    </TDLMESSAGE>
                  </TDL>
                </DESC>
              </BODY>
            </ENVELOPE>"""

            try:
                r = requests.post(tally_url, data=req_xml.encode('utf-8'), headers={'Connection': 'close', 'Content-Type': 'text/xml'}, timeout=50)
                if r.status_code != 200:
                    add_log(f"Tally HTTP {r.status_code} for {chunk_label}", "ERROR")
                    continue
                clean_xml = re.sub(r'&#[0-9]+;', '', r.text)
                clean_xml = re.sub(r'<(/?)(\w+):', r'<\1\2_', clean_xml)
                root = ET.fromstring(clean_xml)
                vouchers_in_chunk = root.findall(".//VOUCHER")
                add_log(f"[{chunk_label}] Extracted {len(vouchers_in_chunk)} vouchers from Tally ({len(r.text)//1024}KB).", "INFO")
            except requests.exceptions.Timeout:
                add_log(f"Tally timed out for {chunk_label} after 50s. Skipping to next day.", "ERROR")
                continue
            except Exception as e:
                add_log(f"Error fetching Tally chunk {chunk_label}: {e}", "ERROR")
                continue

            chunk_records = []
            chunk_new_masters = []

            for v in vouchers_in_chunk:
                if sync_state["stop_requested"]:
                    break

                vdate_raw = v.findtext("DATE", "")
                vno = v.findtext("VOUCHERNUMBER", "")
                vtype = v.findtext("VOUCHERTYPENAME", "") or v.get("VCHTYPE", "")
                if vtype and vtype.strip().lower().startswith("contra"):
                    continue

                vguid = v.findtext("GUID", "") or v.get("REMOTEID", "") or f"{company}_{vtype}_{vno}_{vdate_raw}"
                vdate = f"{vdate_raw[:4]}-{vdate_raw[4:6]}-{vdate_raw[6:]}" if len(vdate_raw) == 8 else None

                cash_ledgers = []
                pnl_ledgers = []
                other_ledgers = []
                allocated_ccs = []
                voucher_amt = 0.0
                narration = v.findtext("NARRATION", "")

                for le in v.findall(".//ALLLEDGERENTRIES.LIST") + v.findall(".//LEDGERENTRIES.LIST"):
                    lname = le.findtext("LEDGERNAME", "").strip()
                    amt = abs(float(le.findtext("AMOUNT", "0")))
                    if "cash" in lname.lower():
                        if "cash connect" not in lname.lower() or lname.lower() in branch_mappings:
                            cash_ledgers.append((lname, amt))
                            if amt > voucher_amt:
                                voucher_amt = amt
                        else:
                            other_ledgers.append({"name": lname, "amount": amt})
                    else:
                        other_ledgers.append({"name": lname, "amount": amt})
                        if is_pnl_ledger(lname):
                            pnl_ledgers.append({"name": lname, "amount": amt})

                    for cc in le.findall(".//COSTCENTREALLOCATIONS.LIST"):
                        cname = cc.findtext("NAME", "").strip()
                        camt = abs(float(cc.findtext("AMOUNT", "0")))
                        allocated_ccs.append({"name": cname, "amount": camt})

                if not cash_ledgers or not pnl_ledgers:
                    continue

                primary_cash, _ = cash_ledgers[0]

                # Branch Filtering
                if selected_branch != "ALL BRANCHES":
                    sel_norm = selected_branch.strip().lower()
                    clean_sel = re.sub(r'\bcash\b', '', sel_norm).strip()
                    cash_norm = primary_cash.strip().lower()
                    clean_cash = re.sub(r'\bcash\b', '', cash_norm).strip()
                    exp_cc = (branch_mappings.get(primary_cash.lower()) or "").lower()
                    clean_exp_cc = re.sub(r'\bcash\b', '', exp_cc).strip()

                    matches_branch = (
                        cash_norm == sel_norm 
                        or clean_cash == clean_sel 
                        or (clean_exp_cc and clean_exp_cc == clean_sel)
                        or any(re.sub(r'\bcash\b', '', cc['name'].lower()).strip() == clean_sel for cc in allocated_ccs)
                    )
                    if not matches_branch:
                        continue

                expected_cc = branch_mappings.get(primary_cash.lower())
                is_mismatch = False
                reco_status = "MATCH"

                if not expected_cc:
                    reco_status = "UNMAPPED_CASH_LEDGER"
                    is_mismatch = True
                    chunk_new_masters.append({
                        "company_name": canonical_company,
                        "master_type": "NEW_CASH_LEDGER",
                        "master_name": primary_cash,
                        "detected_in_voucher_no": vno
                    })
                elif not allocated_ccs:
                    reco_status = "NO_COST_CENTRE_ALLOCATED"
                    is_mismatch = True
                else:
                    allocated_names = [c["name"].upper() for c in allocated_ccs]
                    if expected_cc in allocated_names:
                        reco_status = "SPLIT_OK" if len(allocated_names) > 1 else "MATCH"
                        is_mismatch = False
                    else:
                        reco_status = "MISMATCH"
                        is_mismatch = True

                for c in allocated_ccs:
                    actual_cc_clean = c["name"].strip().upper()
                    if actual_cc_clean not in branch_mappings.values():
                        chunk_new_masters.append({
                            "company_name": canonical_company,
                            "master_type": "NEW_COST_CENTRE",
                            "master_name": actual_cc_clean,
                            "detected_in_voucher_no": vno
                        })

                chunk_records.append({
                    "company_name": canonical_company,
                    "tally_guid": vguid,
                    "voucher_number": vno,
                    "voucher_date": vdate,
                    "voucher_type": vtype,
                    "cash_ledger": primary_cash,
                    "other_ledgers": other_ledgers,
                    "expected_cost_centre": expected_cc,
                    "allocated_cost_centres": allocated_ccs,
                    "voucher_amount": voucher_amt,
                    "narration": narration,
                    "is_mismatch": is_mismatch,
                    "reco_status": reco_status
                })

            if sync_state["stop_requested"]:
                break

            # Upsert vouchers
            if chunk_records:
                batch_size = 50
                for b_i in range(0, len(chunk_records), batch_size):
                    if sync_state["stop_requested"]:
                        break
                    batch = chunk_records[b_i:b_i + batch_size]
                    res = requests.post(f"{supa_url}/tally_cost_center_reco?on_conflict=tally_guid", headers=headers, json=batch, timeout=20)
                    if res.status_code >= 400:
                        add_log(f"Supabase error chunk {chunk_label}: {res.text}", "ERROR")

                m_count = sum(1 for r in chunk_records if not r["is_mismatch"])
                mm_count = sum(1 for r in chunk_records if r["is_mismatch"])
                total_vchs += len(chunk_records)
                total_matches += m_count
                total_mismatches += mm_count
                add_log(f"Synced {len(chunk_records)} vouchers for {chunk_label} ({m_count} match, {mm_count} discrepancies).", "SUCCESS")
            else:
                if vouchers_in_chunk:
                    add_log(f"0 cash vouchers matching criteria for {chunk_label}.", "WARN")

            # Upsert masters
            if chunk_new_masters and not sync_state["stop_requested"]:
                unique_masters = {(m["company_name"], m["master_type"], m["master_name"]): m for m in chunk_new_masters}
                res_m = requests.post(f"{supa_url}/tally_detected_masters_queue?on_conflict=company_name,master_type,master_name", headers=headers, json=list(unique_masters.values()), timeout=10)
                if res_m.status_code < 400:
                    total_masters += len(unique_masters)
                    add_log(f"Queued {len(unique_masters)} unmapped masters for {chunk_label}.", "WARN")

            elapsed = max(1, int(time.time() - t_start))
            sync_state["total_vouchers"] = total_vchs
            sync_state["matches"] = total_matches
            sync_state["mismatches"] = total_mismatches
            sync_state["new_masters"] = total_masters
            sync_state["progress"] = round(idx / len(chunks), 3)
            sync_state["duration_seconds"] = elapsed
            sync_state["speed"] = round(total_vchs / elapsed, 1)

        elapsed = max(1, int(time.time() - t_start))
        if sync_state["stop_requested"]:
            sync_state["status_title"] = "Transfer Stopped"
            sync_state["status_subtitle"] = f"Stopped by user after syncing {total_vchs:,} vouchers."
            add_log(f"⏹ Data Transfer STOPPED by user. Synced {total_vchs:,} vouchers.", "STOP")
        else:
            sync_state["progress"] = 1.0
            sync_state["status_title"] = "Transfer Completed"
            sync_state["status_subtitle"] = f"Processed {total_vchs:,} vouchers in {elapsed}s."
            if total_vchs == 0:
                add_log(f"Notice: 0 vouchers matched criteria for {from_date_str} to {to_date_str}. If entries exist in Tally for an earlier period, select that date range (e.g. 26 Aug 2026 onwards).", "WARN")
            add_log(f"✅ Transfer Completed! Total: {total_vchs:,} vouchers synced ({total_mismatches:,} discrepancies) in {elapsed}s.", "SUCCESS")

    except Exception as e:
        add_log(f"Fatal error during sync: {e}", "ERROR")
        sync_state["status_title"] = "Transfer Error"
        sync_state["status_subtitle"] = str(e)
    finally:
        sync_state["is_syncing"] = False
        sync_state["stop_requested"] = False

@app.post("/api/cost-centre-sync/start")
def api_start_sync(background_tasks: BackgroundTasks):
    global sync_state
    if sync_state["is_syncing"]:
        return {"status": "busy", "message": "Sync is already in progress."}
    
    cfg = load_config()
    company = cfg.get("company_name", "LADUMA HARDWARE & BRICKS CC 2025-26")
    from_date = cfg.get("from_date", "2026-09-01")
    to_date = cfg.get("to_date", "2026-09-26")
    branch = cfg.get("selected_branch", "ALL BRANCHES")

    sync_state["progress"] = 0.0
    sync_state["total_vouchers"] = 0
    sync_state["matches"] = 0
    sync_state["mismatches"] = 0
    sync_state["new_masters"] = 0
    sync_state["duration_seconds"] = 0
    sync_state["speed"] = 0.0

    background_tasks.add_task(run_cost_centre_sync_worker, company, from_date, to_date, branch)
    return {"status": "ok", "message": "Sync started in background."}

@app.post("/api/cost-centre-sync/stop")
def api_stop_sync():
    global sync_state
    if sync_state["is_syncing"]:
        sync_state["stop_requested"] = True
        return {"status": "ok", "message": "Stop signal sent."}
    return {"status": "idle", "message": "Sync is not running."}

@app.get("/api/cost-centre-sync/status")
def api_get_sync_status():
    return sync_state

# ── TALLY VS RBM POSTGRESQL ENGINE ────────────────────────────────────────

@app.get("/api/rbm/periods")
def api_get_periods():
    cfg = load_config()
    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()
        cur.execute("SELECT period_label FROM reconciliation_periods ORDER BY id DESC;")
        rows = cur.fetchall()
        conn.close()
        periods = [r[0] for r in rows] if rows else ["August 2026"]
        return {"status": "ok", "periods": periods}
    except Exception as e:
        return {"status": "error", "message": str(e), "periods": ["August 2026"]}

@app.post("/api/rbm/upload")
async def api_upload_rbm(file: UploadFile = File(...)):
    temp_path = os.path.join(APP_DIR, f"temp_{file.filename}")
    try:
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        reader = RBMExcelReader(temp_path)
        rbm_state["trading_data"] = reader.get_trading_data()
        rbm_state["branch_data"] = reader.get_branch_reports_data()
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {
            "status": "ok",
            "filename": file.filename,
            "trading_rows": len(rbm_state["trading_data"]),
            "branch_rows": len(rbm_state["branch_data"])
        }
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {"status": "error", "message": str(e)}

def resolve_date_range(period: str, from_date: Optional[str] = None, to_date: Optional[str] = None):
    if from_date and to_date and from_date.strip() and to_date.strip():
        return from_date.strip(), to_date.strip()
    
    import calendar
    m_match = re.search(r'([A-Za-z]+)\s*(\d{4})', period)
    if m_match:
        m_name = m_match.group(1).capitalize()
        year = int(m_match.group(2))
        try:
            m_num = list(calendar.month_name).index(m_name)
            last_day = calendar.monthrange(year, m_num)[1]
            return f"{year:04d}-{m_num:02d}-01", f"{year:04d}-{m_num:02d}-{last_day:02d}"
        except Exception:
            pass
    return "2026-08-01", "2026-08-31"

@app.post("/api/rbm/pull-tally-groups")
def api_pull_tally_groups(
    period: str = Form("August 2026"),
    from_date: Optional[str] = Form(None),
    to_date: Optional[str] = Form(None)
):
    try:
        cfg = load_config()
        tally_url = get_tally_url(cfg)
        comp = cfg.get("company_name", "LADUMA HARDWARE & BRICKS CC 2025-26")

        f_date, t_date = resolve_date_range(period, from_date, to_date)

        # Test candidate endpoints: configured URL first, then local, then LAN
        candidates = [tally_url, "http://127.0.0.1:9000", "http://192.168.10.237:9000"]
        active_ep = None
        for ep in candidates:
            if not ep: continue
            try:
                host = ep.replace("http://", "").replace("https://", "").split(":")[0]
                port = int(ep.split(":")[-1].replace("/", "")) if ":" in ep.replace("http://", "").replace("https://", "") else 9000
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(1.2)
                    s.connect((host, port))
                active_ep = ep
                break
            except Exception:
                continue

        if not active_ep:
            # Check if database already has data for this period
            db_check = get_tally_group_summaries_from_db(cfg, period)
            if db_check.get("has_data"):
                return {
                    "status": "warn",
                    "source": "database",
                    "message": f"Could not reach Tally live server, but found {db_check['total_ledgers']} existing group summary records in PostgreSQL for '{period}'.",
                    "period": period,
                    "from_date": db_check.get("from_date", f_date),
                    "to_date": db_check.get("to_date", t_date),
                    "groups_summary": db_check["groups_summary"],
                    "items": db_check["items"],
                    "total_ledgers": db_check["total_ledgers"],
                    "updated_at": db_check.get("updated_at")
                }
            return {
                "status": "error",
                "message": f"Could not connect to Tally on {tally_url} or 127.0.0.1:9000. Please ensure Tally is open with XML server on port 9000."
            }

        # Pull from active Tally endpoint
        res = pull_tally_group_summaries(active_ep, comp, f_date, t_date, cfg=cfg)
        items = res["items"]
        groups_summary = res["groups_summary"]

        if not items:
            return {
                "status": "warn",
                "message": f"Tally responded at {active_ep} but no ledgers were found for the 6 target groups between {f_date} and {t_date}.",
                "groups_summary": groups_summary,
                "items": [],
                "total_ledgers": 0
            }

        # Save into PostgreSQL (both tally_group_summaries and aggregated tally_extracted_data)
        period_id = save_tally_group_summaries(cfg, period, f_date, t_date, comp, items)

        # Update in-memory tally_extracted cache
        branch_extract = {}
        for it in items:
            b = it.get("branch_name")
            if not b: continue
            if b not in branch_extract:
                branch_extract[b] = {
                    "purchases": 0.0, "ibt_in": 0.0, "ibt_out": 0.0,
                    "stock_consumed": 0.0, "ho_stock_consumed": 0.0,
                    "damage_conversion": 0.0, "stock_discrepancy": 0.0,
                    "opening_stock": 0.0, "closing_stock": 0.0
                }
            grp = it["group_name"]
            if grp == "Purchase Accounts":
                net_p = it["debit_amount"] - it["credit_amount"]
                if net_p == 0 and it.get("closing_balance"):
                    net_p = abs(it["closing_balance"])
                branch_extract[b]["purchases"] += net_p
            elif grp == "Stock Transfers Branches":
                branch_extract[b]["ibt_in"] += it["debit_amount"]
                branch_extract[b]["ibt_out"] += it["credit_amount"]
            elif grp == "Stock Consumed By Branch":
                branch_extract[b]["stock_consumed"] += it["closing_balance"]
            elif grp == "Head Office Stock Consumed by Branch":
                branch_extract[b]["ho_stock_consumed"] += it["closing_balance"]
            elif grp == "Damage Conversion Accounts":
                branch_extract[b]["damage_conversion"] += it["closing_balance"]
            elif grp == "Stock Discrepancy in Branches":
                branch_extract[b]["stock_discrepancy"] += it["closing_balance"]

        rbm_state["tally_extracted"] = branch_extract

        return {
            "status": "ok",
            "source": "tally_live",
            "message": f"Successfully pulled 6 group summaries ({len(items)} ledgers) from Tally ({active_ep}) and saved to PostgreSQL.",
            "period": period,
            "from_date": f_date,
            "to_date": t_date,
            "groups_summary": groups_summary,
            "items": items,
            "total_ledgers": len(items),
            "endpoint": active_ep
        }
    except Exception as e:
        return {"status": "error", "message": f"Error pulling Tally group summaries: {str(e)}"}

@app.get("/api/rbm/tally-groups-data")
def api_get_tally_groups_data(period: str = "August 2026"):
    cfg = load_config()
    try:
        data = get_tally_group_summaries_from_db(cfg, period)
        return {
            "status": "ok",
            "source": "database",
            **data
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "has_data": False, "items": [], "groups_summary": {}}

@app.post("/api/rbm/pull-tally")
def api_pull_tally_rbm(
    period: str = Form("August 2026"),
    from_date: Optional[str] = Form(None),
    to_date: Optional[str] = Form(None)
):
    return api_pull_tally_groups(period, from_date, to_date)

@app.post("/api/rbm/reconcile")
def api_run_reco(
    period: str = Form("August 2026"),
    from_date: Optional[str] = Form(None),
    to_date: Optional[str] = Form(None)
):
    cfg = load_config()
    if not rbm_state["trading_data"] and not rbm_state["branch_data"]:
        # Fallback to local default if exists
        def_p = r"D:\10.ANTIGRAVITY\Tally vs RBM\COS Difference AUGUST 2026.xlsx"
        if os.path.exists(def_p):
            reader = RBMExcelReader(def_p)
            rbm_state["trading_data"] = reader.get_trading_data()
            rbm_state["branch_data"] = reader.get_branch_reports_data()
        else:
            return {"status": "error", "message": "Please upload an RBM Excel report file first."}

    f_date, t_date = resolve_date_range(period, from_date, to_date)

    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO reconciliation_periods (period_label, from_date, to_date, company_name)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (period_label) DO UPDATE 
            SET from_date=EXCLUDED.from_date, to_date=EXCLUDED.to_date, updated_at=CURRENT_TIMESTAMP
            RETURNING id;
        """, (period, f_date, t_date, cfg.get("company_name", "LADUMA HARDWARE & BRICKS CC 2025-26")))
        period_id = cur.fetchone()[0]

        # Auto-load tally extracts from PostgreSQL if memory cache is empty
        if not rbm_state.get("tally_extracted"):
            cur.execute("""
                SELECT branch_name, purchases, ibt_in, ibt_out, stock_consumed, ho_stock_consumed, opening_stock, closing_stock
                FROM tally_extracted_data
                WHERE period_id = %s;
            """, (period_id,))
            t_rows = cur.fetchall()
            loaded_tally = {}
            for tr_row in t_rows:
                loaded_tally[tr_row[0]] = {
                    "purchases": float(tr_row[1] or 0),
                    "ibt_in": float(tr_row[2] or 0),
                    "ibt_out": float(tr_row[3] or 0),
                    "stock_consumed": float(tr_row[4] or 0),
                    "ho_stock_consumed": float(tr_row[5] or 0),
                    "opening_stock": float(tr_row[6] or 0),
                    "closing_stock": float(tr_row[7] or 0)
                }
            rbm_state["tally_extracted"] = loaded_tally

        trading_dict = {r["branch"]: r for r in rbm_state["trading_data"]}
        branch_dict = {r["branch"]: r for r in rbm_state["branch_data"]}
        all_b = sorted(list(set(list(trading_dict.keys()) + list(branch_dict.keys()))))

        results = []
        for bname in all_b:
            tr = trading_dict.get(bname, {})
            br = branch_dict.get(bname, {})
            rec = calculate_reconciliation(bname, tr, br, rbm_state["tally_extracted"].get(bname, {}))
            results.append(rec)


            cur.execute("""
                INSERT INTO reconciliation_results (
                    period_id, branch_name, cos_branch_reports, cos_trading_account,
                    cos_sales_report, cos_tally, diff_reports_vs_sales, diff_trading_vs_tally,
                    diff_reports_vs_tally, is_flagged, status, breakdown_json
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (period_id, branch_name) DO UPDATE SET
                    cos_branch_reports=EXCLUDED.cos_branch_reports,
                    cos_trading_account=EXCLUDED.cos_trading_account,
                    cos_sales_report=EXCLUDED.cos_sales_report,
                    cos_tally=EXCLUDED.cos_tally,
                    diff_reports_vs_sales=EXCLUDED.diff_reports_vs_sales,
                    diff_trading_vs_tally=EXCLUDED.diff_trading_vs_tally,
                    diff_reports_vs_tally=EXCLUDED.diff_reports_vs_tally,
                    is_flagged=EXCLUDED.is_flagged,
                    status=EXCLUDED.status,
                    breakdown_json=EXCLUDED.breakdown_json,
                    updated_at=CURRENT_TIMESTAMP;
            """, (
                period_id, bname, rec["cos_branch_reports"], rec["cos_trading_account"],
                rec["cos_sales_report"], rec["cos_tally"], rec["diff_reports_vs_sales"],
                rec["diff_trading_vs_tally"], rec["diff_reports_vs_tally"],
                rec["is_flagged"], rec["status"], json.dumps(rec["details"])
            ))

        conn.commit()
        conn.close()
        rbm_state["reco_results"] = results
        return {
            "status": "ok",
            "period": period,
            "total_branches": len(results),
            "flagged_count": sum(1 for r in results if r["is_flagged"]),
            "results": results
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/rbm/results")
def api_get_reco_results(period: str = "August 2026"):
    cfg = load_config()
    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()
        cur.execute("""
            SELECT r.branch_name, r.cos_branch_reports, r.cos_trading_account,
                   r.cos_sales_report, r.cos_tally, r.diff_reports_vs_sales,
                   r.diff_trading_vs_tally, r.diff_reports_vs_tally,
                   r.is_flagged, r.status, r.breakdown_json
            FROM reconciliation_results r
            JOIN reconciliation_periods p ON r.period_id = p.id
            WHERE p.period_label = %s
            ORDER BY r.branch_name ASC;
        """, (period,))
        rows = cur.fetchall()
        conn.close()

        results = []
        for r in rows:
            results.append({
                "branch_name": r[0],
                "cos_branch_reports": float(r[1] or 0),
                "cos_trading_account": float(r[2] or 0),
                "cos_sales_report": float(r[3] or 0),
                "cos_tally": float(r[4] or 0),
                "diff_reports_vs_sales": float(r[5] or 0),
                "diff_trading_vs_tally": float(r[6] or 0),
                "diff_reports_vs_tally": float(r[7] or 0),
                "is_flagged": bool(r[8]),
                "status": r[9],
                "details": r[10] if isinstance(r[10], dict) else (json.loads(r[10]) if r[10] else {})
            })
        rbm_state["reco_results"] = results
        return {"status": "ok", "period": period, "results": results}
    except Exception as e:
        return {"status": "error", "message": str(e), "results": []}

@app.get("/api/rbm/export")
def api_export_excel(period: str = "August 2026"):
    results = rbm_state.get("reco_results", [])
    if not results:
        res = api_get_reco_results(period)
        results = res.get("results", [])

    if not results:
        raise HTTPException(status_code=400, detail="No reconciliation data to export.")

    out_file = os.path.join(APP_DIR, f"COS_Reconciliation_{period.replace(' ', '_')}.xlsx")
    generate_reconciled_excel(results, out_file, period)
    return FileResponse(out_file, filename=os.path.basename(out_file), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

# ── LEDGER & BRANCH MAPPING MANAGEMENT ──────────────────────────────────────

@app.get("/api/mappings/ledgers")
def api_get_ledger_mappings():
    cfg = load_config()
    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()

        # Get master branches
        cur.execute("SELECT branch_name FROM master_branches WHERE is_active = TRUE ORDER BY branch_name ASC;")
        master_branches = [r[0] for r in cur.fetchall()]

        # Ensure any ledgers in tally_group_summaries exist in tally_ledger_mappings
        cur.execute("""
            INSERT INTO tally_ledger_mappings (company_name, group_name, ledger_name, branch_name, is_verified, updated_at)
            SELECT '', s.group_name, s.ledger_name, '', FALSE, CURRENT_TIMESTAMP
            FROM (SELECT DISTINCT group_name, ledger_name FROM tally_group_summaries) s
            ON CONFLICT (group_name, ledger_name) DO NOTHING;
        """)
        conn.commit()

        # Query tally_ledger_mappings joined with latest closing balance from tally_group_summaries
        cur.execute("""
            SELECT 
                m.group_name,
                m.ledger_name,
                COALESCE(m.branch_name, '') AS branch_name,
                COALESCE(m.is_verified, FALSE) AS is_verified,
                m.id AS mapping_id,
                COALESCE(m.notes, '') AS notes,
                m.updated_at,
                COALESCE(s.closing_balance, 0.0) AS closing_balance
            FROM tally_ledger_mappings m
            LEFT JOIN (
                SELECT group_name, ledger_name, SUM(closing_balance) as closing_balance
                FROM tally_group_summaries
                GROUP BY group_name, ledger_name
            ) s ON s.group_name = m.group_name AND s.ledger_name = m.ledger_name
            ORDER BY m.group_name ASC, m.ledger_name ASC;
        """)
        rows = cur.fetchall()

        # Calculate group totals (total closing balance and count per group)
        cur.execute("""
            SELECT 
                group_name, 
                COUNT(*) as count, 
                COALESCE(SUM(closing_balance), 0.0) as total_closing
            FROM tally_group_summaries
            GROUP BY group_name;
        """)
        group_totals = {r[0]: {"count": int(r[1]), "total_closing": float(r[2])} for r in cur.fetchall()}

        conn.close()

        items = []
        mapped_count = 0
        unmapped_count = 0

        for r in rows:
            grp = r[0]
            lname = r[1]
            bname = (r[2] or "").strip()
            is_ver = bool(r[3])
            m_id = r[4]
            notes = r[5] or ""
            upd = str(r[6]) if r[6] else None
            cl_bal = float(r[7] or 0.0)

            suggested = smart_match_branch(grp, lname)
            is_mapped = bool(bname)

            if is_mapped:
                mapped_count += 1
            else:
                unmapped_count += 1

            items.append({
                "id": m_id,
                "group_name": grp,
                "ledger_name": lname,
                "branch_name": bname,
                "suggested_branch": suggested,
                "is_mapped": is_mapped,
                "is_verified": is_ver,
                "is_new": (not is_ver) or (not is_mapped),
                "notes": notes,
                "updated_at": upd,
                "closing_balance": cl_bal
            })

        unverified_count = sum(1 for it in items if not it["is_verified"])

        return {
            "status": "ok",
            "stats": {
                "total_ledgers": len(items),
                "mapped_count": mapped_count,
                "unmapped_count": unmapped_count,
                "unverified_count": unverified_count,
                "groups_count": len(set(it["group_name"] for it in items))
            },
            "groups": TALLY_TARGET_GROUPS,
            "group_totals": group_totals,
            "master_branches": master_branches,
            "items": items
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "stats": {"total_ledgers": 0, "mapped_count": 0, "unmapped_count": 0, "groups_count": 0},
            "groups": TALLY_TARGET_GROUPS,
            "master_branches": [],
            "items": []
        }

@app.post("/api/mappings/save")
def api_save_ledger_mappings(data: dict):
    cfg = load_config()
    mappings = data.get("mappings", [])
    if not mappings:
        raise HTTPException(status_code=400, detail="No mappings provided to save.")

    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()

        saved_count = 0
        for m in mappings:
            grp = m.get("group_name", "").strip()
            lname = m.get("ledger_name", "").strip()
            bname = m.get("branch_name", "").strip()
            is_ver = m.get("is_verified", True)
            notes = m.get("notes", "")

            if not grp or not lname:
                continue

            if bname:
                cur.execute("""
                    INSERT INTO master_branches (branch_name)
                    VALUES (%s)
                    ON CONFLICT (branch_name) DO NOTHING;
                """, (bname,))

            cur.execute("""
                INSERT INTO tally_ledger_mappings (company_name, group_name, ledger_name, branch_name, is_verified, notes, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (group_name, ledger_name) DO UPDATE
                SET branch_name = EXCLUDED.branch_name,
                    is_verified = EXCLUDED.is_verified,
                    notes = EXCLUDED.notes,
                    updated_at = CURRENT_TIMESTAMP;
            """, (cfg.get("company_name", ""), grp, lname, bname, is_ver, notes))
            saved_count += 1

        conn.commit()
        conn.close()
        return {"status": "ok", "saved_count": saved_count, "message": f"Successfully saved {saved_count} mapping(s)."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/mappings/delete")
def api_delete_mapping(data: dict):
    cfg = load_config()
    grp = data.get("group_name", "").strip()
    lname = data.get("ledger_name", "").strip()

    if not grp or not lname:
        raise HTTPException(status_code=400, detail="Group and Ledger names are required to unmap.")

    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()
        # Reset branch mapping to empty string and unverified
        cur.execute("""
            UPDATE tally_ledger_mappings
            SET branch_name = '',
                is_verified = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE group_name = %s AND ledger_name = %s;
        """, (grp, lname))
        affected = cur.rowcount
        conn.commit()
        conn.close()
        return {
            "status": "ok",
            "message": f"Mapping deleted for '{lname}'.",
            "group_name": grp,
            "ledger_name": lname,
            "affected": affected
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/mappings/ledger/permanent-delete")
def api_permanent_delete_ledger(data: dict):
    cfg = load_config()
    grp = data.get("group_name", "").strip()
    lname = data.get("ledger_name", "").strip()

    if not grp or not lname:
        raise HTTPException(status_code=400, detail="Group and Ledger names are required to delete.")

    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()
        
        # 1. Delete from tally_ledger_mappings
        cur.execute("""
            DELETE FROM tally_ledger_mappings
            WHERE group_name = %s AND ledger_name = %s;
        """, (grp, lname))
        del_mappings = cur.rowcount

        # 2. Delete from tally_group_summaries to remove duplicate/stale figures
        cur.execute("""
            DELETE FROM tally_group_summaries
            WHERE group_name = %s AND ledger_name = %s;
        """, (grp, lname))
        del_summaries = cur.rowcount

        conn.commit()
        conn.close()

        return {
            "status": "ok",
            "message": f"Ledger '{lname}' completely deleted from database.",
            "group_name": grp,
            "ledger_name": lname,
            "deleted_mappings": del_mappings,
            "deleted_summaries": del_summaries
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/mappings/ledger/permanent-delete-bulk")
def api_permanent_delete_ledgers_bulk(data: dict):
    cfg = load_config()
    ledgers = data.get("ledgers", [])

    if not ledgers:
        raise HTTPException(status_code=400, detail="No ledgers provided for bulk delete.")

    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()
        
        del_count = 0
        for item in ledgers:
            grp = item.get("group_name", "").strip()
            lname = item.get("ledger_name", "").strip()
            if not grp or not lname:
                continue

            cur.execute("""
                DELETE FROM tally_ledger_mappings
                WHERE group_name = %s AND ledger_name = %s;
            """, (grp, lname))
            del_count += cur.rowcount

            cur.execute("""
                DELETE FROM tally_group_summaries
                WHERE group_name = %s AND ledger_name = %s;
            """, (grp, lname))

        conn.commit()
        conn.close()

        return {
            "status": "ok",
            "deleted_count": del_count,
            "message": f"Successfully deleted {del_count} ledger(s) from database."
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/mappings/bulk-assign")
def api_bulk_assign_branch(data: dict):
    cfg = load_config()
    branch_name = data.get("branch_name", "").strip()
    ledgers = data.get("ledgers", [])

    if not branch_name:
        raise HTTPException(status_code=400, detail="Branch name is required.")
    if not ledgers:
        raise HTTPException(status_code=400, detail="No ledgers provided for bulk assignment.")

    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO master_branches (branch_name)
            VALUES (%s)
            ON CONFLICT (branch_name) DO NOTHING;
        """, (branch_name,))

        assigned_count = 0
        for item in ledgers:
            grp = item.get("group_name", "").strip()
            lname = item.get("ledger_name", "").strip()
            if not grp or not lname:
                continue

            cur.execute("""
                INSERT INTO tally_ledger_mappings (company_name, group_name, ledger_name, branch_name, is_verified, updated_at)
                VALUES (%s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
                ON CONFLICT (group_name, ledger_name) DO UPDATE
                SET branch_name = EXCLUDED.branch_name,
                    is_verified = TRUE,
                    updated_at = CURRENT_TIMESTAMP;
            """, (cfg.get("company_name", ""), grp, lname, branch_name))
            assigned_count += 1

        conn.commit()
        conn.close()
        return {"status": "ok", "assigned_count": assigned_count, "branch_name": branch_name}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/mappings/auto-suggest-all")
def api_auto_suggest_all():
    cfg = load_config()
    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()

        cur.execute("""
            SELECT DISTINCT group_name, ledger_name
            FROM tally_group_summaries;
        """)
        rows = cur.fetchall()

        updated_count = 0
        for grp, lname in rows:
            suggested = smart_match_branch(grp, lname)
            if suggested and suggested != "UNMAPPED":
                cur.execute("""
                    INSERT INTO tally_ledger_mappings (company_name, group_name, ledger_name, branch_name, is_verified, updated_at)
                    VALUES (%s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
                    ON CONFLICT (group_name, ledger_name) DO UPDATE
                    SET branch_name = CASE WHEN tally_ledger_mappings.branch_name = '' THEN EXCLUDED.branch_name ELSE tally_ledger_mappings.branch_name END,
                        updated_at = CURRENT_TIMESTAMP;
                """, (cfg.get("company_name", ""), grp, lname, suggested))
                updated_count += 1

        conn.commit()
        conn.close()
        return {"status": "ok", "suggested_count": updated_count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/mappings/master-branches")
def api_get_master_branches():
    cfg = load_config()
    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()
        cur.execute("SELECT branch_name, is_active FROM master_branches ORDER BY branch_name ASC;")
        branches = [{"name": r[0], "is_active": r[1]} for r in cur.fetchall()]
        conn.close()
        return {"status": "ok", "branches": branches}
    except Exception as e:
        return {"status": "error", "message": str(e), "branches": []}

@app.post("/api/mappings/master-branches")
def api_add_master_branch(data: dict):
    cfg = load_config()
    branch_name = data.get("branch_name", "").strip()
    if not branch_name:
        raise HTTPException(status_code=400, detail="Branch name cannot be empty.")
    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO master_branches (branch_name, is_active)
            VALUES (%s, TRUE)
            ON CONFLICT (branch_name) DO UPDATE SET is_active = TRUE;
        """, (branch_name,))
        conn.commit()
        conn.close()
        return {"status": "ok", "branch_name": branch_name}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/mappings/master-branches/delete")
def api_delete_master_branch(data: dict):
    cfg = load_config()
    branch_name = data.get("branch_name", "").strip()
    if not branch_name:
        raise HTTPException(status_code=400, detail="Branch name is required to delete.")
    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()

        # 1. Delete from master_branches
        cur.execute("DELETE FROM master_branches WHERE branch_name = %s;", (branch_name,))

        # 2. Reset any ledgers assigned to this branch to unmapped
        cur.execute("""
            UPDATE tally_ledger_mappings
            SET branch_name = '',
                is_verified = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE branch_name = %s;
        """, (branch_name,))
        unmapped_ledgers_count = cur.rowcount

        # 3. Clean up from tally_extracted_data and reconciliation_results for this branch
        cur.execute("DELETE FROM tally_extracted_data WHERE branch_name = %s;", (branch_name,))
        cur.execute("DELETE FROM reconciliation_results WHERE branch_name = %s;", (branch_name,))

        conn.commit()
        conn.close()
        return {
            "status": "ok",
            "message": f"Branch '{branch_name}' deleted successfully. {unmapped_ledgers_count} ledger(s) unmapped.",
            "branch_name": branch_name,
            "unmapped_count": unmapped_ledgers_count
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/mappings/verify")
def api_verify_mapping(data: dict):
    cfg = load_config()
    grp = data.get("group_name", "").strip()
    lname = data.get("ledger_name", "").strip()
    branch_name = data.get("branch_name")

    if not grp or not lname:
        raise HTTPException(status_code=400, detail="Group and Ledger names are required to verify.")

    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()
        if branch_name is not None and branch_name.strip():
            cur.execute("""
                UPDATE tally_ledger_mappings
                SET branch_name = %s,
                    is_verified = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE group_name = %s AND ledger_name = %s;
            """, (branch_name.strip(), grp, lname))
        else:
            cur.execute("""
                UPDATE tally_ledger_mappings
                SET is_verified = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE group_name = %s AND ledger_name = %s;
            """, (grp, lname))
        conn.commit()
        conn.close()
        return {"status": "ok", "message": f"Mapping for '{lname}' verified.", "group_name": grp, "ledger_name": lname}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/mappings/scan-tally")
def api_scan_tally_for_new_ledgers():
    cfg = load_config()
    t_url = get_tally_url(cfg)
    comp = cfg.get("company_name", "LADUMA HARDWARE & BRICKS CC 2025-26")
    clean_comp = comp.replace("&", "&amp;")

    tally_online = False
    active_ep = t_url
    for ep in [t_url, "http://127.0.0.1:9000", f"http://{cfg.get('server_ip')}:9000"]:
        try:
            h = ep.replace("http://", "").split(":")[0]
            p = int(ep.replace("http://", "").split(":")[1])
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1.5)
            s.connect((h, p))
            s.close()
            active_ep = ep
            tally_online = True
            break
        except Exception:
            continue

    if not tally_online:
        return {
            "status": "warn",
            "message": f"Tally server is not reachable on {t_url}. Scanning existing database records instead.",
            "source": "database_only",
            "new_count": 0,
            "new_ledgers": []
        }

    import xml.etree.ElementTree as ET
    new_found = []

    try:
        conn = get_pg_connection(cfg)
        cur = conn.cursor()
        cur.execute("SELECT group_name, ledger_name FROM tally_ledger_mappings;")
        existing_mappings = set((r[0].strip().lower(), r[1].strip().lower()) for r in cur.fetchall())

        for grp in TALLY_TARGET_GROUPS:
            targets = [grp]
            if grp == "Purchase Accounts":
                req_sub = f"""<ENVELOPE>
                  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>SubGrps</ID></HEADER>
                  <BODY>
                    <DESC>
                      <STATICVARIABLES>
                        <SVCURRENTCOMPANY>{clean_comp}</SVCURRENTCOMPANY>
                        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                      </STATICVARIABLES>
                      <TDL>
                        <TDLMESSAGE>
                          <COLLECTION NAME="SubGrps">
                            <TYPE>Group</TYPE>
                            <CHILDOF>Purchase Accounts</CHILDOF>
                            <FETCH>NAME</FETCH>
                          </COLLECTION>
                        </TDLMESSAGE>
                      </TDL>
                    </DESC>
                  </BODY>
                </ENVELOPE>"""
                try:
                    r_sub = requests.post(active_ep, data=req_sub.encode('utf-8'), timeout=15)
                    if r_sub.status_code == 200:
                        root_sub = ET.fromstring(r_sub.text)
                        for g in root_sub.findall(".//GROUP"):
                            gname = g.findtext("NAME") or g.get("NAME")
                            if not gname:
                                continue
                            gn = gname.strip()
                            if gn.upper().startswith("IBT") or "INTER BRANCH" in gn.upper():
                                continue
                            targets.append(gn)
                except Exception as e:
                    print(f"Error fetching sub-groups during scan: {e}")

            for target in targets:
                req_xml = f"""<ENVELOPE>
                  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>ScanLedgers</ID></HEADER>
                  <BODY>
                    <DESC>
                      <STATICVARIABLES>
                        <SVCURRENTCOMPANY>{clean_comp}</SVCURRENTCOMPANY>
                        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                      </STATICVARIABLES>
                      <TDL>
                        <TDLMESSAGE>
                          <COLLECTION NAME="ScanLedgers">
                            <TYPE>Ledger</TYPE>
                            <CHILDOF>{target}</CHILDOF>
                            <FETCH>NAME</FETCH>
                          </COLLECTION>
                        </TDLMESSAGE>
                      </TDL>
                    </DESC>
                  </BODY>
                </ENVELOPE>"""
                try:
                    r = requests.post(active_ep, data=req_xml.encode('utf-8'), headers={'Content-Type': 'text/xml'}, timeout=15)
                    if r.status_code == 200:
                        root = ET.fromstring(r.text)
                        for l in root.findall(".//LEDGER"):
                            lname = l.get("NAME") or l.findtext("NAME")
                            if not lname or not lname.strip():
                                continue
                            lname = lname.strip()
                            key = (grp.strip().lower(), lname.lower())
                            if key not in existing_mappings:
                                suggested = smart_match_branch(grp, lname)
                                cur.execute("""
                                    INSERT INTO tally_ledger_mappings (company_name, group_name, ledger_name, branch_name, is_verified, updated_at)
                                    VALUES (%s, %s, %s, %s, FALSE, CURRENT_TIMESTAMP)
                                    ON CONFLICT (group_name, ledger_name) DO NOTHING;
                                """, (comp, grp, lname, suggested if suggested != "UNMAPPED" else ""))
                                new_found.append({
                                    "group_name": grp,
                                    "ledger_name": lname,
                                    "suggested_branch": suggested
                                })
                                existing_mappings.add(key)
                except Exception as e:
                    print(f"Error scanning target {target}: {e}")

        conn.commit()
        conn.close()

        return {
            "status": "ok",
            "message": f"Scan completed successfully. Found {len(new_found)} new ledger(s).",
            "new_count": len(new_found),
            "new_ledgers": new_found
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "new_count": 0, "new_ledgers": []}

# ── GITHUB RELEASES AUTO-UPDATER ─────────────────────────────────────────

update_state = {
    "status": "idle", # "idle", "downloading", "completed", "error"
    "progress": 0,    # 0 - 100
    "downloaded_bytes": 0,
    "total_bytes": 0,
    "error_message": "",
    "zip_path": "",
    "version": ""
}
update_lock = threading.Lock()

def parse_semver(v: str):
    v = v.lstrip("v").strip()
    parts = []
    for seg in v.split("."):
        try:
            parts.append(int(seg))
        except ValueError:
            parts.append(seg)
    return parts

@app.get("/api/updates/check")
def api_check_updates():
    cfg = load_config()
    repo = cfg.get("github_repo", GITHUB_REPO)
    api_url = f"https://api.github.com/repos/{repo}/releases/latest"
    try:
        headers = {"User-Agent": "TallyBridge-Desktop"}
        r = requests.get(api_url, headers=headers, timeout=6)
        if r.status_code == 200:
            rel = r.json()
            latest_tag = rel.get("tag_name", "").lstrip("v")
            curr_ver = APP_VERSION.lstrip("v")
            
            is_newer = False
            try:
                is_newer = parse_semver(latest_tag) > parse_semver(curr_ver)
            except Exception:
                is_newer = (latest_tag != curr_ver)

            download_url = ""
            asset_name = ""
            asset_size = 0
            for asset in rel.get("assets", []):
                name = asset.get("name", "")
                if name.endswith(".zip") or name.endswith(".exe"):
                    download_url = asset.get("browser_download_url", "")
                    asset_name = name
                    asset_size = asset.get("size", 0)
                    break

            return {
                "status": "ok",
                "current_version": APP_VERSION,
                "latest_version": latest_tag,
                "update_available": is_newer,
                "release_name": rel.get("name", f"Release v{latest_tag}"),
                "release_notes": rel.get("body", "Bug fixes and performance improvements."),
                "published_at": rel.get("published_at", ""),
                "download_url": download_url,
                "asset_name": asset_name,
                "asset_size": asset_size,
                "repo": repo
            }
        elif r.status_code == 404:
            return {
                "status": "ok",
                "current_version": APP_VERSION,
                "latest_version": APP_VERSION,
                "update_available": False,
                "message": f"No published releases found on GitHub repository '{repo}' yet."
            }
        else:
            return {
                "status": "warn",
                "current_version": APP_VERSION,
                "update_available": False,
                "message": f"GitHub API status HTTP {r.status_code}"
            }
    except Exception as e:
        return {"status": "error", "current_version": APP_VERSION, "update_available": False, "message": str(e)}

def _download_worker(download_url: str, target_zip: str, target_ver: str):
    try:
        headers = {"User-Agent": "TallyBridge-Desktop"}
        with requests.get(download_url, headers=headers, stream=True, timeout=60) as r:
            r.raise_for_status()
            total_size = int(r.headers.get("content-length", 0))
            downloaded = 0
            
            with open(target_zip, "wb") as f:
                for chunk in r.iter_content(chunk_size=65536):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        with update_lock:
                            update_state["downloaded_bytes"] = downloaded
                            update_state["total_bytes"] = total_size
                            if total_size > 0:
                                update_state["progress"] = min(100, int((downloaded / total_size) * 100))
                            else:
                                update_state["progress"] = 50

        # Validate downloaded ZIP archive
        if not zipfile.is_zipfile(target_zip):
            raise Exception("Downloaded file is not a valid ZIP package.")

        with update_lock:
            update_state["status"] = "completed"
            update_state["progress"] = 100
            update_state["zip_path"] = target_zip
            update_state["version"] = target_ver
    except Exception as e:
        with update_lock:
            update_state["status"] = "error"
            update_state["error_message"] = str(e)

@app.post("/api/updates/download")
def api_download_update(data: dict):
    url = data.get("download_url")
    version = data.get("version", "latest")
    if not url:
        return {"status": "error", "message": "download_url parameter is required."}

    with update_lock:
        if update_state["status"] == "downloading":
            return {"status": "busy", "message": "Update download is already in progress."}
        
        update_dir = os.path.join(tempfile.gettempdir(), "TallyBridge_Update")
        os.makedirs(update_dir, exist_ok=True)
        target_zip = os.path.join(update_dir, "update_package.zip")
        if os.path.exists(target_zip):
            try:
                os.remove(target_zip)
            except Exception:
                pass

        update_state["status"] = "downloading"
        update_state["progress"] = 0
        update_state["downloaded_bytes"] = 0
        update_state["total_bytes"] = 0
        update_state["error_message"] = ""
        update_state["zip_path"] = ""
        update_state["version"] = version

    t = threading.Thread(target=_download_worker, args=(url, target_zip, version), daemon=True)
    t.start()
    return {"status": "ok", "message": "Download started in background."}

@app.get("/api/updates/progress")
def api_update_progress():
    with update_lock:
        return dict(update_state)

@app.post("/api/updates/apply")
def api_apply_update():
    with update_lock:
        if update_state["status"] != "completed" or not os.path.exists(update_state["zip_path"]):
            return {"status": "error", "message": "No completed update package ready to install."}
        zip_path = update_state["zip_path"]

    is_frozen = getattr(sys, 'frozen', False)
    target_dir = os.path.dirname(sys.executable) if is_frozen else APP_DIR
    exe_name = "TallyBridge.exe"
    pid = os.getpid()

    update_dir = os.path.join(tempfile.gettempdir(), "TallyBridge_Update")
    updater_bat = os.path.join(update_dir, "apply_update.bat")

    bat_content = f"""@echo off
chcp 65001 >nul
title Tally Bridge Auto-Updater
color 0b
echo ====================================================================
echo   TALLY BRIDGE AUTO-UPDATER
echo ====================================================================
echo.
echo [*] Target Directory: "{target_dir}"
echo [*] Update Package:   "{zip_path}"
echo [*] Executable:       "{exe_name}"
echo [*] Process PID:      {pid}
echo.
echo [1/5] Waiting for Tally Bridge to terminate...
timeout /t 2 /nobreak >nul
taskkill /F /PID {pid} >nul 2>&1
timeout /t 1 /nobreak >nul

echo [2/5] Preserving user configuration (config.json)...
if exist "{target_dir}\\config.json" (
    copy /y "{target_dir}\\config.json" "{update_dir}\\config_backup.json" >nul
    echo [✓] Configuration backed up.
)

echo [3/5] Extracting updated files into staging area...
set STAGE_DIR={update_dir}\\staging
if exist "%STAGE_DIR%" rd /s /q "%STAGE_DIR%"
mkdir "%STAGE_DIR%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '{zip_path}' -DestinationPath '%STAGE_DIR%' -Force"

echo [*] Applying updated binaries to application folder...
if exist "%STAGE_DIR%\\{exe_name}" (
    xcopy /s /e /y /q "%STAGE_DIR%\\*" "{target_dir}\\" >nul
) else if exist "%STAGE_DIR%\\TallyBridge\\{exe_name}" (
    xcopy /s /e /y /q "%STAGE_DIR%\\TallyBridge\\*" "{target_dir}\\" >nul
) else (
    xcopy /s /e /y /q "%STAGE_DIR%\\*" "{target_dir}\\" >nul
)

echo [4/5] Restoring user configuration (config.json)...
if exist "{update_dir}\\config_backup.json" (
    copy /y "{update_dir}\\config_backup.json" "{target_dir}\\config.json" >nul
    echo [✓] Configuration restored.
)

echo [5/5] Launching updated Tally Bridge...
timeout /t 1 /nobreak >nul
cd /d "{target_dir}"
start "" "{target_dir}\\{exe_name}"

echo.
echo [✓] Update applied successfully! Cleaning temporary files...
timeout /t 2 /nobreak >nul
rd /s /q "%STAGE_DIR%" >nul 2>&1
del "{zip_path}" >nul 2>&1
exit
"""
    try:
        with open(updater_bat, "w", encoding="utf-8") as f:
            f.write(bat_content)
    except Exception as e:
        return {"status": "error", "message": f"Failed to write updater script: {e}"}

    creationflags = 0x00000008 | 0x00000200
    if hasattr(subprocess, 'CREATE_NEW_CONSOLE'):
        creationflags = subprocess.CREATE_NEW_CONSOLE

    try:
        subprocess.Popen(
            ["cmd.exe", "/c", updater_bat],
            creationflags=creationflags,
            close_fds=True
        )
    except Exception as e:
        return {"status": "error", "message": f"Failed to trigger updater process: {e}"}

    def exit_now():
        time.sleep(1.0)
        os._exit(0)

    threading.Thread(target=exit_now, daemon=True).start()
    return {"status": "ok", "message": "Updater launched. Application restarting now..."}

# Serve frontend build if present (bundled or standalone)
DIST_DIR = os.path.join(BUNDLE_DIR, "frontend", "dist")
if not os.path.exists(DIST_DIR):
    DIST_DIR = os.path.join(EXE_DIR, "frontend", "dist")

if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=19876, log_level="warning")
