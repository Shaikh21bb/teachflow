import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";

const assets = new URL("../dist/assets/", import.meta.url);
const names = (await readdir(assets)).filter((name) =>
  /^(Games-|ArenaGame-|games-|browser-).+\.(js|css)$/.test(name),
);
assert.ok(
  names.some((name) => name.startsWith("ArenaGame-")),
  "Build the application first",
);
let gzipBytes = 0;
for (const name of names)
  gzipBytes += gzipSync(await readFile(new URL(name, assets))).length;
assert.ok(
  gzipBytes < 64 * 1024,
  `Arena chunks exceed 64 KiB gzip: ${gzipBytes}`,
);
console.log(
  JSON.stringify({
    arenaLazyAssets: names.length,
    gzipBytes,
    budgetBytes: 64 * 1024,
    excludesSharedApplication: true,
  }),
);

const questAssets = (await readdir(assets)).filter((name) =>
  /^(Student(Home|History|Quest|Shell|Auth|Login|Register)-|Quest(Map|Studio)-|student-|api-).+\.(js|css)$/.test(
    name,
  ),
);
assert.ok(
  questAssets.some((name) => name.startsWith("StudentQuest-")),
  "Quest entry is missing",
);
let questBytes = 0;
for (const name of questAssets)
  questBytes += gzipSync(await readFile(new URL(name, assets))).length;
assert.ok(
  questBytes < 64 * 1024,
  `Quest chunks exceed 64 KiB gzip: ${questBytes}`,
);
console.log(
  JSON.stringify({
    questLazyAssets: questAssets.length,
    gzipBytes: questBytes,
    budgetBytes: 64 * 1024,
    excludesSharedApplication: true,
  }),
);
