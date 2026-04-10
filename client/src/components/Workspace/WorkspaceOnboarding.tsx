import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { WorkspaceService } from "../../service/workspaceService";
import Button from "../Reusable/Button";
import { cn } from "../../utils/cn";

const WorkspaceOnboarding: React.FC = () => {
  const { user, workspaces, refreshWorkspaces, setActiveWorkspaceId, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
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
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Enter a workspace name (at least 2 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await WorkspaceService.create(trimmed);
      const id = res.data?.workspace?._id;
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
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-semibold text-text mb-1">Create your workspace</h1>
      <p className="text-sm text-card-text mb-6">
        You are signed in as <span className="font-medium text-text">{user.email}</span>. Create a workspace to
        start using the CRM. You can create more workspaces later from the header.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ws-name" className="block text-sm font-medium text-text mb-1.5">
            Workspace name
          </label>
          <input
            id="ws-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          Create workspace
        </Button>
      </form>
    </div>
  );
};

export default WorkspaceOnboarding;
