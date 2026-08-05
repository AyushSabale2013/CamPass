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

          <p className="text-center text-sm text-gray-400">
            Authorized IIIT Pune users and Security personnel only.
          </p>
        </div>
      </div>

      {/* Login Success Popup */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-7 text-center transform animate-scaleIn">
            <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50">
              <svg
                className="w-9 h-9 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Login Successful
            </h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              {welcomeName ? `Welcome back, ${welcomeName}.` : "Welcome back."} You're
              now signed in.
            </p>
            <button
              onClick={handleContinue}
              className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/20 text-sm tracking-wide"
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