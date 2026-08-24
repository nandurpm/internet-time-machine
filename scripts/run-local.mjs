import { spawn } from "node:child_process";

const mode = process.argv[2] ?? "dev";
const args = process.argv.slice(3);
const explicitPort = args.find(arg => arg.startsWith("--port="))?.split("=")[1]
  ?? args[args.indexOf("--port") + 1];
const port = explicitPort && !explicitPort.startsWith("--") ? explicitPort : process.env.PORT ?? "3000";

if (!Number.isInteger(Number(port)) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error("Provide a valid port with --port=3000 or PORT=3000.");
}
if (mode !== "dev" && mode !== "start") throw new Error("Use either 'dev' or 'start'.");

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const commandArgs = mode === "dev"
  ? ["exec", "tsx", "watch", "server/_core/index.ts"]
  : ["exec", "node", "dist/index.js"];

const child = spawn(pnpmCommand, commandArgs, {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: mode === "dev" ? "development" : "production", PORT: port },
});
child.on("exit", code => process.exit(code ?? 0));
