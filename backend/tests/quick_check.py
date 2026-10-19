import urllib.request
import json

BASE = "http://127.0.0.1:8000"

def post(url, data=None, headers=None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    body = json.dumps(data or {}).encode()
    req = urllib.request.Request(url, data=body, headers=h, method="POST")
    r = urllib.request.urlopen(req, timeout=15)
    return json.loads(r.read())

def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    r = urllib.request.urlopen(req, timeout=15)
    return json.loads(r.read())

# 1. Demo Login
auth = post(f"{BASE}/auth/demo")
token = auth["token"]
H = {"Authorization": f"Bearer {token}"}
print("[1] Login OK ->", auth["email"])

# 2. /auth/me
me = get(f"{BASE}/auth/me", H)
print("[2] Me ->", me.get("name") or me.get("display_name"), "|", me.get("practice_language", "en"))

# 3. Create Session
sess = post(f"{BASE}/v1/sessions", {"mode": "interview", "topic": "Database Systems"}, H)
sid = sess["id"]
print("[3] Session created ->", sid[:8], "...")

# 4. Create Attempt
attempt = post(f"{BASE}/v1/sessions/{sid}/attempts", {"role": "baseline"}, H)
aid = attempt["id"]
print("[4] Attempt created ->", aid[:8], "...")
print("    Prompt:", attempt.get("prompt", "")[:80])

print()
print("ALL CHECKS PASSED — Backend + Nhost Postgres fully operational!")
