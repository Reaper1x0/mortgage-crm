// src/types/extraction.ts
export type ConfidenceLevel = "high" | "medium" | "low";

export type FieldOccurrence = {
  snippet: string;
  page: number | null;
  line_hint: string | null;
  // Enhanced traceability
  document_name?: string;
  document_id?: string;
  extracted_at?: string;
};

export type FieldConflict = {
  raw: string | number;
};

export type FieldValue = {
  raw: string | number;
  normalized?: string | number;
} | null;

export type ValidationError = {
  rule: string;
  message: string;
  severity: "error" | "warning";
};

export type FieldValidation = {
  validated: boolean;
  passed: boolean;
  errors: ValidationError[];
  validated_at?: string | null;
};

export type FieldTraceability = {
  document_name: string;
  document_id?: string | null;
  file_id?: string | null;
  extracted_at?: string;
  extraction_method: "openai" | "manual";
};

export type FieldItem = {
  key: string;
  present: boolean;
  value: FieldValue;
  conflicts: FieldConflict[];
  occurrences: FieldOccurrence[];
  confidence: ConfidenceLevel;
  notes?: string;
  // Validation results
  validation?: FieldValidation;
  // Source traceability
  traceability?: FieldTraceability;
};

export type FieldsPayload = {
  fields: FieldItem[];
};

export type SubmissionStatus = "pending" | "review" | "completed";

export type FileRef = {
  _id: string;
  display_name: string;
  original_name: string;
  storage_path: string;
  bucket?: string;
  url?: string;
  type?: string;
  content_type?: string;
  extension?: string;
  size_in_bytes?: number;
  status?: "uploaded" | "failed" | "deleted";
  createdAt?: string;
  updatedAt?: string;
};

export type SubmissionDocument = {
  _id?: string;
  userId: string;
  document: FileRef; // ref to File (id or populated object)
  extracted_fields: FieldItem[]; // fields extracted for THIS document
  uploadDate?: string; // ISO string (backend Date)
};

export type Submission = {
  _id: string;
  userId: string;

  status: SubmissionStatus;
  submission_name: string;
  legal_name?: string | null;

  documents: SubmissionDocument[];

  createdAt?: string;
  updatedAt?: string;
};
