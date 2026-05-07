import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
  useMemo,
} from "react";
import { User } from "../types/auth.types";
import { UserService } from "../service/userService";
import { AuthService } from "../service/authService";
import { WorkspaceService, WorkspaceSummary } from "../service/workspaceService";
import { useTheme } from "./ThemeContext";
import { getTenantFromPath } from "../utils/tenantRouting";

interface AuthContextType {
  user: User | null;
  /** Effective role in the active workspace (membership role). */
  role: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  workspaces: WorkspaceSummary[];
  workspacesLoaded: boolean;
  activeOrganizationId: string | null;
  activeWorkspaceId: string | null;
  setActiveOrganizationId: (id: string | null) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  refreshWorkspaces: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const { applyBranding, setTheme } = useTheme();
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(() =>
    getTenantFromPath(typeof window !== "undefined" ? window.location.pathname : "").organizationId
  );
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(() =>
    getTenantFromPath(typeof window !== "undefined" ? window.location.pathname : "").workspaceId
  );
  const isInitialMount = useRef(true);
  const refreshInProgress = useRef(false);

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

  const setActiveOrganizationId = useCallback((id: string | null) => {
    setActiveOrganizationIdState(id);
  }, []);

  const setActiveWorkspaceId = useCallback((id: string | null) => {
    setActiveWorkspaceIdState(id);
    window.dispatchEvent(new CustomEvent("workspace:changed", { detail: { workspaceId: id } }));
  }, []);

