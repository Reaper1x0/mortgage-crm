import { useMemo } from "react";
import PageHeader from "../Reusable/PageHeader";
import DataTable, { type DataTableColumn } from "../Reusable/DataTable";
import Avatar from "../Reusable/Avatar";
import { AuditLog, AuditTrailService } from "../../service/auditTrailService";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import type { ListQueryParams } from "../../types/listQuery";
import { getAuditActionInfo } from "../../utils/auditAction";
import { normalizeUserForAvatar } from "../../utils/userUtils";
import { prettyDate } from "../../utils/date";

function activityUser(log: AuditLog) {
  const user = log.user_id && typeof log.user_id === "object" ? log.user_id : null;
  return {
    user,
    name: user?.fullName || user?.username || log.user_name || log.user_email || "Unknown",
    email: user?.email || log.user_email || "",
  };
}

function activityDetails(log: AuditLog) {
  const submission =
    log.submission_id && typeof log.submission_id === "object" ? log.submission_id : null;
  const parts: string[] = [];
  if (log.document_name) parts.push(log.document_name);
  if (log.field_key) parts.push(log.field_key);
  if (submission) {
    parts.push(submission.submission_name || submission.legal_name || "Submission");
  }
  return parts.join(" · ") || "—";
}

async function fetchActivity(params: ListQueryParams) {
  const response = await AuditTrailService.getRecentAuditLogs({
    page: params.page,
    limit: params.limit,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  const items = response.audit_logs || [];
  return {
    items,
    pagination: response.pagination || {
      page: Number(params.page || 1),
      limit: Number(params.limit || 10),
      total: items.length,
      totalPages: 1,
    },
  };
}

export default function ActivityPage() {
  const list = usePaginatedList<AuditLog>({
    fetchFn: fetchActivity,
    initialSortBy: "timestamp",
    initialSortOrder: "desc",
  });

  const columns = useMemo<DataTableColumn<AuditLog>[]>(
    () => [
      {
        title: "User",
        key: "user",
        width: 240,
        render: (_value, row) => {
          const person = activityUser(row);
          return (
            <div className="flex items-center gap-3">
              <Avatar user={normalizeUserForAvatar(person.user)} size="sm" />
              <div className="min-w-0">
                <div className="truncate font-semibold text-text">{person.name}</div>
                {person.email ? (
                  <div className="truncate text-xs text-card-text">{person.email}</div>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        title: "Action",
        dataIndex: "action",
        sortable: true,
        width: 220,
        render: (action: string) => {
          const info = getAuditActionInfo(action);
          const ActionIcon = info.Icon;
          return (
            <span className={`inline-flex items-center gap-1.5 ${info.color}`}>
              <ActionIcon className="h-4 w-4" />
              <span className="truncate">{info.label}</span>
            </span>
          );
        },
      },
      {
        title: "Details",
        key: "details",
        minWidth: 220,
        render: (_value, row) => activityDetails(row),
      },
      {
        title: "When",
        dataIndex: "timestamp",
        sortable: true,
        width: 210,
        render: (value: string) => prettyDate(value, { withTime: true }),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="Every action recorded in this workspace."
      />
      <DataTable
        columns={columns}
        data={list.data}
        loading={list.loading}
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        rowKey={(row) => row._id}
        emptyMessage="No activity in this workspace yet."
        sort={{
          sortBy: list.sortBy,
          sortOrder: list.sortOrder,
          onSort: list.setSort,
        }}
      />
    </div>
  );
}
