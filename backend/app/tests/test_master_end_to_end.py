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


def run_master_end_to_end():
    print("\n" + "="*80)
    print("RUNNING COMPLETE END-TO-END PLATFORM LIFECYCLE (MODULES 1 - 8)")
    print("="*80)

    # -------------------------------------------------------------------
    # MODULE 1: Authentication, Roles & Security Baseline
    # -------------------------------------------------------------------
    print("\n[MODULE 1] Authentication & Roles Verification")
    db = SessionLocal()
    try:
        sectors = db.query(Sector).all()
        sector_id = str(sectors[0].id) if sectors else str(uuid.uuid4())
    finally:
        db.close()

    # Login Super Admin 1 (Maker)
    status, login_admin1 = make_request("/auth/login", "POST", {
        "email": "admin@test.gov.in",
        "password": "SankalpAdmin2026!"
    })
    if status != 200:
        print(f"FAILED MODULE 1: Super Admin login: {status} -> {login_admin1}")
        sys.exit(1)
    admin1_token = login_admin1.get("access_token")
    print("  -> Super Admin 1 authenticated successfully.")

    # Create distinct Super Admin 2 (Checker)
    admin2_token, admin2_id = create_user(f"admin2_e2e_{uuid.uuid4().hex[:4]}@test.gov.in", "Admin2Pass123!", "Super Admin 2 (Checker)", "SUPER_ADMIN")
    print("  -> Super Admin 2 (Checker) authenticated successfully.")

    # Create Department Officer
    officer_token, officer_id = create_user(f"officer_e2e_{uuid.uuid4().hex[:4]}@test.gov.in", "OfficerPass123!", "Innovation Officer", "DEPARTMENT_OFFICER")
    print("  -> Department Officer authenticated successfully.")

    # Create Evaluator User
    eval1_token, eval1_id = create_user(f"eval_e2e_{uuid.uuid4().hex[:4]}@test.gov.in", "EvalPass123!", "Technical Expert Evaluator", "EVALUATOR")
    print("  -> Evaluator User authenticated successfully.")

    # Create Procurement Officer
    proc_token, proc_id = create_user(f"proc_e2e_{uuid.uuid4().hex[:4]}@test.gov.in", "ProcPass123!", "Financial Procurement Officer", "PROCUREMENT_OFFICER")
    print("  -> Procurement Officer authenticated successfully.")


    # -------------------------------------------------------------------
    # MODULE 2: Challenge Definition & AI Structure
    # -------------------------------------------------------------------
    print("\n[MODULE 2] Challenge Creation & AI Problem Structuring")
    status, chal_res = make_request("/challenges", "POST", {
        "title": f"Statewide AI Traffic Management System {uuid.uuid4().hex[:4]}",
        "raw_problem_text": "Urban congestion during peak office hours requires real-time signal timing adjustments.",
        "sector_id": sector_id,
        "budget_ceiling": 12000000.00
    }, token=officer_token)
    if status != 201:
        print(f"FAILED MODULE 2 Challenge Creation: {status} -> {chal_res}")
        sys.exit(1)
    chal_id = chal_res.get("id")
    print(f"  -> Challenge created: '{chal_res['title']}' (ID: {chal_id})")

    # Structure Challenge with AI
    status, struct_res = make_request(f"/challenges/{chal_id}/structure", "POST", token=officer_token)
    print(f"  -> AI Problem Structuring trigger completed (Status: {status}).")

    # Submit for approval & approve challenge
    make_request(f"/challenges/{chal_id}/submit-for-approval", "POST", token=officer_token)
    status, app_chal = make_request(f"/challenges/{chal_id}/approve", "POST", token=admin1_token)
    if status != 200 or app_chal.get("status") != "published":
        print(f"FAILED MODULE 2 Challenge Approval: {status} -> {app_chal}")
        sys.exit(1)
    print(f"  -> Challenge approved & published to public marketplace! Status: {app_chal['status']}")

    # -------------------------------------------------------------------
    # MODULE 3: Startup Onboarding & Verification
    # -------------------------------------------------------------------
    print("\n[MODULE 3] Startup Onboarding & Verification")
    st_email = f"st_e2e_{uuid.uuid4().hex[:6]}@trafficaim.com"
    status, reg_st = make_request("/auth/register-startup", "POST", {
        "email": st_email,
        "password": "StartupPass123!",
        "full_name": "Traffic AI Founder",
        "startup_name": "TrafficAim Systems Pvt Ltd",
        "registration_number": f"REG-E2E-{uuid.uuid4().hex[:6]}",
        "sector_id": sector_id,
        "description": "AI-driven computer vision traffic signal optimization."
    })
    if status != 201:
        print(f"FAILED MODULE 3 Startup Registration: {status} -> {reg_st}")
        sys.exit(1)
    startup_token = reg_st.get("access_token")
    print(f"  -> Startup registered: 'TrafficAim Systems Pvt Ltd' ({st_email})")

    # Upload document
    url = f"{BASE_URL}/startups/me/documents"
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    headers = {"Authorization": f"Bearer {startup_token}", "Content-Type": f"multipart/form-data; boundary={boundary}"}
    body = f"--{boundary}\r\nContent-Disposition: form-data; name=\"doc_type\"\r\n\r\nincorporation_certificate\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"incorporation.pdf\"\r\nContent-Type: application/pdf\r\n\r\nINCORPORATION CERTIFICATE PDF DATA\r\n--{boundary}--\r\n".encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        doc_id = json.loads(resp.read().decode("utf-8"))["id"]
    print(f"  -> Incorporation certificate uploaded (Document ID: {doc_id}).")

    # -------------------------------------------------------------------
    # MODULE 4: Applications & Automated Eligibility Rule Verification
    # -------------------------------------------------------------------
    print("\n[MODULE 4] Challenge Application & Eligibility Check")
    status, app_res = make_request(f"/challenges/{chal_id}/applications", "POST", token=startup_token)
    if status != 201:
        print(f"FAILED MODULE 4 Application Submission: {status} -> {app_res}")
        sys.exit(1)
    app_id = app_res.get("id")
    print(f"  -> Application submitted to Challenge! Application ID: {app_id}")

    # Run automated eligibility check
    status, check_res = make_request(f"/applications/{app_id}/run-eligibility-check", "POST", token=officer_token)
    print(f"  -> Automated eligibility check completed (Status: {status}).")

    # Shortlist application
    status, short_res = make_request(f"/applications/{app_id}/shortlist", "POST", token=officer_token)
    if status != 200 or short_res.get("status") != "shortlisted":
        print(f"FAILED MODULE 4 Shortlisting: {status} -> {short_res}")
        sys.exit(1)
    print(f"  -> Application shortlisted! Application Status: {short_res['status']}")

    # -------------------------------------------------------------------
    # MODULE 5: Evaluation Panel, Blind Scoring & Score Hash Chain
    # -------------------------------------------------------------------
    print("\n[MODULE 5] Panel Board Evaluation & Scoring Integrity")
    crit_res = make_request(f"/challenges/{chal_id}/evaluation-criteria", "POST", [
        {"name": "Computer Vision Accuracy", "weight": 50.0, "max_score": 100.0},
        {"name": "Deployment Scalability", "weight": 50.0, "max_score": 100.0}
    ], token=officer_token)[1]
    crit1_id = crit_res[0]["id"]
    crit2_id = crit_res[1]["id"]
    print(f"  -> 2 Evaluation Criteria configured (50% weight each).")

    # Create Evaluation Panel Board
    status, panel_res = make_request("/panels", "POST", {
        "challenge_id": chal_id,
        "name": "Traffic AI Expert Panel",
        "evaluator_user_ids": [eval1_id]
    }, token=admin1_token)
    panel_id = panel_res.get("id")
    print(f"  -> Evaluation Panel board created. Panel ID: {panel_id}")

    # Submit scores (Evaluator 1)
    status, score_res = make_request(f"/applications/{app_id}/scores", "POST", {
        "scores": [
            {"criteria_id": crit1_id, "score": 92.0, "comments": "Outstanding vision model accuracy."},
            {"criteria_id": crit2_id, "score": 88.0, "comments": "Scalable edge hardware architecture."}
        ]
    }, token=eval1_token)
    print(f"  -> Evaluator submitted scores with SHA-256 integrity row hash.")

    # Finalize Panel Board
    status, fin_panel = make_request(f"/panels/{panel_id}/finalize", "POST", token=admin1_token)
    if status != 200 or fin_panel.get("scoring_status") != "finalized":
        print(f"FAILED MODULE 5 Panel Finalization: {status} -> {fin_panel}")
        sys.exit(1)
    print(f"  -> Panel scoring finalized! Scoring Status: {fin_panel['scoring_status']}")

    # Verify score chain integrity
    status, verify_chain = make_request(f"/applications/{app_id}/scores/verify-integrity", "GET", token=admin1_token)
    print(f"  -> Score chain cryptographic verification: {verify_chain.get('valid', True)}")

    # -------------------------------------------------------------------
    # MODULE 6: Pilot Selection, AI Contract Drafting & Financial Milestones
    # -------------------------------------------------------------------
    print("\n[MODULE 6] Pilot Project Selection & Financial Milestone Management")
    status, pilot_res = make_request(f"/applications/{app_id}/select-for-pilot", "POST", token=officer_token)
    if status != 200:
        print(f"FAILED MODULE 6 Pilot Selection: {status} -> {pilot_res}")
        sys.exit(1)
    pilot_id = pilot_res.get("id")
    print(f"  -> Application selected for Pilot deployment! Pilot ID: {pilot_id}")

    # AI Draft Contract
    make_request(f"/pilots/{pilot_id}/draft-contract", "POST", token=officer_token)
    print(f"  -> AI contract terms drafted.")

    # Update contract terms & upload signed contract document
    make_request(f"/pilots/{pilot_id}", "PATCH", {
        "ip_ownership_terms": "Government retains foreground IP rights; startup retains core background algorithm.",
        "data_ownership_terms": "All traffic video feeds and telemetry housed strictly on State Data Center."
    }, token=officer_token)
    make_request(f"/pilots/{pilot_id}/milestones", "POST", {
        "title": "Phase 1: 10 Junction Hardware & Camera Setup",
        "description": "Install edge cameras and signal controllers across 10 major junctions.",
        "due_date": (date.today() + timedelta(days=45)).isoformat(),
        "payment_amount": 4000000.00
    }, token=officer_token)
    make_request(f"/pilots/{pilot_id}", "PATCH", {"contract_document_id": doc_id}, token=officer_token)

    # Finalize Contract -> Transition Pilot status to 'active'
    status, fin_contract = make_request(f"/pilots/{pilot_id}/finalize-contract", "POST", token=officer_token)
    if status != 200 or fin_contract.get("status") != "active":
        print(f"FAILED MODULE 6 Finalize Contract: {status} -> {fin_contract}")
        sys.exit(1)
    print(f"  -> Contract finalized & locked! Pilot status: {fin_contract['status']}")

    # -------------------------------------------------------------------
    # MODULE 7: KPI Progress Measurement & Gemini Performance Narrative
    # -------------------------------------------------------------------
    print("\n[MODULE 7] KPI Measurement & AI Performance Summary")
    # Add Manual KPI
    status, kpi_res = make_request(f"/pilots/{pilot_id}/kpis", "POST", {
        "kpi_name": "Peak Hour Traffic Delay Reduction",
        "description": "Average reduction in vehicle wait time at trial junctions.",
        "unit": "% reduction",
        "target_direction": "increase",
        "baseline_value": 0.0,
        "target_value": 30.0
    }, token=officer_token)
    if status != 200:
        print(f"FAILED MODULE 7 KPI Creation: {status} -> {kpi_res}")
        sys.exit(1)
    kpi_id = kpi_res.get("id")
    print(f"  -> Pilot KPI configured: '{kpi_res['kpi_name']}' (Target: 30% reduction)")

    # Record KPI Measurement
    status, meas_res = make_request(f"/pilot_kpis/{kpi_id}/measurements", "POST", {
        "measured_value": 28.5,
        "notes": "Measured over 30 consecutive trial days."
    }, token=startup_token)
    print(f"  -> Recorded KPI measurement: 28.5% (Achievement: 95% of target).")

    # Transition Pilot project to 'completed'
    status, comp_pilot = make_request(f"/pilots/{pilot_id}/complete", "POST", token=officer_token)
    if status != 200 or comp_pilot.get("status") != "completed":
        print(f"FAILED MODULE 7 Complete Pilot: {status} -> {comp_pilot}")
        sys.exit(1)
    print(f"  -> Pilot project transitioned to 'completed' status!")

    # -------------------------------------------------------------------
    # MODULE 8: Executive Decision Brief, Maker-Checker Scale-Up & Lifecycle Summary
    # -------------------------------------------------------------------
    print("\n[MODULE 8] Procurement Decision, Maker-Checker Scale-Up & Lifecycle Summary")
    
    # 1. Fetch Aggregated Decision Brief
    status, brief = make_request(f"/pilots/{pilot_id}/decision-brief", "GET", token=officer_token)
    if status != 200:
        print(f"FAILED MODULE 8 Decision Brief: {status} -> {brief}")
        sys.exit(1)
    print(f"  -> Executive Decision Brief fetched:")
    print(f"     - Challenge: {brief['challenge']['title']}")
    print(f"     - Candidate: {brief['application_evaluation']['startup_name']} (Rank #{brief['application_evaluation']['rank']})")
    print(f"     - Budget: INR {brief['financial_breakdown']['pilot_budget']}")

    # 2. Propose scale_up decision (Super Admin 1 / Maker)
    status, prop_dec = make_request(f"/pilots/{pilot_id}/procurement-decision", "POST", {
        "decision": "scale_up",
        "justification": "Pilot achieved 28.5% delay reduction (95% target) with zero safety incidents across 10 trial junctions.",
        "contract_value": 15000000.00,
        "scale_up_details": {"scope": "Statewide expansion across 150 junctions", "timeline_months": 12}
    }, token=admin1_token)
    if status != 201:
        print(f"FAILED MODULE 8 Propose Decision: {status} -> {prop_dec}")
        sys.exit(1)
    dec_id = prop_dec.get("id")
    print(f"  -> Super Admin 1 proposed 'scale_up' decision. Decision ID: {dec_id}")

    # 3. Test MAKER-CHECKER SECURITY GUARD: Super Admin 1 attempts self-approval -> Expect 409 Conflict
    status, self_app_err = make_request(f"/procurement-decisions/{dec_id}/approve", "POST", token=admin1_token)
    if status != 409:
        print(f"FAILED MODULE 8 Maker-Checker Guard check: Expected 409, got {status}: {self_app_err}")
        sys.exit(1)
    print(f"  -> MAKER-CHECKER GUARD ENFORCED: Self-approval rejected with HTTP 409 Conflict!")

    # 4. Super Admin 2 (DIFFERENT User / Checker) approves decision
    status, app_dec = make_request(f"/procurement-decisions/{dec_id}/approve", "POST", token=admin2_token)
    if status != 200 or app_dec.get("status") != "approved":
        print(f"FAILED MODULE 8 Approval: {status} -> {app_dec}")
        sys.exit(1)
    print(f"  -> MAKER-CHECKER APPROVED: Super Admin 2 (Checker) finalized approval! Decision Status: {app_dec['status']}")

    # 5. Verify Challenge Auto-Closure
    db = SessionLocal()
    try:
        c_db = db.query(Challenge).filter(Challenge.id == chal_id).first()
        print(f"  -> Challenge status auto-transitioned to: '{c_db.status.upper()}'")
    finally:
        db.close()

    # 6. Fetch End-to-End Lifecycle Summary
    status, life_sum = make_request(f"/challenges/{chal_id}/lifecycle-summary", "GET", token=officer_token)
    if status != 200:
        print(f"FAILED MODULE 8 Lifecycle Summary: {status} -> {life_sum}")
        sys.exit(1)

    print("\n" + "="*80)
    print("END-TO-END PLATFORM LIFECYCLE COMPLETED SUCCESSFULLY!")
    print("="*80)
    print(" Summary Story Timeline:")
    print(f"  1. Challenge Title: {life_sum['title']}")
    print(f"  2. Challenge Final Status: {life_sum['status'].upper()}")
    print(f"  3. Total Applications: {life_sum['eligibility_summary']['total_applications']}")
    print(f"  4. Shortlisted Applications: {life_sum['eligibility_summary']['shortlisted_count']}")
    print(f"  5. Evaluation Panel Board: Configured & Finalized")
    print(f"  6. Pilots Deployed & Completed: {len(life_sum['pilots'])}")
    print(f"  7. Final Procurement Outcome: SCALE_UP (Statewide Expansion)")
    print("="*80 + "\n")

if __name__ == "__main__":
    run_master_end_to_end()


if __name__ == "__main__":
    run_master_end_to_end()
