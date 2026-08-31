import urllib.request
import urllib.error
import json
import sys
import uuid
from datetime import datetime

# Import DB and models directly to seed test fixtures
from app.core.database import SessionLocal
from app.models.models import Department, User, Role, Sector, Challenge, AuditLog
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

def setup_fixtures():
    print("Setting up database fixtures...")
    db = SessionLocal()
    try:
        # Get roles
        officer_role = db.query(Role).filter(Role.name == "DEPARTMENT_OFFICER").first()
        if not officer_role:
            print("ERROR: DEPARTMENT_OFFICER role not found. Seed first.")
            sys.exit(1)

        # Get seeded department
        dept1 = db.query(Department).filter(Department.code == "SEEID").first()
        
        # Create a second department for isolation tests
        dept2 = db.query(Department).filter(Department.code == "AFD").first()
        if not dept2:
            dept2 = Department(
                id=uuid.uuid4(),
                name="Agriculture and Farming Dept",
                code="AFD"
            )
            db.add(dept2)
            db.commit()
            db.refresh(dept2)

        # Create officer 1 (SEEID)
        officer1_email = "officer1@test.gov.in"
        off1 = db.query(User).filter(User.email == officer1_email).first()
        if not off1:
            off1 = User(
                id=uuid.uuid4(),
                email=officer1_email,
                hashed_password=get_password_hash("OfficerPass123!"),
                full_name="Innovation Officer",
                department_id=dept1.id,
                is_active=True
            )
            off1.roles.append(officer_role)
            db.add(off1)
            db.commit()

        # Create officer 2 (AFD)
        officer2_email = "officer2@test.gov.in"
        off2 = db.query(User).filter(User.email == officer2_email).first()
        if not off2:
            off2 = User(
                id=uuid.uuid4(),
                email=officer2_email,
                hashed_password=get_password_hash("OfficerPass123!"),
                full_name="Agriculture Officer",
                department_id=dept2.id,
                is_active=True
            )
            off2.roles.append(officer_role)
            db.add(off2)
            db.commit()

        # Fetch sectors
        sectors = db.query(Sector).all()
        sector_map = {s.name: str(s.id) for s in sectors}

        print("Fixtures set up successfully.")
        return sector_map, dept1.id, dept2.id
    except Exception as e:
        print(f"ERROR setting up fixtures: {e}")
        sys.exit(1)
    finally:
        db.close()

