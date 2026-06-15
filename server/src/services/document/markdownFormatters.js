function displayFileName(fileName = "Document") {
  return String(fileName || "Document").trim() || "Document";
}

function wrapDocumentTitle(fileName) {
  return `# ${displayFileName(fileName)}`;
}

function formatPdfTextAsMarkdown(fileName, rawText) {
  const text = String(rawText || "").trim();
  if (!text) return `${wrapDocumentTitle(fileName)}\n\n## Page 1\n\n`;

  const pages = text.split("\f").map((page) => page.trim()).filter(Boolean);
  if (pages.length <= 1) {
    return `${wrapDocumentTitle(fileName)}\n\n## Page 1\n\n${text}`;
  }

  const body = pages
    .map((page, index) => `## Page ${index + 1}\n\n${page}`)
    .join("\n\n");

  return `${wrapDocumentTitle(fileName)}\n\n${body}`;
}

function formatOcrTextAsMarkdown(fileName, text) {
  const body = String(text || "").trim();
  return `${wrapDocumentTitle(fileName)}\n\n## Page 1\n\n${body}`;
}

function formatDocxMarkdown(fileName, markdownBody) {
  const body = String(markdownBody || "").trim();
  return body ? `${wrapDocumentTitle(fileName)}\n\n${body}` : wrapDocumentTitle(fileName);
}

function formatEmbeddedImageOcrBlock(text, imageIndex) {
  const body = String(text || "").trim();
  if (!body) return "";

  return `\n\n### Extracted from embedded image ${imageIndex}\n\n${body}\n\n`;
}

function escapeTableCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function rowsToMarkdownTable(rows) {
  if (!rows.length) return "";

  const width = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => {
    const copy = [...row];
    while (copy.length < width) copy.push("");
    return copy.map(escapeTableCell);
  });

  const header = normalized[0];
  const divider = header.map(() => "---");
  const dataRows = normalized.slice(1);

  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
    ...dataRows.map((row) => `| ${row.join(" | ")} |`),
  ];

  return lines.join("\n");
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function formatCsvAsMarkdown(fileName, csvText) {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return `${wrapDocumentTitle(fileName)}\n\n`;
  }

  const rows = lines.map(parseCsvLine);
  const table = rowsToMarkdownTable(rows);
  return `${wrapDocumentTitle(fileName)}\n\n${table}`;
}

function formatPlainTextAsMarkdown(fileName, text) {
  const body = String(text || "").trim();
  return body ? `${wrapDocumentTitle(fileName)}\n\n${body}` : wrapDocumentTitle(fileName);
}

function markdownToPlainText(markdown) {
  return String(markdown || "")
    .replace(/^#+\s+.+$/gm, "")
    .replace(/^\|.*\|$/gm, (line) => line.replace(/\|/g, " ").trim())
    .replace(/\*\*|__/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

module.exports = {
  displayFileName,
  wrapDocumentTitle,
  formatPdfTextAsMarkdown,
  formatOcrTextAsMarkdown,
  formatDocxMarkdown,
  formatEmbeddedImageOcrBlock,
  rowsToMarkdownTable,
  formatCsvAsMarkdown,
  formatPlainTextAsMarkdown,
  markdownToPlainText,
};
