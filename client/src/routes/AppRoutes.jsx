import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import CompleteProfile from "../pages/auth/CompleteProfile";

import Dashboard from "../pages/student/Dashboard";
import GateScanner from "../pages/student/GateScanner";
import History from "../pages/student/History";

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

      <Route
        path="/gate/:slug"
        element={<GateScanner />}
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

      <Route
        path="/student/history"
        element={
          <ProtectedRoute role="student">
            <History />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
};

export default AppRoutes;