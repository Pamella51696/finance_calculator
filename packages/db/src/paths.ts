import fs from "node:fs";
import path from "node:path";

export function resolveDataDir(cwd: string = process.cwd()): string {
  const root = findRepoRoot(cwd);
  const dataDir = path.join(root, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

export function resolveDbPath(cwd: string = process.cwd()): string {
  return path.join(resolveDataDir(cwd), "finance.db");
}

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(dir, "package.json"), "utf8"),
      ) as { name?: string };
      if (pkg.name === "finance_calculator") return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}
