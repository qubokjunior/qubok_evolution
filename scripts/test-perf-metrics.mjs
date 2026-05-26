import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_perf_metrics_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSharedModule("perfMetrics.ts", "perfMetrics.mjs");

const {
  PERF_METRICS_VERSION,
  PERF_METRIC_NAMES,
  createPerfMetricsBus
} = await import(pathToFileURL(join(temporaryDirectory, "perfMetrics.mjs")).href);

assertEqual(PERF_METRICS_VERSION, "qubok_evolve.perf_metrics.v1", "version");
assertEqual(PERF_METRIC_NAMES.includes("simMsPerTick"), true, "sim metric exists");
assertEqual(PERF_METRIC_NAMES.includes("workerTransferMs"), true, "future worker metric exists");

let now = 100;
const bus = createPerfMetricsBus({ now: () => now });

bus.record("simMsPerTick", 1.5);
bus.record("simMsPerTick", 2.5);
bus.record("simMsPerTick", 3.5);

const simStats = bus.getStats("simMsPerTick");
assertEqual(simStats.latest, 3.5, "latest");
assertEqual(simStats.min, 1.5, "min");
assertEqual(simStats.max, 3.5, "max");
assertEqual(simStats.count, 3, "count");
assertAlmostEqual(simStats.average, 2.5, 0.000001, "average");

bus.add("entityCount", 10);
bus.add("entityCount", 5);
assertEqual(bus.getLatest("entityCount"), 15, "add latest");
assertEqual(bus.getStats("entityCount").count, 2, "add count");

const endScope = bus.beginScope("renderMsPerFrame");
now = 112.25;
const elapsed = endScope();
assertAlmostEqual(elapsed, 12.25, 0.000001, "scope elapsed");
assertAlmostEqual(bus.getLatest("renderMsPerFrame"), 12.25, 0.000001, "scope recorded");
assertEqual(bus.getStats("renderMsPerFrame").count, 1, "scope count");

const snapshot = bus.makeSnapshot();
assertEqual(snapshot.version, PERF_METRICS_VERSION, "snapshot version");
assertEqual(snapshot.values.simMsPerTick, 3.5, "snapshot value");
assertEqual(snapshot.metrics.simMsPerTick.count, 3, "snapshot stats count");
assertEqual(snapshot.values.entityCount, 15, "snapshot entity value");
assertEqual(snapshot.metrics.entityCount.count, 2, "snapshot entity count");
assertEqual(snapshot.values.renderMsPerFrame, 12.25, "snapshot scope value");
assertEqual(snapshot.metrics.renderMsPerFrame.count, 1, "snapshot scope count");
assertEqual(snapshot.sampleSerial, 6, "sample serial");

bus.reset();
assertEqual(bus.getLatest("simMsPerTick"), 0, "reset latest");
assertEqual(bus.getStats("simMsPerTick").count, 0, "reset count");
assertEqual(bus.makeSnapshot().sampleSerial, 0, "reset serial");

let threw = false;
try {
  bus.record("simMsPerTick", Number.NaN);
} catch {
  threw = true;
}
assertEqual(threw, true, "reject NaN");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("perf metrics tests passed");

async function transpileSharedModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "shared", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });
  await writeFile(outputPath, transpiled.outputText, "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertAlmostEqual(actual, expected, epsilon, label) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}