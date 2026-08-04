// src/pages/gate/GateJunction.jsx
import { useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";

const GateJunction = () => {
  const { user, loading } = useAuth();
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Wait until AuthContext finishes checking token/session
    if (loading) return;

    // Save current gate slug for GateScanner if needed
    if (slug) {
      sessionStorage.setItem("currentGateSlug", slug);
    }

    // 2. CASE: Not Logged In
    if (!user) {
      // Save full current path (/gate/main-gate) so login returns here
      sessionStorage.setItem("redirectAfterLogin", location.pathname);
      navigate("/", { replace: true });
      return;
    }

    // 3. CASE: Logged In -> Check Role
    const role = user.role?.toLowerCase();

    if (role === "student") {
      // FIX: this now matches the route actually registered in
      // AppRoutes.jsx (/student/gate-scanner/:slug) — the old target,
      // /student/gate-scanner with no slug, doesn't exist and would
      // have dead-ended every student scan.
      navigate(`/student/gate-scanner/${slug}`, { replace: true });
    } else if (role === "security" || role === "security guard") {
      navigate("/security/dashboard", { replace: true });
    } else if (role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    } else {
      // Fallback for unknown role
      navigate("/", { replace: true });
    }
  }, [user, loading, slug, navigate, location]);

  return <Loader message="Verifying gate access..." />;
};

export default GateJunction;