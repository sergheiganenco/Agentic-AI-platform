import { useState, useEffect, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import api from "../api/client"; // <-- adjust import to your API wrapper
import type { User } from "./authTypes";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // Fetch user on login
  useEffect(() => {
    if (isLoggedIn) {
      setLoadingUser(true);
      api.get("/users/me", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
        .then((res) => setUser(res.data))
        .catch(() => setUser(null))
        .finally(() => setLoadingUser(false));
    } else {
      setUser(null);
    }
  }, [isLoggedIn]);

  // Clear state on logout
  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn, user, setUser, logout, loadingUser }}>
      {children}
    </AuthContext.Provider>
  );
};
