# Local and Portable Use

Internet Time Machine can be run as a self-hosted Node application on **Linux** or **Windows**. It is not a native desktop binary, but the repository includes portable launch commands that work from a checked-out folder without using the hosted dashboard.

| Task | Linux / macOS shell | Windows PowerShell or Command Prompt |
|---|---|---|
| Install dependencies | `pnpm install` | `pnpm install` |
| Development at port 3000 | `./run-local.sh` | `run-local.cmd` |
| Development at a specific port | `./run-local.sh --port=4100` | `run-local.cmd --port=4100` |
| Production build | `pnpm build` | `pnpm build` |
| Run production build | `pnpm start:local -- --port=4100` | `pnpm start:local -- --port=4100` |

The local launch script provides `NODE_ENV` and `PORT` in a cross-platform way and tries the selected port first. If that port is occupied, the server selects the next free port in its small local range and prints it to the terminal. The full-stack app needs Node.js 22+ and pnpm. Local monitoring data remains in the application’s embedded repository; do not commit local database files or exports.

> The published managed version is available at **https://timemachine-alxsadqu.manus.space**. The hosted URL is optional; local use does not require the hosted site.
