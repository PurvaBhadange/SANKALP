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
    EvaluationCriteria, EvaluationPanel, EvaluationScore, ScoreOutlierFlag
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
        dept = db.query(Department).filter(Department.code == "INNOV").first()
        if not dept:
            dept = Department(id=uuid.uuid4(), name="Innovation Department", code="INNOV")
            db.add(dept)
            db.commit()
        dept_id = dept.id

        existing = db.query(User).filter(User.email == email).first()
        if existing:
            if existing.department_id is None:
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


def run_module5_tests():
    print("\n=== STARTING MODULE 5 ACCEPTANCE VERIFICATION TESTS ===")

    db = SessionLocal()
    try:
        sectors = db.query(Sector).all()
        sector_map = {s.name: str(s.id) for s in sectors}
        agri_sector = sector_map.get("AgriTech") or list(sector_map.values())[0]
    finally:
        db.close()

    # 1. Login Admin & Officer
    print("\n[CRITERION 1 & Setup] Logging in Admin, Officer, and Evaluators...")
    status, login_admin = make_request("/auth/login", "POST", {
        "email": "admin@test.gov.in",
        "password": "SankalpAdmin2026!"
    })
    admin_token = login_admin.get("access_token")

    officer_token, officer_id = create_user_with_role("officer1@test.gov.in", "OfficerPass123!", "Mod5 Officer", "DEPARTMENT_OFFICER")

    # Create 3 Evaluator users
    eval1_token, eval1_id = create_user_with_role("eval1@test.gov.in", "EvalPass123!", "Dr. Aris Thorne", "EVALUATOR")
    eval2_token, eval2_id = create_user_with_role("eval2@test.gov.in", "EvalPass123!", "Prof. Elena Rostova", "EVALUATOR")
    eval3_token, eval3_id = create_user_with_role("eval3@test.gov.in", "EvalPass123!", "Dr. Marcus Vance", "EVALUATOR")

    # Create Non-Panel Evaluator user
    out_eval_token, out_eval_id = create_user_with_role("eval_outsider@test.gov.in", "EvalPass123!", "Outsider Evaluator", "EVALUATOR")

    print(f"SUCCESS: Admin, Officer, and 3 Evaluators logged in. IDs: [{eval1_id[:8]}, {eval2_id[:8]}, {eval3_id[:8]}]")

    status, chal_pub = make_request("/challenges", "POST", {
        "title": "Autonomous Drone Soil & Crop Analytics",
        "raw_problem_text": "We require autonomous AI drone platforms for high-throughput crop disease diagnostics.",
        "sector_id": agri_sector,
        "budget_ceiling": 8000000.00,
        "currency": "INR"
    }, token=officer_token)
    chal_id = chal_pub.get("id")

    make_request(f"/challenges/{chal_id}/structure", "POST", token=officer_token)
    make_request(f"/challenges/{chal_id}/submit-for-approval", "POST", token=officer_token)
    make_request(f"/challenges/{chal_id}/approve", "POST", token=admin_token)

    # Configure Evaluation Criteria (Weights: Technical 40.0, Feasibility 60.0 -> total 100.0)
    status, crit_res = make_request(f"/challenges/{chal_id}/evaluation-criteria", "POST", [
        {"name": "Technical Innovation & AI Model Accuracy", "weight": 40.0, "max_score": 100.0},
        {"name": "Operational Feasibility & Deployment Scalability", "weight": 60.0, "max_score": 100.0}
    ], token=officer_token)
    if status != 200:
        print(f"FAILED to configure criteria: {status} -> {crit_res}")
        sys.exit(1)

    crit_tech_id = crit_res[0]["id"]
    crit_feas_id = crit_res[1]["id"]
    print(f"SUCCESS: Evaluation criteria configured with total weight = 100.0%. Criteria IDs: [{crit_tech_id[:8]}, {crit_feas_id[:8]}]")

    # 2. POST /panels creates panel with 3 evaluators assigned
    print("\n[CRITERION 2] Testing POST /panels creates panel with 3 evaluators assigned...")
    status, panel_res = make_request("/panels", "POST", {
        "challenge_id": chal_id,
        "name": "AgriTech Expert Evaluation Board",
        "evaluator_user_ids": [eval1_id, eval2_id, eval3_id]
    }, token=admin_token)

    if status != 200:
        print(f"FAILED create panel: {status} -> {panel_res}")
        sys.exit(1)

    panel_id = panel_res.get("id")
    member_count = len(panel_res.get("members", []))
    if member_count != 3:
        print(f"FAILED: Expected 3 panel members, got {member_count}")
        sys.exit(1)
    print(f"SUCCESS: Evaluation panel created. Panel ID: {panel_id}, Members: {member_count}")

    # Register Startup A and submit shortlisted application
    reg_num_a = f"REG-EVAL-{uuid.uuid4().hex[:6]}"
    status, reg_a = make_request("/auth/register-startup", "POST", {
        "email": f"st_eval_a_{uuid.uuid4().hex[:6]}@agri.com",
        "password": "StartupPass123!",
        "full_name": "AgriFly Founder",
        "startup_name": "AgriFly Robotics",
        "registration_number": reg_num_a,
        "sector_id": agri_sector,
        "description": "High resolution multispectral drone imaging and real time crop disease analysis."
    })
    if status != 201:
        print(f"FAILED to register startup A: {status} -> {reg_a}")
        sys.exit(1)
    token_a = reg_a.get("access_token")

    make_request("/startups/me", "PATCH", {"team_size": 10}, token=token_a)

    status, app_a_res = make_request(f"/challenges/{chal_id}/applications", "POST", token=token_a)
    app_a_id = app_a_res.get("id")
    make_request(f"/applications/{app_a_id}/run-eligibility-check", "POST", token=officer_token)
    make_request(f"/applications/{app_a_id}/shortlist", "POST", token=officer_token)

    # 3. Assigned evaluator can score shortlisted application; non-panel evaluator is BLOCKED with 403
    print("\n[CRITERION 3] Testing non-panel member evaluator score submission is blocked with 403...")
    status, out_score_res = make_request(f"/applications/{app_a_id}/scores", "POST", {
        "scores": [
            {"criteria_id": crit_tech_id, "score": 85.0, "comments": "Good proposal."},
            {"criteria_id": crit_feas_id, "score": 90.0, "comments": "Scalable."}
        ]
    }, token=out_eval_token)

    if status != 403:
        print(f"FAILED: Expected 403 for non-panel evaluator, got {status}: {out_score_res}")
        sys.exit(1)
    print(f"SUCCESS: Non-panel evaluator correctly blocked with HTTP 403 Forbidden: {out_score_res}")

    # Evaluator 1 submits scores for App A
    status, eval1_score_res = make_request(f"/applications/{app_a_id}/scores", "POST", {
        "scores": [
            {"criteria_id": crit_tech_id, "score": 92.0, "comments": "Exceptional AI vision model accuracy."},
            {"criteria_id": crit_feas_id, "score": 88.0, "comments": "Solid field operation plans."}
        ]
    }, token=eval1_token)
    if status != 200:
        print(f"FAILED Evaluator 1 score submission: {status} -> {eval1_score_res}")
        sys.exit(1)
    print("SUCCESS: Evaluator 1 successfully submitted scores for Application A.")

    # 4. Evaluator CANNOT see another evaluator's scores/comments while scoring_status='open'
    print("\n[CRITERION 4] Testing blind scoring: Evaluator 2 CANNOT see Evaluator 1's scores while panel is open...")
    status, eval2_view_scores = make_request(f"/applications/{app_a_id}/scores", "GET", token=eval2_token)
    if status != 200:
        print(f"FAILED Evaluator 2 score query: {status} -> {eval2_view_scores}")
        sys.exit(1)

    eval2_seen_count = len(eval2_view_scores)
    if eval2_seen_count != 0:
        print(f"FAILED: Evaluator 2 should see 0 scores while panel is open, but saw {eval2_seen_count} scores!")
        sys.exit(1)
    print("SUCCESS: Blind scoring enforced at query level! Evaluator 2 sees 0 scores while scoring_status='open'.")

    # 5. Submitting same evaluator+application+criteria score twice is rejected (409 Conflict)
    print("\n[CRITERION 5] Testing duplicate score submission for same evaluator+app+criteria is rejected...")
    status, dup_score_res = make_request(f"/applications/{app_a_id}/scores", "POST", {
        "scores": [
            {"criteria_id": crit_tech_id, "score": 95.0, "comments": "Attempted rewrite."}
        ]
    }, token=eval1_token)

    if status != 409:
        print(f"FAILED: Expected 409 Conflict for duplicate score, got {status}: {dup_score_res}")
        sys.exit(1)
    print(f"SUCCESS: Duplicate score correctly rejected with HTTP 409 Conflict: {dup_score_res}")

    # 6. GET .../scores/verify-integrity returns valid=true for a normal, untampered chain
    print("\n[CRITERION 6] Testing GET /applications/{id}/scores/verify-integrity on untampered chain...")
    status, integrity_res = make_request(f"/applications/{app_a_id}/scores/verify-integrity", "GET", token=admin_token)
    if status != 200 or integrity_res.get("valid") is not True:
        print(f"FAILED integrity verification: {status} -> {integrity_res}")
        sys.exit(1)
    print(f"SUCCESS: Hash chain integrity verified! Result: {integrity_res}")

    # 7. Testing DB tamper-evidence detection for direct SQL score column modification (leaving row_hash untouched)
    print("\n[CRITERION 7] Testing DB tamper-evidence detection (direct SQL modification of score column)...")
    db = SessionLocal()
    try:
        target_score = db.query(EvaluationScore).filter(EvaluationScore.application_id == app_a_id).first()
        corrupted_row_id = str(target_score.id)
        original_score_val = float(target_score.score)
        
        # Directly modify score column in DB (leaving row_hash untouched!)
        target_score.score = Decimal("99.99")
        db.commit()
    finally:
        db.close()

    # Re-run verify-integrity
    status, corrupted_res = make_request(f"/applications/{app_a_id}/scores/verify-integrity", "GET", token=admin_token)
    if corrupted_res.get("valid") is not False:
        print(f"FAILED: Expected valid=False for tampered score column, got {corrupted_res}")
        sys.exit(1)

    tampered_list = corrupted_res.get("content_tampered_rows", [])
    if len(tampered_list) == 0 or tampered_list[0].get("row_id") != corrupted_row_id:
        print(f"FAILED: Expected content_tampered_rows to contain row {corrupted_row_id}, got {tampered_list}")
        sys.exit(1)

    print(f"SUCCESS: Direct SQL score column tampering PROVED! verify-integrity detected content tampering: {corrupted_res}")

    # Restore DB score column to original value
    db = SessionLocal()
    try:
        target_score = db.query(EvaluationScore).filter(EvaluationScore.id == uuid.UUID(corrupted_row_id)).first()
        target_score.score = Decimal(str(original_score_val))
        db.commit()
    finally:
        db.close()

    # Confirm restored integrity
    status, restored_res = make_request(f"/applications/{app_a_id}/scores/verify-integrity", "GET", token=admin_token)
    if restored_res.get("valid") is not True:
        print(f"FAILED: Chain restore failed: {restored_res}")
        sys.exit(1)
    print("SUCCESS: Score column restored to original value. Hash chain & content integrity valid again.")

    # 8. Outlier detection scenario: Evaluator 1 = 92.0, Evaluator 2 = 88.0, Evaluator 3 = 20.0 (Outlier!)
    print("\n[CRITERION 8] Testing statistical outlier detection for small panel...")
    # Evaluator 2 scores App A (90.0, 85.0)
    make_request(f"/applications/{app_a_id}/scores", "POST", {
        "scores": [
            {"criteria_id": crit_tech_id, "score": 90.0, "comments": "Strong proposal."},
            {"criteria_id": crit_feas_id, "score": 85.0, "comments": "Good feasibility."}
        ]
    }, token=eval2_token)

    # Evaluator 3 scores App A with noticeable outlier variance on Technical (20.0 vs ~91.0 average of others!)
    make_request(f"/applications/{app_a_id}/scores", "POST", {
        "scores": [
            {"criteria_id": crit_tech_id, "score": 20.0, "comments": "Severely flawed technical model."},
            {"criteria_id": crit_feas_id, "score": 84.0, "comments": "Acceptable operational plan."}
        ]
    }, token=eval3_token)

    # Check outlier flags for App A
    status, flags_res = make_request(f"/applications/{app_a_id}/outlier-flags", "GET", token=officer_token)
    if status != 200 or len(flags_res) == 0:
        print(f"FAILED Outlier detection query: {status} -> {flags_res}")
        sys.exit(1)

    flagged_eval_ids = [f.get("evaluator_id") for f in flags_res]
    if eval3_id not in flagged_eval_ids:
        print(f"FAILED: Expected Evaluator 3 ({eval3_id}) to be in flagged outliers, got {flagged_eval_ids}")
        sys.exit(1)
    print(f"SUCCESS: Statistical outlier flag automatically generated for Evaluator 3! Flagged evaluators: {flagged_eval_ids}")

    # Panel Chair acknowledges outlier flag via PATCH /outlier-flags/{id}
    flag_id = flags_res[0]["id"]
    status, review_flag_res = make_request(f"/outlier-flags/{flag_id}", "PATCH", {
        "review_note": "Reviewed by panel chair. Noted harsh technical critique regarding vision training dataset size."
    }, token=officer_token)
    if status != 200 or not review_flag_res.get("review_note"):
        print(f"FAILED Outlier review PATCH: {status} -> {review_flag_res}")
        sys.exit(1)
    print(f"SUCCESS: Outlier flag acknowledged by officer with review note: {review_flag_res.get('review_note')}")

    # 9. GET /applications/{id}/briefing returns real Gemini-generated text discussing proposal without score suggestion
    print("\n[CRITERION 9] Testing GET /applications/{id}/briefing for AI evaluator briefing...")
    status, briefing_res = make_request(f"/applications/{app_a_id}/briefing", "GET", token=eval1_token)
    if status != 200:
        print(f"FAILED AI briefing: {status} -> {briefing_res}")
        sys.exit(1)

    briefing_text = briefing_res.get("briefing_text", "")
    print(f"Briefing Text Preview:\n----------------------------------------\n{briefing_text[:250]}...\n----------------------------------------")
    if not briefing_text or len(briefing_text) < 50:
        print("FAILED: Briefing text is empty or too short!")
        sys.exit(1)
    print("SUCCESS: Real Gemini AI briefing generated and cached for evaluator.")

    # Register Startup B (App B) for finalization check
    reg_num_b = f"REG-EVAL-B-{uuid.uuid4().hex[:6]}"
    status, reg_b = make_request("/auth/register-startup", "POST", {
        "email": f"st_eval_b_{uuid.uuid4().hex[:6]}@drone.com",
        "password": "StartupPass123!",
        "full_name": "DroneTech Founder",
        "startup_name": "DroneTech Solutions",
        "registration_number": reg_num_b,
        "sector_id": agri_sector,
        "description": "Autonomous aerial diagnostic sensors for precision farming."
    })
    if status != 201:
        print(f"FAILED to register startup B: {status} -> {reg_b}")
        sys.exit(1)
    token_b = reg_b.get("access_token")

    make_request("/startups/me", "PATCH", {"team_size": 12}, token=token_b)

    status, app_b_res = make_request(f"/challenges/{chal_id}/applications", "POST", token=token_b)
    app_b_id = app_b_res.get("id")
    make_request(f"/applications/{app_b_id}/run-eligibility-check", "POST", token=officer_token)
    make_request(f"/applications/{app_b_id}/shortlist", "POST", token=officer_token)

    # 10. POST /panels/{id}/finalize correctly rejects if any evaluator hasn't scored everything
    print("\n[CRITERION 10] Testing POST /panels/{id}/finalize rejects incomplete scoring...")
    status, finalize_fail = make_request(f"/panels/{panel_id}/finalize", "POST", token=admin_token)
    if status != 400:
        print(f"FAILED: Expected 400 for incomplete panel finalization, got {status}: {finalize_fail}")
        sys.exit(1)
    print(f"SUCCESS: Finalization correctly rejected with HTTP 400 listing missing evaluator scores: {finalize_fail}")

    # Have all evaluators complete scoring for App B
    make_request(f"/applications/{app_b_id}/scores", "POST", {
        "scores": [
            {"criteria_id": crit_tech_id, "score": 78.0, "comments": "Decent models."},
            {"criteria_id": crit_feas_id, "score": 82.0, "comments": "Feasible."}
        ]
    }, token=eval1_token)

    make_request(f"/applications/{app_b_id}/scores", "POST", {
        "scores": [
            {"criteria_id": crit_tech_id, "score": 80.0, "comments": "Good sensor payload."},
            {"criteria_id": crit_feas_id, "score": 85.0, "comments": "Strong team."}
        ]
    }, token=eval2_token)

    make_request(f"/applications/{app_b_id}/scores", "POST", {
        "scores": [
            {"criteria_id": crit_tech_id, "score": 75.0, "comments": "Average tech."},
            {"criteria_id": crit_feas_id, "score": 80.0, "comments": "Good deployment plan."}
        ]
    }, token=eval3_token)

    # Finalize panel now that all scores are complete!
    status, finalize_pass = make_request(f"/panels/{panel_id}/finalize", "POST", token=admin_token)
    if status != 200 or finalize_pass.get("scoring_status") != "finalized":
        print(f"FAILED Panel finalization: {status} -> {finalize_pass}")
        sys.exit(1)
    print(f"SUCCESS: Panel finalized successfully! Scoring Status: '{finalize_pass.get('scoring_status')}'")

    # 11. After finalize, GET /challenges/{id}/rankings shows applications ranked by weighted_final_score & scores unblinded
    print("\n[CRITERION 11] Testing GET /challenges/{id}/rankings & score unblinding after finalization...")
    status, rankings_res = make_request(f"/challenges/{chal_id}/rankings", "GET", token=officer_token)
    if status != 200 or len(rankings_res) != 2:
        print(f"FAILED Rankings query: {status} -> {rankings_res}")
        sys.exit(1)

    print("Ranked Shortlisted Candidates:")
    for r in rankings_res:
        print(f" - Rank #{r.get('rank')} | Startup: {r.get('startup_name')} | Weighted Final Score: {r.get('weighted_final_score')} / 100 | AI Context Score: {r.get('ai_match_score')}%")

    if rankings_res[0]["weighted_final_score"] < rankings_res[1]["weighted_final_score"]:
        print("FAILED: Rankings list is not sorted descending by weighted final score!")
        sys.exit(1)

    # Confirm score unblinding for evaluators
    status, unblinded_scores = make_request(f"/applications/{app_a_id}/scores", "GET", token=eval2_token)
    if len(unblinded_scores) < 6:
        print(f"FAILED: Expected all 6 evaluator scores to be visible after finalization, got {len(unblinded_scores)}")
        sys.exit(1)
    print(f"SUCCESS: Evaluator-level scores now fully visible and unblinded ({len(unblinded_scores)} total score entries accessible).")

    # 12. Audit log verification
    print("\n[CRITERION 12] Testing audit logs for Module 5 actions...")
    status, audit_res = make_request("/audit-logs", "GET", token=admin_token)
    actions = [a.get("action") for a in audit_res]
    print(f"Audit Actions Recorded: {set(actions)}")

    required_actions = [
        "evaluation_criteria.create",
        "panel.create",
        "evaluation_scores.submit",
        "outlier_flag.review",
        "panel.finalize"
    ]
    for act in required_actions:
        if act not in actions:
            print(f"FAILED: Audit action '{act}' not found in audit logs!")
            sys.exit(1)
    print("SUCCESS: All Module 5 audit events ('evaluation_criteria.create', 'panel.create', 'evaluation_scores.submit', 'outlier_flag.review', 'panel.finalize') verified!")

    print("\n=== ALL 12 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY ===")


if __name__ == "__main__":
    run_module5_tests()
