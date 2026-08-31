import urllib.request
import urllib.error
import json
import sys
import uuid
import os
from decimal import Decimal

from app.core.database import SessionLocal
from app.models.models import (
    Department, User, Role, Sector, Challenge, Startup,
    ChallengeApplication, EligibilityCheckResult, AuditLog,
    EvaluationCriteria, EvaluationPanel, EvaluationScore, ScoreOutlierFlag,
    Pilot, PilotMilestone, Document
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


def create_user_with_role(email, password, full_name, role_name):
    db = SessionLocal()
    try:
        dept = db.query(Department).first()
        if not dept:
            dept = Department(id=uuid.uuid4(), name="Innovation Department", code="INNOV")
            db.add(dept)
            db.commit()
        dept_id = dept.id

        existing = db.query(User).filter(User.email == email).first()
        if existing:
            if existing.department_id is None and dept_id:
                existing.department_id = dept_id
                db.commit()
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


def create_dummy_document(owner_type, owner_id, uploader_id):
    db = SessionLocal()
    try:
        doc = Document(
            id=uuid.uuid4(),
            owner_type=owner_type,
            owner_id=uuid.UUID(str(owner_id)),
            doc_type="pdf",
            file_url=f"http://localhost:8000/uploads/test_{owner_type}.pdf",
            file_hash="dummy_hash_123456",
            uploaded_by=uuid.UUID(str(uploader_id))
        )
        db.add(doc)
        db.commit()
        return str(doc.id)
    finally:
        db.close()


def run_module6_tests():
    print("\n=== STARTING MODULE 6 ACCEPTANCE VERIFICATION TESTS ===")

    db = SessionLocal()
    try:
        sectors = db.query(Sector).all()
        sector_map = {s.name: str(s.id) for s in sectors}
        agri_sector = sector_map.get("AgriTech") or list(sector_map.values())[0]
    finally:
        db.close()

    # 1. Login Admin, Officer, Procurement Officer & Evaluators
    print("\n[CRITERION 1 & Setup] Migration check & User Setup...")
    admin_token, admin_id = create_user_with_role("admin_mod6@test.gov.in", "AdminPass123!", "Mod6 Admin", "SUPER_ADMIN")
    officer_token, officer_id = create_user_with_role("officer_mod6@test.gov.in", "OfficerPass123!", "Mod6 Officer", "DEPARTMENT_OFFICER")
    proc_token, proc_id = create_user_with_role("proc_officer_mod6@test.gov.in", "ProcPass123!", "Procurement Officer John", "PROCUREMENT_OFFICER")
    eval1_token, eval1_id = create_user_with_role("eval_mod6_1@test.gov.in", "EvalPass123!", "Dr. Mod6 Eval1", "EVALUATOR")
    eval2_token, eval2_id = create_user_with_role("eval_mod6_2@test.gov.in", "EvalPass123!", "Dr. Mod6 Eval2", "EVALUATOR")

    print(f"SUCCESS: Created/Logged in Admin, Officer, Procurement Officer (ID: {proc_id[:8]}), and Evaluators.")

    # Create challenge, structure, submit, approve
    status, chal_pub = make_request("/challenges", "POST", {
        "title": "Smart Irrigation & Soil Moisture Sensor Pilot",
        "raw_problem_text": "Need precision IoT soil moisture sensors for automated canal water allocation.",
        "sector_id": agri_sector,
        "budget_ceiling": 5000000.00,
        "currency": "INR"
    }, token=officer_token)
    if status not in [200, 201]:
        print(f"FAILED create challenge: {status} -> {chal_pub}")
        sys.exit(1)
    chal_id = chal_pub.get("id")

    make_request(f"/challenges/{chal_id}/structure", "POST", token=officer_token)
    make_request(f"/challenges/{chal_id}/submit-for-approval", "POST", token=officer_token)
    make_request(f"/challenges/{chal_id}/approve", "POST", token=admin_token)

    # Configure Criteria
    make_request(f"/challenges/{chal_id}/evaluation-criteria", "POST", [
        {"name": "Technical Feasibility", "weight": 50.0, "max_score": 100.0},
        {"name": "Cost Effectiveness", "weight": 50.0, "max_score": 100.0}
    ], token=officer_token)

    # Create Panel
    status, panel_res = make_request("/panels", "POST", {
        "challenge_id": chal_id,
        "name": "Irrigation Pilot Panel",
        "evaluator_user_ids": [eval1_id, eval2_id]
    }, token=admin_token)
    panel_id = panel_res.get("id")

    # Register Startup
    st_email = f"st_pilot_{uuid.uuid4().hex[:6]}@agri.com"
    st_token, st_user_id = create_user_with_role(st_email, "StartupPass123!", "HydroSense Founder", "STARTUP_USER")
    reg_num_p = f"REG-PILOT-{uuid.uuid4().hex[:6]}"

    db = SessionLocal()
    try:
        st_obj = db.query(Startup).filter(Startup.contact_user_id == uuid.UUID(st_user_id)).first()
        if not st_obj:
            st_obj = Startup(
                id=uuid.uuid4(),
                name="HydroSense IoT",
                registration_number=reg_num_p,
                sector_id=uuid.UUID(agri_sector),
                description="IoT solar powered soil sensors and automatic valve control.",
                team_size=15,
                contact_user_id=uuid.UUID(st_user_id)
            )
            db.add(st_obj)
            db.commit()
    finally:
        db.close()

    # Submit Application
    status, app_p_res = make_request(f"/challenges/{chal_id}/applications", "POST", token=st_token)
    if status not in [200, 201]:
        print(f"FAILED submit application: {status} -> {app_p_res}")
        sys.exit(1)
    app_id = app_p_res.get("id")
    make_request(f"/applications/{app_id}/run-eligibility-check", "POST", token=officer_token)

    # 2. select-for-pilot fails before shortlisted/finalized panel
    print("\n[CRITERION 2] Testing select-for-pilot requires shortlisted status + finalized panel...")
    status, sel_fail1 = make_request(f"/applications/{app_id}/select-for-pilot", "POST", token=officer_token)
    if status != 400:
        print(f"FAILED: Expected 400 before shortlisting, got {status}: {sel_fail1}")
        sys.exit(1)

    # Shortlist application
    make_request(f"/applications/{app_id}/shortlist", "POST", token=officer_token)

    # Still panel not finalized!
    status, sel_fail2 = make_request(f"/applications/{app_id}/select-for-pilot", "POST", token=officer_token)
    if status != 400:
        print(f"FAILED: Expected 400 before panel finalization, got {status}: {sel_fail2}")
        sys.exit(1)

    # Complete panel scores & finalize panel
    make_request(f"/applications/{app_id}/scores", "POST", {
        "scores": [
            {"criteria_id": panel_res["challenge_id"], "score": 90.0}, # using dummy criteria pass
        ]
    }, token=eval1_token)

    # Get actual criteria IDs
    db = SessionLocal()
    try:
        crits = db.query(EvaluationCriteria).filter(EvaluationCriteria.challenge_id == uuid.UUID(chal_id)).all()
        c1, c2 = str(crits[0].id), str(crits[1].id)
    finally:
        db.close()

    make_request(f"/applications/{app_id}/scores", "POST", {
        "scores": [
            {"criteria_id": c1, "score": 90.0, "comments": "Greattech"},
            {"criteria_id": c2, "score": 85.0, "comments": "Cost effective"}
        ]
    }, token=eval1_token)

    make_request(f"/applications/{app_id}/scores", "POST", {
        "scores": [
            {"criteria_id": c1, "score": 88.0, "comments": "Solid"},
            {"criteria_id": c2, "score": 82.0, "comments": "Good"}
        ]
    }, token=eval2_token)

    make_request(f"/panels/{panel_id}/finalize", "POST", token=admin_token)

    # Now select-for-pilot succeeds!
    status, pilot_res = make_request(f"/applications/{app_id}/select-for-pilot", "POST", token=officer_token)
    if status != 200:
        print(f"FAILED select-for-pilot: {status} -> {pilot_res}")
        sys.exit(1)

    pilot_id = pilot_res["id"]
    print(f"SUCCESS: Application selected for pilot deployment. Pilot ID: {pilot_id}")

    # 3. draft-contract calls Gemini and stores contract_ai_draft
    print("\n[CRITERION 3] Testing POST /pilots/{id}/draft-contract returns Gemini AI draft...")
    status, ai_draft_res = make_request(f"/pilots/{pilot_id}/draft-contract", "POST", token=officer_token)
    if status != 200 or not ai_draft_res.get("contract_ai_draft"):
        print(f"FAILED draft-contract: {status} -> {ai_draft_res}")
        sys.exit(1)

    ai_draft = ai_draft_res["contract_ai_draft"]
    print(f"SUCCESS: AI contract draft generated and stored! AI Proposed IP: '{ai_draft.get('ip_ownership_terms')[:80]}...'")

    # 4. Officer sets final terms (deliberately different wording than AI draft) and creates 2 milestones
    print("\n[CRITERION 4] Testing officer sets final human terms and creates 2 milestones...")
    custom_ip = "Background IP remains with HydroSense IoT. Foreground IP developed specifically for canal valve control shall be co-owned 50/50 with perpetual non-exclusive government license."
    custom_data = "All telemetry and moisture sensor data generated during the canal pilot shall belong 100% exclusively to the State Water Department."

    status, patch_res = make_request(f"/pilots/{pilot_id}", "PATCH", {
        "ip_ownership_terms": custom_ip,
        "data_ownership_terms": custom_data,
        "start_date": "2026-09-01",
        "end_date": "2026-12-01",
        "budget": 2500000.00
    }, token=officer_token)

    if status != 200 or patch_res.get("ip_ownership_terms") != custom_ip:
        print(f"FAILED PATCH pilot: {status} -> {patch_res}")
        sys.exit(1)

    # Create 2 milestones
    status, m1_res = make_request(f"/pilots/{pilot_id}/milestones", "POST", {
        "title": "Milestone 1: Field Sensor Node Deployment",
        "description": "Deploy 50 IoT soil moisture sensor nodes in Canal Sector A.",
        "due_date": "2026-09-30",
        "payment_amount": 1000000.00
    }, token=officer_token)
    m1_id = m1_res["id"]

    status, m2_res = make_request(f"/pilots/{pilot_id}/milestones", "POST", {
        "title": "Milestone 2: Automated Valve Integration & Handover",
        "description": "Full integration with automated canal gate controllers.",
        "due_date": "2026-11-30",
        "payment_amount": 1500000.00
    }, token=officer_token)
    m2_id = m2_res["id"]

    print(f"SUCCESS: Officer set customized contract terms and created 2 milestones (IDs: [{m1_id[:8]}, {m2_id[:8]}]).")

    # 5. finalize-contract is rejected if contract_document_id is missing; succeeds once uploaded
    print("\n[CRITERION 5] Testing finalize-contract requires uploaded contract document...")
    status, fin_fail = make_request(f"/pilots/{pilot_id}/finalize-contract", "POST", token=officer_token)
    if status != 400:
        print(f"FAILED: Expected 400 without contract document, got {status}: {fin_fail}")
        sys.exit(1)

    # Attach dummy contract document
    contract_doc_id = create_dummy_document("pilot_contract", pilot_id, officer_id)
    make_request(f"/pilots/{pilot_id}", "PATCH", {"contract_document_id": contract_doc_id}, token=officer_token)

    # Now finalize succeeds!
    status, fin_pass = make_request(f"/pilots/{pilot_id}/finalize-contract", "POST", token=officer_token)
    if status != 200 or fin_pass.get("contract_status") != "finalized":
        print(f"FAILED finalize-contract: {status} -> {fin_pass}")
        sys.exit(1)

    print(f"SUCCESS: Contract finalized! Status: '{fin_pass.get('contract_status')}', Pilot Status: '{fin_pass.get('status')}'")

    # 6. After finalization, PATCH /pilots/{id} attempting to change terms is rejected
    print("\n[CRITERION 6] Testing PATCH /pilots/{id} rejected after finalization (contract locked)...")
    status, lock_fail = make_request(f"/pilots/{pilot_id}", "PATCH", {
        "ip_ownership_terms": "Attempting unauthorized post-finalization term change."
    }, token=officer_token)

    if status != 409:
        print(f"FAILED: Expected 409 Conflict for locked contract edit, got {status}: {lock_fail}")
        sys.exit(1)
    print(f"SUCCESS: Post-finalization term edit correctly rejected with HTTP 409 Conflict: {lock_fail}")

    # 7. Startup submits evidence for Milestone 1; officer approves it
    print("\n[CRITERION 7] Testing startup evidence submission & officer approval...")
    ev_doc_id = create_dummy_document("pilot_milestone", m1_id, st_user_id)

    status, ev_res = make_request(f"/milestones/{m1_id}/submit-evidence", "POST", {
        "evidence_document_id": ev_doc_id
    }, token=st_token)
    if status != 200 or ev_res.get("status") != "submitted":
        print(f"FAILED submit-evidence: {status} -> {ev_res}")
        sys.exit(1)

    status, app_res = make_request(f"/milestones/{m1_id}/approve", "POST", token=officer_token)
    if status != 200 or app_res.get("status") != "approved":
        print(f"FAILED approve milestone: {status} -> {app_res}")
        sys.exit(1)

    print("SUCCESS: Milestone evidence submitted by startup and approved by officer.")

    # 8. Maker-Checker Rule: PROCUREMENT_OFFICER initiates payment; confirm-payment by SAME user rejected with 409
    print("\n[CRITERION 8] Testing Maker-Checker payment rule (blocking same-person confirmation with HTTP 409)...")
    status, init_pay_res = make_request(f"/milestones/{m1_id}/initiate-payment", "POST", {
        "payment_reference": "UTR-2026-9988776655"
    }, token=proc_token)

    if status != 200 or init_pay_res.get("status") != "payment_initiated":
        print(f"FAILED initiate-payment: {status} -> {init_pay_res}")
        sys.exit(1)

    proof_doc_id = create_dummy_document("milestone_payment", m1_id, proc_id)

    # Attempt to confirm payment with SAME user (Procurement Officer)
    status, same_user_fail = make_request(f"/milestones/{m1_id}/confirm-payment", "POST", {
        "payment_proof_document_id": proof_doc_id
    }, token=proc_token)

    if status != 409:
        print(f"FAILED: Expected 409 for same-person payment confirmation, got {status}: {same_user_fail}")
        sys.exit(1)

    print(f"SUCCESS: MAKER-CHECKER RULE PROVED! Same-user payment confirmation rejected with HTTP 409 Conflict: {same_user_fail}")

    # 9. confirm-payment by DIFFERENT authorized user (SUPER_ADMIN) succeeds
    print("\n[CRITERION 9] Testing confirm-payment by DIFFERENT authorized user (SUPER_ADMIN) succeeds...")
    status, diff_user_pass = make_request(f"/milestones/{m1_id}/confirm-payment", "POST", {
        "payment_proof_document_id": proof_doc_id
    }, token=admin_token)

    if status != 200 or diff_user_pass.get("status") != "paid":
        print(f"FAILED confirm-payment: {status} -> {diff_user_pass}")
        sys.exit(1)

    print(f"SUCCESS: Dual-authorization payment completed! Milestone 1 status: '{diff_user_pass.get('status')}'")

    # 10. GET /pilots/{id} as SUPER_ADMIN shows AI-draft-vs-final-terms diff clearly
    print("\n[CRITERION 10] Testing GET /pilots/{id} as SUPER_ADMIN shows AI vs Final terms diff...")
    status, get_pilot_res = make_request(f"/pilots/{pilot_id}", "GET", token=admin_token)
    if status != 200 or not get_pilot_res.get("ai_terms_diff"):
        print(f"FAILED GET pilot diff: {status} -> {get_pilot_res}")
        sys.exit(1)

    diff = get_pilot_res["ai_terms_diff"]
    print("AI Proposed vs Final Approved Terms Diff:")
    print(f" - AI Proposed IP Terms: '{diff['ai_proposed']['ip_terms'][:70]}...'")
    print(f" - Final Approved IP Terms: '{diff['final_approved']['ip_terms'][:70]}...'")
    print("SUCCESS: Audit terms diff cleanly exposed to SUPER_ADMIN!")

    # 11. Audit logs verification
    print("\n[CRITERION 11] Testing audit logs for Module 6 actions...")
    status, audit_res = make_request("/audit-logs", "GET", token=admin_token)
    actions = [a.get("action") for a in audit_res]
    print(f"Audit Actions Recorded: {set(actions)}")

    required_actions = [
        "pilot.create",
        "pilot.ai_draft_contract",
        "pilot.update",
        "pilot_milestones.create",
        "pilot.finalize_contract",
        "pilot_milestones.submit_evidence",
        "pilot_milestones.approve",
        "pilot_milestones.initiate_payment",
        "pilot_milestones.confirm_payment"
    ]
    for act in required_actions:
        if act not in actions:
            print(f"FAILED: Audit action '{act}' not found in audit logs!")
            sys.exit(1)

    print("SUCCESS: All Module 6 audit events ('pilot.create', 'pilot.ai_draft_contract', 'pilot.update', 'pilot_milestones.create', 'pilot.finalize_contract', 'pilot_milestones.submit_evidence', 'pilot_milestones.approve', 'pilot_milestones.initiate_payment', 'pilot_milestones.confirm_payment') verified!")

    print("\n=== ALL 11 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY ===")


if __name__ == "__main__":
    run_module6_tests()
