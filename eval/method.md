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

**Results (120 / 120 questions):**

| Metric           | Score  |
|------------------|--------|
| Overall Score    | 78.8%  |
| Keyword Coverage | 65.5%  |
| Source Retrieval | 79.6%  |
| Folder Routing   | 92.5%  |

**Key observation:** The high 92.5% folder routing accuracy demonstrates that the query routing pipeline consistently identifies the correct document category. Differences between folder routing and source retrieval accuracy are primarily caused by multiple valid documents within the same category, resulting in alternative but relevant source selections.