import { ReactNode } from "react";
import { Loader } from "../../assets/Loader";
import Modal from "../Reusable/Modal";
import { cn } from "../../utils/cn";

export const prettyDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
};

export const prettyDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

export const safeText = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
};

export const getInitials = (value?: string | null, fallback = "OR") => {
  if (!value) return fallback;
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || fallback;
};

const statusTone = (status?: string | null) => {
  const normalized = String(status || "none").toLowerCase();

  if (["active", "trialing"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-500";
  }

  if (["past_due", "incomplete", "incomplete_expired", "unpaid"].includes(normalized)) {
    return "border-amber-400/30 bg-amber-500/10 text-amber-500";
  }

  if (["canceled", "paused"].includes(normalized)) {
    return "border-red-400/30 bg-red-500/10 text-red-500";
  }

  return "border-card-border bg-muted/40 text-card-text";
};

export function StatusPill({ value }: { value?: string | null }) {
  const label = value ? String(value).replace(/_/g, " ") : "none";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        statusTone(value),
      )}
    >
      {label}
    </span>
  );
}

export function DetailSection({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-card-text">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Compact KPI strip — not individual cards. */
export function MetricStrip({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <div className="flex flex-wrap overflow-hidden rounded-xl border border-card-border bg-card/50">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "min-w-[110px] flex-1 px-4 py-3",
            index > 0 && "border-l border-card-border",
          )}
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-card-text">
            {item.label}
          </div>
          <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-text">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Dense label/value rows — for brief profile fields. */
export function FieldList({
  fields,
  framed = true,
}: {
  fields: { label: string; value?: ReactNode }[];
  /** When false, omit outer border (for nesting inside another panel). */
  framed?: boolean;
}) {
  return (
    <dl
      className={cn(
        "overflow-hidden",
        framed && "rounded-xl border border-card-border",
      )}
    >
      {fields.map((field, index) => (
        <div
          key={field.label}
          className={cn(
            "grid grid-cols-1 gap-0.5 px-3.5 py-2.5 sm:grid-cols-[148px_minmax(0,1fr)] sm:items-start sm:gap-4",
            index > 0 && "border-t border-card-border",
          )}
        >
          <dt className="text-xs font-medium text-card-text">{field.label}</dt>
          <dd className="min-w-0 break-words text-sm font-medium text-text">
            {field.value === undefined || field.value === null || field.value === ""
              ? "—"
              : field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-card-border px-4 py-6 text-center text-sm text-card-text">
      {text}
    </div>
  );
}

export function DetailList({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-card-border divide-y divide-card-border">
      {children}
    </div>
  );
}

export function DetailModalShell({
  isOpen,
  onClose,
  header,
  loading,
  loadingLabel = "Loading details…",
  error,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  header: ReactNode;
  loading: boolean;
  loadingLabel?: string;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="max-w-5xl"
      className="!max-h-[min(90vh,880px)] !overflow-hidden !p-0"
      contentClassName="!max-h-[min(90vh,880px)] !overflow-hidden !p-0"
      disableDefaultContentPadding
      showCloseButton={false}
    >
      <div className="flex max-h-[min(90vh,880px)] flex-col">
        <div className="shrink-0 border-b border-card-border bg-card/80 px-4 py-4 sm:px-5">
          {header}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {loading ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Loader className="h-6 w-6" aria-hidden />
              </div>
              <p className="text-sm font-medium text-text">{loadingLabel}</p>
              <p className="text-xs text-card-text">Fetching the latest record</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-danger-border bg-danger-muted px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </Modal>
  );
}

export function DetailModalHeader({
  initials,
  title,
  status,
  meta,
  onClose,
}: {
  initials: string;
  title: string;
  status?: string | null;
  meta: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold tracking-tight text-text sm:text-xl">
              {title}
            </h2>
            <StatusPill value={status} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-card-text sm:text-sm">
            {meta}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 self-start rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm font-medium text-card-text transition hover:bg-muted hover:text-text"
      >
        Close
      </button>
    </div>
  );
}
