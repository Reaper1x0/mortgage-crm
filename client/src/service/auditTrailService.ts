import apiClient from "../api/apiClient";

export interface AuditLogUser {
  _id: string;
  fullName?: string;
  email?: string;
  username?: string;
  profile_picture?: {
    _id: string;
    url?: string;
    storage_path?: string;
    display_name?: string;
  } | null;
}

export interface AuditLogSubmission {
  _id: string;
  submission_name?: string;
  legal_name?: string;
  status?: string;
}

export interface AuditLog {
  _id: string;
  entity_type: "submission" | "document" | "field" | "template" | "generated_document";
  entity_id: string;
  user_id: AuditLogUser;
  user_email?: string;
  user_name?: string;
  action:
    | "document_uploaded"
    | "document_replaced"
    | "document_deleted"
    | "field_extracted"
    | "field_edited"
    | "field_reviewed"
    | "field_approved"
    | "master_field_created"
    | "master_field_updated"
    | "master_field_deleted"
    | "submission_created"
    | "submission_updated"
    | "submission_completed"
    | "template_created"
    | "template_updated"
    | "document_generated"
    | "document_downloaded";
  action_details?: Record<string, any>;
  field_key?: string;
  field_source?: "extraction" | "manual";
  document_id?: string;
  document_name?: string;
  submission_id?: AuditLogSubmission | string;
  timestamp: string;
  ip_address?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogsResponse {
  message: string;
  success: boolean;
  audit_logs: AuditLog[];
}

export const AuditTrailService = {
  /**
   * Get recent audit logs for dashboard
   */
  getRecentAuditLogs: async (params?: {
    limit?: number;
    entity_type?: string;
    action?: string;
  }) => {
    const response = await apiClient.get<AuditLogsResponse>("/audit-trail/recent", { params });
    return response.data;
  },

  /**
   * Get audit trail for a specific submission
   */
  getSubmissionAuditTrail: async (submissionId: string, params?: { limit?: number }) => {
    const response = await apiClient.get<AuditLogsResponse>(`/audit-trail/submission/${submissionId}`, { params });
    return response.data;
  },
};

