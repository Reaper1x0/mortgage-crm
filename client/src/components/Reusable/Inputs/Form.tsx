import React, { FormEvent, useEffect, useRef } from "react";
import Input, { InputProps } from "./Input";
import Select, { SelectInputProps } from "./Select";
import TextArea, { TextAreaProps } from "./TextArea";
import Button, { ButtonProps } from "../Button";
import MultiSelect, { MultiSelectProps } from "./MultiSelect";
import RichTextEditor, { RichTextEditorProps } from "./RichTextEditor";
import { cn } from "../../../utils/cn";

type SupportedFieldProps =
  | (InputProps & { fieldtype: "input"; handlechange?: (input: string) => void })
  | (SelectInputProps & { fieldtype: "select"; handlechange?: (input: string) => void })
  | (TextAreaProps & { fieldtype: "textarea"; handlechange?: (input: string) => void })
  | (MultiSelectProps & { fieldtype: "multiselect"; handlechange?: (input: string) => void })
  | (RichTextEditorProps & { fieldtype: "richtexteditor"; handlechange?: (input: string) => void });

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
  const prevDefaultValuesRef = useRef<Record<string, any>>(defaultValues);
  const isInitialMount = useRef(true);

  // Helper function to check if two objects are deeply equal
  const areObjectsEqual = (obj1: Record<string, any>, obj2: Record<string, any>): boolean => {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) {
      return false;
    }
    
    for (const key of keys1) {
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }
    
    return true;
  };

  useEffect(() => {
    // On initial mount, set values from defaultValues
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevDefaultValuesRef.current = defaultValues || {};
      return;
    }

    // Only update form values if defaultValues has actually changed
    // This prevents resetting the form when defaultValues is just a new empty object reference
    const hasChanged = !areObjectsEqual(prevDefaultValuesRef.current, defaultValues || {});
    
    if (hasChanged) {
      // Only reset if defaultValues has actual content (not just empty object)
      // OR if it's explicitly different from previous (e.g., profile data loaded)
      const hasContent = Object.keys(defaultValues || {}).length > 0;
      const prevHasContent = Object.keys(prevDefaultValuesRef.current).length > 0;
      
      // Update if:
      // 1. defaultValues has content and is different (e.g., profile loads)
      // 2. OR if we're going from content to empty (explicit reset)
      if (hasContent || (prevHasContent && !hasContent)) {
        setValues(defaultValues || {});
        prevDefaultValuesRef.current = defaultValues || {};
      }
    }
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
