import apiClient from "../api/apiClient";

export interface FileRef {
  _id: string;
  display_name: string;
  original_name: string;
  storage_path: string;
  url?: string;
  type?: string;
  content_type?: string;
  extension?: string;
  size_in_bytes?: number;
}

export interface User {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
  workspaceRoleId?: string | null;
  workspaceRoleSlug?: string | null;
  isEmailVerified: boolean;
  profile_picture?: FileRef | null;
  createdAt: string;
  updatedAt: string;
  workspaceCount?: number;
  organizationCount?: number;
  primaryOrganizationRole?: "Owner" | "Admin" | "Member" | "Viewer" | null;
}

export interface UserListResponse {
  message: string;
  success: boolean;
  users: User[];
  roleStats?: {
    fullAccessCount: number;
  };
  permissions?: {
    canManageUsers: boolean;
    canManageFullAccess: boolean;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
}

export interface UserResponse {
  message: string;
  success: boolean;
  user: User;
}

export const UserService = {
  // Profile endpoints (for current user)
  getProfile: async () => {
    const response = await apiClient.get("/auth/profile");
    return response.data;
  },
  updateProfile: async (data: FormData | Record<string, any>) => {
    const response = await apiClient.post("/auth/update-profile", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
    });
    return response.data;
  },
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await apiClient.post("/auth/change-password", data);
    return response.data;
  },

  // Admin endpoints (user management)
  listUsers: async (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    role?: string;
    workspaceRoleId?: string;
    search?: string;
  }) => {
    const response = await apiClient.get<UserListResponse>("/users", { params });
    return response.data;
  },

  listSystemUsers: async (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    role?: "superAdmin" | "user";
    search?: string;
  }) => {
    const response = await apiClient.get<UserListResponse>("/super-admin/users", { params });
    return response.data;
  },

  getUser: async (id: string) => {
    const response = await apiClient.get<UserResponse>(`/users/${id}`);
    return response.data;
  },

  createUser: async (data: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    role?: string;
    workspaceRoleId?: string;
  }) => {
    const response = await apiClient.post<UserResponse>("/users", data);
    return response.data;
  },

  updateUser: async (
    id: string,
    data: {
      fullName?: string;
      username?: string;
      email?: string;
      password?: string;
      role?: string;
      workspaceRole?: string;
      workspaceRoleId?: string;
    }
  ) => {
    const response = await apiClient.put<UserResponse>(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },
};
