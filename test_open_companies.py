import requests
import xml.etree.ElementTree as ET
import re

url = "http://127.0.0.1:9000"

req_comp = """<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>ListofCompanies</ID></HEADER>
  <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="ListofCompanies"><TYPE>Company</TYPE><FETCH>NAME</FETCH></COLLECTION></TDLMESSAGE></TDL></DESC></BODY>
</ENVELOPE>"""

try:
    r = requests.post(url, data=req_comp.encode('utf-8'), timeout=5)
    root = ET.fromstring(r.text)
    comps = [c.findtext("NAME") for c in root.findall(".//COMPANY")]
    print("Open Companies in Tally:", comps)
except Exception as e:
    print("Error getting companies:", e)
