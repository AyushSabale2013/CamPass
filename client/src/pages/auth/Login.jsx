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

            const response = await googleLogin(
                credentialResponse.credential
            );

            const data = response.data;

            // Existing Student
            if (data.isRegistered) {

                login(data.user, data.token);

                // Check if user came from QR
                const redirect =
                    sessionStorage.getItem("redirectAfterLogin");

                if (redirect) {

                    sessionStorage.removeItem(
                        "redirectAfterLogin"
                    );

                    navigate(redirect);

                } else {

                    navigate("/student/dashboard");

                }

                return;
            }

            // New Student

            sessionStorage.setItem(
                "registrationToken",
                data.registrationToken
            );

            navigate("/complete-profile");

        } catch (error) {

            console.error(error);

            alert(
                error.response?.data?.message ||
                "Login Failed"
            );

        }

    };

    return (
        <PageContainer>

            <div className="flex flex-col justify-between min-h-screen px-8 py-12">

                <Logo />

                <div>

                    <h2 className="text-3xl font-bold">
                        Welcome
                    </h2>

                    <p className="mt-3 text-gray-500">
                        Login using your IIIT Pune Google account.
                    </p>

                </div>

                <div className="flex flex-col items-center gap-4">

                    <GoogleLogin
                        onSuccess={handleSuccess}
                        onError={() => {
                            alert("Google Login Failed");
                        }}
                    />

                    <p className="text-center text-sm text-gray-400">
                        Only IIIT Pune students can access CamPass.
                    </p>

                </div>

            </div>

        </PageContainer>
    );
};

export default Login;