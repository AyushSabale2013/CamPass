import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser } from "../services/authService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ---------------- LOGIN ----------------

  const login = (userData, token) => {
    localStorage.setItem("token", token);

    setUser(userData);
    setIsAuthenticated(true);
  };

  // ---------------- LOGOUT ----------------

  const logout = () => {
    localStorage.removeItem("token");

    setUser(null);
    setIsAuthenticated(false);
  };

  // ---------------- LOAD USER ----------------

  const loadUser = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await getCurrentUser();

      setUser(response.data.user);

      setIsAuthenticated(true);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,

        login,
        logout,

        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);