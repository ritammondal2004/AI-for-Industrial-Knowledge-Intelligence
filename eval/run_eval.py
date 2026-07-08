
# eval/run_eval.py  

import json
import csv
import time
import os
import sys
import argparse
from datetime import datetime
from pathlib import Path

import requests

# Allow imports from project root  
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
            
from eval.metrics import (
    source_match_score,
    folder_match_score,
    keyword_coverage_score,
    answer_length_score,
    not_found_penalty,
    multi_doc_score,
    compute_overall_score
)           

# ── Config
BACKEND_URL    = os.environ.get("BACKEND_URL", "http://localhost:8000")
TEST_SET_PATH  = Path(__file__).parent / "qa_test_set.json"
RESULTS_PATH   = Path(__file__).parent / "results.csv"
REPORT_PATH    = Path(__file__).parent / "report.md"
DELAY_SECONDS  = 2.0    # pause between questions to avoid rate limits  

#     # Load test set
# print(TEST_SET_PATH)
# print(TEST_SET_PATH.exists()) 
            
# ── Progress tracking ─
PROGRESS_PATH = Path(__file__).parent / "eval_progress.json"

def load_eval_progress() -> set:
    """Returns set of already-evaluated question IDs."""
    if PROGRESS_PATH.exists():
        with open(PROGRESS_PATH, "r") as f:
            data = json.load(f)
        return set(data.get("completed_ids", []))
    return set()

def save_eval_progress(completed_ids: set) -> None:
    """Saves set of completed IDs to disk."""
    with open(PROGRESS_PATH, "w") as f:
        json.dump({"completed_ids": list(completed_ids)}, f, indent=2)


def load_test_set(path: Path) -> list[dict]:  
    """Loads test set from JSONL or JSON array file."""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read().strip()
                 
    if content.startswith("["):
        return json.loads(content)
    else:  
        return [json.loads(line) for line in content.splitlines() if line.strip()]
                       

def query_backend(question: str) -> dict | None:
    """Calls POST /query and returns the response dict."""
    try:          
        r = requests.post(
            f"{BACKEND_URL}/query",
            json={"question": question, "chat_history": [], "verbose": False},
            timeout=60,
        )
        if r.status_code == 200:
            return r.json()
        else:
            print(f"  ✗ HTTP {r.status_code}: {r.text[:100]}")
            return None
    except Exception as e:
        print(f"  ✗ Request failed: {e}")
        return None


def evaluate_one(test_case: dict, response: dict) -> dict:
    """
    Scores a single test case against its API response.
    Returns a flat dict of all scores for CSV writing.
    """
    answer  = response.get("answer", "")
    sources = response.get("sources", [])

    # ── Individual metric scores ──────────────────────────────────
    s_source  = source_match_score(
        test_case.get("expected_docs", []), sources
    )
    s_folder  = folder_match_score(
        test_case.get("expected_folder", ""), sources
    )
    s_keyword = keyword_coverage_score(
        test_case.get("expected_keywords", []), answer
    )
    s_length  = answer_length_score(answer)
    s_nf      = not_found_penalty(answer)
    s_multi   = multi_doc_score(
        sources, test_case.get("multi_document", False)
    )
    s_overall = compute_overall_score(
        s_source, s_folder, s_keyword, s_length, s_nf, s_multi
    )

    # Retrieved doc names for inspection 
    retrieved_docs = "|".join(s.get("filename", "") for s in sources)

    return {
        "id"              : test_case["id"],
        "difficulty"      : test_case.get("difficulty", ""),
        "category"        : test_case.get("category", ""),
        "question"        : test_case["question"],
        "expected_folder" : test_case.get("expected_folder", ""),
        "expected_docs"   : "|".join(test_case.get("expected_docs", [])),
        "retrieved_docs"  : retrieved_docs,
        "source_score"    : round(s_source, 3),
        "folder_score"    : round(s_folder, 3),
        "keyword_score"   : round(s_keyword, 3),
        "length_score"    : round(s_length, 3),
        "not_found_score" : round(s_nf, 3),
        "multi_doc_score" : round(s_multi, 3),
        "overall_score"   : round(s_overall, 3),
        "answer_preview"  : answer[:200].replace("\n", " "),
        "requires_graph"  : test_case.get("requires_graph", False),
    }         


