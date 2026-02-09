import { useMemo, useState } from "react";
import { MasterField } from "../../../types/template.types";
import Input from "../../Reusable/Inputs/Input";

interface MasterFieldsPanelProps {
  masterFields: MasterField[];
  onFieldSelect: (fieldKey: string) => void;
  className?: string;
}

/**
 * Reusable Master Fields Panel component
 * Fully responsive with collapsible mobile view and scrollable desktop view
 */
export default function MasterFieldsPanel({
  masterFields,
  onFieldSelect,
  className = "",
}: MasterFieldsPanelProps) {
  const [fieldSearch, setFieldSearch] = useState("");

  const filteredFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase();
    if (!q) return masterFields;
    return masterFields.filter(
      (f) => f.key.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
    );
  }, [masterFields, fieldSearch]);

  return (
    <div className={className}>
      {/* Mobile: Collapsible panel */}
      <details className="lg:hidden rounded-lg border border-card-border bg-card">
        <summary className="px-4 py-3 cursor-pointer select-none font-semibold text-text">
          Master Fields ({masterFields.length})
        </summary>
        <div className="p-4 pt-0">
          <Input
            label="Search"
            name="search"
            value={fieldSearch}
            onChange={(e) => setFieldSearch(e.target.value)}
          />
          <div className="mt-3 max-h-[60vh] overflow-y-auto space-y-2">
            {filteredFields.length === 0 ? (
              <div className="text-sm text-card-text text-center py-4">
                No fields found
              </div>
            ) : (
              filteredFields.map((f) => (
                <button
                  key={f.key}
                  onClick={() => onFieldSelect(f.key)}
                  className="w-full text-left rounded-md border border-card-border bg-background px-3 py-2 hover:bg-card-hover transition-colors active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-text truncate font-medium">{f.key}</div>
                    <div className="text-xs text-card-text shrink-0 px-2 py-0.5 rounded bg-card border border-card-border">
                      {f.type}
                    </div>
                  </div>
                  {f.description && (
                    <div className="text-xs text-card-text opacity-80 line-clamp-2 mt-1">
                      {f.description}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </details>

      {/* Desktop: Fixed panel with scroll */}
      <div className="hidden lg:block rounded-lg border border-card-border bg-card p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="font-semibold text-text">Master Fields</div>
          <div className="text-xs text-card-text bg-card border border-card-border px-2 py-1 rounded">
            {masterFields.length}
          </div>
        </div>

        <div className="mb-3 shrink-0">
          <Input
            label="Search"
            name="search"
            value={fieldSearch}
            onChange={(e) => setFieldSearch(e.target.value)}
            placeholder="Search fields..."
          />
        </div>

        <div className="flex-1 max-h-screen overflow-y-auto space-y-2 min-h-0">
          {filteredFields.length === 0 ? (
            <div className="text-sm text-card-text text-center py-8">
              <div className="mb-2">No fields found</div>
              <div className="text-xs opacity-60">Try a different search term</div>
            </div>
          ) : (
            filteredFields.map((f) => (
              <button
                key={f.key}
                onClick={() => onFieldSelect(f.key)}
                className="w-full text-left rounded-md border border-card-border bg-background px-3 py-2 hover:bg-card-hover hover:border-primary-border transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-border"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-text truncate font-medium">{f.key}</div>
                  <div className="text-xs text-card-text shrink-0 px-2 py-0.5 rounded bg-card border border-card-border">
                    {f.type}
                  </div>
                </div>
                {f.description && (
                  <div className="text-xs text-card-text opacity-80 line-clamp-2 mt-1">
                    {f.description}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}