  const refreshWorkspaces = useCallback(async (): Promise<void> => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setWorkspaces([]);
      setWorkspacesLoaded(true);
      return;
    }
    try {
      const response = await WorkspaceService.list();
      const list = response.data?.workspaces ?? [];
      setWorkspaces(list);
      const orgFromActiveWorkspace =
        list.find((w) => w.workspaceId === activeWorkspaceId)?.organization?.organizationId ?? null;
      if (orgFromActiveWorkspace) {
        setActiveOrganizationId(orgFromActiveWorkspace);
      } else if (list[0]?.organization?.organizationId) {
        setActiveOrganizationId(list[0].organization.organizationId);
      }

      const tenantFromPath = getTenantFromPath(typeof window !== "undefined" ? window.location.pathname : "");
      const pathWorkspaceId = tenantFromPath.workspaceId;
      const valid = pathWorkspaceId && list.some((w) => w.workspaceId === pathWorkspaceId);
      if (list.length > 0 && !valid) {
        setActiveWorkspaceId(list[0].workspaceId);
      } else if (list.length === 0) {
        setActiveWorkspaceId(null);
      }
    } catch (e) {
      console.error("Failed to load workspaces:", e);
      setWorkspaces([]);
    } finally {
      setWorkspacesLoaded(true);
    }
  }, [activeWorkspaceId, setActiveOrganizationId, setActiveWorkspaceId]);

  const fetchProfile = useCallback(async (): Promise<void> => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setUser(null);
      setLoading(false);
      setWorkspaces([]);
      setWorkspacesLoaded(true);
      return;
    }

    try {
      const response = await UserService.getProfile();
      if (response?.user) {
        const userData = response.user as User;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        window.dispatchEvent(new CustomEvent("auth:user-updated", { detail: userData }));
      } else {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
      await refreshWorkspaces();
    } catch (error: any) {
      console.error("Failed to fetch profile:", error);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      } else {
        const storedUser = loadUserFromStorage();
        if (storedUser) {
          setUser(storedUser);
        }
        await refreshWorkspaces();
      }
    } finally {
      setLoading(false);
    }
  }, [loadUserFromStorage, refreshWorkspaces]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (refreshInProgress.current) return;
    refreshInProgress.current = true;
    try {
      await fetchProfile();
    } finally {
      refreshInProgress.current = false;
    }
  }, [fetchProfile]);

  const updateUser = useCallback((userData: Partial<User>): void => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      const updatedUser = { ...prevUser, ...userData } as User;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent("auth:user-updated", { detail: updatedUser }));
      return updatedUser;
    });
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } finally {
      setUser(null);
      setWorkspaces([]);
      setWorkspacesLoaded(true);
      setActiveOrganizationIdState(null);
      setActiveWorkspaceIdState(null);
      window.dispatchEvent(new CustomEvent("auth:user-logged-out"));
    }
  }, []);

  const workspaceRole = useMemo(() => {
    if (!activeWorkspaceId || workspaces.length === 0) return null;
    return workspaces.find((w) => w.workspaceId === activeWorkspaceId)?.role ?? null;
  }, [activeWorkspaceId, workspaces]);

  const effectiveRole = workspaceRole ?? user?.role ?? null;

  useEffect(() => {
    if (!isInitialMount.current) return;
    isInitialMount.current = false;

    const storedUser = loadUserFromStorage();
    if (storedUser) {
      setUser(storedUser);
      setLoading(false);
    }

    fetchProfile();
  }, [loadUserFromStorage, fetchProfile]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "user" ||
        e.key === "accessToken"
      ) {
        if (e.key === "user" || e.key === "accessToken") {
          if (e.newValue) {
            const storedUser = loadUserFromStorage();
            if (storedUser) {
              setUser(storedUser);
              setLoading(false);
            }
          } else {
            setUser(null);
            setLoading(false);
          }
        }
      }
    };

    const handleUserUpdated = (e: CustomEvent) => {
      const updatedUser = e.detail as User;
      setUser(updatedUser);
      setLoading(false);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      void refreshWorkspaces();
    };

    const handleUserLoggedOut = () => {
      setUser(null);
      setWorkspaces([]);
      setWorkspacesLoaded(true);
      setActiveWorkspaceIdState(null);
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
  }, [loadUserFromStorage, refreshWorkspaces]);

  useEffect(() => {
    const syncFromPath = () => {
      const tenant = getTenantFromPath(typeof window !== "undefined" ? window.location.pathname : "");
      setActiveOrganizationIdState(tenant.organizationId);
      setActiveWorkspaceIdState(tenant.workspaceId);
    };
    syncFromPath();
    window.addEventListener("popstate", syncFromPath);
    return () => window.removeEventListener("popstate", syncFromPath);
  }, []);

  useEffect(() => {
    const activeWorkspace = workspaces.find((w) => w.workspaceId === activeWorkspaceId);
    if (!activeWorkspace) {
      document.title = "Mortgage CRM";
      return;
    }
    const orgId = activeWorkspace.organization?.organizationId;
    if (orgId && orgId !== activeOrganizationId) setActiveOrganizationId(orgId);
    const orgBranding = activeWorkspace.branding?.organization || null;
    applyBranding(orgBranding);
    const orgName = activeWorkspace.organization?.name || "Mortgage CRM";
    document.title = orgName;
    const orgLogo = orgBranding?.logoUrl || null;
    let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.setAttribute("rel", "icon");
      document.head.appendChild(favicon);
    }
    if (orgLogo) {
      favicon.setAttribute("href", orgLogo);
      favicon.setAttribute("type", "image/png");
    } else {
      favicon.setAttribute("href", "/vite.svg");
      favicon.setAttribute("type", "image/svg+xml");
    }
    if (orgBranding?.themeMode === "light" || orgBranding?.themeMode === "dark") {
      setTheme(orgBranding.themeMode);
    }
  }, [activeWorkspaceId, activeOrganizationId, applyBranding, setActiveOrganizationId, setTheme, workspaces]);

  const value: AuthContextType = {
    user,
    role: effectiveRole,
    loading,
    isAuthenticated: !!user,
    workspaces,
    workspacesLoaded,
    activeOrganizationId,
    activeWorkspaceId,
    setActiveOrganizationId,
    setActiveWorkspaceId,
    refreshWorkspaces,
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