def run_evaluation(
    test_set: list[dict],
    limit: int | None = None,
) -> list[dict]:
    """
    Picks next N pending questions when limit is given.
    Results are APPENDED to existing results.csv (not overwritten).
    """
    # Load which IDs are already done
    completed_ids = load_eval_progress()

    # Filter to only pending questions
    pending = [tc for tc in test_set if tc["id"] not in completed_ids]

    if not pending:
        print("\n✓ All questions already evaluated. Nothing to do.")
        print(f"  Completed: {len(completed_ids)}/{len(test_set)}")
        return []

    # Take next N from pending
    batch = pending[:limit] if limit else pending
    total = len(batch)

    print(f"\n{'='*60}")
    print(f"Evaluation batch: {total} questions")
    print(f"Already done    : {len(completed_ids)}/{len(test_set)}")
    print(f"Remaining after : {len(pending) - total}")
    print(f"Backend         : {BACKEND_URL}")
    print(f"{'='*60}\n")

    results = []

    for i, tc in enumerate(batch):
        qid  = tc["id"]
        diff = tc.get("difficulty", "?")
        cat  = tc.get("category", "?")
        q    = tc["question"]

        print(f"[{i+1}/{total}] ID:{qid} [{diff}] [{cat}]")
        print(f"  Q: {q[:70]}...")

        response = query_backend(q)

        if response is None:
            print(f"  ✗ Skipped — no response (will retry next run)")
            # Do NOT mark as complete — retry next time
            continue

        result = evaluate_one(tc, response)
        results.append(result)

        # Mark as complete only on success
        completed_ids.add(qid)
        save_eval_progress(completed_ids)

        print(f"  ✓ Overall: {result['overall_score']:.3f} | "
              f"Keyword: {result['keyword_score']:.3f} | "
              f"Source: {result['source_score']:.3f}")

        if i < total - 1:
            time.sleep(DELAY_SECONDS)

    print(f"\n✓ Batch complete: {len(results)} evaluated")
    print(f"  Total done: {len(completed_ids)}/{len(test_set)}")

    return results  


