const path = require("path");

function addPathEntry(currentPath, entry) {
  if (!entry) return currentPath;

  const delimiter = path.delimiter;
  const parts = String(currentPath || "")
    .split(delimiter)
    .filter(Boolean);

  if (parts.includes(entry)) return currentPath;
  return `${entry}${delimiter}${currentPath || ""}`;
}

function setupRuntimeBinaryPaths() {
  const gmPath =
    process.env.GRAPHICSMAGICK_PATH ||
    "C:\\Program Files\\GraphicsMagick-1.3.46-Q16";
  const gsPath =
    process.env.GHOSTSCRIPT_BIN_PATH ||
    "C:\\Program Files\\gs\\gs10.06.0\\bin";

  let nextPath = process.env.PATH || "";
  nextPath = addPathEntry(nextPath, gmPath);
  nextPath = addPathEntry(nextPath, gsPath);

  process.env.PATH = nextPath;
}

module.exports = { setupRuntimeBinaryPaths };
