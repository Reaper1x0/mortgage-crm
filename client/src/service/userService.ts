import apiClient from "../api/apiClient";

export const UserService = {
  getProfile: async () => {
    const response = await apiClient.get("/auth/profile");
    return response.data;
  },
  updateProfile: async (data: Record<string, any>) => {
    const response = await apiClient.post("/auth/update-profile", data);
    return response.data;
  },
};
