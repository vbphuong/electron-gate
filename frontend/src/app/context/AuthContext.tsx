"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { apiGetMe, apiLogin, type UserInfo } from "@/app/lib/api";

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserInfo>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "electron_gate_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      apiGetMe(savedToken)
        .then((userInfo) => {
          setToken(savedToken);
          setUser(userInfo);
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      queueMicrotask(() => {
        setIsLoading(false);
      });
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<UserInfo> => {
    const data = await apiLogin(email, password);
    const accessToken = data.access_token;
    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);

    const userInfo = await apiGetMe(accessToken);
    setUser(userInfo);
    return userInfo;
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
