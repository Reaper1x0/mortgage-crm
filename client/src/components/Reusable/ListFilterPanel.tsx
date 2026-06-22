import Input from "./Inputs/Input";
import Select from "./Inputs/Select";
import Button from "./Button";

export type FilterFieldConfig =
  | {
      type: "search";
      key: string;
      label: string;
      placeholder?: string;
    }
  | {
      type: "text";
      key: string;
      label: string;
      placeholder?: string;
    }
  | {
      type: "select";
      key: string;
      label: string;
      options: Array<{ label: string; value: string }>;
    }
  | {
      type: "date";
      key: string;
      label: string;
    };

type ListFilterPanelProps = {
  fields: FilterFieldConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  className?: string;
};

export default function ListFilterPanel({
  fields,
  values,
  onChange,
  onClear,
  className = "",
}: ListFilterPanelProps) {
  const gridCols =
    fields.length >= 5
      ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      : fields.length >= 3
        ? "md:grid-cols-2 lg:grid-cols-3"
        : "md:grid-cols-2";

  return (
    <div className={`rounded-2xl border border-card-border bg-card p-4 ${className}`}>
      <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
        {fields.map((field) => {
          if (field.type === "select") {
            return (
              <Select
                key={field.key}
                label={field.label}
                name={field.key}
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                options={field.options}
              />
            );
          }

          const inputType = field.type === "date" ? "date" : "text";
          return (
            <Input
              key={field.key}
              label={field.label}
              name={field.key}
              type={inputType}
              value={values[field.key] ?? ""}
              placeholder={
                field.type === "search" || field.type === "text" ? field.placeholder : undefined
              }
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          );
        })}
      </div>
      <div className="mt-3">
        <Button variant="secondary" onClick={onClear}>
          Clear Filters
        </Button>
      </div>
    </div>
  );
}
