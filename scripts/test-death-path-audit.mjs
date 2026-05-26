import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const simRoot = resolve(projectRoot, "src", "sim");

const allowedDirectAliveZeroFiles = new Set(["world.ts"]);

const directAliveZeroPatterns = [
  /\b[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*\.alive\s*\[[^\]]+\]\s*=\s*0\b/g,
  /\balive\s*\[[^\]]+\]\s*=\s*0\b/g
];

const violations = [];

for (const absolutePath of listTypeScriptFiles(simRoot)) {
  const relativePath = absolutePath.slice(projectRoot.length + 1).replaceAll("\\", "/");
  const fileName = basename(absolutePath);

  if (allowedDirectAliveZeroFiles.has(fileName)) {
    continue;
  }

  const source = stripComments(readFileSync(absolutePath, "utf8"));

  for (const pattern of directAliveZeroPatterns) {
    for (const match of source.matchAll(pattern)) {
      const text = match[0];
      if (isAllowedResourceLayerAliveWrite(relativePath, text)) {
        continue;
      }

      const location = getLineColumn(source, match.index ?? 0);
      violations.push({
        file: relativePath,
        line: location.line,
        column: location.column,
        text
      });
    }
  }
}

if (violations.length > 0) {
  const formatted = violations
    .map((violation) => {
      return `${violation.file}:${violation.line}:${violation.column} direct alive-zero write: ${violation.text}`;
    })
    .join("\n");

  throw new Error(
    `Found direct alive-zero writes outside world.ts. Runtime death paths must call killAgent(world, index).\n${formatted}`
  );
}

const worldSource = readText("src/sim/world.ts");
const movementSource = readText("src/sim/movement.ts");
const energySource = readText("src/sim/energy.ts");
const predatorPreySource = readText("src/sim/predatorPrey.ts");

assert(worldSource.includes("export function killAgent"), "world.ts must expose killAgent.");
assert(worldSource.includes("reusableSlotCount"), "world.ts must own reusable slot state.");
assert(movementSource.includes("killAgent(world, index)"), "movement.ts must route energy death through killAgent.");
assert(energySource.includes("killAgent(world, index)"), "energy.ts must route death through killAgent.");
assert(predatorPreySource.includes("killAgent(world, preyIndex)"), "predatorPrey.ts must route kills through killAgent.");

console.log("death path audit tests passed");

function listTypeScriptFiles(root) {
  const files = [];

  for (const entry of readdirSync(root)) {
    const absolutePath = join(root, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      files.push(...listTypeScriptFiles(absolutePath));
      continue;
    }

    if (entry.endsWith(".ts")) {
      files.push(absolutePath);
    }
  }

  return files;
}

function readText(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function isAllowedResourceLayerAliveWrite(relativePath, text) {
  return relativePath === "src/sim/resources.ts" && (text === "layer.alive[resourceIndex] = 0" || text === "alive[resourceIndex] = 0");
}

function getLineColumn(source, index) {
  const prefix = source.slice(0, index);
  const lines = prefix.split("\n");
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
