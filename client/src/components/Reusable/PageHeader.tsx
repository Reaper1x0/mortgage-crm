import type { ReactNode } from "react";
import { Link } from "react-router";
import { FiArrowLeft } from "react-icons/fi";
import { cn } from "../../utils/cn";

export type PageHeaderBack = {
  label: string;
  to?: string;
  onClick?: () => void;
};

export type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  back?: PageHeaderBack;
  actions?: ReactNode;
  variant?: "page" | "section";
  className?: string;
};

const backClassName =
  "group -ml-0.5 mb-0.5 inline-flex items-center gap-1.5 rounded-md py-0.5 text-xs font-medium text-card-text transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow";

function PageHeaderBackLink({ back }: { back: PageHeaderBack }) {
  const content = (
    <>
      <FiArrowLeft
        className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5"
        aria-hidden
      />
      <span>{back.label}</span>
    </>
  );

  if (back.to) {
    return (
      <Link to={back.to} className={backClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={back.onClick} className={backClassName}>
      {content}
    </button>
  );
}

export default function PageHeader({
  title,
  description,
  back,
  actions,
  variant = "page",
  className,
}: PageHeaderProps) {
  const isSection = variant === "section";

  return (
    <header
      className={cn(
        isSection
          ? "flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between"
          : "flex flex-col gap-3",
        className,
      )}
    >
      <div className="min-w-0 w-full">
        {back ? <PageHeaderBackLink back={back} /> : null}
        <h1
          className={cn(
            "font-extrabold tracking-tight text-text",
            isSection ? "text-lg leading-snug" : "text-xl leading-tight sm:text-2xl",
          )}
        >
          {title}
        </h1>
        {description ? (
          <div
            className={cn(
              "mt-0.5 text-card-text",
              isSection ? "text-xs leading-relaxed" : "max-w-3xl text-sm leading-snug",
            )}
          >
            {description}
          </div>
        ) : null}
      </div>

      {actions ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            isSection ? "shrink-0 sm:justify-end" : "w-full sm:justify-end",
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
