import { useEffect, useMemo, useState } from "react";
import { FiCopy, FiCheck } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../redux/store";
import { addToast } from "../../redux/slices/toasterSlice";

type Props = {
  value?: string | number | null;
  truncate?: number; // e.g. 15
  showIcon?: boolean; // default true
  monospace?: boolean; // default true
  className?: string;
  textClassName?: string;
  buttonClassName?: string;
  copiedMs?: number; // default 900
  title?: string; // tooltip on button
  placeholder?: string; // default "-"
};

const defaultBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-background hover:bg-card-hover";

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export default function CopyToClipboard({
  value,
  truncate,
  showIcon = true,
  monospace = true,
  className = "",
  textClassName = "",
  buttonClassName = "",
  copiedMs = 900,
  title = "Copy",
  placeholder = "-",
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const [copied, setCopied] = useState(false);

  const full = useMemo(() => {
    if (value === null || value === undefined) return "";
    return String(value);
  }, [value]);

  const display = useMemo(() => {
    if (!full) return placeholder;
    if (!truncate || truncate <= 0) return full;
    return full.length > truncate ? full.slice(0, truncate) + "…" : full;
  }, [full, truncate, placeholder]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), copiedMs);
    return () => clearTimeout(t);
  }, [copied, copiedMs]);

  const onCopy = async () => {
    if (!full) return;
    const ok = await copyToClipboard(full);
    if (!ok) return;
    setCopied(true);
    dispatch(
      addToast({
        message: "Copied to clipboard!",
        type: "success",
        duration: 3000,
        position: "top-right",
      })
    );
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={[
          "text-sm text-text",
          monospace ? "font-mono" : "",
          textClassName,
        ].join(" ")}
        title={full || ""}
      >
        {display}
      </span>

      {showIcon && full && (
        <button
          type="button"
          onClick={onCopy}
          className={`${defaultBtn} ${buttonClassName}`}
          aria-label="Copy to clipboard"
          title={title}
        >
          {copied ? (
            <FiCheck className="text-success" />
          ) : (
            <FiCopy className="text-text/80" />
          )}
        </button>
      )}
    </div>
  );
}
