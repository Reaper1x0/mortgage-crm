import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { WorkspaceService } from "../../service/workspaceService";
import { OrganizationService } from "../../service/organizationService";
import Button from "../Reusable/Button";
import { cn } from "../../utils/cn";
import ImageUpload from "../Reusable/Inputs/ImageUpload";

const WorkspaceOnboarding: React.FC = () => {
  const { user, workspaces, refreshWorkspaces, setActiveWorkspaceId, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [logoFile, setLogoFile] = useState<File | undefined>(undefined);
  const [orgPrimaryColor, setOrgPrimaryColor] = useState("#3b82f6");
  const [orgSecondaryColor, setOrgSecondaryColor] = useState("#8b5cf6");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (workspaces.length > 0) {
      navigate("/workspace/dashboard/analytics", { replace: true });
    }
  }, [workspaces.length, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const company = companyName.trim();
    const workspace = workspaceName.trim();
    if (company.length < 2) {
      setError("Enter a company name (at least 2 characters).");
      return;
    }
    if (workspace.length < 2) {
      setError("Enter a workspace name (at least 2 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const orgRes = await OrganizationService.create(company);
      const organizationId = orgRes.data?.organization?._id;
      const res = await WorkspaceService.create(workspace, organizationId);
      const id = res.data?.workspace?._id;

      if (organizationId) localStorage.setItem("activeOrganizationId", String(organizationId));
      if (id) localStorage.setItem("activeWorkspaceId", String(id));

      if (organizationId) {
        const orgBranding = new FormData();
        orgBranding.append("primaryColor", orgPrimaryColor);
        orgBranding.append("secondaryColor", orgSecondaryColor);
        if (logoFile) orgBranding.append("logo", logoFile);
        await OrganizationService.updateBranding(orgBranding);
      }

      await refreshWorkspaces();
      if (id) {
        setActiveWorkspaceId(String(id));
      }
      navigate("/workspace/dashboard/analytics", { replace: true });
    } catch (err: unknown) {
      console.error(err);
      setError("Could not create workspace. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-slate-500">Loading…</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-text mb-1">Set up your company</h1>
      <p className="text-sm text-card-text mb-6">
        You are signed in as <span className="font-medium text-text">{user.email}</span>. First create your company,
        then your first workspace. You can add more workspaces later from the header.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-card-border bg-card p-4">
          <h2 className="text-base font-semibold text-text mb-3">Company details</h2>
        <div>
          <label htmlFor="company-name" className="block text-sm font-medium text-text mb-1.5">
            Company name
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
        </div>
          <div className="mt-4">
            <ImageUpload
              label="Company logo"
              name="company-logo"
              value={logoFile}
              onChange={setLogoFile}
              height="h-36"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-card-border bg-card p-4">
          <h2 className="text-base font-semibold text-text mb-3">Branding</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Organization primary color</label>
              <input type="color" value={orgPrimaryColor} onChange={(e) => setOrgPrimaryColor(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Organization secondary color</label>
              <input type="color" value={orgSecondaryColor} onChange={(e) => setOrgSecondaryColor(e.target.value)} />
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="ws-name" className="block text-sm font-medium text-text mb-1.5">
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
            autoComplete="organization"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" isLoading={submitting} disabled={submitting}>
          Complete setup
        </Button>
      </form>
    </div>
  );
};

export default WorkspaceOnboarding;
