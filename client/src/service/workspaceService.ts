import apiClient from "../api/apiClient";

export interface WorkspaceSummary {
  workspaceId: string;
  name: string;
  slug: string;
  role: "Admin" | "Agent" | "Viewer";
}

export const WorkspaceService = {
  list: () =>
    apiClient.get<{ success: boolean; message: string; workspaces: WorkspaceSummary[] }>("/workspaces"),

  create: (name: string) =>
    apiClient.post<{ success: boolean; message: string; workspace: { _id: string; name: string; slug: string } }>(
      "/workspaces",
      { name }
    ),
};
