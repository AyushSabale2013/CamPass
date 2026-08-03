import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PageContainer from "../../components/layout/PageContainer";
import { registerStudent } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

const HOSTELS = [
  "Godavari",
  "Krishna",
  "Brahmaputra",
  "GH",
];

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    mis: "",
    phone: "",
    userType: "hosteller",
    hostel: HOSTELS[0],
    room: "",
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    const misRegex = /^11(21|22|23|24|25|26|27|28|29)\d{5}$/;

    if (!misRegex.test(formData.mis)) {
      newErrors.mis =
        "Enter a valid MIS (Example: 112415039)";
    }

    const phoneRegex = /^\d{10}$/;

    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone =
        "Phone number must contain exactly 10 digits.";
    }

    if (
      formData.userType === "hosteller" &&
      formData.room.trim() === ""
    ) {
      newErrors.room = "Room number is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const registrationToken =
        sessionStorage.getItem("registrationToken");

      const response = await registerStudent({
        registrationToken,
        mis: formData.mis,
        phone: formData.phone,
        userType: formData.userType,
        hostel: formData.hostel,
        room: formData.room,
      });

      const data = response.data;

      login(data.user, data.token);
      // Redirect back to QR page if user came from QR scan
      // Redirect to Gate Scanner
      const redirect =
        sessionStorage.getItem("redirectAfterLogin") ||
        "/gate/main-gate"; // Replace with your default gate slug

      sessionStorage.removeItem("registrationToken");
      sessionStorage.removeItem("redirectAfterLogin");

      navigate(redirect, { replace: true });

    } catch (error) {

      console.error(error);

      alert(
        error.response?.data?.message ||
        "Registration Failed"
      );

    }
  }; return (
    <PageContainer>
      <div className="min-h-screen p-6">

        <h1 className="text-3xl font-bold">
          Complete Profile
        </h1>

        <p className="text-gray-500 mt-2">
          Complete your profile to continue.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >

          {/* MIS */}

          <div>

            <label className="font-medium">
              MIS Number
            </label>

            <input
              type="text"
              name="mis"
              maxLength={9}
              value={formData.mis}
              onChange={handleChange}
              placeholder="112415039"
              className="w-full border rounded-lg p-3 mt-1"
            />

            {errors.mis && (
              <p className="text-red-500 text-sm mt-1">
                {errors.mis}
              </p>
            )}

          </div>

          {/* Phone */}

          <div>

            <label className="font-medium">
              Phone Number
            </label>

            <input
              type="tel"
              name="phone"
              maxLength={10}
              value={formData.phone}
              onChange={handleChange}
              placeholder="9876543210"
              className="w-full border rounded-lg p-3 mt-1"
            />

            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">
                {errors.phone}
              </p>
            )}

          </div>

          {/* User Type */}

          <div>

            <label className="font-medium block mb-2">
              User Type
            </label>

            <div className="flex gap-6">

              <label className="flex items-center gap-2">

                <input
                  type="radio"
                  name="userType"
                  value="hosteller"
                  checked={formData.userType === "hosteller"}
                  onChange={handleChange}
                />

                Hosteller

              </label>

              <label className="flex items-center gap-2">

                <input
                  type="radio"
                  name="userType"
                  value="dayscholar"
                  checked={formData.userType === "dayscholar"}
                  onChange={handleChange}
                />

                Day Scholar

              </label>

            </div>

          </div>

          {formData.userType === "hosteller" && (
            <>

              {/* Hostel */}

              <div>

                <label className="font-medium">
                  Hostel
                </label>

                <select
                  name="hostel"
                  value={formData.hostel}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3 mt-1"
                >
                  {HOSTELS.map((hostel) => (
                    <option
                      key={hostel}
                      value={hostel}
                    >
                      {hostel}
                    </option>
                  ))}
                </select>

              </div>

              {/* Room */}

              <div>

                <label className="font-medium">
                  Room Number
                </label>

                <input
                  type="text"
                  name="room"
                  value={formData.room}
                  onChange={handleChange}
                  placeholder="A-203"
                  className="w-full border rounded-lg p-3 mt-1"
                />

                {errors.room && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.room}
                  </p>
                )}

              </div>

            </>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Complete Registration
          </button>

        </form>

      </div>
    </PageContainer>
  );
};

export default CompleteProfile;