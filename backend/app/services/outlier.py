import uuid
from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session, joinedload

from app.models.models import (
    ChallengeApplication,
    EvaluationPanel,
    EvaluationCriteria,
    EvaluationScore,
    ScoreOutlierFlag
)


def check_and_flag_outliers(db: Session, application_id: uuid.UUID, criteria_id: uuid.UUID) -> List[ScoreOutlierFlag]:
    """
    Checks if all assigned panel members have scored (application_id, criteria_id).
    If so, detects statistical outliers using small-panel rule:
      |score_i - avg(other_scores)| > 0.25 * max_score
    Creates ScoreOutlierFlag entries for any flagged evaluators.
    """
    app_obj = db.query(ChallengeApplication).filter(ChallengeApplication.id == application_id).first()
    if not app_obj:
        return []

    panel = db.query(EvaluationPanel).options(
        joinedload(EvaluationPanel.members)
    ).filter(EvaluationPanel.challenge_id == app_obj.challenge_id).first()

    if not panel or not panel.members:
        return []

    total_panel_members = len(panel.members)

    # Fetch all scores for this app & criteria
    scores = db.query(EvaluationScore).filter(
        EvaluationScore.application_id == application_id,
        EvaluationScore.criteria_id == criteria_id
    ).all()

    if len(scores) < total_panel_members or len(scores) < 2:
        return []  # Not all members have scored yet

    criteria = db.query(EvaluationCriteria).filter(EvaluationCriteria.id == criteria_id).first()
    if not criteria:
        return []

    max_score = float(criteria.max_score)
    threshold = 0.25 * max_score

    score_values = [float(s.score) for s in scores]
    panel_avg = sum(score_values) / len(score_values)

    new_flags = []

    for idx, score_obj in enumerate(scores):
        val = float(score_obj.score)
        other_vals = [v for i, v in enumerate(score_values) if i != idx]
        other_avg = sum(other_vals) / len(other_vals)

        diff_from_others = abs(val - other_avg)
        if diff_from_others > threshold:
            # Check if flag already exists
            existing_flag = db.query(ScoreOutlierFlag).filter(
                ScoreOutlierFlag.application_id == application_id,
                ScoreOutlierFlag.criteria_id == criteria_id,
                ScoreOutlierFlag.evaluator_id == score_obj.evaluator_id
            ).first()

            if not existing_flag:
                deviation_val = abs(val - panel_avg)
                flag = ScoreOutlierFlag(
                    id=uuid.uuid4(),
                    application_id=application_id,
                    criteria_id=criteria_id,
                    evaluator_id=score_obj.evaluator_id,
                    evaluator_score=Decimal(str(val)),
                    panel_average=Decimal(str(round(panel_avg, 2))),
                    deviation=Decimal(str(round(deviation_val, 2)))
                )
                db.add(flag)
                new_flags.append(flag)

    if new_flags:
        db.commit()

    return new_flags
