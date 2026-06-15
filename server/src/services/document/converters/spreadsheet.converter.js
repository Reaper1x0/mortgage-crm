const XLSX = require("xlsx");
const { wrapDocumentTitle, rowsToMarkdownTable } = require("../markdownFormatters");

function sheetToMarkdownSection(sheetName, sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (!rows.length) {
    return `## Sheet: ${sheetName}\n\n`;
  }

  const table = rowsToMarkdownTable(rows);
  return `## Sheet: ${sheetName}\n\n${table}`;
}

async function convertXlsxToMarkdown({ buffer, fileName }) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sections = workbook.SheetNames.map((sheetName) =>
    sheetToMarkdownSection(sheetName, workbook.Sheets[sheetName])
  );

  const body = sections.join("\n\n").trim();
  const markdown = body
    ? `${wrapDocumentTitle(fileName)}\n\n${body}`
    : wrapDocumentTitle(fileName);

  return {
    markdown,
    method: "xlsx",
  };
}

module.exports = { convertXlsxToMarkdown };
