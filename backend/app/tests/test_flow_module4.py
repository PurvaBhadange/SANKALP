import urllib.request
import urllib.error
import json
import sys
import uuid
import os

from app.core.database import SessionLocal
from app.models.models import Department, User, Role, Sector, Challenge, Startup, ChallengeApplication, EligibilityCheckResult, AuditLog
from app.core.security import get_password_hash

BASE_URL = "http://127.0.0.1:8000"

def make_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if data is not None:
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

def run_module4_tests():
    print("\n=== STARTING MODULE 4 ACCEPTANCE VERIFICATION TESTS ===")

    db = SessionLocal()
    try:
        sectors = db.query(Sector).all()
        sector_map = {s.name: str(s.id) for s in sectors}
        agri_sector = sector_map.get("AgriTech") or list(sector_map.values())[0]
    finally:
        db.close()

    # 1. Login Admin & Officer
    print("\n[CRITERION 1 & Setup] Logging in Admin and Officer...")
    status, login_admin = make_request("/auth/login", "POST", {
        "email": "admin@test.gov.in",
        "password": "SankalpAdmin2026!"
    })
    if status != 200:
        print(f"FAILED Admin login: {login_admin}")
        sys.exit(1)
    admin_token = login_admin.get("access_token")

    status, login_off = make_request("/auth/login", "POST", {
        "email": "officer1@test.gov.in",
        "password": "OfficerPass123!"
    })
    if status != 200:
        db_s = SessionLocal()
        try:
            dept_obj = db_s.query(Department).filter(Department.code == "SEEID").first()
            dept_id_val = str(dept_obj.id) if dept_obj else None
        finally:
            db_s.close()

        make_request("/users", "POST", {
            "email": "officer1@test.gov.in",
            "password": "OfficerPass123!",
            "full_name": "Innovation Officer",
            "role_names": ["DEPARTMENT_OFFICER"],
            "department_id": dept_id_val
        }, token=admin_token)

        status, login_off = make_request("/auth/login", "POST", {
            "email": "officer1@test.gov.in",
            "password": "OfficerPass123!"
        })

    officer_token = login_off.get("access_token")


    print("SUCCESS: Admin & Officer logged in.")

    # Create published challenge with eligibility criteria (min_team_size = 5, dpiit_required = true)
    status, chal_pub = make_request("/challenges", "POST", {
        "title": "Smart Agricultural Crop Diagnostics Platform",
        "raw_problem_text": "We need AI computer vision models to diagnose crop diseases and estimate soil moisture levels automatically.",
        "sector_id": agri_sector,
        "budget_ceiling": 5000000.00,
        "currency": "INR"
    }, token=officer_token)
    pub_chal_id = chal_pub.get("id")

    # Add eligibility criteria
    status_c1, res_c1 = make_request(f"/challenges/{pub_chal_id}/eligibility-criteria", "POST", [{
        "criteria_key": "min_team_size",
        "criteria_value_json": {"value": 5},
        "is_waivable": True,
        "waiver_reason_required": True
    }], token=officer_token)
    if status_c1 != 200:
        print(f"FAILED add criteria 1: {status_c1} -> {res_c1}")
        sys.exit(1)

    status_c2, res_c2 = make_request(f"/challenges/{pub_chal_id}/eligibility-criteria", "POST", [{
        "criteria_key": "dpiit_required",
        "criteria_value_json": {"required": True},
        "is_waivable": True,
        "waiver_reason_required": True
    }], token=officer_token)
    if status_c2 != 200:
        print(f"FAILED add criteria 2: {status_c2} -> {res_c2}")
        sys.exit(1)

    # Structure, submit, approve -> published
    make_request(f"/challenges/{pub_chal_id}/structure", "POST", token=officer_token)
    make_request(f"/challenges/{pub_chal_id}/submit-for-approval", "POST", token=officer_token)
    make_request(f"/challenges/{pub_chal_id}/approve", "POST", token=admin_token)

    # Create draft challenge
    status, chal_draft = make_request("/challenges", "POST", {
        "title": "Draft Internal Logistics Challenge",
        "raw_problem_text": "Draft text",
        "sector_id": agri_sector,
        "budget_ceiling": 1000000.00
    }, token=officer_token)
    draft_chal_id = chal_draft.get("id")

    # Register Startup A (Fully Compliant + Document Uploaded)
    reg_num_a = f"REG-FULL-{uuid.uuid4().hex[:6]}"
    dpiit_a = f"DPIIT-888999-{uuid.uuid4().hex[:4]}"
    status, reg_a = make_request("/auth/register-startup", "POST", {
        "email": f"st_a_{uuid.uuid4().hex[:6]}@agriai.com",
        "password": "StartupPass123!",
        "full_name": "AgriAI Founder",
        "startup_name": "AgriAI Systems",
        "registration_number": reg_num_a,
        "dpiit_recognition_number": dpiit_a,
        "sector_id": agri_sector,
        "description": "We specialize in computer vision models for automated crop diagnostics."
    })
    token_a = reg_a.get("access_token")

    # Update profile to complete team size and dpiit recognition number
    make_request("/startups/me", "PATCH", {
        "team_size": 15,
        "dpiit_recognition_number": dpiit_a,
        "description": "Computer vision models and autonomous drones for crop disease diagnosis."
    }, token=token_a)

    # Upload DPIIT Certificate for Startup A
    upload_startup_document(token_a, "incorporation_certificate", f"DPIIT RECOGNITION CERTIFICATE FOR AGRIAI SYSTEMS. DPIIT NUMBER: {dpiit_a}", "dpiit_cert.txt")

    # Register Startup B (Missing Document, but team size OK)
    reg_num_b = f"REG-NODOC-{uuid.uuid4().hex[:6]}"
    dpiit_b = f"DPIIT-111222-{uuid.uuid4().hex[:4]}"
    status, reg_b = make_request("/auth/register-startup", "POST", {
        "email": f"st_b_{uuid.uuid4().hex[:6]}@nodoc.com",
        "password": "StartupPass123!",
        "full_name": "NoDoc Founder",
        "startup_name": "NoDoc Corp",
        "registration_number": reg_num_b,
        "dpiit_recognition_number": dpiit_b,
        "sector_id": agri_sector,
        "description": "No doc company."
    })
    token_b = reg_b.get("access_token")
    make_request("/startups/me", "PATCH", {"team_size": 10}, token=token_b)
    # NOTE: Startup B purposefully uploads NO documents!

    # 2. STARTUP_USER applies to a published challenge successfully; ai_match_score is captured
    print("\n[CRITERION 2] Testing application submission to published challenge...")
    status, app_a_res = make_request(f"/challenges/{pub_chal_id}/applications", "POST", token=token_a)
    if status != 201:
        print(f"FAILED Apply Startup A: {status} -> {app_a_res}")
        sys.exit(1)

    app_a_id = app_a_res.get("id")
    match_score_a = app_a_res.get("ai_match_score")
    print(f"SUCCESS: Application submitted by Startup A. Application ID: {app_a_id}, AI Match Score Captured: {match_score_a}%")

    # 3. Duplicate application returns 409 Conflict
    print("\n[CRITERION 3] Testing duplicate application returns 409 Conflict...")
    status, dup_app_res = make_request(f"/challenges/{pub_chal_id}/applications", "POST", token=token_a)
    if status != 409:
        print(f"FAILED: Expected 409 Conflict for duplicate application, got {status}: {dup_app_res}")
        sys.exit(1)
    print(f"SUCCESS: Duplicate application correctly rejected with HTTP 409 Conflict: {dup_app_res}")

    # 4. Applying to draft challenge is rejected
    print("\n[CRITERION 4] Testing applying to non-published (draft) challenge is rejected...")
    status, draft_app_res = make_request(f"/challenges/{draft_chal_id}/applications", "POST", token=token_a)
    if status != 400:
        print(f"FAILED: Expected status 400 for draft challenge application, got {status}: {draft_app_res}")
        sys.exit(1)
    print(f"SUCCESS: Draft challenge application correctly rejected with HTTP 400 Bad Request: {draft_app_res}")

    # 5. Running eligibility check for fully compliant Startup A -> Auto-Pass (final_passed=True, checked_by=NULL)
    print("\n[CRITERION 5] Testing eligibility check for fully compliant startup (Auto-Pass)...")
    status, check_a_res = make_request(f"/applications/{app_a_id}/run-eligibility-check", "POST", token=officer_token)
    if status != 200:
        print(f"FAILED Run eligibility check for Startup A: {status} -> {check_a_res}")
        sys.exit(1)

    db = SessionLocal()
    try:
        results_a = db.query(EligibilityCheckResult).filter(EligibilityCheckResult.application_id == app_a_id).all()
        for r in results_a:
            print(f" - Criteria: {r.criteria_id} | Rules Passed: {r.rules_engine_passed} | AI Passed: {r.ai_verification_passed} | Final Passed: {r.final_passed} | Checked By: {r.checked_by}")
            if r.final_passed is not True:
                print(f"FAILED: Criteria {r.criteria_id} did not auto-pass!")
                sys.exit(1)
            if r.checked_by is not None:
                print(f"FAILED: Auto-pass checked_by should be NULL, got {r.checked_by}")
                sys.exit(1)
        print("SUCCESS: All criteria auto-passed (final_passed=True, checked_by=NULL) for fully compliant startup!")
    finally:
        db.close()

    # 6. Running eligibility check for Startup B (MISSING DOCUMENT) -> ai_verification_passed=False, final_passed=NULL
    print("\n[CRITERION 6] Testing eligibility check for startup MISSING required document...")
    status, app_b_res = make_request(f"/challenges/{pub_chal_id}/applications", "POST", token=token_b)
    app_b_id = app_b_res.get("id")

    status, check_b_res = make_request(f"/applications/{app_b_id}/run-eligibility-check", "POST", token=officer_token)
    if status != 200:
        print(f"FAILED Run eligibility check for Startup B: {status} -> {check_b_res}")
        sys.exit(1)

    db = SessionLocal()
    try:
        dpiit_crit_id = None
        results_b = db.query(EligibilityCheckResult).filter(EligibilityCheckResult.application_id == app_b_id).all()
        for r in results_b:
            if r.criteria.criteria_key in ["dpiit_required", "dpiit_recognition"]:
                dpiit_crit_id = r.criteria_id
                print(f" - DPIIT Criteria Check -> Rules: {r.rules_engine_passed}, AI Verification Passed: {r.ai_verification_passed}, AI Result: {r.ai_verification_result}, Final Passed: {r.final_passed}")
                if r.ai_verification_passed is not False:
                    print(f"FAILED: Expected ai_verification_passed=False for missing document, got {r.ai_verification_passed}")
                    sys.exit(1)
                if r.final_passed is not None:
                    print(f"FAILED: Expected final_passed=NULL (flagged for review), got {r.final_passed}")
                    sys.exit(1)
        print("SUCCESS: Missing document correctly flagged criteria with ai_verification_passed=False and final_passed=NULL (NOT silently rubber-stamped)!")
    finally:
        db.close()

    # 8. Attempting to shortlist Startup B prior to waiver override -> BLOCKED with 400
    print("\n[CRITERION 8] Testing shortlisting guard blocks application with unresolved criteria...")
    status, shortlist_fail = make_request(f"/applications/{app_b_id}/shortlist", "POST", token=officer_token)
    if status != 400:
        print(f"FAILED: Expected 400 for shortlisting unresolved application, got {status}: {shortlist_fail}")
        sys.exit(1)
    print(f"SUCCESS: Shortlisting correctly blocked with HTTP 400 detailing unresolved criteria: {shortlist_fail}")

    # 7. Human officer overrides flagged criteria via PATCH with waiver + justification -> checked_by set to officer's ID
    print("\n[CRITERION 7] Testing human officer waiver override (PATCH)...")
    db = SessionLocal()
    try:
        off_user = db.query(User).filter(User.email == "officer1@test.gov.in").first()
        officer_user_id = str(off_user.id)
    finally:
        db.close()

    status, override_res = make_request(f"/applications/{app_b_id}/eligibility/{dpiit_crit_id}", "PATCH", {
        "waived": True,
        "waiver_justification": "Startup possesses active state IT registration waiver while DPIIT central certificate is pending approval."
    }, token=officer_token)

    if status != 200:
        print(f"FAILED Waiver override: {status} -> {override_res}")
        sys.exit(1)

    checked_by_res = override_res.get("checked_by")
    if checked_by_res != officer_user_id:
        print(f"FAILED: checked_by should be set to officer user ID {officer_user_id}, got {checked_by_res}")
        sys.exit(1)
    print(f"SUCCESS: Criteria waived by officer. checked_by correctly populated with Officer User ID: {checked_by_res}")

    # 9. Shortlisting Startup B AFTER waiver override -> SUCCEEDS
    print("\n[CRITERION 9] Testing shortlisting succeeds after waiver override...")
    status, shortlist_pass = make_request(f"/applications/{app_b_id}/shortlist", "POST", token=officer_token)
    if status != 200:
        print(f"FAILED Shortlist after waiver: {status} -> {shortlist_pass}")
        sys.exit(1)
    print(f"SUCCESS: Shortlisting succeeded. Status: {shortlist_pass.get('status')}")

    # 10. GET /startups/me/applications shows correct status for startup's view
    print("\n[CRITERION 10] Testing GET /startups/me/applications...")
    status, my_apps = make_request("/startups/me/applications", "GET", token=token_b)
    if status != 200 or len(my_apps) == 0:
        print(f"FAILED GET /startups/me/applications: {status} -> {my_apps}")
        sys.exit(1)
    st_app_status = my_apps[0].get("status")
    if st_app_status != "shortlisted":
        print(f"FAILED: Expected status shortlisted in startup view, got {st_app_status}")
        sys.exit(1)
    print(f"SUCCESS: Startup view correctly reflects application status: '{st_app_status}'")

    # 11. Audit log verification
    print("\n[CRITERION 11] Testing audit logs for Module 4 actions...")
    status, audit_res = make_request("/audit-logs", "GET", token=admin_token)
    actions = [a.get("action") for a in audit_res]
    print(f"Audit Actions Recorded: {set(actions)}")

    required_actions = [
        "application.submit",
        "application.eligibility_check",
        "application.eligibility_override",
        "application.shortlist"
    ]
    for act in required_actions:
        if act not in actions:
            print(f"FAILED: Audit action '{act}' not found in audit logs!")
            sys.exit(1)
    print("SUCCESS: All Module 4 audit events ('application.submit', 'application.eligibility_check', 'application.eligibility_override', 'application.shortlist') verified!")

    print("\n=== ALL 11 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_module4_tests()
