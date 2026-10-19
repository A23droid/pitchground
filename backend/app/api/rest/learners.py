from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_learner
from app.models import Learner, LearnerDimensionScore, ProfileSnapshot, Session as SessionModel, Attempt, AttemptMetrics, DiagnosisRow
from app.schemas.api import LearnerCreate, LearnerOut

router = APIRouter(prefix="/v1/learners", tags=["learners"])


@router.post("", status_code=201)
def create_learner(body: LearnerCreate, db: Session = Depends(get_db), learner: Learner = Depends(get_current_learner)):
    learner.display_name = body.display_name
    learner.practice_language = body.practice_language
    db.commit()
    db.refresh(learner)
    return {
        "id": learner.id,
        "display_name": learner.display_name,
        "practice_language": learner.practice_language,
        "created_at": learner.created_at.isoformat() if learner.created_at else None,
    }


@router.get("/me")
def me_learner(learner: Learner = Depends(get_current_learner)):
    return {
        "id": learner.id,
        "display_name": learner.display_name,
        "practice_language": learner.practice_language,
        "email": learner.email,
        "created_at": learner.created_at.isoformat() if learner.created_at else None,
    }


@router.get("/{learner_id}/profile")
def profile(learner_id: str, db: Session = Depends(get_db), current: Learner = Depends(get_current_learner)):
    learner = db.get(Learner, learner_id)
    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found")
    if learner.id != current.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    from collections import defaultdict
    from datetime import datetime, timezone, timedelta
    from sqlalchemy.orm import selectinload
    from app.services.practice_report import overall
    from app.services.verified_metrics import verified_attempts
    sessions=(db.query(SessionModel).filter(SessionModel.learner_id==learner_id)
              .options(selectinload(SessionModel.attempts).selectinload(Attempt.metrics),selectinload(SessionModel.diagnosis))
              .order_by(SessionModel.created_at).all())
    values=defaultdict(list)
    recent=[]; progress=[]; pressure_drops=[]; language_scores=defaultdict(list)
    comparison=None; completed=[]; mode_usage={};latest_snapshot=None
    for session in sessions:
        pairs=verified_attempts(sorted(session.attempts,key=lambda a:a.created_at))
        bundles=[b for a,b in pairs]
        by_role={a.role:b for a,b in pairs}
        for attempt,bundle in pairs:
            for key,value in bundle.fused.model_dump().items():
                if value is not None: values[key].append((value*100,attempt.created_at,(session.mode,session.language,session.difficulty,bundle.provenance.get("speech_pipeline","legacy"),bundle.provenance.get("scoring_policy",{}).get("version","legacy"))))
            target=json.loads(attempt.pressure_spec_json or "{}").get("language") or session.language
            if bundle.language.primary_ratio is not None: language_scores[target].append(bundle.language.primary_ratio*100)
        first=bundles[0] if bundles else None; last=bundles[-1] if bundles else None
        if "baseline" in by_role and "pressure" in by_role:
            a,b=by_role["baseline"].fused.fluency,by_role["pressure"].fused.fluency
            if a is not None and b is not None: pressure_drops.append((a-b)*100)
        if "comfortable" in by_role and "english" in by_role:
            a,b=by_role["comfortable"],by_role["english"]
            target = {"Hindi":"hi", "Malayalam":"ml", "Mixed":"mixed"}.get(session.language)
            if b.language.primary == "en" and (a.language.primary == target or (target == "mixed" and a.language.primary != "unknown")):
                comparison=dict(language=session.language,comfortable_score=round(a.fused.fluency*100) if a.fused.fluency is not None else None,
                            english_score=round(b.fused.fluency*100) if b.fused.fluency is not None else None,
                            content_score=round(b.content.coverage*100) if b.content and b.content.coverage is not None else None)
        measured=overall(last) if last else None
        recent.append(dict(id=session.id,topic=session.topic,mode=session.mode,phase=session.phase,
                           created_at=session.created_at.isoformat(),overall_score=measured,
                           score_delta=overall(last)-overall(first) if len(bundles)>1 else None,
                           primary_weakness=session.diagnosis.condition.replace("_"," ") if last and session.diagnosis else None,
                           metrics_verified=bool(last)))
        if last:
            latest_snapshot=dict(attempt_id=last.attempt_id,fused=last.fused.model_dump(),provenance=last.provenance,at=session.updated_at.isoformat())
            progress.append(dict(sessionLabel=f"S{len(progress)+1}",date=session.created_at.isoformat(),
                                 structure=round(last.fused.structure*100) if last.fused.structure is not None else None,
                                 fillers=last.acoustic.filler_rate if last.acoustic.filler_detection.get("status")=="complete" else None,englishArticulation=round(last.language.primary_ratio*100) if last.language.primary_ratio is not None else None))
            usage=mode_usage.setdefault(session.mode,dict(sessions=0,scores=[]))
            usage["sessions"]+=1;usage["scores"].append(measured)
            if session.phase=="completed":completed.append(session)
    dimensions=[]
    for key,readings in values.items():
        ordered=sorted(readings,key=lambda row:row[1])
        scores=[v for v,t,c in ordered]
        context=ordered[-1][2]
        comparable=[v for v,t,c in ordered if c==context]
        trend="insufficient-data"
        if len(comparable)>=6:
            delta=sum(comparable[-3:])/3-sum(comparable[-6:-3])/3
            trend="improving" if delta>3 else "worsening" if delta< -3 else "stable"
        dimensions.append(dict(id=key,score=sum(scores)/len(scores),n=len(scores),trend=trend))
    days={s.updated_at.date() for s in completed}
    day=datetime.now(timezone.utc).date()
    if day not in days:day-=timedelta(days=1)
    streak=0
    while day in days:streak+=1;day-=timedelta(days=1)
    return dict(learner_id=learner.id,display_name=learner.display_name,practice_language=learner.practice_language,
                sessions_completed=len(completed),streak_days=streak,dimensions=dimensions,
                recent_sessions=list(reversed(recent)),progress=progress,language_comparison=comparison,
                language_scores=[dict(language=k,score=sum(v)/len(v)) for k,v in language_scores.items()],pressure_drops=pressure_drops,
                mode_usage={mode:dict(sessions=v["sessions"],average_score=round(sum(v["scores"])/len(v["scores"]))) for mode,v in mode_usage.items()},
                latest_snapshot=latest_snapshot)
