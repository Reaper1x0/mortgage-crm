const XLSX = require("xlsx");
const { R2XX, R4XX } = require("../Responses");
const { leadService } = require("../services");
const { catchAsync } = require("../utils");
const { parsePagination } = require("../utils/pagination.utils");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LEAD_FIELDS = ["fullName", "email", "phone", "company", "source", "notes"];

const toSafeString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const isRowCompletelyEmpty = (row = {}) => {
  return Object.values(row).every((value) => !toSafeString(value));
};

const sanitizeLeadPayload = (payload = {}) => {
  return {
    fullName: toSafeString(payload.fullName),
    email: toSafeString(payload.email),
    phone: toSafeString(payload.phone),
    company: toSafeString(payload.company),
    source: toSafeString(payload.source),
    notes: toSafeString(payload.notes),
  };
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

const LeadController = {
  listLeads: catchAsync(async (req, res) => {
    const workspaceId = req.workspaceId;
    const { page, limit, sort } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100,
      defaultSortBy: "createdAt",
      defaultSortOrder: "desc",
      allowedSortBy: ["createdAt", "updatedAt", "fullName", "email", "phone", "company", "source"],
    });

    const filter = { workspace: workspaceId };
    if (req.query.search) {
      filter.$or = [
        { fullName: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { phone: { $regex: req.query.search, $options: "i" } },
        { company: { $regex: req.query.search, $options: "i" } },
        { source: { $regex: req.query.search, $options: "i" } },
      ];
    }
    if (req.query.source) {
      filter.source = { $regex: req.query.source, $options: "i" };
    }
    if (req.query.company) {
      filter.company = { $regex: req.query.company, $options: "i" };
    }
    if (req.query.createdFrom || req.query.createdTo) {
      filter.createdAt = {};
      if (req.query.createdFrom) {
        filter.createdAt.$gte = new Date(req.query.createdFrom);
      }
      if (req.query.createdTo) {
        const end = new Date(req.query.createdTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const { items, pagination } = await leadService.listLeads({ page, limit, sort, filter });

    return R2XX(res, "Leads fetched successfully", 200, {
      leads: items,
      pagination,
    });
  }),

  createLead: catchAsync(async (req, res) => {
    const payload = sanitizeLeadPayload(req.body);
    if (!payload.fullName) return R4XX(res, 400, "Full name is required");
    if (payload.email && !EMAIL_REGEX.test(payload.email)) {
      return R4XX(res, 400, "Please provide a valid email");
    }

    const lead = await leadService.createLead({ ...payload, workspace: req.workspaceId });
    return R2XX(res, "Lead created successfully", 201, { lead });
  }),

  updateLead: catchAsync(async (req, res) => {
    const { id } = req.params;
    const payload = sanitizeLeadPayload(req.body);

    if (Object.prototype.hasOwnProperty.call(req.body, "fullName") && !payload.fullName) {
      return R4XX(res, 400, "Full name is required");
    }

    if (payload.email && !EMAIL_REGEX.test(payload.email)) {
      return R4XX(res, 400, "Please provide a valid email");
    }

    const lead = await leadService.updateLeadById(id, payload, req.workspaceId);
    if (!lead) return R4XX(res, 404, "Lead not found");

    return R2XX(res, "Lead updated successfully", 200, { lead });
  }),

  deleteLead: catchAsync(async (req, res) => {
    const { id } = req.params;
    const deleted = await leadService.deleteLeadById(id, req.workspaceId);
    if (!deleted) return R4XX(res, 404, "Lead not found");
    return R2XX(res, "Lead deleted successfully", 200);
  }),

  bulkDeleteLeads: catchAsync(async (req, res) => {
    const { ids = [] } = req.body;
    const result = await leadService.deleteLeadsByIds(ids, req.workspaceId);
    return R2XX(res, "Selected leads deleted successfully", 200, {
      deletedCount: result.deletedCount || 0,
    });
  }),

  moveLeadToClient: catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await leadService.moveLeadsToClients([id], req.workspaceId, req.user);
    if (!result.movedCount) {
      const reason = result.skipped?.[0]?.reason || "Lead could not be moved";
      const status = reason === "Lead not found" ? 404 : 409;
      return R4XX(res, status, reason);
    }
    return R2XX(res, "Lead moved to client successfully", 200, {
      movedCount: result.movedCount,
      skippedCount: result.skippedCount,
      skipped: result.skipped,
    });
  }),

  bulkMoveLeadsToClients: catchAsync(async (req, res) => {
    const { ids = [] } = req.body;
    const result = await leadService.moveLeadsToClients(ids, req.workspaceId, req.user);
    return R2XX(res, "Leads moved to clients", 200, {
      movedCount: result.movedCount,
      skippedCount: result.skippedCount,
      skipped: result.skipped,
    });
  }),

  downloadLeadsSampleTemplate: catchAsync(async (req, res) => {
    const headers = ["Full Name", "Email", "Phone", "Company", "Source", "Notes"];
    const sampleRows = [
      ["Jane Doe", "jane.doe@example.com", "555-0100", "Acme Mortgage", "Website", "Interested in refinance"],
      ["John Smith", "john@example.com", "555-0199", "", "Referral", ""],
    ];
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="leads-import-template.xlsx"');
    return res.status(200).send(buffer);
  }),

  bulkPreviewLeads: catchAsync(async (req, res) => {
    const file = req.file;
    if (!file) return R4XX(res, 400, "Upload a CSV or XLSX file");

    const ext = (file.originalname || "").toLowerCase();
    if (!ext.endsWith(".csv") && !ext.endsWith(".xlsx")) {
      return R4XX(res, 400, "Only CSV and XLSX files are supported");
    }

    const parsed = parseSpreadsheetBuffer(file.buffer);
    const nonEmptyRows = parsed.rows.filter((row) => !isRowCompletelyEmpty(row));

    return R2XX(res, "File parsed successfully", 200, {
      columns: parsed.columns,
      previewRows: nonEmptyRows.slice(0, 10),
      rows: nonEmptyRows,
      totalRows: nonEmptyRows.length,
      fields: LEAD_FIELDS,
    });
  }),

  bulkImportLeads: catchAsync(async (req, res) => {
    const { rows = [], mapping = {} } = req.body;
    if (!mapping.fullName) return R4XX(res, 400, "fullName mapping is required");

    let importedRows = 0;
    let skippedRows = 0;
    const skippedReasons = [];
    const leadsToInsert = [];

    rows.forEach((row, index) => {
      const rowData = row && typeof row === "object" ? row : {};

      const mappedLead = sanitizeLeadPayload({
        fullName: rowData[mapping.fullName],
        email: mapping.email ? rowData[mapping.email] : "",
        phone: mapping.phone ? rowData[mapping.phone] : "",
        company: mapping.company ? rowData[mapping.company] : "",
        source: mapping.source ? rowData[mapping.source] : "",
        notes: mapping.notes ? rowData[mapping.notes] : "",
      });

      if (isRowCompletelyEmpty(mappedLead)) {
        skippedRows += 1;
        skippedReasons.push({ row: index + 2, reason: "Empty row" });
        return;
      }

      if (!mappedLead.fullName) {
        skippedRows += 1;
        skippedReasons.push({ row: index + 2, reason: "fullName is required" });
        return;
      }

      if (mappedLead.email && !EMAIL_REGEX.test(mappedLead.email)) {
        skippedRows += 1;
        skippedReasons.push({ row: index + 2, reason: "Invalid email" });
        return;
      }

      leadsToInsert.push({ ...mappedLead, workspace: req.workspaceId });
    });

    if (leadsToInsert.length) {
      await leadService.createLeadsBulk(leadsToInsert);
      importedRows = leadsToInsert.length;
    }

    return R2XX(res, "Leads import completed", 200, {
      totalRows: rows.length,
      importedRows,
      skippedRows,
      skippedReasons,
    });
  }),
};

module.exports = LeadController;
