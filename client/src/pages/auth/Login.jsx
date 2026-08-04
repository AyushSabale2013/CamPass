import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import PageContainer from "../../components/layout/PageContainer";
import Logo from "../../components/common/Logo";

import { googleLogin } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

// Keep this identical to the fallback used in CompleteProfile.jsx —
// both must agree on where a student lands with no saved redirect.
const DEFAULT_GATE_SLUG = "/gate/main-gate";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        alert("Google authentication failed. Missing credentials.");
        return;
      }

      const response = await googleLogin(credentialResponse.credential);
      const data = response.data;

      // Existing User Flow (Student, Security, or Admin)
      if (data.isRegistered) {
        login(data.user, data.token);

        // 1. Check if user came from scanning a QR code (/gate/:slug)
        const savedRedirect = sessionStorage.getItem("redirectAfterLogin");

        if (savedRedirect) {
          sessionStorage.removeItem("redirectAfterLogin");
          navigate(savedRedirect, { replace: true });
          return;
        }

        // 2. Default Fallback Redirects (when logging in normally via homepage)
        const role = data.user?.role?.toLowerCase();

        if (role === "security") {
          navigate("/security/dashboard", { replace: true });
          return;
        }

        if (role === "admin") {
          navigate("/admin/dashboard", { replace: true });
          return;
        }

        // Default: student goes straight to the gate scanner, not a dashboard.
        navigate(DEFAULT_GATE_SLUG, { replace: true });
        return;
      }

      // New User Profile Completion Flow
      sessionStorage.setItem(
        "registrationToken",
        data.registrationToken
      );

      navigate("/complete-profile");
    } catch (error) {
      console.error("Login Handler Error:", error);

      alert(
        error.response?.data?.message ||
        "Login Failed. Please check your network connection and try again."
      );
    }
  };

  const handleError = () => {
    console.error("Google Login Component Error");
    alert("Google Sign-In failed or was closed. Please try again.");
  };

  return (
    <PageContainer>
      <div className="flex flex-col justify-between min-h-screen px-8 py-12">
        <Logo />

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Welcome
          </h2>
          <p className="mt-3 text-gray-500">
            Login using your authorized Google account.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            useOneTap
          />

          <p className="text-center text-sm text-gray-400">
            Authorized IIIT Pune users and Security personnel only.
          </p>
        </div>
      </div>
    </PageContainer>
  );
};

export default Login;