import urllib.request
import urllib.error
import json
import sys
import uuid
from datetime import datetime

from app.core.database import SessionLocal
from app.models.models import Department, User, Role, Sector, Challenge, Startup, AuditLog, Document
from app.core.security import get_password_hash

BASE_URL = "http://localhost:8000"

def make_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if data:
        headers["Content-Type"] = "application/json"
        req_data = json.dumps(data).encode("utf-8")
    else:
        req_data = None

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = e.read().decode("utf-8")
        return e.code, body
    except Exception as e:
        return 500, str(e)

def upload_startup_document(token, doc_type, file_content, file_name):
    url = f"{BASE_URL}/startups/me/documents"
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    }
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="doc_type"\r\n\r\n'
        f"{doc_type}\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{file_name}"\r\n'
        f"Content-Type: text/plain\r\n\r\n"
        f"{file_content}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")
    
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = e.read().decode("utf-8")
        return e.code, body
    except Exception as e:
        return 500, str(e)

def run_module3_tests():
    print("\n=== STARTING MODULE 3 ACCEPTANCE VERIFICATION TESTS ===")

    db = SessionLocal()
    try:
        # Fetch sectors
        sectors = db.query(Sector).all()
        sector_map = {s.name: str(s.id) for s in sectors}
        agri_sector = sector_map.get("AgriTech") or list(sector_map.values())[0]
        fin_sector = sector_map.get("FinTech") or list(sector_map.values())[0]
        health_sector = sector_map.get("HealthTech") or list(sector_map.values())[0]
    finally:
        db.close()

    # 1. Login Admin & Officer
    print("\n[CRITERION 1 & Setup] Logging in as Admin...")
    status, login_admin = make_request("/auth/login", "POST", {
        "email": "admin@test.gov.in",
        "password": "SankalpAdmin2026!"
    })
    if status != 200:
        print(f"FAILED Admin login: {login_admin}")
        sys.exit(1)
    admin_token = login_admin.get("access_token")

    # 2. Self-Registration
    print("\n[CRITERION 2] Testing POST /auth/register-startup...")
    reg_num_1 = f"REG-AGRI-{uuid.uuid4().hex[:6]}"
    status, reg1_res = make_request("/auth/register-startup", "POST", {
        "email": f"agri_{uuid.uuid4().hex[:6]}@agrisense.io",
        "password": "StartupPass123!",
        "full_name": "Agri Tech Founder",
        "startup_name": "AgriSense Crop AI",
        "registration_number": reg_num_1,
        "sector_id": agri_sector,
        "description": "We build AI computer vision systems for automated crop disease diagnosis, soil yield optimization, and smart drone spraying."
    })
    if status != 201:
        print(f"FAILED Register Startup 1: {status} -> {reg1_res}")
        sys.exit(1)

    startup1_token = reg1_res.get("access_token")
    if not startup1_token:
        print("FAILED: Tokens missing in registration response")
        sys.exit(1)
    print(f"SUCCESS: Startup registered. Token obtained. Registration Number: {reg_num_1}")

    # 3. Registration Uniqueness (409 Conflict)
    print("\n[CRITERION 3] Testing duplicate registration_number returns 409 Conflict...")
    status, dup_res = make_request("/auth/register-startup", "POST", {
        "email": f"other_{uuid.uuid4().hex[:6]}@agrisense.io",
        "password": "StartupPass123!",
        "full_name": "Duplicate Founder",
        "startup_name": "Duplicate Corp",
        "registration_number": reg_num_1,  # Same registration number
        "sector_id": agri_sector,
        "description": "Another description."
    })
    if status != 409:
        print(f"FAILED: Expected status 409 Conflict for duplicate registration_number, got {status}: {dup_res}")
        sys.exit(1)
    print(f"SUCCESS: Duplicate registration correctly rejected with HTTP 409 Conflict: {dup_res}")

    # 4. Profile Update & Embedding Vector Verification
    print("\n[CRITERION 4] Testing PATCH /startups/me and verifying embedding vector dimension...")
    status, patch_res = make_request("/startups/me", "PATCH", {
        "website": "https://agrisense.io",
        "team_size": 25,
        "funding_stage": "Seed",
        "description": "AgriSense develops machine learning algorithms and computer vision sensors for automated plant pathology detection, soil nutrient modeling, and high-precision autonomous crop management."
    }, token=startup1_token)
    
    if status != 200:
        print(f"FAILED PATCH /startups/me: {status} -> {patch_res}")
        sys.exit(1)

    db = SessionLocal()
    try:
        st_db = db.query(Startup).filter(Startup.registration_number == reg_num_1).first()
        if not st_db or not st_db.profile_complete:
            print("FAILED: Startup profile_complete is False")
            sys.exit(1)
        if st_db.embedding is None:
            print("FAILED: Startup embedding vector is None")
            sys.exit(1)
        vec_len = len(st_db.embedding)
        print(f"SUCCESS: Startup embedding vector length returned from Gemini: {vec_len}")
        if vec_len != 768:
            print(f"FAILED: Embedding length is {vec_len}, expected 768")
            sys.exit(1)
    finally:
        db.close()

    # 5. Challenge Embedding Generation on Approval
    print("\n[CRITERION 5] Testing Challenge approval triggers embedding generation...")
    # Register officer or use existing officer to create draft challenge
    status, off_login = make_request("/auth/login", "POST", {
        "email": "officer1@test.gov.in",
        "password": "OfficerPass123!"
    })
    officer_token = off_login.get("access_token")

    status, chal_res = make_request("/challenges", "POST", {
        "title": "Smart Agricultural Pest & Disease Diagnostics",
        "raw_problem_text": "Farmers in rural regions face heavy crop loss due to unidentified pest infestations. We require an automated computer vision software system to detect leaf diseases early from mobile photos.",
        "sector_id": agri_sector,
        "budget_ceiling": 4000000.00,
        "currency": "INR"
    }, token=officer_token)
    chal_id = chal_res.get("id")

    # Structure & submit for approval
    make_request(f"/challenges/{chal_id}/structure", "POST", token=officer_token)
    make_request(f"/challenges/{chal_id}/submit-for-approval", "POST", token=officer_token)

    # Approve as SUPER_ADMIN
    status, app_res = make_request(f"/challenges/{chal_id}/approve", "POST", token=admin_token)
    if status != 200:
        print(f"FAILED Challenge approve: {status} -> {app_res}")
        sys.exit(1)

    db = SessionLocal()
    try:
        ch_db = db.query(Challenge).filter(Challenge.id == chal_id).first()
        if ch_db.embedding is None:
            print("FAILED: Published challenge embedding is None")
            sys.exit(1)
        ch_vec_len = len(ch_db.embedding)
        print(f"SUCCESS: Published Challenge embedding populated with dimension: {ch_vec_len}")
    finally:
        db.close()

    # 6. Semantic Matching Accuracy (Challenge -> Startups)
    print("\n[CRITERION 6] Testing Semantic Matching Accuracy (Challenge -> Startups)...")
    # Create 2 additional startups in different domains
    reg_num_2 = f"REG-FIN-{uuid.uuid4().hex[:6]}"
    status, reg2_res = make_request("/auth/register-startup", "POST", {
        "email": f"fin_{uuid.uuid4().hex[:6]}@finpay.io",
        "password": "StartupPass123!",
        "full_name": "FinTech Founder",
        "startup_name": "FinPay Payment Gateway",
        "registration_number": reg_num_2,
        "sector_id": fin_sector,
        "description": "FinPay provides digital payment APIs, credit scoring algorithms, merchant POS terminals, and cross-border remittance gateway infrastructure."
    })

    reg_num_3 = f"REG-HEALTH-{uuid.uuid4().hex[:6]}"
    status, reg3_res = make_request("/auth/register-startup", "POST", {
        "email": f"health_{uuid.uuid4().hex[:6]}@meddiag.io",
        "password": "StartupPass123!",
        "full_name": "HealthTech Founder",
        "startup_name": "MedDiag Diagnostics AI",
        "registration_number": reg_num_3,
        "sector_id": health_sector,
        "description": "MedDiag develops deep learning models for reading radiology X-rays, MRI scans, and automating hospital diagnostic workflows."
    })

    status, match_res = make_request(f"/challenges/{chal_id}/matching-startups?top_k=5", "GET", token=admin_token)
    if status != 200:
        print(f"FAILED GET /challenges/{chal_id}/matching-startups: {status} -> {match_res}")
        sys.exit(1)

    print(f"Matching Results for AgriTech Challenge ({len(match_res)} startups found):")
    for m in match_res:
        print(f" - {m['title_or_name']} (Sector: {m['sector_name']}) -> Similarity Score: {m['similarity_score']}")

    top_matched_name = match_res[0]['title_or_name']
    top_sector = match_res[0]['sector_name']
    if "Agri" not in top_matched_name and top_sector != "AgriTech":
        print(f"FAILED: Top matching startup for AgriTech challenge should be AgriTech startup, got: {top_matched_name} ({top_sector})")
        sys.exit(1)
    print(f"SUCCESS: Topically relevant startup ({top_matched_name}) scored highest similarity for the AgriTech challenge!")


    # 7. Semantic Matching Symmetrically (Startup -> Challenges)
    print("\n[CRITERION 7] Testing GET /startups/me/matching-challenges...")
    status, st_match_res = make_request("/startups/me/matching-challenges?top_k=5", "GET", token=startup1_token)
    if status != 200:
        print(f"FAILED GET /startups/me/matching-challenges: {status} -> {st_match_res}")
        sys.exit(1)

    print(f"Matching Challenges for AgriSense Startup ({len(st_match_res)} challenges found):")
    for ch in st_match_res:
        print(f" - {ch['title_or_name']} -> Similarity Score: {ch['similarity_score']}")
    print("SUCCESS: Startup matching challenges query returned valid ranked results!")

    # 8. RBAC Guards Enforcement
    print("\n[CRITERION 8] Testing RBAC guards on matching endpoints...")
    status, rbac_fail = make_request(f"/challenges/{chal_id}/matching-startups", "GET", token=startup1_token)
    if status != 403:
        print(f"FAILED: Startup user calling challenge matching returned {status} (expected 403)")
        sys.exit(1)
    print("SUCCESS: STARTUP_USER correctly blocked from viewing officer matching endpoint with 403 Forbidden.")

    # 9. Document Upload via /startups/me/documents
    print("\n[CRITERION 9] Testing KYC document upload via /startups/me/documents...")
    status, doc_res = upload_startup_document(
        token=startup1_token,
        doc_type="incorporation_certificate",
        file_content="CERTIFICATE OF INCORPORATION FOR AGRISENSE CROP AI PRIVATE LIMITED",
        file_name="inc_cert.pdf"
    )
    if status != 201:
        print(f"FAILED Upload document: {status} -> {doc_res}")
        sys.exit(1)

    doc_id = doc_res.get("id")
    db = SessionLocal()
    try:
        doc_db = db.query(Document).filter(Document.id == doc_id).first()
        if not doc_db or doc_db.owner_type != "startup":
            print(f"FAILED: Document owner_type is {doc_db.owner_type if doc_db else None}")
            sys.exit(1)
        print(f"SUCCESS: Document uploaded. ID: {doc_id}, owner_type: {doc_db.owner_type}, doc_type: {doc_db.doc_type}")
    finally:
        db.close()

    # 10. Audit Logs Verification
    print("\n[CRITERION 10] Testing audit log entries for startup actions...")
    status, audit_res = make_request("/audit-logs", "GET", token=admin_token)
    actions = [a.get("action") for a in audit_res]
    print(f"Audit Log Actions Recorded: {set(actions)}")

    required_actions = ["startup.register", "startup.profile_update", "DOCUMENT_UPLOAD"]
    for act in required_actions:
        if act not in actions:
            print(f"FAILED: Required audit action '{act}' not found in audit logs")
            sys.exit(1)
    print("SUCCESS: All Module 3 audit events ('startup.register', 'startup.profile_update', 'DOCUMENT_UPLOAD') verified!")

    print("\n=== ALL 10 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_module3_tests()
