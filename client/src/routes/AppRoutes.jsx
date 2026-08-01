import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import CompleteProfile from "../pages/auth/CompleteProfile";

import Dashboard from "../pages/student/Dashboard";

import ProtectedRoute from "../components/common/ProtectedRoute";

const AppRoutes = () => {
  return (
    <Routes>

      {/* Public Routes */}

      <Route
        path="/"
        element={<Login />}
      />

      <Route
        path="/complete-profile"
        element={<CompleteProfile />}
      />

      {/* Student */}

      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute role="student">
            <Dashboard />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
};

export default AppRoutes;