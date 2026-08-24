# Background Scheduling

The application uses an authenticated HTTP callback for recurring collection. This route is deliberately separate from the dashboard lifecycle: it can run while no browser is open and remains durable across application restarts.

| Safeguard | Behavior |
|---|---|
| Conservative cadence | Endpoint profiles accept only 15, 30, 60, 120, 240, 360, 720, or 1440 minutes. |
| One job per profile | The scheduler identifier is saved against the endpoint profile and is used to find it during callback execution. |
| Authenticated callbacks | The callback refuses ordinary requests and processes only scheduler-authenticated identities. |
| Idempotent endpoint lookup | Missing scheduled profiles are acknowledged as orphaned instead of retried indefinitely. |
| Bounded measurement | HTTP requests use a 10-second abort timer; unavailable optional capabilities remain blank rather than guessed. |

Deploy the application before enabling a schedule. The deployment environment must have persistent application storage suitable for the configured SQLite path, or a production-compatible repository implementation should be substituted. For the supplied managed deployment, schedule creation is performed after the site is published through the authenticated dashboard.

## Managed-hosting handoff

The recommended production route is the project’s managed hosting. After a validated checkpoint is available, open the project interface and select **Publish**. The deployment panel displays the assigned `manus.space` production URL, which is the URL to share after publication. A custom domain can also be configured from the project domain settings.

External providers such as Vercel and Netlify are not automatically published from this workspace. They may require additional adaptation because the application uses a Node/Express server, authenticated scheduled callbacks, and a filesystem-oriented SQLite repository. Before using an external provider, replace local SQLite persistence with storage appropriate for that provider and ensure its serverless/runtime model supports the scheduled callback path. For these reasons, managed hosting is the safer deployment handoff for the current implementation.
