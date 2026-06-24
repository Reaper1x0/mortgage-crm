const { R2XX, R4XX } = require("../Responses");
const { leadService } = require("../services");
const { catchAsync } = require("../utils");
const { parsePagination } = require("../utils/pagination.utils");
const {
  buildTextSearch,
  buildRegexFilter,
  buildDateRangeFilter,
  mergeFilters,
  toSafeString,
} = require("../utils/queryBuilder.utils");
const {
  isRowCompletelyEmpty,
  parseSpreadsheetBuffer,
  buildSampleWorkbook,
  assertSpreadsheetFile,
} = require("../utils/spreadsheetImport.utils");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LEAD_FIELDS = ["fullName", "email", "phone", "company", "source", "notes"];

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

    const filter = mergeFilters(
      { workspace: workspaceId },
      buildTextSearch(req.query.search, ["fullName", "email", "phone", "company", "source"]),
      buildRegexFilter("source", req.query.source),
      buildRegexFilter("company", req.query.company),
      buildDateRangeFilter("createdAt", req.query.createdFrom, req.query.createdTo),
    );

    const { items, pagination } = await leadService.listLeads({
      page,
      limit,
      sort,
      filter,
      workspaceId,
    });

    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");

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
    const buffer = buildSampleWorkbook(headers, sampleRows, "Leads");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="leads-import-template.xlsx"');
    return res.status(200).send(buffer);
  }),

  bulkPreviewLeads: catchAsync(async (req, res) => {
    const fileError = assertSpreadsheetFile(req.file);
    if (fileError) return R4XX(res, 400, fileError);

    const parsed = parseSpreadsheetBuffer(req.file.buffer);
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
