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
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { AuthService } from "../../service/authService";
import axios from "axios";
import { WorkspaceService } from "../../service/workspaceService";
import { OrganizationService, OnboardingSessionState } from "../../service/organizationService";
import { BillingCycle, BillingService, Plan } from "../../service/billingService";
import Button from "../Reusable/Button";
import Callout from "../Reusable/Callout";
import Input from "../Reusable/Inputs/Input";
import ColorPicker from "../Reusable/Inputs/ColorPicker";
import ImageUpload from "../Reusable/Inputs/ImageUpload";
import PlanCard from "../Reusable/PlanCard";
import Segmented from "../Reusable/Segmented";
import Stepper from "../Reusable/Stepper";
import { buildOrganizationPath, buildWorkspacePath } from "../../utils/tenantRouting";

const ONBOARDING_STEPS = [
  { step: 1, label: "Organization", helper: "Company profile and branding" },
  { step: 2, label: "Billing", helper: "Choose a plan" },
  { step: 3, label: "Workspace", helper: "Create your first workspace" },
];

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const WorkspaceOnboarding: React.FC = () => {
  const { organizationId: urlOrgParam } = useParams<{ organizationId?: string }>();
  const urlOrgId =
    urlOrgParam && OBJECT_ID_RE.test(urlOrgParam.trim()) ? urlOrgParam.trim() : null;

  const { user, workspaces, refreshWorkspaces, setActiveWorkspaceId, isAuthenticated, loading } =
    useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<OnboardingSessionState | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const organizationId = session?.organizationId ?? urlOrgId;

  type Step = "organization" | "billing" | "workspace" | "access";
  const [step, setStep] = useState<Step>("organization");

  const [companyName, setCompanyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | undefined>(undefined);
  const [orgPrimaryColor, setOrgPrimaryColor] = useState("#3b82f6");
  const [orgSecondaryColor, setOrgSecondaryColor] = useState("#8b5cf6");
  const [workspaceName, setWorkspaceName] = useState("");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/", { replace: true });
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (urlOrgParam && !urlOrgId) {
      navigate("/onboarding", { replace: true });
    }
  }, [urlOrgParam, urlOrgId, navigate]);

  useEffect(() => {
    if (workspaces.length > 0) {
      const first = workspaces[0];
      const oid = first?.organization?.organizationId;
      const wsId = first?.workspaceId;
      if (oid && wsId) navigate(buildWorkspacePath(oid, wsId, "dashboard"), { replace: true });
    }
  }, [workspaces, navigate]);

  const fetchSession = async () => {
    setSessionLoading(true);
    setSessionError(null);
    try {
      const res = await OrganizationService.getOnboardingSession(urlOrgId);
      const s = res.data?.session;
      if (!s) throw new Error("Empty session response");

      setSession(s);

      if (s.step === "complete" && s.organizationId && s.workspaceId) {
        await refreshWorkspaces();
        navigate(buildWorkspacePath(s.organizationId, s.workspaceId, "dashboard"), {
          replace: true,
        });
        return;
      }

      if (s.hasOrganization && s.organizationId && !urlOrgId) {
        navigate(buildOrganizationPath(s.organizationId, "onboarding"), { replace: true });
      }

      const serverStep: Step =
        s.step === "complete" ? "workspace" : (s.step as Step) ?? "organization";
      setStep(serverStep);
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 401 || status === 403) {
        setSessionError("Your session has expired. Redirecting to sign in…");
        await AuthService.logout();
        return;
      }
      setSessionError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSessionLoading(false);
    }
  };

  const [stripeHandled, setStripeHandled] = useState(false);
  useEffect(() => {
    if (sessionLoading || stripeHandled) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;
    setStripeHandled(true);

    window.history.replaceState({}, "", window.location.pathname);

    if (checkout === "success") {
      setNotice("Checkout completed. Verifying subscription status…");
      void fetchSession();
    } else if (checkout === "cancel") {
      setNotice("Checkout was canceled. Pick a plan and try again.");
    }
  }, [sessionLoading, stripeHandled]);

  useEffect(() => {
    void fetchSession();
  }, [urlOrgId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(t);
  }, [notice]);

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

      const brandingForm = new FormData();
      brandingForm.append("primaryColor", orgPrimaryColor);
      brandingForm.append("secondaryColor", orgSecondaryColor);
      if (logoFile) brandingForm.append("logo", logoFile);
      await OrganizationService.updateBranding(brandingForm, id);

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

  const currentStepNum =
    step === "organization" ? 1 : step === "billing" ? 2 : 3;

  if (!user || loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-card-text">
        Loading…
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-card-text">
        Preparing your setup…
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 text-sm">
        <p className="text-danger-text">{sessionError}</p>
        <Button variant="secondary" onClick={() => void fetchSession()}>
          <FiRefreshCw className="mr-2 inline" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-text">Set up your account</h1>
        <p className="mt-1 text-sm text-card-text">
          Create your organization, choose a plan, then add your first workspace.
        </p>
      </div>

      {notice ? <Callout tone="info">{notice}</Callout> : null}

      <Stepper
        currentStep={currentStepNum}
        maxUnlockedStep={currentStepNum}
        onStepChange={() => {}}
        steps={ONBOARDING_STEPS}
      />

      {step === "organization" ? (
        <form onSubmit={handleCreateOrganization} className="space-y-4">
          <section className="rounded-2xl border border-card-border bg-card p-4 md:p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-text">Organization</h2>
            <Input
              name="companyName"
              label="Organization name"
              placeholder="e.g. Acme Mortgage Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoComplete="organization"
            />
            <ImageUpload
              label="Organization logo"
              name="company-logo"
              value={logoFile}
              onChange={setLogoFile}
              height="h-36"
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ColorPicker
                label="Primary color"
                value={orgPrimaryColor}
                onChange={setOrgPrimaryColor}
              />
              <ColorPicker
                label="Secondary color"
                value={orgSecondaryColor}
                onChange={setOrgSecondaryColor}
              />
            </div>
          </section>

          {error ? <Callout tone="danger">{error}</Callout> : null}
          <div className="flex justify-end">
            <Button type="submit" isLoading={submitting} disabled={submitting}>
              Continue
            </Button>
          </div>
        </form>
      ) : null}

      {step === "billing" ? (
        <section className="space-y-4">
          <section className="rounded-2xl border border-card-border bg-card p-4 md:p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">Billing plan</h2>
                <p className="mt-1 text-sm text-card-text">
                  Select a plan to activate product access.
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
          </section>

          {plansLoading ? (
            <p className="text-sm text-card-text">Loading plans…</p>
          ) : plans.length === 0 ? (
            <Callout tone="warning" title="No plans available">
              Contact your administrator to enable billing plans.
            </Callout>
          ) : (
            <div className="grid grid-cols-1 gap-4">
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

          {error ? <Callout tone="danger">{error}</Callout> : null}
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={handleVerifySubscription}
              isLoading={sessionLoading}
            >
              I've completed checkout — verify
            </Button>
          </div>
        </section>
      ) : null}

      {step === "workspace" ? (
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <section className="rounded-2xl border border-card-border bg-card p-4 md:p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-text">First workspace</h2>
            <p className="mt-1 mb-4 text-sm text-card-text">
              Name your primary workspace. You can add more later from the navbar.
            </p>
            <Input
              name="workspaceName"
              label="Workspace name"
              placeholder="e.g. Acme Lending Team"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              autoComplete="off"
            />
          </section>

          {error ? <Callout tone="danger">{error}</Callout> : null}
          <div className="flex justify-end">
            <Button type="submit" isLoading={submitting} disabled={submitting}>
              Complete setup
            </Button>
          </div>
        </form>
      ) : null}

      {step === "access" ? (
        <section className="rounded-2xl border border-card-border bg-card p-4 md:p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-text">Awaiting access</h2>
          <Callout tone="warning" title="Additional permissions required">
            Your organization is set up, but your role cannot finish onboarding. Ask an owner or
            admin to assign you to a workspace or grant the required permissions.
          </Callout>
          <p className="text-sm text-card-text">
            {session?.accessReason === "billing_manage_required"
              ? "Missing: organization.billing.manage"
              : "Missing: organization.workspaces.create"}
          </p>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => void fetchSession()} isLoading={sessionLoading}>
              <FiRefreshCw className="mr-2 inline" />
              Refresh access
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default WorkspaceOnboarding;
