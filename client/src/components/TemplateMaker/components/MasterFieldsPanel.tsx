import { useMemo, useState } from "react";
import { MasterField } from "../../../types/template.types";
import Input from "../../Reusable/Inputs/Input";
import CollapsibleSidebar from "../../Reusable/CollapsibleSidebar";
import { cn } from "../../../utils/cn";

interface MasterFieldsPanelProps {
  masterFields: MasterField[];
  onFieldSelect: (fieldKey: string) => void;
  loading?: boolean;
  className?: string;
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
  const shortLabel = (field.label || field.key).slice(0, 2).toUpperCase();

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onSelect}
        title={`${field.label || field.key} (${field.type})`}
        className={cn(
          "mx-auto flex h-10 w-10 items-center justify-center rounded-xl",
          "border border-card-border bg-background text-xs font-bold text-text",
          "hover:bg-card-hover hover:border-primary-border transition-all",
          "focus:outline-none focus:ring-2 focus:ring-primary-border"
        )}
      >
        {shortLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-md border border-card-border bg-background px-3 py-2",
        "hover:bg-card-hover hover:border-primary-border transition-all active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-primary-border"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-text truncate font-medium">{field.label || field.key}</div>
        <div className="text-xs text-card-text shrink-0 px-2 py-0.5 rounded bg-card border border-card-border">
          {field.type}
        </div>
      </div>
      <div className="text-xs text-card-text opacity-75 mt-0.5 truncate">{field.key}</div>
      {field.description ? (
        <div className="text-xs text-card-text opacity-80 line-clamp-2 mt-1">{field.description}</div>
      ) : null}
    </button>
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

/**
 * Master fields list in a collapsible left sidebar shell.
 */
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
        f.description.toLowerCase().includes(q)
    );
  }, [masterFields, fieldSearch]);

  const fieldCountLabel = loading ? "…" : String(masterFields.length);

  return (
    <CollapsibleSidebar
      className={className}
      mobileTitle={`Master Fields (${fieldCountLabel})`}
      desktopHeader={
        <div className="flex items-center justify-between gap-2">
          <div className="truncate font-semibold text-text">Master Fields</div>
          <div className="shrink-0 rounded border border-card-border bg-card px-2 py-1 text-xs text-card-text">
            {fieldCountLabel}
          </div>
        </div>
      }
    >
      {({ collapsed }) => (
        <div className="flex h-full min-h-0 flex-col">
          {!collapsed ? (
            <div className="shrink-0 pb-3">
              <Input
                label="Search"
                name="search"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="Search fields..."
                disabled={loading}
              />
            </div>
          ) : null}

          <div className={cn("min-h-0 flex-1 overflow-y-auto", collapsed ? "space-y-1.5" : "space-y-2")}>
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
