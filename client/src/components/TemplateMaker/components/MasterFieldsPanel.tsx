import { useMemo, useState } from "react";
import { MasterField } from "../../../types/template.types";
import Input from "../../Reusable/Inputs/Input";
import CollapsibleSidebar from "../../Reusable/CollapsibleSidebar";
import Tooltip from "../../Reusable/Tooltip";
import { cn } from "../../../utils/cn";

interface MasterFieldsPanelProps {
  masterFields: MasterField[];
  onFieldSelect: (fieldKey: string) => void;
  loading?: boolean;
  className?: string;
}

function FieldTooltipContent({ field }: { field: MasterField }) {
  return (
    <div className="space-y-1.5 text-left">
      <div className="whitespace-normal break-words font-semibold text-text">
        {field.label || field.key}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-background px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-card-text">
          {field.type}
        </span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            field.required
              ? "bg-danger-muted text-danger-text"
              : "bg-success-muted text-success-text",
          )}
        >
          {field.required ? "Required" : "Optional"}
        </span>
      </div>
      {field.description ? (
        <p className="whitespace-normal break-words text-[11px] leading-relaxed text-card-text">
          {field.description}
        </p>
      ) : null}
    </div>
  );
}

function RequiredPill({ required }: { required: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
        required
          ? "bg-danger-muted text-danger-text"
          : "bg-success-muted text-success-text",
      )}
    >
      {required ? "Required" : "Optional"}
    </span>
  );
}

function FieldButton({
  field,
  collapsed,
  onSelect,
}: {
  field: MasterField;
  collapsed: boolean;
  onSelect: () => void;
}) {
  const label = field.label || field.key;
  const shortLabel = label.slice(0, 2).toUpperCase();

  if (collapsed) {
    return (
      <Tooltip
        content={<FieldTooltipContent field={field} />}
        placement="right"
        className="!max-w-[240px] !whitespace-normal break-words"
        triggerClassName="mx-auto"
      >
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            "text-xs font-semibold text-card-text",
            "hover:bg-card-hover hover:text-text transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary-shadow",
          )}
        >
          {shortLabel}
        </button>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      content={<FieldTooltipContent field={field} />}
      placement="right"
      className="!max-w-[260px] !whitespace-normal break-words"
      triggerClassName="w-full"
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
          "hover:bg-card-hover focus:outline-none focus:ring-2 focus:ring-primary-shadow",
        )}
      >
        <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-medium leading-snug text-text">
          {label}
        </span>
        <RequiredPill required={field.required} />
      </button>
    </Tooltip>
  );
}

function FieldList({
  collapsed,
  loading,
  filteredFields,
  onFieldSelect,
}: {
  collapsed: boolean;
  loading: boolean;
  filteredFields: MasterField[];
  onFieldSelect: (key: string) => void;
}) {
  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-card-text">
        {collapsed ? "…" : "Loading fields…"}
      </div>
    );
  }

  if (filteredFields.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-card-text">
        {collapsed ? "—" : "No fields found"}
      </div>
    );
  }

  return (
    <>
      {filteredFields.map((field) => (
        <FieldButton
          key={field.key}
          field={field}
          collapsed={collapsed}
          onSelect={() => onFieldSelect(field.key)}
        />
      ))}
    </>
  );
}

export default function MasterFieldsPanel({
  masterFields,
  onFieldSelect,
  loading = false,
  className,
}: MasterFieldsPanelProps) {
  const [fieldSearch, setFieldSearch] = useState("");

  const filteredFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase();
    if (!q) return masterFields;
    return masterFields.filter(
      (f) =>
        f.key.toLowerCase().includes(q) ||
        (f.label || "").toLowerCase().includes(q) ||
        (f.description || "").toLowerCase().includes(q),
    );
  }, [masterFields, fieldSearch]);

  const fieldCountLabel = loading ? "…" : String(masterFields.length);

  return (
    <CollapsibleSidebar
      className={className}
      mobileTitle={`Master Fields (${fieldCountLabel})`}
      expandedWidthClass="w-[260px]"
      collapsedWidthClass="w-[64px]"
      desktopHeader={
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold text-text">Master Fields</div>
          <div className="shrink-0 text-xs tabular-nums text-card-text">{fieldCountLabel}</div>
        </div>
      }
    >
      {({ collapsed }) => (
        <div className="flex h-full min-h-0 flex-col">
          {!collapsed ? (
            <div className="shrink-0 pb-2">
              <Input
                name="search"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="Search fields..."
                disabled={loading}
              />
            </div>
          ) : null}

          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto",
              collapsed ? "space-y-1" : "space-y-0.5",
            )}
          >
            <FieldList
              collapsed={collapsed}
              loading={loading}
              filteredFields={filteredFields}
              onFieldSelect={onFieldSelect}
            />
          </div>
        </div>
      )}
    </CollapsibleSidebar>
  );
}
