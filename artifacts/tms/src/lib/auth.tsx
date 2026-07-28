import React, { createContext, useContext, useState, useEffect } from "react";
import { useGetMe, getGetMeQueryKey, StaffMember } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: StaffMember | null;
  isLoading: boolean;
  setToken: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [token, setTokenState] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("tms_token") : null
  );

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    if (isError) {
      setTokenState(null);
      localStorage.removeItem("tms_token");
      setLocation("/login");
    }
  }, [isError, setLocation]);

  const setToken = (newToken: string) => {
    localStorage.setItem("tms_token", newToken);
    setTokenState(newToken);
  };

  const logout = () => {
    localStorage.removeItem("tms_token");
    setTokenState(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
