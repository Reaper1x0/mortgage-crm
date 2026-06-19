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
  checksum_md5?: string;
  meta?: {
    thumbnail_url?: string | null;
    thumbnail_storage_path?: string | null;
    thumbnail_kind?: string | null;
    document_type?: string | null;
  };
  uploaded_by?: string | { _id: string; name?: string; email?: string; fullName?: string; username?: string };
  uploaded_at?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SubmissionDocument = {
  _id?: string;
  userId: string;
  document: FileRef | string; // ref to File (id or populated object)
  extracted_fields: FieldItem[]; // fields extracted for THIS document
  uploadDate?: string; // ISO string (backend Date)
  document_name?: string;
  document_type?: string;
  upload_status?: "uploaded" | "upload_failed";
  extraction_status?: "pending" | "extracting" | "extracted" | "extract_failed";
  upload_error?: string | null;
  extraction_error?: string | null;
  extracted_at?: string | null;
};

export type GeneratedDocument = {
  _id?: string;
  template_id?: string;
  template_name?: string;
  file_id?: FileRef | string;
  generated_by?: string | { _id: string; name?: string; email?: string };
  generated_at?: string;
  download_count?: number;
  last_downloaded_at?: string;
};

export type Submission = {
  _id: string;
  userId: string;

  status: SubmissionStatus;
  submission_name: string;
  legal_name?: string | null;
  sourceLead?: {
    _id: string;
    fullName?: string;
    email?: string;
    phone?: string;
    company?: string;
    source?: string;
  } | null;

  documents: SubmissionDocument[];
  generated_documents?: GeneratedDocument[];

  createdAt?: string;
  updatedAt?: string;
};
