import { Align, Placement } from "../../types/template.types";
import Button from "../Reusable/Button";
import Input from "../Reusable/Inputs/Input";

export default function InspectorPanel({
  selected,
  onChange,
  onDelete,
}: {
  selected: Placement | undefined;
  onChange: (patch: Partial<Placement>) => void;
  onDelete: () => void;
}) {
  if (!selected) {
    return (
      <div className="rounded-lg border border-card-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-text">Inspector</div>
          <span className="text-xs text-card-text">No selection</span>
        </div>

        <div className="mt-3 rounded-md border border-card-border bg-background p-3 text-sm text-card-text">
          Select a placed field to edit its label and styling.
        </div>
      </div>
    );
  }

  const fontSize = selected.style?.fontSize ?? 12;
  const align = selected.style?.align ?? "left";

  return (
    <div className="rounded-lg border border-card-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-text">Inspector</div>
        <span className="rounded-md border border-card-border bg-background px-2 py-1 text-xs text-card-text">
          Field
        </span>
      </div>

      <div className="mt-3 space-y-4">
        {/* Field meta */}
        <div className="rounded-md border border-card-border bg-background p-3">
          <div className="text-xs font-medium text-card-text">Field Key</div>
          <div className="mt-1 break-all text-sm font-semibold text-text">
            {selected.fieldKey}
          </div>
        </div>

        <Input
          label="Label (optional)"
          name="label"
          value={selected.label || ""}
          onChange={(e) => onChange({ label: e.target.value })}
        />

        {/* Style controls */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-card-text">Text Style</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-card-text">
                Font size
              </label>
              <input
                type="number"
                min={6}
                className="w-full rounded-md border border-card-border bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary-border"
                value={fontSize}
                onChange={(e) =>
                  onChange({
                    style: {
                      ...(selected.style || {}),
                      fontSize: Number(e.target.value),
                      lineHeight: Math.round(Number(e.target.value) * 1.2),
                    },
                  })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-card-text">Align</label>
              <select
                className="w-full rounded-md border border-card-border bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary-border"
                value={align}
                onChange={(e) =>
                  onChange({
                    style: {
                      ...(selected.style || {}),
                      align: e.target.value as Align,
                    },
                  })
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          {/* Multiline toggle */}
          <label className="mt-1 flex cursor-pointer items-center justify-between rounded-md border border-card-border bg-background px-3 py-2">
            <div>
              <div className="text-sm font-medium text-text">Multiline</div>
              <div className="text-xs text-card-text">
                Allow wrapping onto multiple lines
              </div>
            </div>

            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-primary)]"
              checked={!!selected.style?.multiline}
              onChange={(e) =>
                onChange({
                  style: {
                    ...(selected.style || {}),
                    multiline: e.target.checked,
                  },
                })
              }
            />
          </label>
        </div>

        {/* Footer actions */}
        <div className="pt-2 border-t border-card-border">
          <Button variant="danger" onClick={onDelete}>
            Remove Field
          </Button>
        </div>
      </div>
    </div>
  );
}
