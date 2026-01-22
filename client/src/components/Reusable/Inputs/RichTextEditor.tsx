// src/components/RichTextEditor.tsx
import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export interface RichTextEditorProps {
  name: string;
  label?: string;
  value?: string;
  disabled?: boolean;
  className?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  value,
  onChange,
  placeholder = "Write your content here...",
}) => {
  const handleChange = (content: string) => {
    onChange?.(content);
  };

  return (
    <div>
      <label className="font-medium text-text">{label}</label>
      <ReactQuill
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="mt-2"
      />
    </div>
  );
};

export default React.memo(RichTextEditor);