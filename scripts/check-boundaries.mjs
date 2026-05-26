import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const projectRoot = process.cwd();

const rules = [
  {
    label: "sim must not import PixiJS",
    root: "src/sim",
    pattern: /from\s+["']pixi\.js["']|import\s+["']pixi\.js["']/u
  },
  {
    label: "sim must not import editor modules",
    root: "src/sim",
    pattern: /from\s+["'][./]*.*editor/u
  },
  {
    label: "sim must not import UI modules",
    root: "src/sim",
    pattern: /from\s+["'][./]*.*ui/u
  }
];

let failures = 0;

for (const rule of rules) {
  const absoluteRoot = join(projectRoot, rule.root);
  const files = await collectSourceFiles(absoluteRoot);

  for (const file of files) {
    const text = await readFile(file, "utf8");

    if (rule.pattern.test(text)) {
      failures += 1;
      console.error(`boundary fail: ${rule.label}: ${relative(projectRoot, file)}`);
    }
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log("boundary checks passed");
}

async function collectSourceFiles(dir) {
  let entries = [];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)));
    } else if (/\.(ts|tsx|js|jsx)$/u.test(entry.name)) {
      files.push(path);
    }
  }

  return files;
}
