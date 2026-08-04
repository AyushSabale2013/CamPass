import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import PageContainer from "../../components/layout/PageContainer";

// Restricted authorized admin email
const AUTHORIZED_ADMIN_EMAIL = "ayushsabale2282@gmail.com";

// Mock student records (Replace with your backend API call)
const INITIAL_STUDENTS = [
  { id: 1, name: "Ayush Sabale", mis: "112203001", email: "ayushsabale2282@gmail.com", userType: "Hosteller", hostel: "Godavari", room: "A-203", phone: "9876543210", status: "Active" },
  { id: 2, name: "Rohan Sharma", mis: "112203002", email: "rohan.s@college.edu", userType: "Hosteller", hostel: "Krishna", room: "B-105", phone: "9812345678", status: "Active" },
  { id: 3, name: "Priya Patel", mis: "112203003", email: "priya.p@college.edu", userType: "Day Scholar", hostel: "-", room: "-", phone: "9765432109", status: "Active" },
  { id: 4, name: "Amit Kumar", mis: "112203004", email: "amit.k@college.edu", userType: "Hosteller", hostel: "Brahmaputra", room: "C-301", phone: "9543210987", status: "Flagged" },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Get current user email from auth context or local storage
  const currentUserEmail =
    user?.email ||
    sessionStorage.getItem("googleAuthEmail") ||
    localStorage.getItem("email") ||
    "";

  // Security Check: Verify Admin Authorization
  if (currentUserEmail.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
    return (
      <PageContainer>
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Access Restricted</h2>
            <p className="text-sm text-slate-500 mb-6">
              You are logged in as <span className="font-semibold text-slate-800">{currentUserEmail || "Guest"}</span>.
              This portal is strictly reserved for official system administrators.
            </p>
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs font-semibold text-red-700">
              Required Account: {AUTHORIZED_ADMIN_EMAIL}
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Filter students based on search input & residency type
  const filteredStudents = INITIAL_STUDENTS.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.mis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === "all" ||
      (filterType === "hosteller" && student.userType === "Hosteller") ||
      (filterType === "dayscholar" && student.userType === "Day Scholar");

    return matchesSearch && matchesType;
  });

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Campus Admin Command Center
              </h1>
              <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                Authorized
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Logged in as <strong className="text-slate-800">{AUTHORIZED_ADMIN_EMAIL}</strong>
            </p>
          </div>
        </div>

        {/* System Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Registered</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{INITIAL_STUDENTS.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Hostellers</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {INITIAL_STUDENTS.filter((s) => s.userType === "Hosteller").length}
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Day Scholars</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {INITIAL_STUDENTS.filter((s) => s.userType === "Day Scholar").length}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Security Alerts</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">1 Flagged</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Management Table Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Controls Header */}
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-900">Student Profiles & Gate Status</h3>
              <p className="text-xs text-slate-500">Search, filter, and review registered student access.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Tabs */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Residency Categories</option>
                <option value="hosteller">Hostellers Only</option>
                <option value="dayscholar">Day Scholars Only</option>
              </select>

              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search name, MIS, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="p-4">Student</th>
                  <th className="p-4">MIS Number</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Hostel / Room</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-semibold text-slate-900">
                        <div>{student.name}</div>
                        <div className="text-xs text-slate-400 font-normal">{student.email}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-700 font-bold">{student.mis}</td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            student.userType === "Hosteller"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {student.userType}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {student.userType === "Hosteller"
                          ? `${student.hostel} (${student.room})`
                          : "Day Scholar"}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-600">{student.phone}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            student.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400 text-sm">
                      No matching student records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </PageContainer>
  );
};

export default AdminDashboard;