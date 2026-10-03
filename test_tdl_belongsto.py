import requests
import xml.etree.ElementTree as ET

comp = "LADUMA HARDWARE & BRICKS CC 2025-26".replace("&", "&amp;")

# Test query using BELONGSTO vs CHILDOF
req = f"""<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>TestBelongsTo</ID></HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>{comp}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="TestBelongsTo">
            <TYPE>Ledger</TYPE>
            <BELONGSTO>Yes</BELONGSTO>
            <CHILDOF>Purchase Accounts</CHILDOF>
            <FETCH>NAME,PARENT,CLOSINGBALANCE</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>"""

r = requests.post("http://127.0.0.1:9000", data=req.encode('utf-8'), timeout=15)
root = ET.fromstring(r.text)
ledgers = root.findall(".//LEDGER")
print(f"Total ledgers found with BELONGSTO=Yes: {len(ledgers)}")
for l in ledgers[:40]:
    n = l.findtext("NAME") or l.get("NAME")
    p = l.findtext("PARENT")
    c = l.findtext("CLOSINGBALANCE")
    print(f"  {n} | Parent: {p} | Balance: {c}")
