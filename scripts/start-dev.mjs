import { execSync, spawn } from "child_process";
import { rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// 1. Kill whatever is on port 3000
try {
  // Windows: find PID using port 3000 and kill it
  const result = execSync('netstat -ano | findstr ":3000 "', { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
  const pids = [...new Set(
    result.split("\n")
      .map(line => line.trim().split(/\s+/).pop())
      .filter(pid => pid && /^\d+$/.test(pid) && pid !== "0")
  )];
  for (const pid of pids) {
    try { execSync(`taskkill /f /pid ${pid}`, { stdio: "ignore" }); } catch {}
  }
  if (pids.length) console.log(`Freed port 3000 (killed PIDs: ${pids.join(", ")})`);
} catch {
  // Port was already free
}

// 2. Clear .next cache
try {
  rmSync(join(root, ".next"), { recursive: true, force: true });
  console.log("Cleared .next cache");
} catch {}

// 3. Start next dev
console.log("Starting dev server on http://localhost:3000 ...\n");
const child = spawn("node", ["node_modules/next/dist/bin/next", "dev"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env },
});

child.on("exit", (code) => process.exit(code ?? 0));
