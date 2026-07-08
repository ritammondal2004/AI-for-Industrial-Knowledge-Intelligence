

# Exposes evaluation results to the frontend

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/eval", tags=["Evaluation"])

EVAL_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "eval" / "plots" / "eval_results.json"


class EvalDataResponse(BaseModel):
    score_distribution: dict
    by_difficulty: dict
    by_category: dict
    radar: dict         
    question_scores: list[dict]
    summary: dict


@router.get("/results", response_model=EvalDataResponse)
async def get_eval_results():
    """
    GET /eval/results  
    """
    if not EVAL_DATA_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Evaluation data not found. "
                "Run: python eval/run_eval.py && python eval/plots.py"
            )
        )   

    with open(EVAL_DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
                 
    return EvalDataResponse(**data)