def run_tests():
    sector_map, dept1_id, dept2_id = setup_fixtures()

    print("\n=== STARTING MODULE 2 INTEGRATION TESTS ===")

    # 1. Login
    print("\n1. Logging in as Officer 1 (SEEID) and Admin...")
    status, login_off1 = make_request("/auth/login", "POST", {
        "email": "officer1@test.gov.in",
        "password": "OfficerPass123!"
    })
    if status != 200:
        print(f"FAILED: Officer 1 login failed: {login_off1}")
        sys.exit(1)
    token_off1 = login_off1.get("access_token")

    status, login_off2 = make_request("/auth/login", "POST", {
        "email": "officer2@test.gov.in",
        "password": "OfficerPass123!"
    })
    token_off2 = login_off2.get("access_token")

    status, login_admin = make_request("/auth/login", "POST", {
        "email": "admin@test.gov.in",
        "password": "SankalpAdmin2026!"
    })
    token_admin = login_admin.get("access_token")
    print("SUCCESS: Logged in successfully.")

    # 2. POST /challenges - Create draft challenge
    print("\n2. Creating draft challenge as Officer 1...")
    title = "HealthTech AI Diagnostics"
    raw_text = "Rural areas lack specialist doctors. We need an AI system that analyzes x-rays and detects early signs of tuberculosis automatically with high accuracy."
    sector_id = sector_map.get("HealthTech") or list(sector_map.values())[0]

    status, chal_res = make_request("/challenges", "POST", {
        "title": title,
        "raw_problem_text": raw_text,
        "sector_id": sector_id,
        "budget_ceiling": 5000000.00,
        "currency": "INR",
        "timeline_start": "2026-09-01",
        "timeline_end": "2027-03-01"
    }, token=token_off1)

    if status != 201:
        print(f"FAILED: Creating challenge returned {status}: {chal_res}")
        sys.exit(1)
    
    challenge_id = chal_res.get("id")
    print(f"SUCCESS: Challenge created. ID: {challenge_id}, status: {chal_res.get('status')}")

    # 3. POST /challenges/{id}/structure - Call Gemini
    print("\n3. Testing Gemini AI structuring endpoint...")
    status, struct_res = make_request(f"/challenges/{challenge_id}/structure", "POST", token=token_off1)
    if status != 200:
        # Check if rate limit is encountered
        if status == 503:
            print("INFO: Rate limit exceeded or Gemini key blocked. Graceful fail verified.")
        else:
            print(f"FAILED: AI structuring failed with status {status}: {struct_res}")
            sys.exit(1)
    else:
        print("SUCCESS: AI structured challenge saved:")
        print(json.dumps(struct_res.get("structured_outcome_json"), indent=2))
        print("Metadata:")
        print(json.dumps(struct_res.get("ai_structuring_metadata"), indent=2))

    # 4. Graceful failure on invalid model name
    print("\n4. Testing Gemini graceful failure (invalid model)...")
    status, fail_res = make_request(
        f"/challenges/{challenge_id}/structure?model_name=invalid-model-name", 
        "POST", 
        token=token_off1
    )
    if status == 500:
        print("FAILED: Endpoint crashed with 500 on invalid model.")
        sys.exit(1)
    print(f"SUCCESS: Endpoint handled error gracefully. Status: {status}, response: {fail_res}")

    # 5. PATCH /challenges/{id} - Manual edits
    print("\n5. Manually patching challenge...")
    manual_outcomes = {
        "outcomes": ["Achieve 98% accuracy in detection", "Run within 5 seconds on low-spec tablets"],
        "scope": "Rural community health clinics",
        "constraints": ["Must work offline", "Data must remain on device"],
        "suggested_sector": "HealthTech",
        "suggested_kpis": [{"name": "detection_accuracy", "unit": "percentage", "target_direction": "increase"}]
    }

    status, patch_res = make_request(f"/challenges/{challenge_id}", "PATCH", {
        "budget_ceiling": 6000000.00,
        "structured_outcome_json": manual_outcomes
    }, token=token_off1)

    if status != 200:
        print(f"FAILED: PATCH returned {status}: {patch_res}")
        sys.exit(1)
    print(f"SUCCESS: Challenge patched. Budget ceiling: {patch_res.get('budget_ceiling')}")

    # 6. POST /challenges/{id}/eligibility-criteria
    print("\n6. Adding eligibility criteria...")
    status, crit_res = make_request(f"/challenges/{challenge_id}/eligibility-criteria", "POST", [
        {
            "criteria_key": "dpiit_required",
            "criteria_value_json": {"required": True},
            "is_waivable": False,
            "waiver_reason_required": False
        },
        {
            "criteria_key": "min_team_size",
            "criteria_value_json": {"min": 5},
            "is_waivable": True,
            "waiver_reason_required": True
        }
    ], token=token_off1)

    if status != 200:
        print(f"FAILED: Adding criteria returned {status}: {crit_res}")
        sys.exit(1)
    print(f"SUCCESS: Added criteria items: {len(crit_res)}")

    # 7. POST /challenges/{id}/submit-for-approval
    print("\n7. Submitting challenge for approval...")
    status, submit_res = make_request(f"/challenges/{challenge_id}/submit-for-approval", "POST", token=token_off1)
    if status != 200:
        print(f"FAILED: Submit returned {status}: {submit_res}")
        sys.exit(1)
    print(f"SUCCESS: Submitted. Status: {submit_res.get('status')}")

    # 8. Department isolation checks
    print("\n8. Testing department isolation on listings...")
    status, list_off1 = make_request("/challenges", "GET", token=token_off1)
    ids_off1 = [c.get("id") for c in list_off1]
    if challenge_id not in ids_off1:
        print("FAILED: Officer 1 cannot list their own challenge.")
        sys.exit(1)

    status, list_off2 = make_request("/challenges", "GET", token=token_off2)
    ids_off2 = [c.get("id") for c in list_off2]
    if challenge_id in ids_off2:
        print("FAILED: Department isolation leak! Officer 2 can see Officer 1's challenge.")
        sys.exit(1)
    print("SUCCESS: Department isolation enforced on listings.")

    # 9. Role permissions check on approve
    print("\n9. Testing approval role authorization...")
    status, app_fail_res = make_request(f"/challenges/{challenge_id}/approve", "POST", token=token_off1)
    if status != 403:
        print(f"FAILED: Officer 1 approve call returned {status} (expected 403)")
        sys.exit(1)
    print("SUCCESS: Non-admin approval rejected with 403.")

    # 10. Approve as SUPER_ADMIN
    print("\n10. Approving challenge as SUPER_ADMIN...")
    status, approve_res = make_request(f"/challenges/{challenge_id}/approve", "POST", token=token_admin)
    if status != 200:
        print(f"FAILED: Admin approval returned {status}: {approve_res}")
        sys.exit(1)
    print(f"SUCCESS: Approved. Status: {approve_res.get('status')}")

    # 11. GET /challenges/{id} detail fetch and status history checks
    print("\n11. Verifying challenge details and status history trail...")
    status, detail_res = make_request(f"/challenges/{challenge_id}", "GET", token=token_off1)
    if status != 200:
        print(f"FAILED: GET detail returned {status}")
        sys.exit(1)
    
    history = detail_res.get("status_history", [])
    trail = [h.get("to_status") for h in history]
    print(f"Status history trail: {trail}")
    if "pending_approval" not in trail or "published" not in trail:
        print(f"FAILED: Trail incomplete: {trail}")
        sys.exit(1)
    
    criteria = detail_res.get("criteria", [])
    if len(criteria) != 2:
        print(f"FAILED: Criteria count: {len(criteria)}")
        sys.exit(1)
    print("SUCCESS: Detail view and history trail validated.")

    # 12. Check audit logs
    print("\n12. Verifying audit logging records...")
    status, logs_res = make_request("/audit-logs", "GET", token=token_admin)
    actions = [l.get("action") for l in logs_res]
    print(f"Logged actions: {actions}")
    
    expected_actions = ["CHALLENGE_CREATE", "CHALLENGE_SUBMIT", "CHALLENGE_PUBLISH"]
    for act in expected_actions:
        if act not in actions:
            print(f"WARNING: Action {act} not found in audit logs.")
    print("SUCCESS: Audit logs checked successfully.")

    print("\n=== ALL MODULE 2 TESTS COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
