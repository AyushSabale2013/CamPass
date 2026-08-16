
import { useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";

const GateJunction = () => {
  const { user, loading } = useAuth();
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // FIX: This lock prevents the infinite "Verifying access..." loop
  const hasHandledRedirect = useRef(false);

  useEffect(() => {
    // 1. Wait until AuthContext finishes checking token/session
    if (loading) return;

    // FIX: Stop React from running this twice and looping
    if (hasHandledRedirect.current) return;
    hasHandledRedirect.current = true;

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
    // FIX: Added optional chaining (?.) so it doesn't crash if role is undefined
    const role = user?.role?.toLowerCase() || "";

    if (role === "student") {
      // FIX: Matches your route /student/gate-scanner/:slug safely
      navigate(`/student/gate-scanner/${slug || "main-gate"}`, { replace: true });
    } else if (role === "security" || role === "security guard") {
      navigate("/security/dashboard", { replace: true });
    } else if (role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    } else {
      // Fallback for unknown role
      navigate("/", { replace: true });
    }
    
    // FIX: Only track location.pathname, not the whole location object
  }, [user, loading, slug, navigate, location.pathname]);

  return <Loader message="Verifying gate access..." />;
};

export default GateJunction;

