import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { FiCheck, FiCreditCard, FiFolder, FiLayers } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { WorkspaceService } from "../../service/workspaceService";
import { OrganizationService } from "../../service/organizationService";
import { BillingCycle, BillingService, Plan } from "../../service/billingService";
import Button from "../Reusable/Button";
import { cn } from "../../utils/cn";
import ImageUpload from "../Reusable/Inputs/ImageUpload";
import PlanCard from "../Reusable/PlanCard";
import Segmented from "../Reusable/Segmented";
import { buildWorkspacePath } from "../../utils/tenantRouting";

const WorkspaceOnboarding: React.FC = () => {
  const {
    user,
    workspaces,
    refreshWorkspaces,
    setActiveWorkspaceId,
    setActiveOrganizationId,
    isAuthenticated,
    loading,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [companyName, setCompanyName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [logoFile, setLogoFile] = useState<File | undefined>(undefined);
  const [orgPrimaryColor, setOrgPrimaryColor] = useState("#3b82f6");
  const [orgSecondaryColor, setOrgSecondaryColor] = useState("#8b5cf6");
  const [activeOrganizationId, setLocalActiveOrganizationId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [step, setStep] = useState<"organization" | "billing" | "workspace">(
    activeOrganizationId ? "billing" : "organization"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/", { replace: true });
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (workspaces.length > 0) {
      const first = workspaces[0];
      const orgId = first?.organization?.organizationId;
      const wsId = first?.workspaceId;
      if (orgId && wsId) navigate(buildWorkspacePath(orgId, wsId, "dashboard"), { replace: true });
    }
  }, [workspaces.length, navigate]);

  const checkBillingEligibility = async (organizationId: string) => {
    setCheckingSubscription(true);
    setError(null);
    try {
      setActiveOrganizationId(organizationId);
      const data = await BillingService.getOrganizationBilling();
      const eligible = Boolean(data?.access?.canUseProduct);
      setStep(eligible ? "workspace" : "billing");
      setCheckoutNotice(
        eligible
          ? "Subscription verified. You can now create your first workspace."
          : "Subscription is not active yet. Complete checkout to continue."
      );
    } catch (_err) {
      setStep("billing");
      setCheckoutNotice("We could not verify subscription yet. Please try again in a moment.");
    } finally {
      setCheckingSubscription(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!activeOrganizationId || workspaces.length > 0) return;
      await checkBillingEligibility(activeOrganizationId);
    };
    void init();
  }, [activeOrganizationId, workspaces.length]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;
    if (checkout === "success" && activeOrganizationId) {
      setCheckoutNotice("Checkout completed. Verifying subscription status...");
      void checkBillingEligibility(activeOrganizationId);
    } else if (checkout === "cancel") {
      setCheckoutNotice("Checkout was canceled. You can pick a plan and try again.");
    }
  }, [location.search, activeOrganizationId]);

  useEffect(() => {
    if (!checkoutNotice) return;
    if (checkingSubscription) return;
    const timeout = window.setTimeout(() => setCheckoutNotice(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [checkoutNotice, checkingSubscription]);

  useEffect(() => {
    const loadPlans = async () => {
      if (step !== "billing") return;
      try {
        setPlans(await BillingService.listPublicPlans());
      } catch (_err) {
        setPlans([]);
      }
    };
    void loadPlans();
  }, [step]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const company = companyName.trim();
    if (company.length < 2) return setError("Enter a company name (at least 2 characters).");
    setSubmitting(true);
    try {
      const orgRes = await OrganizationService.create(company);
      const organizationId = orgRes.data?.organization?._id;
      if (!organizationId) throw new Error("Organization not created");
      setLocalActiveOrganizationId(String(organizationId));
      setActiveOrganizationId(String(organizationId));
      const orgBranding = new FormData();
      orgBranding.append("primaryColor", orgPrimaryColor);
      orgBranding.append("secondaryColor", orgSecondaryColor);
      if (logoFile) orgBranding.append("logo", logoFile);
      await OrganizationService.updateBranding(orgBranding);
      await checkBillingEligibility(String(organizationId));
    } catch (_err) {
      setError("Could not create organization. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWorkspaceCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const workspace = workspaceName.trim();
    if (workspace.length < 2) return setError("Enter a workspace name (at least 2 characters).");
    if (!activeOrganizationId) {
      setStep("organization");
      return setError("Organization context is missing. Please create organization first.");
    }
    setSubmitting(true);
    try {
      const res = await WorkspaceService.create(workspace, activeOrganizationId);
      const id = res.data?.workspace?._id;
      await refreshWorkspaces();
      if (id) setActiveWorkspaceId(String(id));
      if (id && activeOrganizationId) {
        navigate(buildWorkspacePath(activeOrganizationId, String(id), "dashboard"), { replace: true });
      }
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === "SUBSCRIPTION_REQUIRED" || code === "FEATURE_NOT_AVAILABLE") {
        setStep("billing");
        setError("Please activate a plan before creating a workspace.");
      } else {
        setError("Could not create workspace. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartCheckout = async (planId: string) => {
    if (!activeOrganizationId) return;
    try {
      setSubmitting(true);
      setError(null);
      const data = await BillingService.createCheckoutSession(planId, billingCycle);
      if (data?.checkoutUrl) window.location.href = data.checkoutUrl;
      else setError("Checkout session could not be created.");
    } catch (err: any) {
      setError(err?.response?.data?.reason || "Unable to start checkout right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const onboardingProgress = useMemo(
    () => ({
      organization: step === "organization" ? "current" : "done",
      billing: step === "billing" ? "current" : step === "workspace" ? "done" : "pending",
      workspace: step === "workspace" ? "current" : "pending",
    }),
    [step]
  );

  if (!user) return <div className="min-h-[40vh] flex items-center justify-center text-sm text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl border border-card-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-card-text">Workspace Onboarding</p>
            <h1 className="mt-1 text-2xl font-semibold text-text">Set up your CRM in three steps</h1>
            <p className="mt-2 max-w-2xl text-sm text-card-text">
              Signed in as <span className="font-medium text-text">{user.email}</span>. Create your organization, pick a plan, then create your first workspace.
            </p>
            {checkoutNotice ? <p className="mt-3 text-sm font-medium text-primary">{checkoutNotice}</p> : null}
          </div>
          <div className="rounded-2xl border border-card-border bg-background/60 px-4 py-3 text-xs text-card-text">
            <span className="font-semibold text-text">Current step:</span>{" "}
            {step === "organization" ? "Organization Setup" : step === "billing" ? "Billing Plan Selection" : "Workspace Creation"}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { k: "organization", label: "Organization", icon: FiLayers, text: "Company profile, branding colors, and logo." },
            { k: "billing", label: "Billing Plan", icon: FiCreditCard, text: "Choose monthly/yearly plan and complete Stripe checkout." },
            { k: "workspace", label: "Workspace", icon: FiFolder, text: "Create your first workspace and enter the CRM dashboard." },
          ].map((item, idx) => {
            const Icon = item.icon;
            const status = onboardingProgress[item.k as keyof typeof onboardingProgress];
            return (
              <div
                key={item.k}
                className={cn(
                  "rounded-2xl border p-4 transition-all",
                  status === "current" ? "border-primary-border bg-primary/10" : "border-card-border bg-background/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text"><Icon className="text-primary" /> {item.label}</div>
                  {status === "done" ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success text-success-text"><FiCheck size={14} /></span>
                  ) : (
                    <span className="text-xs text-card-text">Step {idx + 1}</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-card-text">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {step === "organization" ? (
        <form onSubmit={handleCreateOrganization} className="space-y-4">
          <div className="rounded-3xl border border-card-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text">Organization details</h2>
            <p className="mt-1 text-sm text-card-text">Tell us about your company and visual identity.</p>
            <label htmlFor="company-name" className="mb-1.5 mt-5 block text-sm font-medium text-text">Organization name</label>
            <input
              id="company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Mortgage Inc."
              className={cn("w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm text-text", "placeholder:text-card-text/70 focus:outline-none focus:ring-2 focus:ring-primary/30")}
              autoComplete="organization"
            />
            <div className="mt-5"><ImageUpload label="Organization logo" name="company-logo" value={logoFile} onChange={setLogoFile} height="h-36" /></div>
          </div>
          <div className="rounded-3xl border border-card-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text">Branding colors</h2>
            <p className="mt-1 text-sm text-card-text">Set default colors used in organization-level UI themes.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="mb-1.5 mt-4 block text-sm font-medium text-text">Primary color</label><input type="color" value={orgPrimaryColor} onChange={(e) => setOrgPrimaryColor(e.target.value)} /></div>
              <div><label className="mb-1.5 mt-4 block text-sm font-medium text-text">Secondary color</label><input type="color" value={orgSecondaryColor} onChange={(e) => setOrgSecondaryColor(e.target.value)} /></div>
            </div>
          </div>
          {error ? <div className="rounded-xl border border-danger-border bg-danger/10 px-4 py-3 text-sm text-danger-text">{error}</div> : null}
          <div className="flex justify-end"><Button type="submit" isLoading={submitting} disabled={submitting}>Continue to plan selection</Button></div>
        </form>
      ) : null}

      {step === "billing" ? (
        <section className="space-y-4">
          <div className="rounded-3xl border border-card-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">Choose a billing plan</h2>
                <p className="mt-1 text-sm text-card-text">Your organization is ready. Select a plan to activate product access.</p>
              </div>
              <div className="w-full max-w-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-card-text">Billing cycle</p>
                <Segmented value={billingCycle} onChange={(value) => setBillingCycle(value as BillingCycle)} options={[{ key: "monthly", label: "Monthly" }, { key: "yearly", label: "Yearly" }]} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard
                key={plan._id}
                name={plan.name}
                description={plan.description}
                recommended={plan.recommended}
                pricing={plan.pricing}
                billingCycle={billingCycle}
                entitlements={plan.entitlements}
                onAction={() => void handleStartCheckout(plan._id)}
                actionLabel={!plan.pricing ? "Pricing unavailable" : submitting ? "Please wait..." : `Choose ${plan.name}`}
                disabled={submitting || !plan.pricing}
              />
            ))}
          </div>
          {plans.length === 0 ? <div className="rounded-2xl border border-card-border bg-card p-5 text-sm text-card-text shadow-sm">No active plans are currently available. Please contact super admin.</div> : null}
          {error ? <div className="rounded-xl border border-danger-border bg-danger/10 px-4 py-3 text-sm text-danger-text">{error}</div> : null}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => activeOrganizationId && void checkBillingEligibility(activeOrganizationId)} isLoading={checkingSubscription}>
              I have activated my plan
            </Button>
          </div>
        </section>
      ) : null}

      {step === "workspace" ? (
        <form onSubmit={handleWorkspaceCreate} className="space-y-4">
          <div className="rounded-3xl border border-card-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text">Create your first workspace</h2>
            <p className="mt-1 text-sm text-card-text">Name your primary workspace. You can create more based on your plan limits.</p>
            <div className="mt-4">
              <label htmlFor="ws-name" className="mb-1.5 block text-sm font-medium text-text">Workspace name</label>
              <input
                id="ws-name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Lending Team"
                className={cn("w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm text-text", "placeholder:text-card-text/70 focus:outline-none focus:ring-2 focus:ring-primary/30")}
                autoComplete="organization"
              />
            </div>
          </div>
          {error ? <div className="rounded-xl border border-danger-border bg-danger/10 px-4 py-3 text-sm text-danger-text">{error}</div> : null}
          <div className="flex justify-end"><Button type="submit" isLoading={submitting} disabled={submitting}>Complete setup</Button></div>
        </form>
      ) : null}
    </div>
  );
};

export default WorkspaceOnboarding;
