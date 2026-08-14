import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import CompleteProfile from "../pages/auth/CompleteProfile";

import Dashboard from "../pages/student/Dashboard";
import GateScanner from "../pages/student/GateScanner";
import History from "../pages/student/History";

import SecurityDashboard from "../pages/security/SecurityDashboard";

// Admin Imports
import AdminDashboard from "../pages/admin/AdminDashboard";
import ManageUsers from "../pages/admin/ManageUsers";
import ManageGates from "../pages/admin/ManageGates";
import ExportLogs from "../pages/admin/ExportLogs";
import ResetSystem from "../pages/admin/ResetSystem";

import GateJunction from "../pages/gate/GateJunction";

import ProtectedRoute from "../components/common/ProtectedRoute";

const AppRoutes = () => {
  return (
    <Routes>

      {/* Public Routes */}
      <Route path="/" element={<Login />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />

      {/* QR scans land here first. GateJunction reads the logged-in
          user's role and redirects to the right destination. */}
      {/* FIX: Added a base /gate route just in case someone scans a link without a slug, preventing a 404 crash */}
      <Route path="/gate" element={<GateJunction />} />
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

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute role="admin">
            <ManageUsers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/gates"
        element={
          <ProtectedRoute role="admin">
            <ManageGates />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute role="admin">
            <ExportLogs />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/reset"
        element={
          <ProtectedRoute role="admin">
            <ResetSystem />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
};

export default AppRoutes;