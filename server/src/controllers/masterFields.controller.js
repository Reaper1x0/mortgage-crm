const { R2XX, R4XX } = require("../Responses");
const MasterFieldService = require("../services/masterFields.service");
const { catchAsync } = require("../utils");
const { parsePagination } = require("../utils/pagination.utils");
const {
  buildTextSearch,
  buildExactFilter,
  buildDateRangeFilter,
  buildBooleanQueryFilter,
  mergeFilters,
  toSafeString,
} = require("../utils/queryBuilder.utils");
const {
  isRowCompletelyEmpty,
  parseSpreadsheetBuffer,
  buildSampleWorkbook,
  assertSpreadsheetFile,
} = require("../utils/spreadsheetImport.utils");
const { MASTER_FIELD_TYPES } = require("../validations/masterFields.validation");
const AuditTrailService = require("../services/auditTrail.service");
const { seedMasterFieldsBulk } = require("../seeders/masterFields.seeder");

const MASTER_FIELD_IMPORT_FIELDS = ["key", "label", "type", "required", "description", "validation_rules"];

const parseValidationRules = (value) => {
  const raw = toSafeString(value);
  if (!raw) return [];
  return raw
    .split(/[|;]/)
    .map((rule) => rule.trim())
    .filter(Boolean);
};

const parseRequiredValue = (value) => {
  const raw = toSafeString(value).toLowerCase();
  if (!raw) return false;
  return ["true", "yes", "1", "y"].includes(raw);
};

const sanitizeMasterFieldPayload = (payload = {}) => {
  const type = toSafeString(payload.type).toLowerCase();
  return {
    key: toSafeString(payload.key),
    label: toSafeString(payload.label),
    type,
    required: Boolean(payload.required),
    description: toSafeString(payload.description) || "No description",
    validation_rules: Array.isArray(payload.validation_rules)
      ? payload.validation_rules.map((r) => toSafeString(r)).filter(Boolean)
      : parseValidationRules(payload.validation_rules),
  };
};

const logBulkDeleteAudit = async ({ fields, userId, workspaceId }) => {
  for (const field of fields) {
    await AuditTrailService.log({
      entity_type: "field",
      entity_id: field.key,
      user_id: userId,
      workspace: workspaceId,
      action: "master_field_deleted",
      action_details: {
        field_key: field.key,
        field_label: field.label || field.label_on_form,
        batch_delete: true,
      },
      field_key: field.key,
    });
  }
};

