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

  // Shows a loading screen until the registration token has been decoded
  // and the form's initial values are set — so the user never sees a
  // half-populated / flashing form while that work happens.
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("registrationToken");

    const finishPreparing = () => {
      setTimeout(() => setIsPreparing(false), 400);
    };

    if (!token) {
      finishPreparing();
      return;
    }

    const payload = decodeTokenPayload(token);
    if (!payload?.email) {
      finishPreparing();
      return;
    }

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

    finishPreparing();
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

  const handleContinueToDashboard = () => {
    setShowSuccessModal(false);
    setIsRedirecting(true);

    setTimeout(() => {
      navigate("/student/dashboard", { replace: true });
    }, 900);
  };

  return (
    <PageContainer>
      <div className="min-h-screen bg-slate-100/70 flex flex-col relative">
        {/* Preparing Registration Loader */}
        {isPreparing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm animate-fadeIn">
            <div className="flex flex-col items-center gap-5 px-8 text-center">
              <div className="relative w-14 h-14">
                <span className="absolute inset-0 rounded-full border-4 border-slate-200" />
                <span className="absolute inset-0 rounded-full border-4 border-slate-900 border-t-transparent animate-spin" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Preparing your registration form...
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Just a moment while we set things up.
                </p>
              </div>
            </div>
          </div>
        )}

        <div
          className={`flex-1 flex flex-col max-w-md w-full mx-auto transition-opacity duration-300 ${
            isPreparing ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Header */}
          <header className="sticky top-0 z-20 bg-slate-900 text-white px-5 pt-6 pb-5 shadow-md">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/15 text-[10px] font-bold uppercase tracking-wider mb-2.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Final Step
            </span>
            <h1 className="text-xl font-extrabold tracking-tight">
              Complete Your Profile
            </h1>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Review your pre-filled details and add your contact information.
            </p>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 space-y-4 pb-32">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs shadow-sm flex gap-2.5">
              <svg className="w-4.5 h-4.5 shrink-0 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-bold">Important Notice</p>
                <p className="mt-1 text-amber-800/90 leading-relaxed">
                  Every detail provided must be valid and accurate. Entering false information or misrepresenting identity constitutes a security violation and will result in <strong className="font-semibold underline">strict disciplinary action</strong>.
                </p>
              </div>
            </div>

            {emailWarning && (
              <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 text-xs shadow-sm flex gap-2.5">
                <svg className="w-4.5 h-4.5 shrink-0 text-rose-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-bold">Security & Registration Warning</p>
                  <p className="mt-1 text-rose-800/90 leading-relaxed">{emailWarning}</p>
                </div>
              </div>
            )}

            <form id="complete-profile-form" onSubmit={handleSubmit} className="space-y-4">
              {/* ===== Identity Card ===== */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Identity
                  </h3>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    disabled={isSubmitting}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  {errors.name && (
                    <p className="text-rose-500 text-[11px] mt-1.5 font-semibold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl px-4 py-3 text-xs cursor-not-allowed select-none truncate"
                  />
                </div>

                {/* MIS */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    MIS Number
                  </label>
                  <input
                    type="text"
                    value={formData.mis}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold rounded-2xl px-4 py-3 text-sm cursor-not-allowed select-none tracking-wide"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  {errors.phone && (
                    <p className="text-rose-500 text-[11px] mt-1.5 font-semibold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* ===== Status Card ===== */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-3.5">
                  <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Current Status
                  </h3>
                </div>

                <p className="text-xs font-semibold text-slate-700 mb-2.5">
                  Where would you like to go right now? <span className="text-rose-500">*</span>
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className={`relative flex items-center justify-center p-3.5 rounded-2xl border text-xs font-bold text-center transition-all active:scale-95 ${formData.isInsideCampus === true ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                    <input
                      type="radio"
                      name="isInsideCampus"
                      checked={formData.isInsideCampus === true}
                      onChange={() => setFormData((prev) => ({ ...prev, isInsideCampus: true }))}
                      disabled={isSubmitting}
                      className="sr-only"
                    />
                    Outside Campus
                  </label>

                  <label className={`relative flex items-center justify-center p-3.5 rounded-2xl border text-xs font-bold text-center transition-all active:scale-95 ${formData.isInsideCampus === false ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                    <input
                      type="radio"
                      name="isInsideCampus"
                      checked={formData.isInsideCampus === false}
                      onChange={() => setFormData((prev) => ({ ...prev, isInsideCampus: false }))}
                      disabled={isSubmitting}
                      className="sr-only"
                    />
                    Inside Campus
                  </label>
                </div>
              </div>

              {/* ===== Residence Card ===== */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-3.5">
                  <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Residence
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <label className={`relative flex items-center justify-center p-3.5 rounded-2xl border text-xs font-bold text-center transition-all active:scale-95 ${formData.userType === "hosteller" ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                    <input
                      type="radio"
                      name="userType"
                      value="hosteller"
                      checked={formData.userType === "hosteller"}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="sr-only"
                    />
                    Hosteller
                  </label>

                  <label className={`relative flex items-center justify-center p-3.5 rounded-2xl border text-xs font-bold text-center transition-all active:scale-95 ${formData.userType === "dayscholar" ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                    <input
                      type="radio"
                      name="userType"
                      value="dayscholar"
                      checked={formData.userType === "dayscholar"}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="sr-only"
                    />
                    Day Scholar
                  </label>
                </div>

                {formData.userType === "hosteller" && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-dashed border-slate-200 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Hostel <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="hostel"
                        value={formData.hostel}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        {HOSTELS.map((hostel) => (
                          <option key={hostel} value={hostel}>{hostel}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Room Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="room"
                        value={formData.room}
                        onChange={handleChange}
                        placeholder="e.g. A-203"
                        disabled={isSubmitting}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                      {errors.room && (
                        <p className="text-rose-500 text-[11px] mt-1.5 font-semibold flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {errors.room}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </form>
          </main>

          {/* Sticky Submit Bar — mobile-standard pattern, matches GateScanner */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200/80 p-4 z-20 shadow-2xl">
            <div className="max-w-md mx-auto">
              <button
                type="submit"
                form="complete-profile-form"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-lg transition-all duration-200 active:scale-98 bg-slate-900 hover:bg-slate-800 shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Complete Registration"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Success Popup with Instructions Only */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-fadeIn">
            <div className="relative w-full max-w-sm bg-white rounded-3xl p-7 text-center shadow-2xl animate-scaleIn">
              <div className="relative mx-auto mb-3 flex items-center justify-center w-16 h-16">
                <span className="absolute inset-0 rounded-full bg-emerald-100 animate-ping" />
                <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[11px] font-bold uppercase tracking-wider">
                Profile Created
              </span>

              <h2 className="text-xl font-extrabold text-slate-900 mt-3 mb-1">Registration Successful</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                Your profile has been created successfully.
              </p>

              {/* Limited Passes Warning Box */}
              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-left text-xs leading-relaxed flex gap-2.5">
                <svg className="w-4.5 h-4.5 shrink-0 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <span className="font-bold block mb-1 text-amber-950 text-sm">Important Pass Guidelines:</span>
                  You have <strong>limited passes</strong> for entries and exits. Please use them wisely and <strong>do not spam pass logs</strong> or unnecessary scan requests.
                </div>
              </div>

              <button
                onClick={handleContinueToDashboard}
                className="w-full mt-6 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-md transition-all active:scale-95"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        )}

        {isRedirecting && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/95 backdrop-blur-sm animate-fadeIn">
            <svg className="animate-spin h-10 w-10 text-slate-900 mb-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-slate-600 text-sm font-medium tracking-wide">Redirecting to your dashboard...</p>
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