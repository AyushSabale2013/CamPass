import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import PageContainer from "../../components/layout/PageContainer";
import Logo from "../../components/common/Logo";

import { googleLogin } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

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
        const user = data.user;
        login(user, data.token);
        sessionStorage.removeItem("redirectAfterLogin");

        if (user.role === "student") {
          navigate("/student/dashboard", { replace: true });
        } else if (user.role === "security") {
          navigate("/security/dashboard", { replace: true });
        } else if (user.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        }
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