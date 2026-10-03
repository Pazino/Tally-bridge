import requests
import xml.etree.ElementTree as ET
import backend

cfg = backend.load_config()
conn = backend.get_pg_connection(cfg)
cur = conn.cursor()

comp = "LADUMA HARDWARE & BRICKS CC 2025-26".replace("&", "&amp;")

# 1. Fetch all subgroups under Purchase Accounts
req_subgroups = f"""<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>SubGrps</ID></HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>{comp}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="SubGrps">
            <TYPE>Group</TYPE>
            <CHILDOF>Purchase Accounts</CHILDOF>
            <FETCH>NAME,CLOSINGBALANCE</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>"""

r = requests.post("http://127.0.0.1:9000", data=req_subgroups.encode('utf-8'), timeout=15)
root = ET.fromstring(r.text)

subgroups = []
for g in root.findall(".//GROUP"):
    gname = g.findtext("NAME") or g.get("NAME")
    if not gname or gname == "None":
        continue
    # Exclude IBT / Inter Branch Transfer
    if gname.strip().upper().startswith("IBT") or "INTER BRANCH" in gname.strip().upper():
        print(f"Skipping IBT group: {gname}")
        continue
    subgroups.append(gname.strip())

print(f"Found {len(subgroups)} non-IBT subgroups under Purchase Accounts.")

# 2. For each subgroup, extract child ledgers and insert into tally_ledger_mappings & tally_group_summaries
total_added = 0
for sub in subgroups:
    req_sub_ledgers = f"""<ENVELOPE>
      <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>SubLedgers</ID></HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVCURRENTCOMPANY>{comp}</SVCURRENTCOMPANY>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          </STATICVARIABLES>
          <TDL>
            <TDLMESSAGE>
              <COLLECTION NAME="SubLedgers">
                <TYPE>Ledger</TYPE>
                <CHILDOF>{sub}</CHILDOF>
                <FETCH>NAME,OPENINGBALANCE,DEBITTOTALS,CREDITTOTALS,CLOSINGBALANCE</FETCH>
              </COLLECTION>
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>"""
    try:
        r_l = requests.post("http://127.0.0.1:9000", data=req_sub_ledgers.encode('utf-8'), timeout=10)
        root_l = ET.fromstring(r_l.text)
        for l in root_l.findall(".//LEDGER"):
            lname = l.findtext("NAME") or l.get("NAME")
            if not lname or lname == "None" or not lname.strip():
                continue
            lname = lname.strip()

            def pf(x):
                try: return float(x.strip()) if x else 0.0
                except: return 0.0

            op = pf(l.findtext("OPENINGBALANCE"))
            dr = pf(l.findtext("DEBITTOTALS"))
            cr = pf(l.findtext("CREDITTOTALS"))
            cl = pf(l.findtext("CLOSINGBALANCE"))

            suggested = backend.smart_match_branch("Purchase Accounts", lname)
            branch = suggested if suggested != "UNMAPPED" else ""

            # Insert into tally_ledger_mappings
            cur.execute("""
                INSERT INTO tally_ledger_mappings (company_name, group_name, ledger_name, branch_name, is_verified, updated_at)
                VALUES (%s, 'Purchase Accounts', %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (group_name, ledger_name) DO UPDATE
                SET branch_name = CASE WHEN tally_ledger_mappings.branch_name = '' THEN EXCLUDED.branch_name ELSE tally_ledger_mappings.branch_name END,
                    updated_at = CURRENT_TIMESTAMP;
            """, (comp, lname, branch, bool(branch)))

            # Upsert into tally_group_summaries using UNIQUE (period_label, group_name, ledger_name)
            cur.execute("""
                INSERT INTO tally_group_summaries (
                    period_id, period_label, group_name, ledger_name, 
                    opening_balance, debit_amount, credit_amount, closing_balance, 
                    from_date, to_date, updated_at
                )
                VALUES (
                    1, 'August 2026', 'Purchase Accounts', %s,
                    %s, %s, %s, %s,
                    '2026-08-01', '2026-08-31', CURRENT_TIMESTAMP
                )
                ON CONFLICT (period_label, group_name, ledger_name) DO UPDATE
                SET closing_balance = EXCLUDED.closing_balance,
                    debit_amount = EXCLUDED.debit_amount,
                    credit_amount = EXCLUDED.credit_amount,
                    opening_balance = EXCLUDED.opening_balance,
                    updated_at = CURRENT_TIMESTAMP;
            """, (lname, op, dr, cr, cl))

            total_added += 1
            print(f"  Added/Updated: {lname} -> Branch: {branch} (Bal: {cl})")
    except Exception as e:
        print(f"Error on subgroup {sub}: {e}")

conn.commit()
conn.close()
print(f"\nDone! Processed {total_added} ledgers under Purchase Accounts.")
