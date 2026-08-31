import urllib.request
import urllib.error
import json
import sys
import uuid
from datetime import datetime, date, timedelta

from app.core.database import SessionLocal
from app.models.models import (
    Department, User, Role, Sector, Challenge, Startup, ChallengeApplication,
    EvaluationPanel, EvaluationScore, EvaluationCriteria, Pilot, PilotMilestone, PilotKPI, PilotKPIMeasurement,
    ProcurementDecision, AuditLog
)
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


def create_user(email, password, full_name, role_name, dept_code="INNOV"):
    db = SessionLocal()
    try:
        dept = db.query(Department).filter(Department.code == dept_code).first()
        if not dept:
            dept = Department(id=uuid.uuid4(), name="Innovation Department", code=dept_code)
            db.add(dept)
            db.commit()
        dept_id = dept.id

        existing = db.query(User).filter(User.email == email).first()
        if existing:
            status, login_res = make_request("/auth/login", "POST", {"email": email, "password": password})
            return login_res.get("access_token"), str(existing.id)

        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(id=uuid.uuid4(), name=role_name, description=f"{role_name} role")
            db.add(role)
            db.commit()

        u = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            department_id=dept_id,
            is_active=True
        )
        u.roles.append(role)
        db.add(u)
        db.commit()
        user_id = str(u.id)
    finally:
        db.close()

    status, login_res = make_request("/auth/login", "POST", {"email": email, "password": password})
    return login_res.get("access_token"), user_id


