import requests
import xml.etree.ElementTree as ET

comp = "LADUMA HARDWARE & BRICKS CC 2025-26".replace("&", "&amp;")

# 1. Fetch sub-groups under Purchase Accounts
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
            <FETCH>NAME,PARENT</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>"""

r = requests.post("http://127.0.0.1:9000", data=req_subgroups.encode('utf-8'), timeout=10)
root = ET.fromstring(r.text)
groups = [g.findtext("NAME") or g.get("NAME") for g in root.findall(".//GROUP")]
print("=== Subgroups under 'Purchase Accounts' in Tally ===")
for g in groups:
    print(f"  - {g}")

# 2. Fetch all ledgers where PARENT is Purchase Accounts OR any of its sub-groups
req_all_ledgers = f"""<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>AllLedgers</ID></HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>{comp}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="AllLedgers">
            <TYPE>Ledger</TYPE>
            <FETCH>NAME,PARENT,CLOSINGBALANCE</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>"""

r2 = requests.post("http://127.0.0.1:9000", data=req_all_ledgers.encode('utf-8'), timeout=15)
root2 = ET.fromstring(r2.text)
print("\n=== Ledgers directly or indirectly under Purchase Accounts ===")
purchase_ledgers = []
for l in root2.findall(".//LEDGER"):
    lname = l.findtext("NAME") or l.get("NAME")
    parent = l.findtext("PARENT")
    bal = l.findtext("CLOSINGBALANCE")
    if parent and ("purchase" in parent.lower() or parent in groups):
        purchase_ledgers.append((lname, parent, bal))
        print(f"Ledger: {lname} | Parent: {parent} | Closing: {bal}")

print(f"\nTotal Purchase-related Ledgers: {len(purchase_ledgers)}")
