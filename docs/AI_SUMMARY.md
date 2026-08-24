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

## Downloading a generated summary

After a validated summary is visible, the panel offers **Markdown** and **PDF** downloads. Both documents are generated in the browser from the currently displayed headline, narrative, highlights, provenance labels, model/parser identifiers, selected UTC window, and interpretation boundary. The download formatter includes the endpoint display label but deliberately does **not** include an endpoint URL, raw error text, or additional measurement-by-measurement history. PDF generation is invoked only when the user selects its download action.

Users can also select **Add to batch** for several generated summaries and choose which queued items to include in one **Batch PDF**. Each selected summary is page-separated and retains its own endpoint label, UTC window, model/parser fields, provenance-bearing highlights, and caveat. The queue is held only in the current browser session; it is not stored by the application and no extra source data is sent to the model to create the export.

Queue rows can be reordered with drag and drop before export. Visible move-up and move-down buttons provide a keyboard-accessible alternative, and the batch PDF follows that exact displayed queue order.

If a structured model response contains no visible text, the server makes one bounded plain-JSON retry using the same aggregate-only input and validates that reply against the same output contract. It does not fabricate an insight if both calls are unusable.

When a summary already exists, **Refresh summary** preserves the earlier result while the new request is in progress and clearly announces that it will be replaced. This avoids a misleading empty panel during re-analysis.
