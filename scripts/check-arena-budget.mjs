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
