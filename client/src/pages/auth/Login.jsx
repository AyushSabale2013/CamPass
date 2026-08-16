import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../components/layout/PageContainer";
import Logo from "../../components/common/Logo";
import { googleLogin } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // "idle" | "verifying" | "loading-dashboard" | "preparing-registration"
  // Drives a full-screen loader so the user never sees the bare Login
  // page flash back up while auth context/navigation catch up — we only
  // navigate once we're fully done and ready to land on the next screen.
  const [status, setStatus] = useState("idle");

  const isBusy = status !== "idle";

  const handleSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        alert("Google authentication failed. Missing credentials.");
        return;
      }

      setStatus("verifying");

      const response = await googleLogin(credentialResponse.credential);
      const data = response.data;

      // Existing User Flow (Student, Security, or Admin)
      if (data.isRegistered) {
        const user = data.user;

        setStatus("loading-dashboard");

        // Commit auth state first, then wait a tick so context/localStorage
        // writes are flushed before we hand off to the router — this is
        // what prevents the protected route from mounting before it can
        // see the logged-in user.
        login(user, data.token);
        sessionStorage.removeItem("redirectAfterLogin");
        await new Promise((resolve) => setTimeout(resolve, 400));

        if (user.role === "student") {
          navigate("/student/dashboard", { replace: true });
        } else if (user.role === "security") {
          navigate("/security/dashboard", { replace: true });
        } else if (user.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          // Unknown role — don't strand the user on a spinner forever.
          setStatus("idle");
        }
        return;
      }

      // New User Profile Completion Flow
      setStatus("preparing-registration");
      sessionStorage.setItem("registrationToken", data.registrationToken);
      await new Promise((resolve) => setTimeout(resolve, 400));

      navigate("/complete-profile");
    } catch (error) {
      console.error("Login Handler Error:", error);
      alert(
        error.response?.data?.message ||
          "Login Failed. Please check your network connection and try again."
      );
      setStatus("idle");
    }
  };

  const handleError = () => {
    console.error("Google Login Component Error");
    alert("Google Sign-In failed or was closed. Please try again.");
  };

  const statusMessages = {
    verifying: "Verifying your Google account...",
    "loading-dashboard": "Setting up your dashboard...",
    "preparing-registration": "Preparing your registration...",
  };

  return (
    <PageContainer>
      <div className="relative flex flex-col justify-between min-h-screen px-8 py-12">
        <Logo />

        <div>
          <h2 className="text-3xl font-bold text-slate-900">Welcome</h2>
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
          <div className="text-center">
            <p className="text-sm text-gray-400">
              Authorized IIIT Pune users Only
            </p>
            <p className="text-[10px] font-medium mt-3 text-slate-400">
              Designed & Developed by{" "}
              <span className="text-slate-900 font-semibold">Ayush Sabale</span>
            </p>
          </div>
        </div>

        {/* Full-screen loading overlay — covers the entire login page so
            nothing behind it is visible or clickable while we verify,
            log in, and navigate. Prevents the "flash back to login" bug. */}
        {isBusy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm animate-fadeIn">
            <div className="flex flex-col items-center gap-5 px-8 text-center">
              <div className="relative w-14 h-14">
                <span className="absolute inset-0 rounded-full border-4 border-slate-200" />
                <span className="absolute inset-0 rounded-full border-4 border-slate-900 border-t-transparent animate-spin" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {statusMessages[status] || "Just a moment..."}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Please don't close or refresh this page.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.25s ease-out;
        }
      `}</style>
    </PageContainer>
  );
};

export default Login;