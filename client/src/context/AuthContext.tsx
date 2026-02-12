import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { User } from "../types/auth.types";
import { UserService } from "../service/userService";
import { AuthService } from "../service/authService";

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialMount = useRef(true);
  const refreshInProgress = useRef(false);

  // ---- Load user from localStorage (initial hydration) ----
  const loadUserFromStorage = useCallback((): User | null => {
    try {
      const storedUser = localStorage.getItem("user");
      const accessToken = localStorage.getItem("accessToken");

      if (storedUser && accessToken) {
        const parsedUser = JSON.parse(storedUser) as User;
        return parsedUser;
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage:", error);
    }
    return null;
  }, []);

  // ---- Fetch fresh profile from API ----
  const fetchProfile = useCallback(async (): Promise<void> => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const response = await UserService.getProfile();
      if (response?.user) {
        const userData = response.user as User;
        setUser(userData);
        setRole(userData.role || null);
        // Sync with localStorage
        localStorage.setItem("user", JSON.stringify(userData));
        // Dispatch custom event for other tabs/components
        window.dispatchEvent(new CustomEvent("auth:user-updated", { detail: userData }));
      } else {
        // No user in response - clear state
        setUser(null);
        setRole(null);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    } catch (error: any) {
      console.error("Failed to fetch profile:", error);
      // If 401/403, user is not authenticated
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setUser(null);
        setRole(null);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      } else {
        // For other errors, keep existing user from localStorage
        const storedUser = loadUserFromStorage();
        if (storedUser) {
          setUser(storedUser);
          setRole(storedUser.role || null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [loadUserFromStorage]);

  // ---- Refresh profile (public method) ----
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (refreshInProgress.current) return; // Prevent concurrent refreshes
    refreshInProgress.current = true;
    try {
      await fetchProfile();
    } finally {
      refreshInProgress.current = false;
    }
  }, [fetchProfile]);

  // ---- Update user in state and localStorage ----
  const updateUser = useCallback((userData: Partial<User>): void => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      const updatedUser = { ...prevUser, ...userData } as User;
      setRole(updatedUser.role || null);
      // Sync with localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));
      // Dispatch custom event for other tabs/components
      window.dispatchEvent(new CustomEvent("auth:user-updated", { detail: updatedUser }));
      return updatedUser;
    });
  }, []);

  // ---- Logout ----
  const logout = useCallback(async (): Promise<void> => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Clear local state even if API call fails
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } finally {
      setUser(null);
      setRole(null);
      window.dispatchEvent(new CustomEvent("auth:user-logged-out"));
    }
  }, []);

  // ---- Initialize on mount ----
  useEffect(() => {
    if (!isInitialMount.current) return;
    isInitialMount.current = false;

    // First, load from localStorage for instant UI
    const storedUser = loadUserFromStorage();
    if (storedUser) {
      setUser(storedUser);
      setRole(storedUser.role || null);
      setLoading(false);
    }

    // Then fetch fresh profile from API
    fetchProfile();
  }, [loadUserFromStorage, fetchProfile]);

  // ---- Listen for storage changes (e.g., from other tabs) ----
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user" || e.key === "accessToken") {
        if (e.newValue) {
          // User was updated in another tab
          const storedUser = loadUserFromStorage();
          if (storedUser) {
            setUser(storedUser);
            setRole(storedUser.role || null);
            setLoading(false);
          }
        } else {
          // User was removed in another tab
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    };

    // Listen for custom events (same tab updates)
    const handleUserUpdated = (e: CustomEvent) => {
      const updatedUser = e.detail as User;
      setUser(updatedUser);
      setRole(updatedUser.role || null);
      setLoading(false);
      // Sync with localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));
    };

    const handleUserLoggedOut = () => {
      setUser(null);
      setRole(null);
      setLoading(false);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth:user-updated", handleUserUpdated as EventListener);
    window.addEventListener("auth:user-logged-out", handleUserLoggedOut);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth:user-updated", handleUserUpdated as EventListener);
      window.removeEventListener("auth:user-logged-out", handleUserLoggedOut);
    };
  }, [loadUserFromStorage]);

  const value: AuthContextType = {
    user,
    role,
    loading,
    isAuthenticated: !!user,
    refreshProfile,
    updateUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default useAuth;

