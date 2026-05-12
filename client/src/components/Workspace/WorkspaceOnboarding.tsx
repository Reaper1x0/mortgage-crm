/**
 * WorkspaceOnboarding
 *
 * Single call to GET /organizations/onboarding-session determines the current step.
 * Onboarding carries its own organizationId state, so no X-Organization-Id header
 * problems occur during any step — every org-scoped call explicitly passes the id.
 *
 * Steps:
 *   1. "organization"  – create org + branding
 *   2. "billing"       – choose plan & Stripe checkout
 *   3. "workspace"     – create first workspace → navigate to dashboard
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { FiCheck, FiCreditCard, FiFolder, FiLayers, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { WorkspaceService } from "../../service/workspaceService";
import { OrganizationService, OnboardingSessionState } from "../../service/organizationService";
import { BillingCycle, BillingService, Plan } from "../../service/billingService";
import Button from "../Reusable/Button";
import { cn } from "../../utils/cn";
import ImageUpload from "../Reusable/Inputs/ImageUpload";
import PlanCard from "../Reusable/PlanCard";
import Segmented from "../Reusable/Segmented";
import { buildOrganizationPath, buildWorkspacePath } from "../../utils/tenantRouting";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/* ──────────────────────────────────────────────────────────────────────────── */

const WorkspaceOnboarding: React.FC = () => {
  const { organizationId: urlOrgParam } = useParams<{ organizationId?: string }>();
  // Only trust route param if it looks like a real Mongo ObjectId
  const urlOrgId =
    urlOrgParam && OBJECT_ID_RE.test(urlOrgParam.trim()) ? urlOrgParam.trim() : null;

  const { user, workspaces, refreshWorkspaces, setActiveWorkspaceId, isAuthenticated, loading } =
    useAuth();
  const navigate = useNavigate();

  // ── Session state from server ─────────────────────────────────────────────
  const [session, setSession] = useState<OnboardingSessionState | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Derived active org id: prefer server session, fallback to URL, else null
  const organizationId = session?.organizationId ?? urlOrgId;

  // ── Step state (override can come from session or action results) ─────────
  type Step = "organization" | "billing" | "workspace" | "access";
  const [step, setStep] = useState<Step>("organization");

  // ── Form state ────────────────────────────────────────────────────────────
  const [companyName, setCompanyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | undefined>(undefined);
  const [orgPrimaryColor, setOrgPrimaryColor] = useState("#3b82f6");
  const [orgSecondaryColor, setOrgSecondaryColor] = useState("#8b5cf6");
  const [workspaceName, setWorkspaceName] = useState("");

  // ── Billing state ─────────────────────────────────────────────────────────
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  // ── Action state ──────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Redirect unauthenticated users
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/", { replace: true });
  }, [loading, isAuthenticated, navigate]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Guard bad route params – redirect to clean /onboarding
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (urlOrgParam && !urlOrgId) {
      navigate("/onboarding", { replace: true });
    }
  }, [urlOrgParam, urlOrgId, navigate]);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. If workspaces already loaded and user has one, skip straight to dashboard
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (workspaces.length > 0) {
      const first = workspaces[0];
      const oid = first?.organization?.organizationId;
      const wsId = first?.workspaceId;
      if (oid && wsId) navigate(buildWorkspacePath(oid, wsId, "dashboard"), { replace: true });
    }
  }, [workspaces, navigate]);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Single API call: resolve onboarding session
  // ──────────────────────────────────────────────────────────────────────────
  const fetchSession = async () => {
    setSessionLoading(true);
    setSessionError(null);
    try {
      const res = await OrganizationService.getOnboardingSession(urlOrgId);
      const s = res.data?.session;
      if (!s) throw new Error("Empty session response");

      setSession(s);

      // If server says "complete" (workspace exists), refresh and navigate
      if (s.step === "complete" && s.organizationId && s.workspaceId) {
        await refreshWorkspaces();
        navigate(buildWorkspacePath(s.organizationId, s.workspaceId, "dashboard"), {
          replace: true,
        });
        return;
      }

      // If org exists but we're on /onboarding (no org id in URL), update URL
      if (s.hasOrganization && s.organizationId && !urlOrgId) {
        navigate(buildOrganizationPath(s.organizationId, "onboarding"), { replace: true });
      }

      // Sync step from server truth
      const serverStep: Step =
        s.step === "complete" ? "workspace" : (s.step as Step) ?? "organization";
      setStep(serverStep);
    } catch {
      setSessionError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSessionLoading(false);
    }
  };

  // Handle Stripe callback (success / cancel query params) once session loaded
  const [stripeHandled, setStripeHandled] = useState(false);
  useEffect(() => {
    if (sessionLoading || stripeHandled) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;
    setStripeHandled(true);

    // Clean URL without re-trigger
    window.history.replaceState({}, "", window.location.pathname);

    if (checkout === "success") {
      setNotice("Checkout completed. Verifying subscription status…");
      void fetchSession(); // re-check subscription
    } else if (checkout === "cancel") {
      setNotice("Checkout was canceled. Pick a plan and try again.");
    }
  }, [sessionLoading, stripeHandled]);

  // Initial fetch
  useEffect(() => {
    void fetchSession();
  }, [urlOrgId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Load plans when billing step is active
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "billing") return;
    let alive = true;
    setPlansLoading(true);
    BillingService.listPublicPlans()
      .then((p) => alive && setPlans(p))
      .catch(() => alive && setPlans([]))
      .finally(() => alive && setPlansLoading(false));
    return () => {
      alive = false;
    };
  }, [step]);

  // Notice auto-clear
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(t);
  }, [notice]);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    const company = companyName.trim();
    if (company.length < 2) return setError("Enter a company name (at least 2 characters).");
    setError(null);
    setSubmitting(true);
    try {
      const orgRes = await OrganizationService.create(company);
      const newOrgId = orgRes.data?.organization?._id;
      if (!newOrgId) throw new Error("Organization not created");
      const id = String(newOrgId);

      // Upload branding (pass org id explicitly — no URL context yet)
      const brandingForm = new FormData();
      brandingForm.append("primaryColor", orgPrimaryColor);
      brandingForm.append("secondaryColor", orgSecondaryColor);
      if (logoFile) brandingForm.append("logo", logoFile);
      await OrganizationService.updateBranding(brandingForm, id);

      // Navigate to org-scoped onboarding; URL update triggers session re-fetch
      navigate(buildOrganizationPath(id, "onboarding"), { replace: true });
    } catch {
      setError("Could not create organization. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartCheckout = async (planId: string) => {
    if (!organizationId) return;
    setError(null);
    setSubmitting(true);
    try {
      const data = await BillingService.createCheckoutSession(planId, billingCycle, organizationId);
      if (data?.checkoutUrl) window.location.href = data.checkoutUrl;
      else setError("Checkout session could not be created.");
    } catch (err: any) {
      setError(err?.response?.data?.reason || "Unable to start checkout right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySubscription = () => {
    setNotice("Re-checking subscription…");
    void fetchSession();
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = workspaceName.trim();
    if (name.length < 2) return setError("Enter a workspace name (at least 2 characters).");
    if (!organizationId) return setError("Organization context missing. Please refresh.");
    setError(null);
    setSubmitting(true);
    try {
      const res = await WorkspaceService.create(name, organizationId);
      const wsId = res.data?.workspace?._id;
      if (!wsId) throw new Error("Workspace not returned");
      await refreshWorkspaces();
      setActiveWorkspaceId(String(wsId));
      navigate(buildWorkspacePath(organizationId, String(wsId), "dashboard"), { replace: true });
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === "SUBSCRIPTION_REQUIRED" || code === "FEATURE_NOT_AVAILABLE") {
        setStep("billing");
        setError("Please activate a plan before creating a workspace.");
      } else if (code === "WORKSPACE_CREATE_FORBIDDEN") {
        setStep("access");
        setError("Your role does not allow workspace creation in this organization.");
      } else {
        setError("Could not create workspace. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Progress indicator
  // ──────────────────────────────────────────────────────────────────────────
  const progress = useMemo(
    () => ({
      organization:
        step === "organization" ? "current" : ("done" as const),
      billing:
        step === "billing"
          ? "current"
          : step === "workspace" || step === "access"
          ? "done"
          : ("pending" as const),
      workspace: step === "workspace" ? "current" : step === "access" ? "done" : ("pending" as const),
    }),
    [step]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  if (!user || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-card-text">
        Loading…
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-card-text">
        Preparing your setup…
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-sm">
        <p className="text-danger-text">{sessionError}</p>
        <Button variant="secondary" onClick={() => void fetchSession()}>
          <FiRefreshCw className="mr-2 inline" />
          Retry
        </Button>
      </div>
    );
  }

  const STEPS = [
    {
      k: "organization" as const,
      label: "Organization",
      icon: FiLayers,
      text: "Company profile, branding colors, and logo.",
    },
    {
      k: "billing" as const,
      label: "Billing Plan",
      icon: FiCreditCard,
      text: "Choose a monthly/yearly plan and complete Stripe checkout.",
    },
    {
      k: "workspace" as const,
      label: "Workspace",
      icon: FiFolder,
      text: "Create your first workspace and enter the CRM dashboard.",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* ── Header + progress ──────────────────────────────────────── */}
      <section className="rounded-3xl border border-card-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-card-text">
              Workspace Onboarding
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-text">Set up your CRM in three steps</h1>
            <p className="mt-2 max-w-2xl text-sm text-card-text">
              Signed in as <span className="font-medium text-text">{user.email}</span>. Create your
              organization, pick a plan, then create your first workspace.
            </p>
            {notice ? (
              <p className="mt-3 text-sm font-medium text-primary">{notice}</p>
            ) : null}
          </div>
          <div className="shrink-0 rounded-2xl border border-card-border bg-background/60 px-4 py-3 text-xs text-card-text">
            <span className="font-semibold text-text">Current step: </span>
            {step === "organization"
              ? "Organization Setup"
              : step === "billing"
              ? "Billing Plan Selection"
              : step === "access"
              ? "Awaiting Access"
              : "Workspace Creation"}
          </div>
        </div>

        {/* Step cards */}
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          {STEPS.map((item, idx) => {
            const Icon = item.icon;
            const status = progress[item.k];
            return (
              <div
                key={item.k}
                className={cn(
                  "rounded-2xl border p-4 transition-all",
                  status === "current"
                    ? "border-primary-border bg-primary/10"
                    : "border-card-border bg-background/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text">
                    <Icon className="text-primary" />
                    {item.label}
                  </div>
                  {status === "done" ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success text-success-text">
                      <FiCheck size={14} />
                    </span>
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

      {/* ── Step 1: Create Organization ────────────────────────────── */}
      {step === "organization" ? (
        <form onSubmit={handleCreateOrganization} className="space-y-4">
          <div className="rounded-3xl border border-card-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text">Organization details</h2>
            <p className="mt-1 text-sm text-card-text">
              Tell us about your company and visual identity.
            </p>

            <label
              htmlFor="company-name"
              className="mb-1.5 mt-5 block text-sm font-medium text-text"
            >
              Organization name
            </label>
            <input
              id="company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Mortgage Inc."
              className={cn(
                "w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm text-text",
                "placeholder:text-card-text/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
              )}
              autoComplete="organization"
            />

            <div className="mt-5">
              <ImageUpload
                label="Organization logo"
                name="company-logo"
                value={logoFile}
                onChange={setLogoFile}
                height="h-36"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-card-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text">Branding colors</h2>
            <p className="mt-1 text-sm text-card-text">
              Set default colors used in organization-level UI themes.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text">Primary color</label>
                <input
                  type="color"
                  value={orgPrimaryColor}
                  onChange={(e) => setOrgPrimaryColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded border border-card-border"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text">
                  Secondary color
                </label>
                <input
                  type="color"
                  value={orgSecondaryColor}
                  onChange={(e) => setOrgSecondaryColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded border border-card-border"
                />
              </div>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-danger-border bg-danger/10 px-4 py-3 text-sm text-danger-text">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" isLoading={submitting} disabled={submitting}>
              Continue to plan selection
            </Button>
          </div>
        </form>
      ) : null}

      {/* ── Step 2: Billing Plan ───────────────────────────────────── */}
      {step === "billing" ? (
        <section className="space-y-4">
          <div className="rounded-3xl border border-card-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">Choose a billing plan</h2>
                <p className="mt-1 text-sm text-card-text">
                  Your organization is ready. Select a plan to activate product access.
                </p>
              </div>
              <div className="w-full max-w-xs">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-card-text">
                  Billing cycle
                </p>
                <Segmented
                  value={billingCycle}
                  onChange={(v) => setBillingCycle(v as BillingCycle)}
                  options={[
                    { key: "monthly", label: "Monthly" },
                    { key: "yearly", label: "Yearly" },
                  ]}
                />
              </div>
            </div>
          </div>

          {plansLoading ? (
            <div className="text-sm text-card-text">Loading plans…</div>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl border border-card-border bg-card p-5 text-sm text-card-text shadow-sm">
              No active plans are currently available. Please contact the super admin.
            </div>
          ) : (
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
                  actionLabel={
                    !plan.pricing
                      ? "Pricing unavailable"
                      : submitting
                      ? "Please wait…"
                      : `Choose ${plan.name}`
                  }
                  disabled={submitting || !plan.pricing}
                />
              ))}
            </div>
          )}

          {error ? (
            <p className="rounded-xl border border-danger-border bg-danger/10 px-4 py-3 text-sm text-danger-text">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={handleVerifySubscription}
              isLoading={sessionLoading}
            >
              I've completed checkout — verify subscription
            </Button>
          </div>
        </section>
      ) : null}

      {/* ── Step 3: Create Workspace ───────────────────────────────── */}
      {step === "workspace" ? (
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div className="rounded-3xl border border-card-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text">Create your first workspace</h2>
            <p className="mt-1 text-sm text-card-text">
              Name your primary workspace. You can create more from settings later.
            </p>
            <div className="mt-4">
              <label htmlFor="ws-name" className="mb-1.5 block text-sm font-medium text-text">
                Workspace name
              </label>
              <input
                id="ws-name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Lending Team"
                className={cn(
                  "w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm text-text",
                  "placeholder:text-card-text/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
                )}
                autoComplete="off"
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-danger-border bg-danger/10 px-4 py-3 text-sm text-danger-text">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" isLoading={submitting} disabled={submitting}>
              Complete setup
            </Button>
          </div>
        </form>
      ) : null}

      {/* ── Restricted access state ─────────────────────────────────── */}
      {step === "access" ? (
        <section className="space-y-4">
          <div className="rounded-3xl border border-card-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text">Awaiting elevated access</h2>
            <p className="mt-2 text-sm text-card-text">
              Your organization setup is complete, but your role cannot finish onboarding actions.
              Ask your organization owner/admin to either assign you to a workspace or grant the required permissions.
            </p>
            <div className="mt-4 rounded-2xl border border-card-border bg-background/50 p-4 text-sm text-card-text">
              <p>
                {session?.accessReason === "billing_manage_required"
                  ? "Missing permission: organization.billing.manage"
                  : "Missing permission: organization.workspaces.create"}
              </p>
              <p className="mt-1">Current account: {user.email}</p>
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => void fetchSession()} isLoading={sessionLoading}>
                <FiRefreshCw className="mr-2 inline" />
                Refresh access
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default WorkspaceOnboarding;
