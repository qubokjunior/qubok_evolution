import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const patcherPath = join(process.cwd(), "_patch_transfer", "m32_terrain_material_layer_patch.mjs");
let text = readFileSync(patcherPath, "utf8");

const bad = String.raw`'  const outputText = transpiled.outputText.replaceAll("from \\\"./arrays\\\"", "from \\\"./arrays.mjs\\\"").replaceAll("from \\\'./arrays\\\'", "from \\\'./arrays.mjs\\\'");',`;
const good = String.raw`'  const outputText = transpiled.outputText.replaceAll("from \\\"./arrays\\\"", "from \\\"./arrays.mjs\\\"");',`;

const countBefore = text.split(bad).length - 1;
if (countBefore < 1) {
  throw new Error("m32 patcher quote repair anchor not found");
}

text = text.split(bad).join(good);
writeFileSync(patcherPath, text, "utf8");
console.log("m32 patcher quote escaping repaired", { replacements: countBefore });