def save_results_csv(results: list[dict], path: Path) -> None:
    """Appends new results to CSV ."""
    if not results:
        return  
              
    fieldnames = list(results[0].keys())
    file_exists = path.exists()

    with open(path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()   # only write header on first run
        writer.writerows(results)

    print(f"✓ {len(results)} results appended to {path}")


def compute_summary(results: list[dict]) -> dict:
    """Computes aggregate statistics from results list."""
    if not results:
        return {}
             
    def avg(key):
        vals = [r[key] for r in results if isinstance(r.get(key), (int, float))]
        return sum(vals) / len(vals) if vals else 0.0

    # Overall averages
    summary = {
        "total_questions" : len(results),
        "avg_overall"     : avg("overall_score"),
        "avg_keyword"     : avg("keyword_score"),
        "avg_source"      : avg("source_score"),
        "avg_folder"      : avg("folder_score"),
        "avg_length"      : avg("length_score"),
        "avg_not_found"   : avg("not_found_score"),
        "avg_multi_doc"   : avg("multi_doc_score"),
    }

    # By difficulty
    for diff in ["easy", "medium", "hard"]:
        subset = [r for r in results if r.get("difficulty") == diff]
        if subset:     
            summary[f"avg_overall_{diff}"] = (
                sum(r["overall_score"] for r in subset) / len(subset)
            )             
            summary[f"count_{diff}"] = len(subset)

    # By category
    categories = list({r.get("category", "") for r in results})
    for cat in categories:
        if not cat:
            continue
        subset = [r for r in results if r.get("category") == cat]
        summary[f"avg_overall_cat_{cat}"] = (
            sum(r["overall_score"] for r in subset) / len(subset)
        )

    # Graph questions
    graph_subset = [r for r in results if r.get("requires_graph")]
    if graph_subset:
        summary["avg_overall_graph_questions"] = (
            sum(r["overall_score"] for r in graph_subset) / len(graph_subset)
        )

    return summary


def generate_report(
    results: list[dict],
    summary: dict,
    path: Path,
) -> None:
    """Generates a markdown report."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = [
        f"# Industrial Knowledge Copilot — Evaluation Report",
        f"",
        f"**Generated:** {timestamp}  ",
        f"**Backend:** {BACKEND_URL}  ",
        f"**Total questions evaluated:** {summary.get('total_questions', 0)}",
        f"",
        f"---",
        f"",
        f"## Overall Metrics",
        f"",
        f"| Metric | Score |",
        f"|--------|-------|",
        f"| **Overall Score** | **{summary.get('avg_overall', 0):.1%}** |",
        f"| Keyword Coverage | {summary.get('avg_keyword', 0):.1%} |",
        f"| Source Retrieval | {summary.get('avg_source', 0):.1%} |",
        f"| Folder Routing   | {summary.get('avg_folder', 0):.1%} |",
        f"| Answer Quality   | {summary.get('avg_length', 0):.1%} |",
        f"| Not-Found Guard  | {summary.get('avg_not_found', 0):.1%} |",
        f"",
        f"---",     
        f"",
        f"## By Difficulty",
        f"",
        f"| Difficulty | Count | Avg Score |",
        f"|------------|-------|-----------|",
    ]
             
    for diff in ["easy", "medium", "hard"]:
        count = summary.get(f"count_{diff}", 0)
        score = summary.get(f"avg_overall_{diff}", 0)
        if count:
            lines.append(f"| {diff.capitalize()} | {count} | {score:.1%} |")

    lines += [
        f"",
        f"---",
        f"",
        f"## By Category",
        f"",
        f"| Category | Avg Score |",
        f"|----------|-----------|",
    ]

    for key, val in sorted(summary.items()):
        if key.startswith("avg_overall_cat_"):
            cat = key.replace("avg_overall_cat_", "")
            lines.append(f"| {cat} | {val:.1%} |")

    # Worst performing questions
    sorted_results = sorted(results, key=lambda r: r.get("overall_score", 0))
    worst = sorted_results[:5]

    lines += [
        f"",
        f"---",
        f"",
        f"## 5 Worst Performing Questions",
        f"",
    ]

    for r in worst:
        lines.append(
            f"- **[{r['difficulty']}] ID {r['id']}** "
            f"(score: {r.get('overall_score', 0):.3f}): "
            f"{r['question'][:80]}"
        )

    # Best performing
    best = sorted_results[-5:][::-1]
    lines += [
        f"",
        f"## 5 Best Performing Questions",
        f"",
    ]

    for r in best:
        lines.append(
            f"- **[{r['difficulty']}] ID {r['id']}** "
            f"(score: {r.get('overall_score', 0):.3f}): "
            f"{r['question'][:80]}"
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"✓ Report saved to {path}")


def print_summary(summary: dict) -> None:
    """Prints summary to terminal."""
    print(f"\n{'='*60}")
    print(f"EVALUATION SUMMARY")
    print(f"{'='*60}")
    print(f"Total questions : {summary.get('total_questions', 0)}")
    print(f"Overall score   : {summary.get('avg_overall', 0):.1%}")
    print(f"Keyword score   : {summary.get('avg_keyword', 0):.1%}")
    print(f"Source score    : {summary.get('avg_source', 0):.1%}")
    print(f"Folder score    : {summary.get('avg_folder', 0):.1%}")
    print(f"{'='*60}\n")


# ── Entry point
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Evaluate Industrial Knowledge Copilot"
    )
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Limit number of questions (default: all)"
    )
    parser.add_argument(
        "--backend", type=str, default=None,
        help="Backend URL override (default: http://localhost:8000)"
    )
    args = parser.parse_args()

    if args.backend:
        BACKEND_URL = args.backend


                                        
    test_set = load_test_set(TEST_SET_PATH)
    print(f"Loaded {len(test_set)} test questions from {TEST_SET_PATH}")
                
    # Run evaluation
    results = run_evaluation(test_set, limit=args.limit)

    # Save CSV
    save_results_csv(results, RESULTS_PATH)

    # Compute summary
    summary = compute_summary(results)

    # Generate report
    generate_report(results, summary, REPORT_PATH)

    # Print to terminal
    print_summary(summary) 