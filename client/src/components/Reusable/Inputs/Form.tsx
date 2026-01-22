import React, { FormEvent, useEffect } from "react";
import Input, { InputProps } from "./Input";
import Select, { SelectInputProps } from "./Select";
import TextArea, { TextAreaProps } from "./TextArea";
import Button, { ButtonProps } from "../Button";
import MultiSelect, { MultiSelectProps } from "./MultiSelect";
import RichTextEditor, { RichTextEditorProps } from "./RichTextEditor";
import { cn } from "../../../utils/cn";

type SupportedFieldProps =
  | (InputProps & { fieldtype: "input"; handlechange?: (input: String) => void })
  | (SelectInputProps & { fieldtype: "select"; handlechange?: (input: String) => void })
  | (TextAreaProps & { fieldtype: "textarea"; handlechange?: (input: String) => void })
  | (MultiSelectProps & { fieldtype: "multiselect"; handlechange?: (input: String) => void })
  | (RichTextEditorProps & { fieldtype: "richtexteditor"; handlechange?: (input: String) => void });

export interface FormSection {
  title?: string;
  fields: SupportedFieldProps[];
  className?: string;
}

interface FormProps {
  title?: string;
  subtitle?: string;
  sections: FormSection[];
  buttons: ButtonProps[];
  links?: ButtonProps[];
  onSubmit: (values: Record<string, any>) => void;
  errors?: Record<string, string>;
  defaultValues: Record<string, any>;
  className?: string;
  sectionClassName?: string;
}

const Form: React.FC<FormProps> = ({
  title,
  subtitle,
  sections,
  buttons,
  links,
  onSubmit,
  errors = {},
  defaultValues = {},
  className,
  sectionClassName = "",
}) => {
  const [values, setValues] = React.useState<Record<string, any>>(defaultValues);

  useEffect(() => {
    // allow empty object too (e.g., login), but still update when profile loads
    setValues(defaultValues || {});
  }, [defaultValues]);

  const handleChange = (name: string, value: any) => setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const renderField = (field: SupportedFieldProps) => {
    const commonProps = {
      label: field.label,
      value: values[field.name] ?? field.value ?? "",
      error: errors[field.name],
      disabled: field.disabled,
      className: field.className,
    };

    switch (field.fieldtype) {
      case "input":
        return (
          <Input
            key={field.name}
            {...commonProps}
            {...field}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              handleChange(field.name, e.target.value);
              field.handlechange?.(e.target.value);
            }}
          />
        );

      case "select":
        return (
          <Select
            key={field.name}
            {...commonProps}
            {...field}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              handleChange(field.name, e.target.value);
              field.handlechange?.(e.target.value);
            }}
          />
        );

      case "textarea":
        return (
          <TextArea
            key={field.name}
            {...commonProps}
            {...field}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              handleChange(field.name, e.target.value);
              field.handlechange?.(e.target.value);
            }}
          />
        );

      case "multiselect":
        return (
          <MultiSelect
            key={field.name}
            {...commonProps}
            {...field}
            onChange={(selected) => handleChange(field.name, selected)}
          />
        );

      case "richtexteditor":
        return (
          <RichTextEditor
            key={field.name}
            {...commonProps}
            {...field}
            onChange={(content) => handleChange(field.name, content)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      {(title || subtitle) && (
        <div className="mb-5 text-center">
          {title && <h2 className="text-2xl font-bold text-text">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-card-text">{subtitle}</p>}
          {/* form-level error */}
          {errors.form && <p className="mt-2 text-sm font-semibold text-danger-text">{errors.form}</p>}
        </div>
      )}

      <div className={cn("space-y-5", sectionClassName)}>
        {sections.map((section, idx) => (
          <div key={idx} className={cn("space-y-3", section.className)}>
            {section.title && (
              <h3 className="text-sm font-semibold text-text">
                {section.title}
              </h3>
            )}

            <div className="grid gap-3">{section.fields.map((field) => renderField(field))}</div>
          </div>
        ))}
      </div>

      {buttons?.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {buttons.map((btnProps, i) => (
            <Button key={i} {...btnProps} className={cn("w-full", btnProps.className)} />
          ))}
        </div>
      )}

      {links && links.length > 0 && (
        <div className="mt-4 flex flex-col items-center gap-1">
          {links.map((btnProps, i) => (
            <Button key={i} {...btnProps} variant="link" />
          ))}
        </div>
      )}
    </form>
  );
};

export default Form;
