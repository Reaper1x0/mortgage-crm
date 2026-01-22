import { useEffect, useState, useCallback } from "react";
import { User } from "../types/auth.types";

interface UseAuthReturn {
  user: User | null;
  role: string | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- Load auth state from localStorage ----
  const loadAuthFromStorage = useCallback(() => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem("user");
      const accessToken = localStorage.getItem("accessToken");

      if (storedUser && accessToken) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setRole(parsedUser?.role || null);
      } else {
        setUser(null);
        setRole(null);
      }
    } catch {
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Init on mount ----
  useEffect(() => {
    loadAuthFromStorage();
  }, [loadAuthFromStorage]);

  return {
    user,
    role,
    loading,
    isAuthenticated: !!user,
  };
};

export default useAuth;
