import Card from "./Card";
import Button from "./Button";
import { BillingCycle, PlanPricing } from "../../service/billingService";

interface PlanCardProps {
  name: string;
  description?: string;
  recommended?: boolean;
  pricing?: PlanPricing | null;
  billingCycle?: BillingCycle;
  entitlements?: Record<string, number | boolean | null>;
  onAction?: () => void;
  actionLabel?: string;
  disabled?: boolean;
}

const ENTITLEMENT_LABELS: Record<string, string> = {
  max_workspaces_per_organization: "Workspaces per Organization",
  max_submissions: "Submissions",
  max_templates: "Templates",
  max_monthly_extractions: "Monthly Extractions",
};

const ORDERED_KEYS = [
  "max_workspaces_per_organization",
  "max_submissions",
  "max_templates",
  "max_monthly_extractions",
];

export default function PlanCard({
  name,
  description,
  recommended,
  pricing = null,
  billingCycle = "monthly",
  entitlements = {},
  onAction,
  actionLabel = "Select plan",
  disabled,
}: PlanCardProps) {
  const entries = ORDERED_KEYS.filter((key) => typeof entitlements[key] !== "undefined").map((key) => [
    key,
    entitlements[key],
  ]) as [string, number | boolean | null][];

  return (
    <Card className="h-full rounded-2xl">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-text">{name}</h3>
            {recommended ? (
              <span className="rounded-full border border-primary-border bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                Recommended
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-card-text">{description || "No description provided."}</p>
          {pricing ? (
            <div className="mt-2">
              <div className="text-2xl font-bold text-text">
                {billingCycle === "monthly" ? pricing.display.monthly || "-" : pricing.display.yearly || "-"}
              </div>
              <div className="text-xs text-card-text">
                Billed {billingCycle === "monthly" ? "monthly" : "yearly"}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-card-text">Price unavailable</div>
          )}
        </div>

        <ul className="space-y-2 text-sm">
          {entries.map(([key, value]) => (
            <li
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-card-border bg-background/50 px-3 py-2"
            >
              <span className="text-card-text">{ENTITLEMENT_LABELS[key] || key}</span>
              <span className="rounded-md bg-card px-2 py-0.5 font-semibold text-text">
                {value === -1 || value === null ? "Unlimited" : String(value)}
              </span>
            </li>
          ))}
        </ul>

        {onAction ? (
          <Button onClick={onAction} className="w-full" disabled={disabled}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
