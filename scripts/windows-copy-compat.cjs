// Packaging-only workaround for Node 24.14.0 fs.cpSync native crash on this Windows host.
// Does not modify application/runtime behavior. Do not enable in production.
const fs = require("node:fs"),
  path = require("node:path");
function copy(source, target, options = {}) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink())
    throw new Error("Compatibility copier refuses symbolic links");
  if (stat.isDirectory()) {
    if (!options.recursive) throw new Error("recursive option required");
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source))
      copy(path.join(source, entry), path.join(target, entry), options);
  } else if (stat.isFile()) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  } else throw new Error("Compatibility copier only accepts ordinary files");
}
fs.cpSync = copy;
require("node:module").syncBuiltinESMExports();
