# Contributing

Contributions should preserve the project’s primary contract: **record local endpoint observations carefully, label their provenance, and avoid overstating conclusions**. Before opening a pull request, describe whether a new measurement is direct, estimated, or simulated and document its traffic profile.

| Change type | Required evidence |
|---|---|
| New measurement adapter | Unit tests for successful and recoverable failure cases, a documented timeout, and an explanation of any network traffic it creates. |
| Statistics or charts | Tests that retain provenance separation and screenshots or manual checks of empty and error states. |
| Persistence changes | A backwards-aware migration plan and tests for timestamped records and events. |
| Scheduling changes | Idempotent behavior, authenticated callback validation, and a safe interval no shorter than 15 minutes. |

Use pnpm for dependency management. Run `pnpm test`, `pnpm check`, and `pnpm build` before submitting work. Never commit `.env` files, local SQLite files, endpoint credentials, or unredacted measurement exports.

Please keep pull requests focused. If a change alters the interpretation boundary for availability incidents, explain the change prominently in the pull request description and update both the README and safety documentation.