def run_module8_tests():
    print("\n=== STARTING MODULE 8 ACCEPTANCE VERIFICATION TESTS ===")

    # -------------------------------------------------------------------
    # CRITERION 1: Database Migration & Model Verification
    # -------------------------------------------------------------------
    print("\n[CRITERION 1] Testing ProcurementDecision database table & model verification...")
    db = SessionLocal()
    try:
        # Check procurement_decisions table query
        dec_count = db.query(ProcurementDecision).count()
        print(f"SUCCESS: procurement_decisions table exists in database. Existing decision rows: {dec_count}")
        sectors = db.query(Sector).all()
        sector_id = str(sectors[0].id) if sectors else str(uuid.uuid4())
    finally:
        db.close()

    # Logins
    status, login_admin1 = make_request("/auth/login", "POST", {
        "email": "admin@test.gov.in",
        "password": "SankalpAdmin2026!"
    })
    admin1_token = login_admin1.get("access_token")

    # Create distinct Super Admin 2 for Maker-Checker testing
    admin2_token, admin2_id = create_user("admin2_makerchecker@test.gov.in", "Admin2Pass123!", "Super Admin 2", "SUPER_ADMIN")

    # Create Officer
    officer_token, officer_id = create_user("officer_mod8@test.gov.in", "OfficerPass123!", "Mod8 Officer", "DEPARTMENT_OFFICER")

    # -------------------------------------------------------------------
    # CRITERION 2: Decision brief blocked if pilot isn't 'completed'
    # -------------------------------------------------------------------
    print("\n[CRITERION 2] Testing decision-brief blocked for uncompleted pilot...")
    # Create challenge, application, and active pilot
    status, chal_res = make_request("/challenges", "POST", {
        "title": "Smart Solar Energy Irrigation Systems",
        "raw_problem_text": "Solar powered micro irrigation pumps for dry agricultural land.",
        "sector_id": sector_id,
        "budget_ceiling": 5000000.00
    }, token=officer_token)
    chal1_id = chal_res.get("id")

    make_request(f"/challenges/{chal1_id}/structure", "POST", token=officer_token)
    make_request(f"/challenges/{chal1_id}/submit-for-approval", "POST", token=officer_token)
    make_request(f"/challenges/{chal1_id}/approve", "POST", token=admin1_token)

    # Register Startup
    status, reg_st = make_request("/auth/register-startup", "POST", {
        "email": f"st_m8_a_{uuid.uuid4().hex[:6]}@solar.com",
        "password": "StartupPass123!",
        "full_name": "Solar Founder",
        "startup_name": "SolarTech Irrigation",
        "registration_number": f"REG-M8-SOLAR-{uuid.uuid4().hex[:6]}",
        "sector_id": sector_id,
        "description": "Solar micro pumps."
    })
    startup_token = reg_st.get("access_token")

    status, app_res = make_request(f"/challenges/{chal1_id}/applications", "POST", token=startup_token)
    app1_id = app_res.get("id")
    make_request(f"/applications/{app1_id}/run-eligibility-check", "POST", token=officer_token)
    make_request(f"/applications/{app1_id}/shortlist", "POST", token=officer_token)

    # Configure criteria & panel to finalize panel
    crit_res = make_request(f"/challenges/{chal1_id}/evaluation-criteria", "POST", [
        {"name": "Technical Viability", "weight": 50.0, "max_score": 100.0},
        {"name": "Cost Effectiveness", "weight": 50.0, "max_score": 100.0}
    ], token=officer_token)[1]
    crit_id1 = crit_res[0]["id"]
    crit_id2 = crit_res[1]["id"]

    eval1_token, eval1_id = create_user("eval1_m8@test.gov.in", "EvalPass123!", "Evaluator 1", "EVALUATOR")
    panel_res = make_request("/panels", "POST", {
        "challenge_id": chal1_id,
        "name": "Solar Panel Board",
        "evaluator_user_ids": [eval1_id]
    }, token=admin1_token)[1]
    panel1_id = panel_res.get("id")

    make_request(f"/applications/{app1_id}/scores", "POST", {
        "scores": [
            {"criteria_id": crit_id1, "score": 85.0, "comments": "Good tech"},
            {"criteria_id": crit_id2, "score": 90.0, "comments": "Affordable"}
        ]
    }, token=eval1_token)
    make_request(f"/panels/{panel1_id}/finalize", "POST", token=admin1_token)

    # Select for pilot
    status, pilot1_res = make_request(f"/applications/{app1_id}/select-for-pilot", "POST", token=officer_token)
    pilot1_id = pilot1_res.get("id")

    # Attempt decision-brief on 'not_started' pilot -> 400
    status, brief_err = make_request(f"/pilots/{pilot1_id}/decision-brief", "GET", token=officer_token)
    if status != 400:
        print(f"FAILED: Expected status 400 for uncompleted pilot decision brief, got {status}: {brief_err}")
        sys.exit(1)
    print(f"SUCCESS: Decision brief correctly blocked with HTTP 400 for uncompleted pilot: {brief_err}")

    # Finalize contract & transition pilot to active, then complete
    make_request(f"/pilots/{pilot1_id}/draft-contract", "POST", token=officer_token)
    make_request(f"/pilots/{pilot1_id}", "PATCH", {"ip_ownership_terms": "Gov owns foreground IP", "data_ownership_terms": "Gov cloud hosting"}, token=officer_token)
    
    # Upload doc for contract
    url = f"{BASE_URL}/startups/me/documents"
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    headers = {"Authorization": f"Bearer {startup_token}", "Content-Type": f"multipart/form-data; boundary={boundary}"}
    body = f"--{boundary}\r\nContent-Disposition: form-data; name=\"doc_type\"\r\n\r\nincorporation_certificate\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"contract.txt\"\r\nContent-Type: text/plain\r\n\r\nSIGNED CONTRACT\r\n--{boundary}--\r\n".encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        doc1_id = json.loads(resp.read().decode("utf-8"))["id"]

    # Create mandatory milestone before finalizing contract
    make_request(f"/pilots/{pilot1_id}/milestones", "POST", {
        "title": "M1 Prototype Deployment",
        "description": "Field setup",
        "due_date": (date.today() + timedelta(days=30)).isoformat(),
        "payment_amount": 1000000.00
    }, token=officer_token)

    make_request(f"/pilots/{pilot1_id}", "PATCH", {"contract_document_id": doc1_id}, token=officer_token)
    status_fin, fin_res = make_request(f"/pilots/{pilot1_id}/finalize-contract", "POST", token=officer_token)
    if status_fin != 200:
        print(f"FAILED finalize-contract: {status_fin} -> {fin_res}")
        sys.exit(1)

    status_comp, comp_res = make_request(f"/pilots/{pilot1_id}/complete", "POST", token=officer_token)
    if status_comp != 200:
        print(f"FAILED complete pilot: {status_comp} -> {comp_res}")
        sys.exit(1)


    # -------------------------------------------------------------------
    # CRITERION 3: decision-brief returns real aggregated data
    # -------------------------------------------------------------------
    print("\n[CRITERION 3] Testing decision-brief aggregates real data across 4 modules...")
    status, brief_data = make_request(f"/pilots/{pilot1_id}/decision-brief", "GET", token=officer_token)
    if status != 200:
        print(f"FAILED decision-brief query: {status} -> {brief_data}")
        sys.exit(1)

    print("Decision Brief Aggregated Output Summary:")
    print(f" - Challenge Title: {brief_data['challenge']['title']}")
    print(f" - Startup Name: {brief_data['application_evaluation']['startup_name']} (Weighted Score: {brief_data['application_evaluation']['weighted_final_score']})")
    print(f" - Financial Budget: INR {brief_data['financial_breakdown']['pilot_budget']}")

    if brief_data['challenge']['title'] != "Smart Solar Energy Irrigation Systems":
        print(f"FAILED: Challenge title mismatch in decision brief!")
        sys.exit(1)
    if brief_data['application_evaluation']['startup_name'] != "SolarTech Irrigation":
        print(f"FAILED: Startup name mismatch in decision brief!")
        sys.exit(1)
    print("SUCCESS: decision-brief aggregated verified real data across Modules 2, 5, 6, and 7!")

    # -------------------------------------------------------------------
    # CRITERION 4: Proposing scale_up validation
    # -------------------------------------------------------------------
    print("\n[CRITERION 4] Testing scale_up decision validation (contract_value requirement)...")
    # Propose scale_up WITHOUT contract_value -> 400
    status, scale_fail = make_request(f"/pilots/{pilot1_id}/procurement-decision", "POST", {
        "decision": "scale_up",
        "justification": "High performance solar pumps."
    }, token=officer_token)
    if status != 400:
        print(f"FAILED: Expected 400 for scale_up without contract_value, got {status}: {scale_fail}")
        sys.exit(1)
    print(f"SUCCESS: Proposing scale_up without contract_value correctly rejected with HTTP 400: {scale_fail}")

    # Propose scale_up WITH contract_value & details -> 201
    status, scale_pass = make_request(f"/pilots/{pilot1_id}/procurement-decision", "POST", {
        "decision": "scale_up",
        "justification": "High performance solar pumps deployment across 5 districts.",
        "contract_value": 7500000.00,
        "scale_up_details": {"target_districts": 5, "units": 200}
    }, token=officer_token)
    if status != 201:
        print(f"FAILED Propose scale_up: {status} -> {scale_pass}")
        sys.exit(1)
    dec1_id = scale_pass.get("id")
    print(f"SUCCESS: Proposing scale_up with contract_value succeeded. Decision ID: {dec1_id}")

    # -------------------------------------------------------------------
    # CRITERION 5: DEPARTMENT_OFFICER approval blocked with 403
    # -------------------------------------------------------------------
    print("\n[CRITERION 5] Testing officer calling /approve is blocked with 403 Forbidden...")
    status, off_app_fail = make_request(f"/procurement-decisions/{dec1_id}/approve", "POST", token=officer_token)
    if status != 403:
        print(f"FAILED: Expected 403 for officer approve call, got {status}: {off_app_fail}")
        sys.exit(1)
    print(f"SUCCESS: Officer approval attempt correctly blocked with HTTP 403 Forbidden: {off_app_fail}")

    # -------------------------------------------------------------------
    # CRITERION 6: MAKER-CHECKER Rule on scale_up approval
    # -------------------------------------------------------------------
    print("\n[CRITERION 6] Testing MAKER-CHECKER Rule for scale_up approval...")
    # Propose a new scale_up decision using Admin 1 (as Proposer / Maker)
    # First send-back or clear dec1
    make_request(f"/procurement-decisions/{dec1_id}/send-back", "POST", {"comments": "Re-submitting under Admin 1 proposal."}, token=admin1_token)

    # Admin 1 proposes scale_up
    status, scale_admin1 = make_request(f"/pilots/{pilot1_id}/procurement-decision", "POST", {
        "decision": "scale_up",
        "justification": "Proposed by Admin 1 for state procurement.",
        "contract_value": 10000000.00,
        "scale_up_details": {"scope": "Statewide deployment"}
    }, token=admin1_token)
    dec_admin1_id = scale_admin1.get("id")

    # Admin 1 attempts to APPROVE their OWN scale_up proposal -> 409 Conflict
    status, same_admin_fail = make_request(f"/procurement-decisions/{dec_admin1_id}/approve", "POST", token=admin1_token)
    if status != 409:
        print(f"FAILED: Expected 409 for same-user scale_up approval, got {status}: {same_admin_fail}")
        sys.exit(1)
    print(f"SUCCESS: MAKER-CHECKER PROVED! Same-user scale_up approval rejected with HTTP 409 Conflict: {same_admin_fail}")

    # Admin 2 (DIFFERENT Super Admin / Checker) approves scale_up proposal -> 200 OK
    status, diff_admin_pass = make_request(f"/procurement-decisions/{dec_admin1_id}/approve", "POST", token=admin2_token)
    if status != 200:
        print(f"FAILED Dual-authorization scale_up approval: {status} -> {diff_admin_pass}")
        sys.exit(1)
    print(f"SUCCESS: Scale-up decision approved by DIFFERENT Super Admin (Admin 2). Final status: {diff_admin_pass.get('status')}")

    # -------------------------------------------------------------------
    # CRITERION 7: Multi-Pilot Challenge Closure Rule
    # -------------------------------------------------------------------
    print("\n[CRITERION 7] Testing Multi-Pilot Challenge Closure logic...")
    # Create Challenge 2 with TWO pilots
    status, chal2_res = make_request("/challenges", "POST", {
        "title": "Dual-Pilot AI Logistics Challenge",
        "raw_problem_text": "Automated drone delivery and fleet management.",
        "sector_id": sector_id,
        "budget_ceiling": 9000000.00
    }, token=officer_token)
    chal2_id = chal2_res.get("id")
    make_request(f"/challenges/{chal2_id}/structure", "POST", token=officer_token)
    make_request(f"/challenges/{chal2_id}/submit-for-approval", "POST", token=officer_token)
    make_request(f"/challenges/{chal2_id}/approve", "POST", token=admin1_token)

    # Register 2 Startups
    reg_st_b = make_request("/auth/register-startup", "POST", {
        "email": f"st_m8_b_{uuid.uuid4().hex[:6]}@drone.com",
        "password": "StartupPass123!",
        "full_name": "Drone B Founder",
        "startup_name": "DroneTech Alpha",
        "registration_number": f"REG-M8-DRB-{uuid.uuid4().hex[:6]}",
        "sector_id": sector_id,
        "description": "Drone delivery"
    })[1]
    st_b_token = reg_st_b.get("access_token")

    reg_st_c = make_request("/auth/register-startup", "POST", {
        "email": f"st_m8_c_{uuid.uuid4().hex[:6]}@drone.com",
        "password": "StartupPass123!",
        "full_name": "Drone C Founder",
        "startup_name": "DroneTech Beta",
        "registration_number": f"REG-M8-DRC-{uuid.uuid4().hex[:6]}",
        "sector_id": sector_id,
        "description": "Fleet management"
    })[1]
    st_c_token = reg_st_c.get("access_token")

    # Create evaluation criteria for Challenge 2
    crit_res2 = make_request(f"/challenges/{chal2_id}/evaluation-criteria", "POST", [
        {"name": "Drone Payload Capacity", "weight": 50.0, "max_score": 100.0},
        {"name": "Flight Range", "weight": 50.0, "max_score": 100.0}
    ], token=officer_token)[1]
    crit2_id1 = crit_res2[0]["id"]
    crit2_id2 = crit_res2[1]["id"]

    # Applications & Shortlisting
    app_b_id = make_request(f"/challenges/{chal2_id}/applications", "POST", token=st_b_token)[1]["id"]
    app_c_id = make_request(f"/challenges/{chal2_id}/applications", "POST", token=st_c_token)[1]["id"]

    make_request(f"/applications/{app_b_id}/run-eligibility-check", "POST", token=officer_token)
    make_request(f"/applications/{app_b_id}/shortlist", "POST", token=officer_token)

    make_request(f"/applications/{app_c_id}/run-eligibility-check", "POST", token=officer_token)
    make_request(f"/applications/{app_c_id}/shortlist", "POST", token=officer_token)

    # Finalize panel
    panel2_res = make_request("/panels", "POST", {
        "challenge_id": chal2_id,
        "name": "Drone Logistics Board",
        "evaluator_user_ids": [eval1_id]
    }, token=admin1_token)[1]
    panel2_id = panel2_res.get("id")

    make_request(f"/applications/{app_b_id}/scores", "POST", {"scores": [
        {"criteria_id": crit2_id1, "score": 90.0},
        {"criteria_id": crit2_id2, "score": 85.0}
    ]}, token=eval1_token)
    make_request(f"/applications/{app_c_id}/scores", "POST", {"scores": [
        {"criteria_id": crit2_id1, "score": 88.0},
        {"criteria_id": crit2_id2, "score": 82.0}
    ]}, token=eval1_token)
    status_p2_fin, p2_fin_res = make_request(f"/panels/{panel2_id}/finalize", "POST", token=admin1_token)
    if status_p2_fin != 200:
        print(f"FAILED panel2 finalize: {status_p2_fin} -> {p2_fin_res}")
        sys.exit(1)





    # Create Pilot 1 and Pilot 2
    p_b_id = make_request(f"/applications/{app_b_id}/select-for-pilot", "POST", token=officer_token)[1]["id"]
    p_c_id = make_request(f"/applications/{app_c_id}/select-for-pilot", "POST", token=officer_token)[1]["id"]

    # Finalize contract & complete both pilots
    make_request(f"/pilots/{p_b_id}/draft-contract", "POST", token=officer_token)
    make_request(f"/pilots/{p_b_id}", "PATCH", {"ip_ownership_terms": "Gov IP", "data_ownership_terms": "Gov Data"}, token=officer_token)
    make_request(f"/pilots/{p_b_id}/milestones", "POST", {"title": "M1 Drone Test", "due_date": (date.today() + timedelta(days=30)).isoformat(), "payment_amount": 500000.00}, token=officer_token)
    make_request(f"/pilots/{p_b_id}", "PATCH", {"contract_document_id": doc1_id}, token=officer_token)
    make_request(f"/pilots/{p_b_id}/finalize-contract", "POST", token=officer_token)
    make_request(f"/pilots/{p_b_id}/complete", "POST", token=officer_token)

    make_request(f"/pilots/{p_c_id}/draft-contract", "POST", token=officer_token)
    make_request(f"/pilots/{p_c_id}", "PATCH", {"ip_ownership_terms": "Gov IP", "data_ownership_terms": "Gov Data"}, token=officer_token)
    make_request(f"/pilots/{p_c_id}/milestones", "POST", {"title": "M1 Fleet Test", "due_date": (date.today() + timedelta(days=30)).isoformat(), "payment_amount": 500000.00}, token=officer_token)
    make_request(f"/pilots/{p_c_id}", "PATCH", {"contract_document_id": doc1_id}, token=officer_token)
    make_request(f"/pilots/{p_c_id}/finalize-contract", "POST", token=officer_token)
    make_request(f"/pilots/{p_c_id}/complete", "POST", token=officer_token)

    # Propose and Approve decision on Pilot 1 ONLY
    dec_p_b = make_request(f"/pilots/{p_b_id}/procurement-decision", "POST", {
        "decision": "scale_up",
        "justification": "Pilot 1 scaled up",
        "contract_value": 4000000.00,
        "scale_up_details": {"units": 50}
    }, token=officer_token)[1]["id"]
    make_request(f"/procurement-decisions/{dec_p_b}/approve", "POST", token=admin2_token)

    # Check Challenge 2 status -> MUST STILL BE 'published' (NOT closed)
    db = SessionLocal()
    try:
        ch2_db = db.query(Challenge).filter(Challenge.id == chal2_id).first()
        if ch2_db.status == "closed":
            print(f"FAILED: Challenge incorrectly closed after only 1 of 2 pilots was finalized!")
            sys.exit(1)
        print(f"SUCCESS: Challenge status is '{ch2_db.status}' (NOT closed) after Pilot 1 decision finalization!")
    finally:
        db.close()

    # Propose and Approve decision on Pilot 2
    dec_p_c = make_request(f"/pilots/{p_c_id}/procurement-decision", "POST", {
        "decision": "reject",
        "justification": "Pilot 2 rejected due to battery degradation."
    }, token=officer_token)[1]["id"]
    make_request(f"/procurement-decisions/{dec_p_c}/approve", "POST", token=admin1_token)

    # Check Challenge 2 status -> MUST NOW BE 'closed'!
    db = SessionLocal()
    try:
        ch2_db = db.query(Challenge).filter(Challenge.id == chal2_id).first()
        if ch2_db.status != "closed":
            print(f"FAILED: Expected challenge status 'closed', got '{ch2_db.status}'!")
            sys.exit(1)
        print(f"SUCCESS: Challenge status NOW correctly transitioned to 'closed' after ALL pilots finalized!")
    finally:
        db.close()

    # -------------------------------------------------------------------
    # CRITERION 8: Approving extend_pilot reactivates pilot
    # -------------------------------------------------------------------
    print("\n[CRITERION 8] Testing extend_pilot decision reactivates pilot...")
    # Create Challenge 3 with Pilot 3
    chal3_id = make_request("/challenges", "POST", {"title": "Extension Pilot Challenge", "raw_problem_text": "Ext text", "sector_id": sector_id}, token=officer_token)[1]["id"]
    make_request(f"/challenges/{chal3_id}/structure", "POST", token=officer_token)
    make_request(f"/challenges/{chal3_id}/submit-for-approval", "POST", token=officer_token)
    make_request(f"/challenges/{chal3_id}/approve", "POST", token=admin1_token)

    # Create evaluation criteria for Challenge 3
    crit_res3 = make_request(f"/challenges/{chal3_id}/evaluation-criteria", "POST", [
        {"name": "Extension Test Criteria", "weight": 100.0, "max_score": 100.0}
    ], token=officer_token)[1]
    crit3_id1 = crit_res3[0]["id"]

    app_ext_id = make_request(f"/challenges/{chal3_id}/applications", "POST", token=st_b_token)[1]["id"]
    make_request(f"/applications/{app_ext_id}/run-eligibility-check", "POST", token=officer_token)
    make_request(f"/applications/{app_ext_id}/shortlist", "POST", token=officer_token)

    panel3_id = make_request("/panels", "POST", {"challenge_id": chal3_id, "name": "Ext Board", "evaluator_user_ids": [eval1_id]}, token=admin1_token)[1]["id"]
    make_request(f"/applications/{app_ext_id}/scores", "POST", {"scores": [{"criteria_id": crit3_id1, "score": 92.0}]}, token=eval1_token)
    make_request(f"/panels/{panel3_id}/finalize", "POST", token=admin1_token)


    p_ext_id = make_request(f"/applications/{app_ext_id}/select-for-pilot", "POST", token=officer_token)[1]["id"]
    make_request(f"/pilots/{p_ext_id}/draft-contract", "POST", token=officer_token)
    make_request(f"/pilots/{p_ext_id}", "PATCH", {"ip_ownership_terms": "Gov IP", "data_ownership_terms": "Gov Data"}, token=officer_token)
    make_request(f"/pilots/{p_ext_id}/milestones", "POST", {"title": "M1 Ext Test", "due_date": (date.today() + timedelta(days=30)).isoformat(), "payment_amount": 500000.00}, token=officer_token)
    make_request(f"/pilots/{p_ext_id}", "PATCH", {"contract_document_id": doc1_id}, token=officer_token)
    make_request(f"/pilots/{p_ext_id}/finalize-contract", "POST", token=officer_token)
    make_request(f"/pilots/{p_ext_id}/complete", "POST", token=officer_token)

    # Propose extend_pilot
    ext_date = (date.today() + timedelta(days=90)).isoformat()
    dec_ext_id = make_request(f"/pilots/{p_ext_id}/procurement-decision", "POST", {
        "decision": "extend_pilot",
        "justification": "Extend pilot by 90 days for seasonal testing.",
        "extended_end_date": ext_date
    }, token=officer_token)[1]["id"]

    # Approve extend_pilot
    make_request(f"/procurement-decisions/{dec_ext_id}/approve", "POST", token=admin1_token)

    # Check pilot status -> 'active'
    db = SessionLocal()
    try:
        p_ext_db = db.query(Pilot).filter(Pilot.id == p_ext_id).first()
        if p_ext_db.status != "active":
            print(f"FAILED: Expected extended pilot status 'active', got '{p_ext_db.status}'!")
            sys.exit(1)
        if str(p_ext_db.end_date) != ext_date:
            print(f"FAILED: Expected pilot end_date '{ext_date}', got '{p_ext_db.end_date}'!")
            sys.exit(1)
        print(f"SUCCESS: extended_pilot approved! Pilot reactivated to 'active' status with updated end_date: {ext_date}")
    finally:
        db.close()

    # -------------------------------------------------------------------
    # CRITERION 9: send-back requires comments and preserves original row
    # -------------------------------------------------------------------
    print("\n[CRITERION 9] Testing send-back comments requirement & audit preservation...")
    # Complete p_ext_id again
    make_request(f"/pilots/{p_ext_id}/complete", "POST", token=officer_token)

    # Propose decision
    dec_sb_id = make_request(f"/pilots/{p_ext_id}/procurement-decision", "POST", {
        "decision": "terminate",
        "justification": "Attempted termination."
    }, token=officer_token)[1]["id"]

    # Call send-back WITHOUT comments -> 400
    status, sb_fail = make_request(f"/procurement-decisions/{dec_sb_id}/send-back", "POST", {"comments": "   "}, token=admin1_token)
    if status != 400:
        print(f"FAILED: Expected 400 for send-back without comments, got {status}: {sb_fail}")
        sys.exit(1)
    print(f"SUCCESS: send-back without comments correctly rejected with HTTP 400: {sb_fail}")

    # Call send-back WITH comments -> 200
    status, sb_pass = make_request(f"/procurement-decisions/{dec_sb_id}/send-back", "POST", {"comments": "Budget justification unclear."}, token=admin1_token)
    if status != 200 or sb_pass.get("status") != "sent_back":
        print(f"FAILED Send-back execution: {status} -> {sb_pass}")
        sys.exit(1)

    # Submit NEW proposal afterwards
    status, new_prop_res = make_request(f"/pilots/{p_ext_id}/procurement-decision", "POST", {
        "decision": "reject",
        "justification": "Fresh rejection proposal following sent-back feedback."
    }, token=officer_token)
    if status != 201:
        print(f"FAILED Submit new proposal after send-back: {status} -> {new_prop_res}")
        sys.exit(1)

    db = SessionLocal()
    try:
        old_row = db.query(ProcurementDecision).filter(ProcurementDecision.id == dec_sb_id).first()
        if old_row.status != "sent_back" or old_row.comments != "Budget justification unclear.":
            print(f"FAILED: Sent-back row was mutated or modified!")
            sys.exit(1)
        print("SUCCESS: Sent-back row preserved intact in DB with status='sent_back' & comments! New proposal created separately.")
    finally:
        db.close()

    # -------------------------------------------------------------------
    # CRITERION 10: lifecycle-summary end-to-end story
    # -------------------------------------------------------------------
    print("\n[CRITERION 10] Testing GET /challenges/{id}/lifecycle-summary...")
    status, life_res = make_request(f"/challenges/{chal2_id}/lifecycle-summary", "GET", token=officer_token)
    if status != 200:
        print(f"FAILED GET /challenges/{chal2_id}/lifecycle-summary: {status} -> {life_res}")
        sys.exit(1)

    print("Lifecycle Summary Story Output:")
    print(f" - Challenge Title: {life_res['title']} (Status: {life_res['status']})")
    print(f" - Total Applications: {life_res['eligibility_summary']['total_applications']}")
    print(f" - Pilots Count: {len(life_res['pilots'])}")

    if len(life_res['pilots']) != 2:
        print(f"FAILED: Expected 2 pilots in multi-pilot challenge lifecycle summary, got {len(life_res['pilots'])}")
        sys.exit(1)
    print("SUCCESS: lifecycle-summary returned full coherent story for multi-pilot challenge!")

    # -------------------------------------------------------------------
    # CRITERION 11: Audit log verification
    # -------------------------------------------------------------------
    print("\n[CRITERION 11] Testing audit logs for Module 8 actions...")
    status, audit_res = make_request("/audit-logs", "GET", token=admin1_token)
    actions = [a.get("action") for a in audit_res]
    print(f"Audit Actions Recorded: {set(actions)}")

    required_actions = [
        "procurement_decision.propose",
        "procurement_decision.approve",
        "procurement_decision.send_back"
    ]
    for act in required_actions:
        if act not in actions:
            print(f"FAILED: Required audit action '{act}' not found in audit logs!")
            sys.exit(1)
    print("SUCCESS: All Module 8 audit events ('procurement_decision.propose', 'procurement_decision.approve', 'procurement_decision.send_back') verified!")

    print("\n=== ALL 11 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_module8_tests()
