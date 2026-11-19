import { Link, useLocation } from "react-router";
import { useBillingAccessOptional } from "../../context/BillingAccessContext";
import { prettyDate } from "../../utils/date";
import { normalizeBillingStatus } from "../../utils/billingUi";

export default function BillingAccessBanner() {
  const location = useLocation();
  const billing = useBillingAccessOptional();
  if (location.pathname.includes("/settings/billing")) return null;
  if (!billing || billing.loading || !billing.isPaidBlocked) return null;

  const status = normalizeBillingStatus(billing.status);
  const ended =
    status === "canceled" && billing.currentPeriodEnd
      ? ` Ended on ${prettyDate(billing.currentPeriodEnd)}.`
      : "";

  const message =
    status === "past_due"
      ? "Payment is past due. Paid features are restricted until billing is updated."
      : `Subscription inactive. Paid features such as create client, extract, upload, and generate PDF are restricted.${ended}`;

  return (
    <div className="mb-6 rounded-xl border border-warning-border bg-warning-muted px-4 py-3 text-sm text-warning">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{message}</p>
        {billing.billingPath ? (
          <Link
            to={billing.billingPath}
            className="shrink-0 font-semibold text-warning underline underline-offset-2 hover:opacity-90"
          >
            {billing.canManageBilling ? "Open billing" : "View billing"}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
