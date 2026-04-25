import React from "react";
import { useAuth } from "../../context/AuthContext";
import Callout from "../Reusable/Callout";

const WorkspaceSettings: React.FC = () => {
  const { workspaces, activeWorkspaceId } = useAuth();
  const active = workspaces.find((w) => w.workspaceId === activeWorkspaceId);

  if (!active) {
    return (
      <div className="max-w-3xl mx-auto">
        <Callout tone="warning" title="No active workspace">
          Select or create a workspace first.
        </Callout>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-semibold text-text">Workspace Settings</h1>
      <p className="text-sm text-card-text">Workspace identity and access context.</p>

      <section className="rounded-2xl border border-card-border bg-card p-4">
        <h2 className="text-lg font-semibold text-text mb-3">Workspace Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-card-text">Name</div>
            <div className="text-text font-medium">{active.name}</div>
          </div>
          <div>
            <div className="text-card-text">Slug</div>
            <div className="text-text font-medium">{active.slug}</div>
          </div>
          <div>
            <div className="text-card-text">Role</div>
            <div className="text-text font-medium">{active.role}</div>
          </div>
          <div>
            <div className="text-card-text">Organization</div>
            <div className="text-text font-medium">{active.organization?.name || "-"}</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WorkspaceSettings;
