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
import { WorkspaceService, WorkspaceSummary, OrganizationMembership } from "../service/workspaceService";
import { getTenantFromPath } from "../utils/tenantRouting";
import {
  cacheOrganizationLogosFromMemberships,
  readCachedOrganizationLogoUrl,
  resolveOrganizationLogoUrl,
} from "../utils/orgLogo";
import {
  pickPreferredOrganizationId,
  readLastOrganizationId,
  writeLastOrganizationId,
} from "../utils/resolveAppDestination";

export type AuthBootstrapStatus =
  | "Checking your session…"
  | "Fetching your profile…"
  | "Loading organization details…"
  | "Preparing your workspace…"
  | "Ready";

interface AuthContextType {
  user: User | null;
  /** Effective role in the active workspace (membership role). */
  role: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  workspaces: WorkspaceSummary[];
  organizations: OrganizationMembership[];
  workspacesLoaded: boolean;
  /** True once initial profile + memberships have settled (or there is no session). */
  authBootstrapComplete: boolean;
  /** Human-readable step for the entry gate loading card. */
  bootstrapStatus: AuthBootstrapStatus;
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
  const [bootstrapStatus, setBootstrapStatus] =
    useState<AuthBootstrapStatus>("Checking your session…");
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
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
        return JSON.parse(storedUser) as User;
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage:", error);
    }
    return null;
  }, []);

  const setActiveOrganizationId = useCallback((id: string | null) => {
    setActiveOrganizationIdState(id);
    if (id) writeLastOrganizationId(id);
  }, []);

  const setActiveWorkspaceId = useCallback((id: string | null) => {
    setActiveWorkspaceIdState(id);
    window.dispatchEvent(new CustomEvent("workspace:changed", { detail: { workspaceId: id } }));
  }, []);

  const refreshWorkspaces = useCallback(async (): Promise<void> => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setWorkspaces([]);
      setOrganizations([]);
      setWorkspacesLoaded(true);
      return;
    }

    setBootstrapStatus("Loading organization details…");
    try {
      const response = await WorkspaceService.list();
      const list = response.data?.workspaces ?? [];
      const orgList = response.data?.organizations ?? [];
      setWorkspaces(list);
      setOrganizations(orgList);
      cacheOrganizationLogosFromMemberships(orgList);

      const tenantFromPath = getTenantFromPath(
        typeof window !== "undefined" ? window.location.pathname : "",
      );
      const stickyOrg = readLastOrganizationId();

      if (tenantFromPath.organizationId) {
        setActiveOrganizationId(tenantFromPath.organizationId);
      } else {
        const preferred = pickPreferredOrganizationId(orgList, list, stickyOrg);
        setActiveOrganizationId(preferred);
      }

      if (tenantFromPath.workspaceId && list.some((w) => w.workspaceId === tenantFromPath.workspaceId)) {
        setActiveWorkspaceId(tenantFromPath.workspaceId);
      } else if (!tenantFromPath.workspaceId) {
        // Org-primary: do not invent a workspace when the URL is org-only or public.
        setActiveWorkspaceId(null);
      } else {
        // Deep link pointed at a workspace the user no longer has.
        setActiveWorkspaceId(null);
      }
    } catch (e) {
      console.error("Failed to load workspaces:", e);
      setWorkspaces([]);
      setOrganizations([]);
    } finally {
      setWorkspacesLoaded(true);
    }
  }, [setActiveOrganizationId, setActiveWorkspaceId]);

  const fetchProfile = useCallback(async (): Promise<void> => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setUser(null);
      setWorkspaces([]);
      setOrganizations([]);
      setWorkspacesLoaded(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setBootstrapStatus("Fetching your profile…");
    try {
      const response = await UserService.getProfile();
      if (response?.user) {
        const userData = response.user as User;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setWorkspaces([]);
        setOrganizations([]);
        setWorkspacesLoaded(true);
        setBootstrapStatus("Ready");
        return;
      }
      setBootstrapStatus("Loading organization details…");
      await refreshWorkspaces();
      setBootstrapStatus("Preparing your workspace…");
    } catch (error: any) {
      console.error("Failed to fetch profile:", error);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setWorkspaces([]);
        setOrganizations([]);
        setWorkspacesLoaded(true);
      } else {
        const storedUser = loadUserFromStorage();
        if (storedUser) {
          setUser(storedUser);
        }
        setBootstrapStatus("Loading organization details…");
        await refreshWorkspaces();
      }
    } finally {
      setBootstrapStatus("Ready");
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
      setOrganizations([]);
      setWorkspacesLoaded(true);
      setActiveOrganizationIdState(null);
      setActiveWorkspaceIdState(null);
      setLoading(false);
      window.dispatchEvent(new CustomEvent("auth:user-logged-out"));
    }
  }, []);

  const workspaceRole = useMemo(() => {
    if (!activeWorkspaceId || workspaces.length === 0) return null;
    return workspaces.find((w) => w.workspaceId === activeWorkspaceId)?.role ?? null;
  }, [activeWorkspaceId, workspaces]);

  const effectiveRole = workspaceRole ?? user?.role ?? null;
  const authBootstrapComplete = !loading && workspacesLoaded;

  useEffect(() => {
    if (!isInitialMount.current) return;
    isInitialMount.current = false;

    // Hydrate user for UI, but keep loading=true until profile + memberships finish.
    const storedUser = loadUserFromStorage();
    if (storedUser) {
      setUser(storedUser);
    }

    void fetchProfile();
  }, [loadUserFromStorage, fetchProfile]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== "user" && e.key !== "accessToken") return;
      if (e.newValue) {
        const storedUser = loadUserFromStorage();
        if (storedUser) setUser(storedUser);
        void fetchProfile();
      } else {
        setUser(null);
        setWorkspaces([]);
        setOrganizations([]);
        setWorkspacesLoaded(true);
        setLoading(false);
      }
    };

    const handleUserUpdated = (e: CustomEvent) => {
      const updatedUser = e.detail as User;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setLoading(true);
      setWorkspacesLoaded(false);
      setBootstrapStatus("Loading organization details…");
      void (async () => {
        try {
          await refreshWorkspaces();
          setBootstrapStatus("Preparing your workspace…");
        } finally {
          setBootstrapStatus("Ready");
          setLoading(false);
        }
      })();
    };

    const handleUserLoggedOut = () => {
      setUser(null);
      setWorkspaces([]);
      setOrganizations([]);
      setWorkspacesLoaded(true);
      setActiveWorkspaceIdState(null);
      setActiveOrganizationIdState(null);
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
  }, [loadUserFromStorage, fetchProfile, refreshWorkspaces]);

  useEffect(() => {
    const syncFromPath = () => {
      const tenant = getTenantFromPath(typeof window !== "undefined" ? window.location.pathname : "");
      setActiveOrganizationIdState(tenant.organizationId);
      if (tenant.organizationId) writeLastOrganizationId(tenant.organizationId);
      setActiveWorkspaceIdState(tenant.workspaceId);
    };
    syncFromPath();
    window.addEventListener("popstate", syncFromPath);
    return () => window.removeEventListener("popstate", syncFromPath);
  }, []);

  useEffect(() => {
    const activeWorkspace = workspaces.find((w) => w.workspaceId === activeWorkspaceId);
    const activeOrganization =
      organizations.find((o) => o.organizationId === activeOrganizationId) ||
      activeWorkspace?.organization?.organizationId
        ? organizations.find(
            (o) => o.organizationId === (activeWorkspace?.organization?.organizationId || activeOrganizationId)
          )
        : null;

    if (!activeWorkspace && !activeOrganization) {
      document.title = "Mortgage CRM";
      return;
    }

    const orgName =
      activeOrganization?.name || activeWorkspace?.organization?.name || "Mortgage CRM";
    document.title = activeWorkspace ? `${activeWorkspace.name} · ${orgName}` : orgName;

    const orgLogo =
      resolveOrganizationLogoUrl(activeOrganization, activeWorkspace) ||
      readCachedOrganizationLogoUrl(activeOrganizationId);
    let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.setAttribute("rel", "icon");
      document.head.appendChild(favicon);
    }
    if (orgLogo) {
      favicon.setAttribute("href", orgLogo);
      const path = orgLogo.split("?")[0].toLowerCase();
      const type = path.endsWith(".svg")
        ? "image/svg+xml"
        : path.endsWith(".jpg") || path.endsWith(".jpeg")
          ? "image/jpeg"
          : path.endsWith(".webp")
            ? "image/webp"
            : path.endsWith(".gif")
              ? "image/gif"
              : path.endsWith(".png")
                ? "image/png"
                : "";
      if (type) favicon.setAttribute("type", type);
      else favicon.removeAttribute("type");
    } else {
      favicon.setAttribute("href", "/vite.svg");
      favicon.setAttribute("type", "image/svg+xml");
    }
  }, [activeWorkspaceId, activeOrganizationId, organizations, workspaces]);

  const value: AuthContextType = {
    user,
    role: effectiveRole,
    loading,
    isAuthenticated: !!user,
    workspaces,
    organizations,
    workspacesLoaded,
    authBootstrapComplete,
    bootstrapStatus,
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