const MasterFieldController = {
  createMasterField: catchAsync(async (req, res) => {
    const data = { ...req.body, workspace: req.workspaceId };
    const userId = req.user;
    const field = await MasterFieldService.createMasterField(data);

    await AuditTrailService.log({
      entity_type: "field",
      entity_id: field.key,
      user_id: userId,
      workspace: req.workspaceId,
      action: "master_field_created",
      action_details: {
        field_key: field.key,
        field_label: field.label || field.label_on_form,
        field_type: field.type,
      },
      field_key: field.key,
    });

    return R2XX(res, "MasterField created successfully", 201, { field });
  }),

  getAllMasterFields: catchAsync(async (req, res) => {
    const { page, limit, sort } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 200,
      defaultSortBy: "createdAt",
      defaultSortOrder: "desc",
      allowedSortBy: ["createdAt", "updatedAt", "key", "type", "required", "label"],
    });

    const filter = mergeFilters(
      buildTextSearch(req.query.search, ["key", "label", "description"]),
      buildExactFilter("type", req.query.type),
      buildBooleanQueryFilter("required", req.query.required),
      buildDateRangeFilter("createdAt", req.query.createdFrom, req.query.createdTo),
    );

    const { items, pagination } = await MasterFieldService.getAllMasterFields({
      page,
      limit,
      sort,
      workspaceId: req.workspaceId,
      filter,
    });

    return R2XX(res, "Fields fetched successfully", 200, {
      fields: items,
      pagination,
    });
  }),

  getMasterFieldByKey: catchAsync(async (req, res) => {
    const { key } = req.params;
    const field = await MasterFieldService.getMasterFieldByKey(key, req.workspaceId);

    if (!field) {
      return R4XX(res, 404, "Field not found");
    }

    return R2XX(res, "Field fetched successfully", 200, { field });
  }),

  updateMasterField: catchAsync(async (req, res) => {
    const { key } = req.params;
    const data = req.body;
    const userId = req.user;
    const updatedField = await MasterFieldService.updateMasterField(key, data, req.workspaceId);

    if (!updatedField) {
      return R4XX(res, 404, "Field not found");
    }

    await AuditTrailService.log({
      entity_type: "field",
      entity_id: key,
      user_id: userId,
      workspace: req.workspaceId,
      action: "master_field_updated",
      action_details: {
        field_key: key,
        field_label: updatedField.label || updatedField.label_on_form,
        updated_fields: Object.keys(data),
      },
      field_key: key,
    });

    return R2XX(res, "Field updated successfully", 200, { updatedField });
  }),

  deleteMasterField: catchAsync(async (req, res) => {
    const { key } = req.params;
    const userId = req.user;

    const field = await MasterFieldService.getMasterFieldByKey(key, req.workspaceId);

    await MasterFieldService.deleteMasterField(key, req.workspaceId);

    if (field) {
      await AuditTrailService.log({
        entity_type: "field",
        entity_id: key,
        user_id: userId,
        workspace: req.workspaceId,
        action: "master_field_deleted",
        action_details: {
          field_key: key,
          field_label: field.label || field.label_on_form,
        },
        field_key: key,
      });
    }

    return R2XX(res, "Field deleted successfully", 200);
  }),

  deleteMultipleMasterFields: catchAsync(async (req, res) => {
    const { keys } = req.body;
    const userId = req.user;
    if (!Array.isArray(keys) || keys.length === 0) {
      return R4XX(res, 400, "Invalid or empty list of keys");
    }

    const fields = await MasterFieldService.getMasterFieldsByKeys(keys, req.workspaceId);
    const result = await MasterFieldService.deleteMultipleMasterFields(keys, req.workspaceId);

    await logBulkDeleteAudit({ fields, userId, workspaceId: req.workspaceId });

    return R2XX(res, "Fields deleted successfully", 200, {
      deletedCount: result.deletedCount || 0,
    });
  }),

  bulkDeleteMasterFields: catchAsync(async (req, res) => {
    const { keys = [] } = req.body;
    const userId = req.user;

    const fields = await MasterFieldService.getMasterFieldsByKeys(keys, req.workspaceId);
    const result = await MasterFieldService.deleteMultipleMasterFields(keys, req.workspaceId);

    await logBulkDeleteAudit({ fields, userId, workspaceId: req.workspaceId });

    return R2XX(res, "Selected fields deleted successfully", 200, {
      deletedCount: result.deletedCount || 0,
    });
  }),

  downloadMasterFieldsSampleTemplate: catchAsync(async (req, res) => {
    const headers = ["Key", "Label", "Type", "Required", "Description", "Validation Rules"];
    const sampleRows = [
      ["borrower_name", "Borrower Name", "string", "true", "Full legal name of borrower", "required|minLength:2"],
      ["loan_amount", "Loan Amount", "number", "true", "Principal loan amount", "required|positive"],
    ];
    const buffer = buildSampleWorkbook(headers, sampleRows, "MasterFields");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="master-fields-import-template.xlsx"',
    );
    return res.status(200).send(buffer);
  }),

  bulkPreviewMasterFields: catchAsync(async (req, res) => {
    const fileError = assertSpreadsheetFile(req.file);
    if (fileError) return R4XX(res, 400, fileError);

    const parsed = parseSpreadsheetBuffer(req.file.buffer);
    const nonEmptyRows = parsed.rows.filter((row) => !isRowCompletelyEmpty(row));

    return R2XX(res, "File parsed successfully", 200, {
      columns: parsed.columns,
      previewRows: nonEmptyRows.slice(0, 10),
      rows: nonEmptyRows,
      totalRows: nonEmptyRows.length,
      fields: MASTER_FIELD_IMPORT_FIELDS,
    });
  }),

  bulkImportMasterFields: catchAsync(async (req, res) => {
    const { rows = [], mapping = {} } = req.body;
    if (!mapping.key) return R4XX(res, 400, "key mapping is required");
    if (!mapping.type) return R4XX(res, 400, "type mapping is required");

    let importedRows = 0;
    let skippedRows = 0;
    const skippedReasons = [];
    const fieldsToInsert = [];
    const keysInFile = new Set();

    const existingKeys = await MasterFieldService.getExistingKeys(
      rows
        .map((row) => toSafeString(row?.[mapping.key]))
        .filter(Boolean),
      req.workspaceId,
    );

    rows.forEach((row, index) => {
      const rowData = row && typeof row === "object" ? row : {};

      const mapped = sanitizeMasterFieldPayload({
        key: rowData[mapping.key],
        label: mapping.label ? rowData[mapping.label] : "",
        type: rowData[mapping.type],
        required: mapping.required ? parseRequiredValue(rowData[mapping.required]) : false,
        description: mapping.description ? rowData[mapping.description] : "",
        validation_rules: mapping.validation_rules ? rowData[mapping.validation_rules] : "",
      });

      if (isRowCompletelyEmpty(mapped)) {
        skippedRows += 1;
        skippedReasons.push({ row: index + 2, reason: "Empty row" });
        return;
      }

      if (!mapped.key) {
        skippedRows += 1;
        skippedReasons.push({ row: index + 2, reason: "key is required" });
        return;
      }

      if (!MASTER_FIELD_TYPES.includes(mapped.type)) {
        skippedRows += 1;
        skippedReasons.push({
          row: index + 2,
          reason: `Invalid type. Allowed: ${MASTER_FIELD_TYPES.join(", ")}`,
        });
        return;
      }

      if (keysInFile.has(mapped.key)) {
        skippedRows += 1;
        skippedReasons.push({ row: index + 2, reason: "Duplicate key in file" });
        return;
      }

      if (existingKeys.has(mapped.key)) {
        skippedRows += 1;
        skippedReasons.push({ row: index + 2, reason: "Key already exists" });
        return;
      }

      keysInFile.add(mapped.key);
      fieldsToInsert.push({ ...mapped, workspace: req.workspaceId });
    });

    if (fieldsToInsert.length) {
      const result = await MasterFieldService.createMasterFieldsBulk(fieldsToInsert);
      importedRows = result.insertedCount;

      for (const field of result.inserted) {
        await AuditTrailService.log({
          entity_type: "field",
          entity_id: field.key,
          user_id: req.user,
          workspace: req.workspaceId,
          action: "master_field_created",
          action_details: {
            field_key: field.key,
            field_label: field.label,
            field_type: field.type,
            batch_import: true,
          },
          field_key: field.key,
        });
      }
    }

    return R2XX(res, "Master fields import completed", 200, {
      totalRows: rows.length,
      importedRows,
      skippedRows,
      skippedReasons,
    });
  }),

  seedDefaultMasterFields: catchAsync(async (req, res) => {
    const result = await seedMasterFieldsBulk(req.workspaceId);

    await AuditTrailService.log({
      entity_type: "field",
      entity_id: String(req.workspaceId),
      user_id: req.user,
      workspace: req.workspaceId,
      action: "master_fields_seeded",
      action_details: {
        matchedCount: result?.matchedCount || 0,
        modifiedCount: result?.modifiedCount || 0,
        upsertedCount: result?.upsertedCount || 0,
      },
    });

    return R2XX(res, "Default master fields seeded successfully.", 200, {
      matchedCount: result?.matchedCount || 0,
      modifiedCount: result?.modifiedCount || 0,
      upsertedCount: result?.upsertedCount || 0,
    });
  }),
};

module.exports = MasterFieldController;
