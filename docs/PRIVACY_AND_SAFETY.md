# Privacy and Safety

Internet Time Machine is designed for endpoints you own or are explicitly authorized to monitor. An endpoint URL, DNS hostname, result timestamp, HTTP status, and failure message can all reveal operational details. Treat the embedded database and exported files as sensitive records.

| Practice | Rationale |
|---|---|
| Use the least sensitive endpoint that answers the monitoring question. | A dedicated health endpoint is preferable to a privileged administration interface. |
| Keep credentials out of URLs. | URLs can be persisted, exported, logged, or displayed in browser history. The validator rejects embedded URL credentials. |
| Use the 15-minute minimum or a slower interval. | Slow, intentional collection reduces unnecessary traffic and avoids turning a diagnosis tool into an aggressive poller. |
| Keep speed tests opt-in. | Bulk transfers are qualitatively different from a small reachability probe and can consume metered capacity. |
| Generate AI summaries deliberately. | The summary receives only aggregate metrics and provenance totals, but each request uses project AI capacity and should be initiated by an authorized user. |
| Interpret incidents narrowly. | This monitor sees only the path between itself and one endpoint at one moment. It cannot establish a broader internet condition. |

> Demo records are simulated. They must not be exported as live evidence or used for service-level reporting.

Delete local SQLite history and exports when they are no longer needed. Protect any deployed dashboard with authentication, and do not share a public URL that exposes endpoint names or measurements.
