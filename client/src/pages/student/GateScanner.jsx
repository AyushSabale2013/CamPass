import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { verifyGate } from "../../services/gateService";

const GateScanner = () => {

    const { slug } = useParams();
    const { isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(true);

    const [verification, setVerification] = useState(null);

    const [error, setError] = useState("");

    // Redirect to Login
    if (!isAuthenticated) {

        sessionStorage.setItem(
            "redirectAfterLogin",
            `/gate/${slug}`
        );

        return <Navigate to="/" replace />;

    }

    useEffect(() => {

        if (!navigator.geolocation) {

            setError("Geolocation is not supported.");

            setLoading(false);

            return;

        }

        navigator.geolocation.getCurrentPosition(

            async (position) => {

                try {

                    const latitude = position.coords.latitude;

                    const longitude = position.coords.longitude;

                    const response = await verifyGate({

                        slug,

                        latitude,

                        longitude,

                    });

                    setVerification(response.data);

                }

                catch (error) {

                    console.error(error);

                    setError(

                        error.response?.data?.message ||

                        "Verification Failed"

                    );

                }

                finally {

                    setLoading(false);

                }

            },

            () => {

                setError("Location permission denied.");

                setLoading(false);

            },

            {

                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,

            }

        );

    }, [slug]);

    return (

        <div className="min-h-screen flex flex-col items-center justify-center p-6">

            <div className="w-full max-w-md rounded-2xl shadow-lg border p-6">

                <h1 className="text-3xl font-bold text-center">

                    CamPass

                </h1>

                <p className="text-center text-gray-500 mt-2">

                    Gate Verification

                </p>

                <p className="text-center mt-3">

                    Gate :

                    <span className="font-semibold">

                        {" "}{slug}

                    </span>

                </p>

                {loading && (

                    <div className="mt-8 text-center">

                        <p className="text-blue-600 font-medium">

                            Verifying your location...

                        </p>

                    </div>

                )}

                {!loading && verification && (

                    <div className="mt-8 rounded-xl bg-green-100 p-5">

                        <h2 className="text-xl font-bold text-green-700">

                            ✓ {verification.message}

                        </h2>

                        <p className="mt-3">

                            Action :

                            <strong>

                                {" "}{verification.action}

                            </strong>

                        </p>

                        <p>

                            Distance :

                            <strong>

                                {" "}{verification.distance} m

                            </strong>

                        </p>

                    </div>

                )}

                {!loading && error && (

                    <div className="mt-8 rounded-xl bg-red-100 p-5">

                        <h2 className="text-xl font-bold text-red-700">

                            Verification Failed

                        </h2>

                        <p className="mt-2">

                            {error}

                        </p>

                    </div>

                )}

            </div>

        </div>

    );

};

export default GateScanner;