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

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redirectPath, setRedirectPath] = useState(null);
  const [welcomeName, setWelcomeName] = useState("");

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

        // Direct Role-Based Redirects
        if (data.user?.role === "security") {
          setWelcomeName(data.user?.name || "");
          setRedirectPath("/security/dashboard");
          setShowSuccessModal(true);
          return;
        }

        if (data.user?.role === "admin") {
          setWelcomeName(data.user?.name || "");
          setRedirectPath("/admin/dashboard");
          setShowSuccessModal(true);
          return;
        }

        // Student Navigation Flow — always route to gate scanner
        sessionStorage.removeItem("redirectAfterLogin");
        setWelcomeName(data.user?.name || "");
        setRedirectPath("/gate/main-gate");
        setShowSuccessModal(true);
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

  const handleContinue = () => {
    if (redirectPath) {
      navigate(redirectPath, { replace: true });
    }
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

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Authorized IIIT Pune users Only
            </p>
            <p className="text-[10px] font-medium mt-3 text-slate-400">
              Designed & Developed by <span className="text-slate-900 font-semibold">Ayush Sabale</span>
            </p>
          </div>
        </div>

      </div>



      {/* Login Success Popup */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-md px-4 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-xl rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-emerald-500/30 max-w-xs w-full p-6 text-center transform animate-scaleIn">

            {/* Clean Bright Success Check Core */}
            <div className="mx-auto mb-5 relative flex items-center justify-center w-14 h-14">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl animate-pulse"></div>
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <svg
                  className="w-6 h-6 text-white stroke-[2.5]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-base font-bold tracking-tight text-slate-900">
              Login Successful
            </h2>

            <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-medium">
              {welcomeName ? `Welcome back, ${welcomeName}.` : "Welcome back."} You are now signed in.
            </p>

            <button
              onClick={handleContinue}
              className="w-full mt-6 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-all duration-200 text-white py-3 rounded-2xl font-semibold text-xs tracking-wide shadow-md shadow-slate-900/10"
            >
              Continue
            </button>
          </div>
        </div>
      )}

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