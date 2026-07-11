## Evaluation Methodology

**Test Set:** 120 questions across 5 industrial categories
(Pumps, Valves, Process Safety, Incident Reports, Regulations)
at three difficulty levels (Easy / Medium / Hard).
36 questions evaluated to date.

**Scoring Formula:**

| Metric             | Weight | What It Measures                                      |
|--------------------|--------|-------------------------------------------------------|
| Keyword Coverage   | 40%    | % of expected answer keywords present in response     |
| Source Retrieval   | 25%    | % of expected source documents actually retrieved     |
| Folder Routing     | 15%    | Correct document category searched (binary)           |
| Not-Found Guard    | 10%    | Penalises false "not in knowledge base" responses     |
| Answer Quality     |  5%    | Answer length proxy (< 100 chars penalised)           |
| Multi-Document     |  5%    | Multi-source retrieval for cross-document questions   |

**Preliminary Results (36 / 120 questions):**

| Metric           | Score  |
|------------------|--------|
| Overall Score    | 71.7%  |
| Keyword Coverage | 66.1%  |
| Source Retrieval | 72.2%  |
| Folder Routing   | 83.3%  |

**Key observation:** Folder routing accuracy (83.3%) significantly
exceeds source retrieval (72.2%), confirming that the metadata-based
query routing is working correctly — the system searches the right
category but occasionally retrieves a different document within
that category than the expected one. This is expected behaviour
for questions with multiple valid source documents in the same folder.

Full 120-question results will be included in the final submission.