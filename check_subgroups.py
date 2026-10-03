import requests
import xml.etree.ElementTree as ET

comp = "LADUMA HARDWARE & BRICKS CC 2025-26".replace("&", "&amp;")

# 1. Fetch direct sub-groups under Purchase Accounts
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
groups = [g for g in groups if g and g != "None"]

print("=== Subgroups under Purchase Accounts ===")
for g in groups:
    print(f"  {g}")

# Filter out IBT / Carriage Inward as requested:
# "except the first IBT Inter Branch Transfer"
print("\n=== Subgroups excluding IBT ===")
valid_purchase_groups = [g for g in groups if not g.upper().startswith("IBT") and not "INTER BRANCH" in g.upper()]
for g in valid_purchase_groups:
    print(f"  - {g}")
