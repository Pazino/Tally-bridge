import requests
import xml.etree.ElementTree as ET

comp = "LADUMA HARDWARE & BRICKS CC 2025-26".replace("&", "&amp;")

# 1. Fetch sub-groups of Purchase Accounts
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

r = requests.post("http://127.0.0.1:9000", data=req_subgroups.encode('utf-8'), timeout=10)
root = ET.fromstring(r.text)
groups_with_bal = []
for g in root.findall(".//GROUP"):
    name = g.findtext("NAME") or g.get("NAME")
    bal = g.findtext("CLOSINGBALANCE")
    if name and name != "None":
        groups_with_bal.append((name, bal))

print("=== Subgroups under Purchase Accounts with CLOSINGBALANCE ===")
for g, b in groups_with_bal:
    print(f"  Group: {g} | Balance: {b}")

# 2. For each subgroup (excluding IBT), fetch its child ledgers
valid_subgroups = [g for g, _ in groups_with_bal if not g.upper().startswith("IBT") and "INTER BRANCH" not in g.upper()]
print(f"\nScanning ledgers under {len(valid_subgroups)} valid purchase subgroups...")

total_ledgers = 0
for sub in valid_subgroups:
    sub_xml = f"""<ENVELOPE>
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
                <FETCH>NAME,CLOSINGBALANCE,OPENINGBALANCE,DEBITTOTALS,CREDITTOTALS</FETCH>
              </COLLECTION>
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>"""
    r_sub = requests.post("http://127.0.0.1:9000", data=sub_xml.encode('utf-8'), timeout=10)
    root_sub = ET.fromstring(r_sub.text)
    ledgers = root_sub.findall(".//LEDGER")
    for l in ledgers:
        lname = l.findtext("NAME") or l.get("NAME")
        if lname and lname != "None":
            bal = l.findtext("CLOSINGBALANCE")
            print(f"    [{sub}] -> {lname} (Bal: {bal})")
            total_ledgers += 1

print(f"\nTotal child ledgers found across all non-IBT purchase subgroups: {total_ledgers}")
