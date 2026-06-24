import { useEffect, useMemo, useState } from "react";
import Button from "../Reusable/Button";
import Input from "../Reusable/Inputs/Input";
import PageHeader from "../Reusable/PageHeader";
import { BillingService, Plan, PlanPricing } from "../../service/billingService";
import Checkbox from "../Reusable/Checkbox";
import Modal from "../Reusable/Modal";
import StatusBadge from "../Reusable/StatusBadge";

type PlanForm = Partial<Plan> & {
  entitlements: Record<string, number | boolean | null>;
};

const ENTITLEMENT_CATALOG = [
  {
    key: "max_workspaces_per_organization",
    label: "Workspaces per Organization",
    description: "Maximum workspaces that can be created under one organization.",
  },
  {
    key: "max_submissions",
    label: "Submissions",
    description: "Maximum submissions allowed per workspace.",
  },
  {
    key: "max_templates",
    label: "Templates",
    description: "Maximum templates that can be created per workspace.",
  },
  {
    key: "max_monthly_extractions",
    label: "Monthly Extractions",
    description: "Maximum OCR/AI extraction operations per organization per month.",
  },
];

const emptyPlan: PlanForm = {
  name: "",
  code: "",
  description: "",
  displayOrder: 0,
  stripeMonthlyPriceId: "",
  stripeYearlyPriceId: "",
  trialDays: 0,
  active: true,
  visible: true,
  recommended: false,
  entitlements: {},
};

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<PlanForm>(emptyPlan);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validatingPrices, setValidatingPrices] = useState(false);
  const [stripePricingPreview, setStripePricingPreview] = useState<PlanPricing | null>(null);
  const [stripeValidationError, setStripeValidationError] = useState<string | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    try {
      setPlans(await BillingService.listAdminPlans());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlans();
  }, []);

  const upsertEntitlement = (key: string, value: number | null) => {
    setForm((prev) => ({
      ...prev,
      entitlements: {
        ...(prev.entitlements || {}),
        [key]: value,
      },
    }));
  };

  const isUnlimited = (value: number | boolean | null | undefined) => value === -1 || value === null;

  const normalizedEntitlements = useMemo(
    () => form.entitlements || {},
    [form.entitlements]
  );

  const createPlan = async () => {
    if (!stripePricingPreview) return;
    setSaving(true);
    try {
      await BillingService.createAdminPlan(form);
      setIsCreateOpen(false);
      setForm(emptyPlan);
      await loadPlans();
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      ...plan,
      entitlements: plan.entitlements || {},
    });
    setStripePricingPreview(plan.pricing || null);
    setStripeValidationError(null);
  };

  const openCreate = () => {
    setForm(emptyPlan);
    setIsCreateOpen(true);
    setStripePricingPreview(null);
    setStripeValidationError(null);
  };

  const updatePlan = async () => {
    if (!editingPlan?._id) return;
    if (!stripePricingPreview) return;
    setSaving(true);
    try {
      await BillingService.updateAdminPlan(editingPlan._id, form);
      setEditingPlan(null);
      setForm(emptyPlan);
      await loadPlans();
    } finally {
      setSaving(false);
    }
  };

  const validateStripePrices = async () => {
    const monthly = String(form.stripeMonthlyPriceId || "").trim();
    const yearly = String(form.stripeYearlyPriceId || "").trim();
    if (!monthly || !yearly) {
      setStripeValidationError("Monthly and yearly Stripe price IDs are required.");
      setStripePricingPreview(null);
      return;
    }
    setValidatingPrices(true);
    setStripeValidationError(null);
    try {
      const pricing = await BillingService.validateStripePriceIds(monthly, yearly);
      setStripePricingPreview(pricing);
    } catch (err: any) {
      const reason = err?.response?.data?.reason || "Unable to validate Stripe price IDs.";
      setStripeValidationError(reason);
      setStripePricingPreview(null);
    } finally {
      setValidatingPrices(false);
    }
  };

  const renderEntitlementEditor = () => (
    <div className="space-y-3 rounded-2xl border border-card-border bg-background-muted p-4">
      <h3 className="text-sm font-semibold text-text">Plan Entitlements</h3>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {ENTITLEMENT_CATALOG.map((item) => {
          const current = normalizedEntitlements[item.key];
          const unlimited = isUnlimited(current);
          return (
            <div key={item.key} className="rounded-xl border border-card-border bg-card p-3">
              <div className="mb-2">
                <div className="text-sm font-semibold text-text">{item.label}</div>
              </div>
              <div className="space-y-2">
                <Input
                  name={`entitlement-${item.key}`}
                  type="number"
                  min={0}
                  disabled={unlimited}
                  value={unlimited ? "" : Number(current || 0)}
                  onChange={(e) => upsertEntitlement(item.key, Number(e.target.value || 0))}
                  placeholder="Set numeric limit"
                />
                <Checkbox
                  size="sm"
                  checked={unlimited}
                  onChange={(e) => upsertEntitlement(item.key, e.target.checked ? -1 : 0)}
                  label="Unlimited"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPlanForm = (action: "create" | "edit") => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input name={`${action}-planName`} label="Plan name" value={form.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <Input name={`${action}-planCode`} label="Plan code" value={form.code || ""} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
        <Input
          name={`${action}-monthlyPriceId`}
          label="Stripe monthly price id"
          value={form.stripeMonthlyPriceId || ""}
          onChange={(e) => {
            setStripePricingPreview(null);
            setStripeValidationError(null);
            setForm((p) => ({ ...p, stripeMonthlyPriceId: e.target.value }));
          }}
        />
        <Input
          name={`${action}-yearlyPriceId`}
          label="Stripe yearly price id"
          value={form.stripeYearlyPriceId || ""}
          onChange={(e) => {
            setStripePricingPreview(null);
            setStripeValidationError(null);
            setForm((p) => ({ ...p, stripeYearlyPriceId: e.target.value }));
          }}
        />
        <Input name={`${action}-trialDays`} label="Trial days" type="number" value={String(form.trialDays || 0)} onChange={(e) => setForm((p) => ({ ...p, trialDays: Number(e.target.value || 0) }))} />
        <Input name={`${action}-displayOrder`} label="Display order" type="number" value={String(form.displayOrder || 0)} onChange={(e) => setForm((p) => ({ ...p, displayOrder: Number(e.target.value || 0) }))} />
        <div className="md:col-span-2">
          <Input name={`${action}-description`} label="Description" value={form.description || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </div>
      </div>
      <div className="rounded-2xl border border-card-border bg-background-muted p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-text">Stripe Price Validation</h3>
          <Button variant="secondary" onClick={() => void validateStripePrices()} isLoading={validatingPrices}>
            Validate Stripe IDs
          </Button>
        </div>
        {stripeValidationError ? <p className="text-sm text-danger-text">{stripeValidationError}</p> : null}
        {stripePricingPreview ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-card-border bg-card p-3">
              <div className="text-xs text-card-text">Monthly Price</div>
              <div className="text-base font-semibold text-text">{stripePricingPreview.display.monthly || "-"}</div>
              <div className="text-xs text-card-text mt-1">
                {stripePricingPreview.monthly.productName || "Product"} ({stripePricingPreview.monthly.id})
              </div>
            </div>
            <div className="rounded-xl border border-card-border bg-card p-3">
              <div className="text-xs text-card-text">Yearly Price</div>
              <div className="text-base font-semibold text-text">{stripePricingPreview.display.yearly || "-"}</div>
              <div className="text-xs text-card-text mt-1">
                {stripePricingPreview.yearly.productName || "Product"} ({stripePricingPreview.yearly.id})
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-card-text">
            Validate Stripe price IDs first. Plan submission is disabled until validation succeeds.
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-card-border bg-background-muted p-4 sm:grid-cols-3">
        <Checkbox size="sm" checked={Boolean(form.active)} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} label="Active" />
        <Checkbox size="sm" checked={Boolean(form.visible)} onChange={(e) => setForm((p) => ({ ...p, visible: e.target.checked }))} label="Visible" />
        <Checkbox size="sm" checked={Boolean(form.recommended)} onChange={(e) => setForm((p) => ({ ...p, recommended: e.target.checked }))} label="Recommended" />
      </div>
      {renderEntitlementEditor()}
      <div className="flex justify-end gap-2">
        {action === "create" ? (
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => void createPlan()} isLoading={saving} disabled={!stripePricingPreview}>
              Create Plan
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setEditingPlan(null)}>Cancel</Button>
            <Button onClick={() => void updatePlan()} isLoading={saving} disabled={!stripePricingPreview}>
              Save changes
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Plans"
        description="Manage plan visuals, Stripe mapping, and entitlement limits."
        actions={
          <Button onClick={openCreate} disabled={loading}>
            Create Plan
          </Button>
        }
      />

      {loading ? <div className="rounded-2xl border border-card-border bg-card p-6 text-sm text-card-text">Loading plans...</div> : null}

      {!loading && plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-card-border bg-card p-10 text-center">
          <h3 className="text-lg font-semibold text-text">No plans yet</h3>
          <p className="mt-1 text-sm text-card-text">Create your first plan to configure billing and entitlements.</p>
          <div className="mt-4">
            <Button onClick={openCreate}>Create First Plan</Button>
          </div>
        </div>
      ) : null}

      {!loading && plans.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan._id} className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-text">{plan.name}</h3>
                  <p className="text-xs uppercase tracking-wide text-card-text">{plan.code}</p>
                  <p className="mt-1 text-sm text-card-text">{plan.description || "No description provided."}</p>
                  <p className="mt-2 text-sm font-semibold text-text">
                    {plan.pricing?.display?.monthly || "-"} monthly · {plan.pricing?.display?.yearly || "-"} yearly
                  </p>
                </div>
                <Button variant="secondary" onClick={() => openEdit(plan)}>
                  Edit
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge tone={plan.active ? "success" : "danger"}>
                  {plan.active ? "Active" : "Inactive"}
                </StatusBadge>
                <StatusBadge tone={plan.visible ? "info" : "neutral"}>
                  {plan.visible ? "Visible" : "Hidden"}
                </StatusBadge>
                {plan.recommended ? (
                  <StatusBadge tone="primary">Recommended</StatusBadge>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ENTITLEMENT_CATALOG.map((item) => {
                  const val = plan.entitlements?.[item.key];
                  return (
                    <div key={item.key} className="rounded-lg border border-card-border bg-background-muted px-3 py-2">
                      <div className="text-[11px] text-card-text">{item.label}</div>
                      <div className="text-sm font-semibold text-text">
                        {isUnlimited(val as number | null) ? "Unlimited" : String(val ?? 0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text">Create Plan</h2>
          {renderPlanForm("create")}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(editingPlan)}
        onClose={() => setEditingPlan(null)}
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text">Edit Plan</h2>
          {renderPlanForm("edit")}
        </div>
      </Modal>
    </div>
  );
}
