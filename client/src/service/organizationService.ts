import apiClient from "../api/apiClient";

export interface OrganizationSummary {
  organizationId: string;
  name: string;
  slug: string;
  role: "Owner" | "Admin" | "Member" | "Viewer";
}

export const OrganizationService = {
  list: () =>
    apiClient.get<{ success: boolean; message: string; organizations: OrganizationSummary[] }>("/organizations"),
  create: (name: string) =>
    apiClient.post<{ success: boolean; message: string; organization: { _id: string; name: string; slug: string } }>(
      "/organizations",
      { name }
    ),
  updateBranding: (formData: FormData) =>
    apiClient.post<{ success: boolean; message: string; organization: { _id: string; branding: unknown } }>(
      "/organizations/branding",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    ),
  updateProfile: (payload: Record<string, string | null>) =>
    apiClient.patch<{ success: boolean; message: string; organization: unknown }>(
      "/organizations/profile",
      payload
    ),
};
