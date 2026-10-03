import requests
import re
import xml.etree.ElementTree as ET
import time

tally_url = "http://127.0.0.1:9000"

# Test 1: Day Book for a date we KNOW has data (try Sep 1)
for test_date in ["20260901", "20260826", "20260925"]:
    print(f"\n{'='*60}")
    print(f"TEST: Day Book for {test_date}")
    print(f"{'='*60}")
    
    req_xml = f"""<ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>Day Book</REPORTNAME>
            <STATICVARIABLES>
              <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
              <SVFROMDATE>{test_date}</SVFROMDATE>
              <SVTODATE>{test_date}</SVTODATE>
            </STATICVARIABLES>
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>"""
    
    try:
        t0 = time.time()
        r = requests.post(tally_url, data=req_xml.encode('utf-8'), 
                         headers={'Connection': 'close', 'Content-Type': 'text/xml'}, 
                         timeout=15)
        elapsed = time.time() - t0
        print(f"  HTTP {r.status_code} in {elapsed:.2f}s, response length: {len(r.text)} bytes")
        
        # Show raw response (first 800 chars)
        print(f"  RAW RESPONSE (first 800 chars):")
        print(f"  {r.text[:800]}")
        
        # Try parsing
        clean_xml = re.sub(r'&#[0-9]+;', '', r.text)
        clean_xml = re.sub(r'<(/?)(\w+):', r'<\1\2_', clean_xml)
        root = ET.fromstring(clean_xml)
        
        # Count vouchers
        vouchers = root.findall(".//VOUCHER")
        print(f"  VOUCHER elements: {len(vouchers)}")
        
        # Show all top-level tags
        children = [child.tag for child in root]
        print(f"  Root tag: {root.tag}, children: {children}")
        
        # Look for any data containers
        all_tags = set()
        for elem in root.iter():
            all_tags.add(elem.tag)
        print(f"  All unique tags ({len(all_tags)}): {sorted(all_tags)[:30]}")
        
        if vouchers:
            v = vouchers[0]
            print(f"  Sample voucher DATE: {v.findtext('DATE')}")
            print(f"  Sample voucher VCHTYPE: {v.get('VCHTYPE', 'N/A')}")
            print(f"  Sample voucher VOUCHERNUMBER: {v.findtext('VOUCHERNUMBER')}")
    except Exception as e:
        print(f"  ERROR: {e}")

# Test 2: Try the old-style TDL collection (single day, should be fast)
print(f"\n{'='*60}")
print(f"TEST: TDL Collection for 20260901 (single day)")
print(f"{'='*60}")

req_xml2 = """<ENVELOPE>
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
        <SVFROMDATE TYPE="Date">20260901</SVFROMDATE>
        <SVTODATE TYPE="Date">20260901</SVTODATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="DayVouchers">
            <TYPE>Voucher</TYPE>
            <FETCH>DATE, GUID, VOUCHERNUMBER, VOUCHERTYPENAME, NARRATION, ALLLEDGERENTRIES.LIST</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>"""

try:
    t0 = time.time()
    r2 = requests.post(tally_url, data=req_xml2.encode('utf-8'),
                      headers={'Connection': 'close', 'Content-Type': 'text/xml'},
                      timeout=15)
    elapsed = time.time() - t0
    print(f"  HTTP {r2.status_code} in {elapsed:.2f}s, response length: {len(r2.text)} bytes")
    print(f"  RAW (first 500 chars): {r2.text[:500]}")
    
    clean2 = re.sub(r'&#[0-9]+;', '', r2.text)
    clean2 = re.sub(r'<(/?)(\w+):', r'<\1\2_', clean2)
    root2 = ET.fromstring(clean2)
    v2 = root2.findall(".//VOUCHER")
    print(f"  VOUCHER elements: {len(v2)}")
except Exception as e:
    print(f"  ERROR: {e}")
