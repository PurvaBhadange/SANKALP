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
    ChallengeApplication, EvaluationPanel, Pilot, PilotKPI, PilotKPIMeasurement, AuditLog
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
        data_bytes = json.dumps(data).encode("utf-8")
    else:
        data_bytes = None

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res_body = response.read().decode("utf-8")
            try:
                parsed = json.loads(res_body)
            except Exception:
                parsed = res_body
            return response.status, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return e.code, parsed
    except Exception as e:
        return 500, {"detail": str(e)}


def create_user_with_role(email, password, full_name, role_name):
    db = SessionLocal()
    try:
        dept = db.query(Department).filter(Department.code == "INNOV").first()
        if not dept:
            dept = Department(id=uuid.uuid4(), name="Innovation Department", code="INNOV")
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


def run_module7_tests():
    print("\n=== STARTING MODULE 7 (KPI MEASUREMENT) ACCEPTANCE TESTS ===")

    db = SessionLocal()
    try:
        sectors = db.query(Sector).all()
        sector_map = {s.name: str(s.id) for s in sectors}
        agri_sector = sector_map.get("AgriTech") or list(sector_map.values())[0]
    finally:
        db.close()

    # 1. Users Setup & Tokens
    print("\n[Setup] Logging in Officer, Admin, and Startups...")
    admin_token, admin_id = create_user_with_role("admin_mod7@test.gov.in", "AdminPass123!", "Mod7 Admin", "SUPER_ADMIN")
    officer_token, officer_id = create_user_with_role("officer_mod7@test.gov.in", "OfficerPass123!", "Mod7 Officer", "DEPARTMENT_OFFICER")
    
    st1_email = f"st_kpi_owner_{uuid.uuid4().hex[:6]}@agri.com"
    st1_token, st1_user_id = create_user_with_role(st1_email, "StartupPass123!", "KpiOwner Founder", "STARTUP_USER")

    st2_email = f"st_kpi_stranger_{uuid.uuid4().hex[:6]}@agri.com"
    st2_token, st2_user_id = create_user_with_role(st2_email, "StartupPass123!", "KpiStranger Founder", "STARTUP_USER")

    # Set up Startups in DB
    db = SessionLocal()
    try:
        st1_obj = Startup(
            id=uuid.uuid4(),
            name="HydroSense Pilot Owner",
            registration_number=f"REG-KPI-OWN-{uuid.uuid4().hex[:6]}",
            sector_id=uuid.UUID(agri_sector),
            description="Precision soil sensors for pilot verification.",
            team_size=12,
            contact_user_id=uuid.UUID(st1_user_id)
        )
        st2_obj = Startup(
            id=uuid.uuid4(),
            name="HydroSense Pilot Stranger",
            registration_number=f"REG-KPI-STR-{uuid.uuid4().hex[:6]}",
            sector_id=uuid.UUID(agri_sector),
            description="Precision agriculture stranger company.",
            team_size=5,
            contact_user_id=uuid.UUID(st2_user_id)
        )
        db.add(st1_obj)
        db.add(st2_obj)
        db.commit()
        st1_id = st1_obj.id
        st2_id = st2_obj.id
    finally:
        db.close()

    # 2. Create Published Challenge with suggested_kpis in structured_outcome_json (Module 2 output)
    print("\n[Setup] Creating Published Challenge with Module 2 KPI suggestions...")
    suggested_kpis = [
        {"name": "Water Savings Efficiency", "unit": "%", "target_direction": "increase", "description": "Percentage of water usage reduced"},
        {"name": "Leak Alert Response Time", "unit": "hours", "target_direction": "decrease", "description": "Hours to resolve water leak"}
    ]
    status, chal_pub = make_request("/challenges", "POST", {
        "title": f"Moisture Sensor Pilot Challenge {uuid.uuid4().hex[:4]}",
        "raw_problem_text": "Need precision IoT soil sensors for canal irrigation.",
        "sector_id": agri_sector,
        "budget_ceiling": 2000000.00,
        "currency": "INR"
    }, token=officer_token)
    
    chal_id = chal_pub.get("id")
    # Simulate Module 2 Structuring
    db = SessionLocal()
    try:
        c_obj = db.query(Challenge).filter(Challenge.id == uuid.UUID(chal_id)).first()
        c_obj.structured_outcome_json = {
            "title": c_obj.title,
            "suggested_kpis": suggested_kpis
        }
        c_obj.status = "published"
        db.commit()
    finally:
        db.close()

    # 3. Create challenge application and transition to select-for-pilot
    print("\n[Setup] Submitting Application, Shortlisting & Initializing Pilot...")
    status, app_res = make_request(f"/challenges/{chal_id}/applications", "POST", token=st1_token)
    app_id = app_res.get("id")

    # Shortlist application
    make_request(f"/applications/{app_id}/shortlist", "POST", token=officer_token)

    # Finalize criteria & panel to satisfy pilot rules
    make_request(f"/challenges/{chal_id}/evaluation-criteria", "POST", [
        {"name": "Performance", "weight": 100.0, "max_score": 100.0}
    ], token=officer_token)

    db = SessionLocal()
    try:
        panel = EvaluationPanel(
            id=uuid.uuid4(),
            challenge_id=uuid.UUID(chal_id),
            name="KPI Pilot panel",
            scoring_status="finalized"
        )
        db.add(panel)
        db.commit()
    finally:
        db.close()

    # Select application for pilot
    status, pilot_res = make_request(f"/applications/{app_id}/select-for-pilot", "POST", token=officer_token)
    pilot_id = pilot_res.get("id")
    print(f" -> Pilot initialized: {pilot_id}")

    # Set pilot status to active (requires finalizing contract or directly setting in DB to test KPIs easily)
    db = SessionLocal()
    try:
        p_obj = db.query(Pilot).filter(Pilot.id == uuid.UUID(pilot_id)).first()
        p_obj.status = "active"
        p_obj.contract_status = "finalized"
        db.commit()
    finally:
        db.close()

    # -------------------------------------------------------------------
    # CRITERION 2: Pull Suggested KPIs
    # -------------------------------------------------------------------
    print("\n[CRITERION 2] Suggesting KPIs from Challenge structured outcome...")
    status, suggest_res = make_request(f"/pilots/{pilot_id}/kpis/suggest", "POST", token=officer_token)
    if status != 200 or "kpis" not in suggest_res:
        print(f"FAILED Criterion 2 suggest call: {status} -> {suggest_res}")
        sys.exit(1)
    
    kpis_created = suggest_res["kpis"]
    print(f"SUCCESS: Generated {len(kpis_created)} AI-suggested KPIs.")
    for k in kpis_created:
        print(f"   Name: '{k['kpi_name']}' | Dir: {k['target_direction']} | Target: {k['target_value']}")

    # -------------------------------------------------------------------
    # CRITERION 3: Officer Sets Targets via PATCH
    # -------------------------------------------------------------------
    print("\n[CRITERION 3] Updating baseline & target values via PATCH...")
    increase_kpi = [k for k in kpis_created if k["target_direction"] == "increase"][0]
    decrease_kpi = [k for k in kpis_created if k["target_direction"] == "decrease"][0]

    # PATCH values for Increase KPI
    status, patch_res1 = make_request(f"/pilot_kpis/{increase_kpi['id']}", "PATCH", {
        "baseline_value": 10.0,
        "target_value": 50.0,
        "description": "Increase soil moisture sensor efficiency range."
    }, token=officer_token)
    
    if status != 200 or float(patch_res1["target_value"]) != 50.0:
        print(f"FAILED Criterion 3 PATCH on increase KPI: {status} -> {patch_res1}")
        sys.exit(1)

    # PATCH values for Decrease KPI
    status, patch_res2 = make_request(f"/pilot_kpis/{decrease_kpi['id']}", "PATCH", {
        "baseline_value": 100.0,
        "target_value": 20.0,
        "description": "Reduce Response delay metric."
    }, token=officer_token)

    if status != 200 or float(patch_res2["target_value"]) != 20.0:
        print(f"FAILED Criterion 3 PATCH on decrease KPI: {status} -> {patch_res2}")
        sys.exit(1)

    print("SUCCESS: KPI parameters updated correctly by department officer.")

    # -------------------------------------------------------------------
    # CRITERION 4: Startup Records Measurement & Access Separation
    # -------------------------------------------------------------------
    print("\n[CRITERION 4] Testing Measurement Entry & Security Separation...")
    
    # Non-owner startup attempts to record measurement
    status, stranger_res = make_request(f"/pilot_kpis/{increase_kpi['id']}/measurements", "POST", {
        "measured_value": 30.0,
        "remarks": "Attempting stranger submission."
    }, token=st2_token)
    if status != 403:
        print(f"FAILED: Expected HTTP 403 for stranger submission, got {status} -> {stranger_res}")
        sys.exit(1)
    print(" -> Non-owner startup successfully blocked (HTTP 403).")

    # Owner startup records measurement for Increase KPI: baseline=10, target=50, actual=30
    status, owner_res1 = make_request(f"/pilot_kpis/{increase_kpi['id']}/measurements", "POST", {
        "measured_value": 30.0,
        "remarks": "Measured soil moisture coverage increase."
    }, token=st1_token)
    if status != 200:
        print(f"FAILED: KPI owner could not record measurement: {status} -> {owner_res1}")
        sys.exit(1)

    # Owner startup records measurement for Decrease KPI: baseline=100, target=20, actual=60
    status, owner_res2 = make_request(f"/pilot_kpis/{decrease_kpi['id']}/measurements", "POST", {
        "measured_value": 60.0,
        "remarks": "Measured alert response delay reduction."
    }, token=st1_token)
    if status != 200:
        print(f"FAILED: KPI owner could not record measurement 2: {status} -> {owner_res2}")
        sys.exit(1)

    print("SUCCESS: Startup owner verified, non-owners blocked correctly.")

    # -------------------------------------------------------------------
    # CRITERION 5 & 6: Progress Percentage Math & Null checks
    # -------------------------------------------------------------------
    print("\n[CRITERION 5 & 6] Verifying programmatic progress calculations & Null checks...")
    
    # Add a manual KPI with target/baseline not set yet to verify Null calculations
    status, null_kpi_res = make_request(f"/pilots/{pilot_id}/kpis", "POST", {
        "kpi_name": "Unconfigured KPI",
        "unit": "units",
        "target_direction": "increase"
    }, token=officer_token)
    null_kpi_id = null_kpi_res["id"]

    # Fetch pilot KPIs with calculated progress
    status, kpi_list_res = make_request(f"/pilots/{pilot_id}/kpis", "GET", token=officer_token)
    if status != 200:
        print(f"FAILED to fetch pilot KPIs: {status} -> {kpi_list_res}")
        sys.exit(1)

    inc_calc = [k for k in kpi_list_res if k["id"] == increase_kpi["id"]][0]
    dec_calc = [k for k in kpi_list_res if k["id"] == decrease_kpi["id"]][0]
    null_calc = [k for k in kpi_list_res if k["id"] == null_kpi_id][0]

    # Verify math by hand:
    # 1. Increase direction: baseline = 10, target = 50, latest = 30.
    #    Expected: ((30 - 10) / (50 - 10)) * 100 = 50.0%
    inc_pct = inc_calc["progress_percentage"]
    if inc_pct != 50.0:
        print(f"FAILED: Increase progress percentage expected 50.0, got {inc_pct}")
        sys.exit(1)
    print(f"   [Math Verified] Increase KPI: baseline=10, target=50, actual=30 -> Progress: {inc_pct}%")

    # 2. Decrease direction: baseline = 100, target = 20, latest = 60.
    #    Expected: ((100 - 60) / (100 - 20)) * 100 = 50.0%
    dec_pct = dec_calc["progress_percentage"]
    if dec_pct != 50.0:
        print(f"FAILED: Decrease progress percentage expected 50.0, got {dec_pct}")
        sys.exit(1)
    print(f"   [Math Verified] Decrease KPI: baseline=100, target=20, actual=60 -> Progress: {dec_pct}%")

    # 3. Verify Null Target check (Criterion 6)
    if null_calc["progress_percentage"] is not None or "not set" not in null_calc["reason"].lower():
        print(f"FAILED: Expected null progress_percentage with reason, got: {null_calc}")
        sys.exit(1)
    print(f"   [Null Guard Verified] Unconfigured KPI -> progress: {null_calc['progress_percentage']}, reason: '{null_calc['reason']}'")

    # -------------------------------------------------------------------
    # CRITERION 7: AI Performance Summary (Gemini)
    # -------------------------------------------------------------------
    print("\n[CRITERION 7] Generating AI Performance Summary...")
    status, summary_res = make_request(f"/pilots/{pilot_id}/performance-summary", "GET", token=officer_token)
    if status != 200 or "summary" not in summary_res:
        print(f"FAILED Criterion 7 summary generation: {status} -> {summary_res}")
        sys.exit(1)
    
    print(f"SUCCESS: Performance summary returned. AI Generated: {summary_res['ai_generated']}")
    print(f"Summary Content Snippet: {summary_res['summary'][:200]}...")

    # -------------------------------------------------------------------
    # CRITERION 8: Complete Pilot & State guards
    # -------------------------------------------------------------------
    print("\n[CRITERION 8] Testing Complete Pilot status transitions & guards...")
    
    # 1. Complete active pilot -> succeeds
    status, comp_res = make_request(f"/pilots/{pilot_id}/complete", "POST", token=officer_token)
    if status != 200 or comp_res["status"] != "completed":
        print(f"FAILED: Could not complete active pilot: {status} -> {comp_res}")
        sys.exit(1)
    print(" -> Active pilot successfully transitioned to completed.")

    # 2. Attempt to complete already completed pilot -> blocked (since it is no longer 'active')
    status, comp_fail_res = make_request(f"/pilots/{pilot_id}/complete", "POST", token=officer_token)
    if status != 400:
        print(f"FAILED: Expected 400 when completing non-active pilot, got {status} -> {comp_fail_res}")
        sys.exit(1)
    print(" -> Completed pilot blocking guard succeeded (HTTP 400).")

    # -------------------------------------------------------------------
    # CRITERION 9: Audit Logs for Module 7 events
    # -------------------------------------------------------------------
    print("\n[CRITERION 9] Verifying Audit Logs for KPI events...")
    db = SessionLocal()
    try:
        logs = db.query(AuditLog).filter(
            AuditLog.entity_id == uuid.UUID(pilot_id)
        ).all()
        actions = [log.action for log in logs]
        print(f" -> Found actions in audit log: {actions}")
        if "pilot.complete" not in actions:
            print("FAILED: Complete pilot action not logged in audit logs.")
            sys.exit(1)
    finally:
        db.close()

    print("\n=== ALL 9 MODULE 7 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY ===")


if __name__ == "__main__":
    run_module7_tests()
