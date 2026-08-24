# AI Trend Summary

The AI trend-summary panel is a **user-triggered interpretation aid**, not an autonomous monitoring action. It is available for the selected endpoint and date range after the user selects **Generate summary**.

| Item | Behavior |
|---|---|
| Model selection | The server queries the live catalog and selects `gpt-5-mini` when available, with a safe catalog fallback. |
| Input to the model | Endpoint display label, selected-window boundaries, record and provenance counts, aggregate availability/latency/DNS/loss values, and endpoint-local incident counts. |
| Omitted input | Endpoint URL, DNS hostname, raw failure messages, status codes, user identity, and measurement-by-measurement history. |
| Output contract | A validated JSON object with a headline, narrative, bounded highlights, explicit provenance for each highlight, and an interpretation caveat. |
| Safety instruction | The model is told not to infer root cause, claim internet-wide outages, or represent simulated records as direct observations. |

> When simulated records dominate a selected window, the resulting summary is a **demo interpretation**. It is not a live network assessment.

The AI response is generated at request time and is not persisted by the application. The interface shows a loading state, reports failures without substituting invented analysis, and exposes the responding model identifier for transparency.

If a structured model response contains no visible text, the server makes one bounded plain-JSON retry using the same aggregate-only input and validates that reply against the same output contract. It does not fabricate an insight if both calls are unusable.

When a summary already exists, **Refresh summary** preserves the earlier result while the new request is in progress and clearly announces that it will be replaced. This avoids a misleading empty panel during re-analysis.
