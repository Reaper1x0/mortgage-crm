import { Align, Placement } from "../../types/template.types";
import Button from "../Reusable/Button";
import Input from "../Reusable/Inputs/Input";
import { cn } from "../../utils/cn";

export default function InspectorPanel({
  selected,
  onChange,
  onDelete,
  embedded = false,
}: {
  selected: Placement | undefined;
  onChange: (patch: Partial<Placement>) => void;
  onDelete: () => void;
  embedded?: boolean;
}) {
  const shellClass = embedded
    ? "space-y-4"
    : "rounded-lg border border-card-border bg-card p-4 space-y-4";

  if (!selected) {
    return (
      <div className={shellClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-text">Inspector</div>
          <span className="text-xs text-card-text">No selection</span>
        </div>
        <p className="text-sm leading-relaxed text-card-text">
          Select a placed field on the canvas to edit its label and styling.
        </p>
      </div>
    );
  }

  const fontSize = selected.style?.fontSize ?? 12;
  const align = selected.style?.align ?? "left";

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-text">Inspector</div>
        <span className="text-xs text-card-text">Field</span>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium text-card-text">Field key</div>
        <div className="break-all font-mono text-xs text-text">{selected.fieldKey}</div>
      </div>

      <Input
        label="Label (optional)"
        name="label"
        value={selected.label || ""}
        onChange={(e) => onChange({ label: e.target.value })}
      />

      <div className="space-y-2">
        <div className="text-xs font-medium text-card-text">Text style</div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-card-text">Font size</label>
            <input
              type="number"
              min={6}
              className="w-full rounded-md border border-card-border bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary-shadow"
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
              className="w-full rounded-md border border-card-border bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary-shadow"
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

        <label
          className={cn(
            "mt-1 flex cursor-pointer items-center justify-between gap-3",
            "rounded-md border border-card-border bg-background px-3 py-2",
          )}
        >
          <div>
            <div className="text-sm font-medium text-text">Multiline</div>
            <div className="text-xs text-card-text">Allow wrapping</div>
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

      <div className="border-t border-card-border pt-3">
        <Button variant="danger" onClick={onDelete}>
          Remove field
        </Button>
      </div>
    </div>
  );
}
