import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { usePermissionsOptional } from "./PermissionContext";
import { BillingService } from "../service/billingService";
import { BILLING_TOOLTIPS } from "../utils/billingUi";
import { buildOrganizationPath } from "../utils/tenantRouting";

export type BillingAccessValue = {
  loading: boolean;
  canUseProduct: boolean | null;
  hasSubscriptionRecord: boolean;
  requiresCheckout: boolean;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  billingPath: string | null;
  canManageBilling: boolean;
  refreshBilling: () => Promise<void>;
  /** True when product access is known to be blocked. */
  isPaidBlocked: boolean;
  /** Tooltip for a paid action; undefined when the action should stay enabled. */
  paidActionTooltip: (specific?: string) => string | undefined;
};

const BillingAccessContext = createContext<BillingAccessValue | undefined>(undefined);

export function BillingAccessProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, activeOrganizationId, user } = useAuth();
  const perm = usePermissionsOptional();
  const [loading, setLoading] = useState(false);
  const [canUseProduct, setCanUseProduct] = useState<boolean | null>(null);
  const [hasSubscriptionRecord, setHasSubscriptionRecord] = useState(false);
  const [requiresCheckout, setRequiresCheckout] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);

  const isSuperAdmin = user?.role === "superAdmin";

  const canManageBilling = Boolean(
    perm?.effective?.isOrgOwner ||
      perm?.canOrg("organization.billing.manage") ||
      perm?.canOrg("organization.billing.read")
  );

  const billingPath = activeOrganizationId
    ? buildOrganizationPath(activeOrganizationId, "settings/billing")
    : null;

  const refreshBilling = useCallback(async () => {
    if (!isAuthenticated || !activeOrganizationId || isSuperAdmin) {
      setCanUseProduct(isSuperAdmin ? true : null);
      setHasSubscriptionRecord(false);
      setRequiresCheckout(false);
      setStatus(null);
      setCancelAtPeriodEnd(false);
      setCurrentPeriodEnd(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await BillingService.getOrganizationBilling(activeOrganizationId);
      const access = data?.access || {};
      const subscription = data?.subscription || null;
      setCanUseProduct(Boolean(access.canUseProduct));
      setHasSubscriptionRecord(Boolean(access.hasSubscriptionRecord ?? subscription));
      setRequiresCheckout(Boolean(access.requiresCheckout));
      setStatus(subscription?.status ? String(subscription.status) : null);
      setCancelAtPeriodEnd(Boolean(subscription?.cancelAtPeriodEnd));
      setCurrentPeriodEnd(subscription?.currentPeriodEnd || null);
    } catch {
      // Keep last known state on transient failures.
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId, isAuthenticated, isSuperAdmin]);

  useEffect(() => {
    void refreshBilling();
  }, [refreshBilling]);

  useEffect(() => {
    const onDenied = () => {
      void refreshBilling();
    };
    window.addEventListener("billing:access-denied", onDenied);
    return () => window.removeEventListener("billing:access-denied", onDenied);
  }, [refreshBilling]);

  const isPaidBlocked = canUseProduct === false;

  const paidActionTooltip = useCallback(
    (specific?: string) => {
      if (!isPaidBlocked) return undefined;
      if (specific) return specific;
      return canManageBilling || billingPath
        ? BILLING_TOOLTIPS.inactive
        : BILLING_TOOLTIPS.inactiveAskAdmin;
    },
    [billingPath, canManageBilling, isPaidBlocked]
  );

  const value = useMemo<BillingAccessValue>(
    () => ({
      loading,
      canUseProduct,
      hasSubscriptionRecord,
      requiresCheckout,
      status,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      billingPath,
      canManageBilling,
      refreshBilling,
      isPaidBlocked,
      paidActionTooltip,
    }),
    [
      loading,
      canUseProduct,
      hasSubscriptionRecord,
      requiresCheckout,
      status,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      billingPath,
      canManageBilling,
      refreshBilling,
      isPaidBlocked,
      paidActionTooltip,
    ]
  );

  return <BillingAccessContext.Provider value={value}>{children}</BillingAccessContext.Provider>;
}

export function useBillingAccess(): BillingAccessValue {
  const ctx = useContext(BillingAccessContext);
  if (!ctx) {
    throw new Error("useBillingAccess must be used within BillingAccessProvider");
  }
  return ctx;
}

export function useBillingAccessOptional(): BillingAccessValue | null {
  return useContext(BillingAccessContext) ?? null;
}
