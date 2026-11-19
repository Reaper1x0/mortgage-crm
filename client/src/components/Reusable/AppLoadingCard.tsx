import { Loader } from "../../assets/Loader";
import { cn } from "../../utils/cn";

type AppLoadingCardProps = {
  /** Primary status line shown under the title. */
  message: string;
  title?: string;
  /**
   * page — full viewport centered card (session / route gates).
   * panel — fills the remaining layout area under Navbar (scope bootstrap).
   */
  variant?: "page" | "panel";
  className?: string;
};

/**
 * Shared bootstrap UI for auth entry, protected routes, and tenant layouts.
 * Keeps loading states consistent instead of scattered "Loading…" text.
 */
export default function AppLoadingCard({
  message,
  title = "Getting things ready",
  variant = "page",
  className,
}: AppLoadingCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center px-4",
        variant === "page" ? "min-h-[70vh]" : "min-h-[calc(100vh-3.5rem)] w-full",
        className,
      )}
    >
      <div className="w-full max-w-sm rounded-2xl border border-card-border bg-card p-8 shadow-sm shadow-card-shadow">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-4 text-base font-semibold text-text">{title}</p>
          <p className="mt-1.5 min-h-[1.25rem] text-sm text-card-text" aria-live="polite">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
