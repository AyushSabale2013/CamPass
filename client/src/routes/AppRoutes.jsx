import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import CompleteProfile from "../pages/auth/CompleteProfile";

import Dashboard from "../pages/student/Dashboard";
import GateScanner from "../pages/student/GateScanner";
import History from "../pages/student/History";

import SecurityDashboard from "../pages/security/SecurityDashboard";
import AdminDashboard from "../pages/admin/AdminDashboard";

import GateJunction from "../pages/gate/GateJunction";

import ProtectedRoute from "../components/common/ProtectedRoute";

const AppRoutes = () => {
  return (
    <Routes>

      {/* Public Routes */}

      <Route path="/" element={<Login />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />

      {/* QR scans land here first. GateJunction reads the logged-in
          user's role and redirects to the right destination — students
          go on to the scanner, security/admin go straight to their
          dashboards. This is what keeps a security guard's scan from
          ever reaching GateScanner. */}
      <Route path="/gate/:slug" element={<GateJunction />} />

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
        path="/student/gate-scanner/:slug"
        element={
          <ProtectedRoute role="student">
            <GateScanner />
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

      {/* Security Guard */}

      <Route
        path="/security/dashboard"
        element={
          <ProtectedRoute role="security">
            <SecurityDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin */}

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
};

export default AppRoutes;