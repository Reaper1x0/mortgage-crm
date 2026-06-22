const XLSX = require("xlsx");
const { toSafeString } = require("./queryBuilder.utils");

const isRowCompletelyEmpty = (row = {}, valueGetter = (v) => toSafeString(v)) => {
  return Object.values(row).every((value) => !valueGetter(value));
};

const parseSpreadsheetBuffer = (fileBuffer) => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (!rows.length) return { columns: [], rows: [] };

  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  const normalizedHeaders = headerRow.map((value, index) => {
    const label = toSafeString(value);
    return label || `Column_${index + 1}`;
  });

  const dataRows = rows.slice(1).map((rawRow) => {
    const rowArray = Array.isArray(rawRow) ? rawRow : [];
    const rowObject = {};

    normalizedHeaders.forEach((header, idx) => {
      rowObject[header] = rowArray[idx] ?? "";
    });

    return rowObject;
  });

  return { columns: normalizedHeaders, rows: dataRows };
};

const buildSampleWorkbook = (headers, sampleRows = [], sheetName = "Sheet1") => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

/**
 * Map spreadsheet rows using column mapping and validate with per-field rules.
 *
 * schema[field] = { required?: boolean, validate?: (value, row) => string|null }
 */
const validateMappedRows = ({
  rows = [],
  mapping = {},
  schema = {},
  sanitizeField = (field, value) => toSafeString(value),
  rowOffset = 2,
}) => {
  const validRows = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowData = row && typeof row === "object" ? row : {};
    const mapped = {};

    for (const [field, columnKey] of Object.entries(mapping)) {
      if (!columnKey) continue;
      mapped[field] = sanitizeField(field, rowData[columnKey]);
    }

    if (isRowCompletelyEmpty(mapped)) {
      errors.push({ row: index + rowOffset, reason: "Empty row" });
      return;
    }

    let rowValid = true;
    for (const [field, rules] of Object.entries(schema)) {
      const value = mapped[field];

      if (rules.required && !toSafeString(value)) {
        errors.push({ row: index + rowOffset, reason: `${field} is required` });
        rowValid = false;
        break;
      }

      if (rules.validate) {
        const message = rules.validate(value, mapped);
        if (message) {
          errors.push({ row: index + rowOffset, reason: message });
          rowValid = false;
          break;
        }
      }
    }

    if (rowValid) validRows.push(mapped);
  });

  return { validRows, errors };
};

const assertSpreadsheetFile = (file) => {
  if (!file) return "Upload a CSV or XLSX file";
  const ext = (file.originalname || "").toLowerCase();
  if (!ext.endsWith(".csv") && !ext.endsWith(".xlsx")) {
    return "Only CSV and XLSX files are supported";
  }
  return null;
};

module.exports = {
  isRowCompletelyEmpty,
  parseSpreadsheetBuffer,
  buildSampleWorkbook,
  validateMappedRows,
  assertSpreadsheetFile,
};
