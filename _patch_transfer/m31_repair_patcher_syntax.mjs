import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const patcherPath = join(process.cwd(), "_patch_transfer", "m31_roadmap_architecture_tracks_patch.mjs");
let text = readFileSync(patcherPath, "utf8");

const bad = "  assert(roadmap.includes(token), `roadmap missing track token: ${token}`);";
const good = "  assert(roadmap.includes(token), \"roadmap missing track token: \" + token);";

if (!text.includes(bad)) {
  throw new Error("Could not find bad nested template literal in m31 patcher.");
}

text = text.replace(bad, good);
writeFileSync(patcherPath, text, "utf8");
console.log("m31 patcher syntax repaired");
