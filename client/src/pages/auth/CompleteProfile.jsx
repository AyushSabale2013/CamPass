import { useState, useEffect } from "react";
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

// Helper to decode registration token payload safely
const decodeTokenPayload = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to decode token", e);
    return null;
  }
};

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    mis: "",
    phone: "",
    userType: "hosteller",
    hostel: HOSTELS[0],
    room: "",
  });

  const [errors, setErrors] = useState({});

  // Auto-extract email and first 9 chars for MIS from registration token on mount
  useEffect(() => {
    const token = sessionStorage.getItem("registrationToken");
    if (token) {
      const payload = decodeTokenPayload(token);
      if (payload && payload.email) {
        const extractedEmail = payload.email;
        const derivedMis = extractedEmail.substring(0, 9);

        setFormData((prev) => ({
          ...prev,
          email: extractedEmail,
          mis: derivedMis,
        }));
      }
    }
  }, []);

  const validate = () => {
    const newErrors = {};
    const phoneRegex = /^\d{10}$/;

    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = "Phone number must contain exactly 10 digits.";
    }

    if (formData.userType === "hosteller" && formData.room.trim() === "") {
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
      const registrationToken = sessionStorage.getItem("registrationToken");

      const response = await registerStudent({
        registrationToken,
        mis: formData.mis,
        phone: formData.phone,
        userType: formData.userType,
        hostel: formData.userType === "hosteller" ? formData.hostel : "Day Scholar",
        room: formData.userType === "hosteller" ? formData.room : "Day Scholar",
      });

      const data = response.data;
      login(data.user, data.token);

      const redirect = sessionStorage.getItem("redirectAfterLogin") || "/gate/main-gate";

      sessionStorage.removeItem("registrationToken");
      sessionStorage.removeItem("redirectAfterLogin");

      navigate(redirect, { replace: true });
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Registration Failed");
    }
  };

  return (
    <PageContainer>
      <div className="min-h-screen py-10 px-4 flex flex-col justify-center items-center bg-slate-50">
        <div className="w-full max-w-xl bg-white shadow-xl rounded-2xl border border-slate-100 p-8">
          
          <div className="text-center md:text-left mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Complete Your Profile
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Please review your pre-filled details and provide your contact information.
            </p>
          </div>

          {/* Strict Warning Banner */}
          <div className="p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-900 rounded-r-xl text-xs sm:text-sm shadow-sm">
            <p className="font-bold">Important Notice</p>
            <p className="mt-1 text-amber-800/90 leading-relaxed">
              Every detail provided must be valid and accurate. Entering false information or misrepresenting identity constitutes a security violation and will result in <strong className="font-semibold underline">strict disciplinary action</strong>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            
            {/* Auto-filled Email Block */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address <span className="text-slate-400 font-normal normal-case">(Auto-filled by system)</span>
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-4 py-3 text-sm cursor-not-allowed select-none shadow-inner"
              />
            </div>

            {/* Auto-filled MIS Number Block */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                MIS Number <span className="text-slate-400 font-normal normal-case">(Auto-filled from email)</span>
              </label>
              <input
                type="text"
                value={formData.mis}
                disabled
                className="w-full bg-slate-100 border border-slate-200 text-slate-700 font-mono font-semibold rounded-xl px-4 py-3 text-sm cursor-not-allowed select-none shadow-inner tracking-wide"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Extracted automatically from the first 9 characters of your institutional email.
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                maxLength={10}
                value={formData.phone}
                onChange={handleChange}
                placeholder="9876543210"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
              />
              {errors.phone && (
                <p className="text-rose-500 text-xs mt-1.5 font-medium">
                  {errors.phone}
                </p>
              )}
            </div>

            {/* User Type Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                User Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center justify-center gap-2 p-3.5 border rounded-xl cursor-pointer transition-all ${formData.userType === "hosteller" ? "border-blue-600 bg-blue-50/50 text-blue-900 font-semibold shadow-sm" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <input
                    type="radio"
                    name="userType"
                    value="hosteller"
                    checked={formData.userType === "hosteller"}
                    onChange={handleChange}
                    className="accent-blue-600"
                  />
                  Hosteller
                </label>

                <label className={`flex items-center justify-center gap-2 p-3.5 border rounded-xl cursor-pointer transition-all ${formData.userType === "dayscholar" ? "border-blue-600 bg-blue-50/50 text-blue-900 font-semibold shadow-sm" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <input
                    type="radio"
                    name="userType"
                    value="dayscholar"
                    checked={formData.userType === "dayscholar"}
                    onChange={handleChange}
                    className="accent-blue-600"
                  />
                  Day Scholar
                </label>
              </div>
            </div>

            {formData.userType === "hosteller" && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                {/* Hostel */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Hostel <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="hostel"
                    value={formData.hostel}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm cursor-pointer"
                  >
                    {HOSTELS.map((hostel) => (
                      <option key={hostel} value={hostel}>
                        {hostel}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Room */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Room Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="room"
                    value={formData.room}
                    onChange={handleChange}
                    placeholder="e.g. A-203"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
                  />
                  {errors.room && (
                    <p className="text-rose-500 text-xs mt-1.5 font-medium">
                      {errors.room}
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/20 text-sm tracking-wide"
            >
              Complete Registration
            </button>

          </form>
        </div>
      </div>
    </PageContainer>
  );
};

export default CompleteProfile;