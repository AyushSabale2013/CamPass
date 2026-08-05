import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import PageContainer from "../../components/layout/PageContainer";
import { registerStudent } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

const HOSTELS = ["Godavari", "Krishna", "Brahmaputra", "Indrayani"];

// Helper to decode registration token payload safely
const decodeTokenPayload = (token) => {
  try {
    if (!token || typeof token !== "string" || !token.includes(".")) return null;
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
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
    name: "",
    email: "",
    mis: "",
    phone: "",
    userType: "hosteller",
    hostel: HOSTELS[0],
    room: "",
    isInsideCampus: true, // Boolean matching backend schema default
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [emailWarning, setEmailWarning] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("registrationToken");
    if (!token) return;

    const payload = decodeTokenPayload(token);
    if (!payload?.email) return;

    const extractedEmail = payload.email;
    const localPart = extractedEmail.split("@")[0];
    const firstNine = localPart.substring(0, 9);
    const isNumeric = /^\d{9}$/.test(firstNine);

    setFormData((prev) => ({
      ...prev,
      email: extractedEmail,
      mis: isNumeric ? firstNine : "",
      name: payload.name || prev.name,
    }));

    if (!isNumeric) {
      setEmailWarning(
        "Invalid institutional email format. Your email must start with a valid 9-digit MIS number. Please register with a valid official mail, otherwise strict disciplinary action will be taken against you."
      );
    }
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Full name is required.";
    if (!/^\d{10}$/.test(formData.phone)) {
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const registrationToken = sessionStorage.getItem("registrationToken");

      const response = await registerStudent({
        registrationToken,
        name: formData.name,
        mis: formData.mis,
        phone: formData.phone,
        userType: formData.userType,
        hostel: formData.userType === "hosteller" ? formData.hostel : "Day Scholar",
        room: formData.userType === "hosteller" ? formData.room : "Day Scholar",
        isInsideCampus: formData.isInsideCampus,
      });

      const data = response.data;
      login(data.user, data.token);

      sessionStorage.removeItem("registrationToken");
      sessionStorage.removeItem("redirectAfterLogin");

      setIsSubmitting(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
      alert(error.response?.data?.message || "Registration Failed");
    }
  };

  const handleContinueToGate = () => {
    setShowSuccessModal(false);
    setIsRedirecting(true);

    setTimeout(() => {
      navigate("/gate/main-gate", { replace: true });
    }, 900);
  };

  return (
    <PageContainer>
      <div className="min-h-screen py-10 px-4 flex flex-col justify-center items-center bg-slate-50 relative">
        <div className="w-full max-w-xl bg-white shadow-xl rounded-2xl border border-slate-100 p-8">
          
          <div className="text-center md:text-left mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Complete Your Profile
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Please review your pre-filled details and provide your contact information.
            </p>
          </div>

          <div className="p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-900 rounded-r-xl text-xs sm:text-sm shadow-sm">
            <p className="font-bold">Important Notice</p>
            <p className="mt-1 text-amber-800/90 leading-relaxed">
              Every detail provided must be valid and accurate. Entering false information or misrepresenting identity constitutes a security violation and will result in <strong className="font-semibold underline">strict disciplinary action</strong>.
            </p>
          </div>

          {emailWarning && (
            <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-900 rounded-r-xl text-xs sm:text-sm shadow-sm mt-4">
              <p className="font-bold">Security & Registration Warning</p>
              <p className="mt-1 text-rose-800/90 leading-relaxed">{emailWarning}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                disabled={isSubmitting}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
              {errors.name && (
                <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.name}</p>
              )}
            </div>

            {/* Email Address */}
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

            {/* MIS Number */}
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

            {/* Phone Number */}
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
                disabled={isSubmitting}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
              {errors.phone && (
                <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.phone}</p>
              )}
            </div>

            {/* Campus Status Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Where are you currently? <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center justify-center gap-2 p-3.5 border rounded-xl cursor-pointer transition-all ${formData.isInsideCampus === true ? "border-blue-600 bg-blue-50/50 text-blue-900 font-semibold shadow-sm" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <input
                    type="radio"
                    name="isInsideCampus"
                    checked={formData.isInsideCampus === true}
                    onChange={() => setFormData((prev) => ({ ...prev, isInsideCampus: true }))}
                    disabled={isSubmitting}
                    className="accent-blue-600"
                  />
                  Inside Campus
                </label>

                <label className={`flex items-center justify-center gap-2 p-3.5 border rounded-xl cursor-pointer transition-all ${formData.isInsideCampus === false ? "border-blue-600 bg-blue-50/50 text-blue-900 font-semibold shadow-sm" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <input
                    type="radio"
                    name="isInsideCampus"
                    checked={formData.isInsideCampus === false}
                    onChange={() => setFormData((prev) => ({ ...prev, isInsideCampus: false }))}
                    disabled={isSubmitting}
                    className="accent-blue-600"
                  />
                  Outside Campus
                </label>
              </div>
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                    className="accent-blue-600"
                  />
                  Day Scholar
                </label>
              </div>
            </div>

            {formData.userType === "hosteller" && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Hostel <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="hostel"
                    value={formData.hostel}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed"
                  >
                    {HOSTELS.map((hostel) => (
                      <option key={hostel} value={hostel}>{hostel}</option>
                    ))}
                  </select>
                </div>

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
                    disabled={isSubmitting}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                  {errors.room && (
                    <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.room}</p>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/20 text-sm tracking-wide disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Registering...
                </>
              ) : (
                "Complete Registration"
              )}
            </button>
          </form>
        </div>

        {/* Success Popup with Instructions Only */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-7 text-center transform animate-scaleIn">
              <div className="mx-auto mb-3 flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-slate-900">Registration Successful</h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-relaxed">
                Your profile has been created successfully.
              </p>

              {/* Limited Passes Warning Box */}
              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-left text-xs leading-relaxed">
                <span className="font-bold block mb-1 text-amber-950 text-sm">Important Pass Guidelines:</span>
                You have <strong>limited passes</strong> for entries and exits. Please use them wisely and <strong>do not spam pass logs</strong> or unnecessary scan requests.
              </div>

              <button
                onClick={handleContinueToGate}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/20 text-sm tracking-wide"
              >
                Continue to Gate
              </button>
            </div>
          </div>
        )}

        {isRedirecting && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/95 backdrop-blur-sm animate-fadeIn">
            <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-slate-600 text-sm font-medium tracking-wide">Redirecting to gate scanner...</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.25s ease-out; }
      `}</style>
    </PageContainer>
  );
};

export default CompleteProfile;