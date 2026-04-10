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

const ACTIVE_WORKSPACE_KEY = "activeWorkspaceId";

interface AuthContextType {
  user: User | null;
  /** Effective role in the active workspace (membership role). */
  role: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  workspaces: WorkspaceSummary[];
  workspacesLoaded: boolean;
  activeWorkspaceId: string | null;
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
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(ACTIVE_WORKSPACE_KEY) : null
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

  const setActiveWorkspaceId = useCallback((id: string | null) => {
    setActiveWorkspaceIdState(id);
    if (id) {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    }
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

      const stored = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
      const valid = stored && list.some((w) => w.workspaceId === stored);
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
  }, [setActiveWorkspaceId]);

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
        localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
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
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    } finally {
      setUser(null);
      setWorkspaces([]);
      setWorkspacesLoaded(true);
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
      if (e.key === "user" || e.key === "accessToken" || e.key === ACTIVE_WORKSPACE_KEY) {
        if (e.key === ACTIVE_WORKSPACE_KEY && e.newValue) {
          setActiveWorkspaceIdState(e.newValue);
        }
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

  const value: AuthContextType = {
    user,
    role: effectiveRole,
    loading,
    isAuthenticated: !!user,
    workspaces,
    workspacesLoaded,
    activeWorkspaceId,
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
