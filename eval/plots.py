# eval/plots.py
# Generates charts from results.csv   
import csv
import json
from pathlib import Path

RESULTS_PATH = Path(__file__).parent / "results.csv"
PLOTS_DIR    = Path(__file__).parent / "plots"


def load_results(path: Path) -> list[dict]:
    """Loads results from JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

              
def generate_chart_data(results: list[dict]) -> dict:
    """                   
    Generates chart-ready data structures.
    Returns JSON-serializable dict consumed by frontend.
    """             
    # . Score distribution histogram ─
    buckets = {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0}
    for r in results:
        score = float(r.get("overall_score", 0))
        if score < 0.2:   buckets["0-20%"]   += 1
        elif score < 0.4: buckets["20-40%"]  += 1
        elif score < 0.6: buckets["40-60%"]  += 1
        elif score < 0.8: buckets["60-80%"]  += 1
        else:             buckets["80-100%"] += 1

    # ── 2. By difficulty
    diff_scores: dict[str, list] = {}
    for r in results:
        diff = r.get("difficulty", "unknown")
        score = float(r.get("overall_score", 0))
        diff_scores.setdefault(diff, []).append(score)

    by_difficulty = {
        diff: round(sum(scores) / len(scores), 3)
        for diff, scores in diff_scores.items()
    }

    #  3. By category
    cat_scores: dict[str, list] = {}
    for r in results:
        cat = r.get("category", "unknown")
        score = float(r.get("overall_score", 0))
        cat_scores.setdefault(cat, []).append(score)

    by_category = {
        cat: round(sum(scores) / len(scores), 3)
        for cat, scores in cat_scores.items()
    }

    #  4. Metric radar data 
    def avg(key):
        vals = [float(r.get(key, 0)) for r in results]
        return round(sum(vals) / len(vals), 3) if vals else 0.0

    radar = {
        "Keyword Coverage" : avg("keyword_score"),
        "Source Retrieval" : avg("source_score"),
        "Folder Routing"   : avg("folder_score"),
        "Answer Quality"   : avg("length_score"),
        "Not-Found Guard"  : avg("not_found_score"),
        "Multi-Doc"        : avg("multi_doc_score"),
    }

    # ─ Question-level data for table 
    question_scores = [
        {
            "id"           : r["id"],
            "difficulty"   : r.get("difficulty", ""),
            "category"     : r.get("category", ""),
            "question"     : r.get("question", "")[:60] + "...",
            "overall_score": float(r.get("overall_score", 0)),
            "keyword_score": float(r.get("keyword_score", 0)),
            "source_score" : float(r.get("source_score", 0)),
        }
        for r in results
    ]

    return {
        "score_distribution" : buckets,
        "by_difficulty"      : by_difficulty,
        "by_category"        : by_category,
        "radar"              : radar,
        "question_scores"    : question_scores,
        "summary": {
            "total"        : len(results),
            "avg_overall"  : avg("overall_score"),
            "avg_keyword"  : avg("keyword_score"),
            "avg_source"   : avg("source_score"),
            "avg_folder"   : avg("folder_score"),
        }
    }


def save_chart_data(data: dict) -> Path:
    """Saves chart data as JSON for frontend consumption."""
    PLOTS_DIR.mkdir(exist_ok=True)
    out_path = PLOTS_DIR / "eval_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"✓ Chart data saved to {out_path}")
    return out_path


if __name__ == "__main__":
    results = load_results(RESULTS_PATH)
    print(f"Loaded {len(results)} results from {RESULTS_PATH}")
    data = generate_chart_data(results)
    save_chart_data(data)
    print(f"\nSummary:")
    print(f"  Total questions : {data['summary']['total']}")
    print(f"  Overall score   : {data['summary']['avg_overall']:.1%}")
    print(f"  Keyword score   : {data['summary']['avg_keyword']:.1%}")
    print(f"  Source score    : {data['summary']['avg_source']:.1%}")