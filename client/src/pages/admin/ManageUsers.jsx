import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../components/layout/PageContainer";
import { 
  fetchAllUsers, 
  createUserProfile, 
  deleteUserProfile 
} from "../../services/adminService";

const HOSTELS = [
  "Godavari",
  "Krishna",
  "Brahmaputra",
  "Indrayani",
];

const ManageUsers = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Confirmation Popup State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    isSuccess: false,
  });

  // Form State strictly matching your Mongoose userSchema
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    mis: "",
    phone: "",
    userType: "hosteller",
    hostel: HOSTELS[0],
    room: "",
    role: "student",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchAllUsers();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    const emailVal = e.target.value;
    let updatedForm = { ...userForm, email: emailVal };

    // Auto-extract MIS from email if possible (e.g. text before '@')
    const parts = emailVal.split("@");
    if (parts.length > 0 && parts[0].trim() !== "") {
      updatedForm.mis = parts[0].trim();
    }

    setUserForm(updatedForm);
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    if (newRole === "security" || newRole === "admin") {
      setUserForm({
        ...userForm,
        role: newRole,
        userType: "dayscholar",
        hostel: "N/A",
        room: "N/A",
      });
    } else {
      setUserForm({
        ...userForm,
        role: newRole,
        userType: "hosteller",
        hostel: HOSTELS[0],
        room: "",
      });
    }
  };

  const handleUserTypeChange = (e) => {
    const newUserType = e.target.value;
    if (newUserType === "dayscholar") {
      setUserForm({
        ...userForm,
        userType: newUserType,
        hostel: "N/A",
        room: "N/A",
      });
    } else {
      setUserForm({
        ...userForm,
        userType: newUserType,
        hostel: HOSTELS[0],
        room: "",
      });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      // Automatically generate a unique Google ID behind the scenes
      const payload = {
        ...userForm,
        googleId: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      };

      await createUserProfile(payload);
      setShowModal(false);
      setUserForm({
        name: "",
        email: "",
        mis: "",
        phone: "",
        userType: "hosteller",
        hostel: HOSTELS[0],
        room: "",
        role: "student",
      });
      loadUsers();
      
      // Trigger Success Custom Modal
      setConfirmModal({
        isOpen: true,
        title: "Success",
        message: "User created successfully!",
        isSuccess: true,
        onConfirm: () => setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null, isSuccess: false }),
      });
    } catch (err) {
      setConfirmModal({
        isOpen: true,
        title: "Error",
        message: err.response?.data?.message || "Failed to create user.",
        isSuccess: false,
        onConfirm: () => setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null, isSuccess: false }),
      });
    }
  };

  const handleDelete = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete User",
      message: `Are you sure you want to delete ${name}?`,
      isSuccess: false,
      onConfirm: async () => {
        try {
          await deleteUserProfile(id);
          loadUsers();
          setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null, isSuccess: false });
        } catch (err) {
          setConfirmModal({
            isOpen: true,
            title: "Error",
            message: "Failed to delete user.",
            isSuccess: false,
            onConfirm: () => setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null, isSuccess: false }),
          });
        }
      },
    });
  };

  // Filter users based on search
  const filteredUsers = users.filter((u) => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.mis?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageContainer>
      <div className="flex flex-col min-h-screen bg-slate-100 max-w-md mx-auto shadow-2xl overflow-x-hidden">
        
        {/* Top Header */}
        <header className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div>
            <h1 className="text-base font-bold tracking-wide">Manage Users</h1>
            <p className="text-[11px] text-slate-400">Total Registered: {users.length}</p>
          </div>
          <button 
            onClick={() => navigate("/admin/dashboard")}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          >
            Dashboard
          </button>
        </header>

        {/* Content Area */}
        <main className="p-4 space-y-4 pb-12 flex-1">
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search name, email, MIS..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-blue-600 shadow-sm"
            />
            <button 
              onClick={() => setShowModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition whitespace-nowrap"
            >
              + Add User
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 text-center py-10 animate-pulse">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">No users found.</p>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <div key={u._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <h4 className="font-bold text-slate-900 text-xs truncate">{u.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        u.role === 'admin' ? 'bg-purple-50 text-purple-600' : 
                        u.role === 'security' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {u.role}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-600">
                        {u.mis || "N/A"}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-600 uppercase">
                        {u.userType}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(u._id, u.name)}
                    className="text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

        </main>

        {/* ADD USER MODAL - Centered */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-bold text-slate-900 mb-4">Add New System User</h3>
              <form onSubmit={handleCreateUser} className="space-y-3">
                <input 
                  type="text" placeholder="Full Name" required 
                  value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-blue-600"
                />
                <input 
                  type="email" placeholder="Email Address" required 
                  value={userForm.email} onChange={handleEmailChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-blue-600"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" placeholder="MIS/ID" required 
                    value={userForm.mis} onChange={e => setUserForm({...userForm, mis: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-blue-600"
                  />
                  <input 
                    type="text" placeholder="Phone Number" required 
                    value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-blue-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={userForm.role} onChange={handleRoleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-blue-600"
                  >
                    <option value="student">Student</option>
                    <option value="security">Security Guard</option>
                    <option value="admin">Admin</option>
                  </select>

                  {userForm.role === "student" ? (
                    <select 
                      value={userForm.userType} onChange={handleUserTypeChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-blue-600"
                    >
                      <option value="hosteller">Hosteller</option>
                      <option value="dayscholar">Day Scholar</option>
                    </select>
                  ) : (
                    <input 
                      type="text" disabled 
                      value="Day Scholar"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                    />
                  )}
                </div>

                {userForm.role === "student" && userForm.userType === "hosteller" && (
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={userForm.hostel} onChange={e => setUserForm({...userForm, hostel: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-blue-600"
                    >
                      {HOSTELS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <input 
                      type="text" placeholder="Room Number" required 
                      value={userForm.room} onChange={e => setUserForm({...userForm, room: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-blue-600"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl text-xs font-semibold">Cancel</button>
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-semibold">Create User</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CUSTOM MANUAL CONFIRMATION / ALERT MODAL */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl text-center space-y-4">
              <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>
              
              <div className="flex gap-2 pt-2">
                {!confirmModal.isSuccess && confirmModal.title === "Delete User" ? (
                  <>
                    <button 
                      onClick={() => setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null, isSuccess: false })}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={confirmModal.onConfirm}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-semibold transition shadow-md shadow-rose-600/20"
                    >
                      Confirm
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={confirmModal.onConfirm}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-semibold transition shadow-md shadow-blue-600/20"
                  >
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </PageContainer>
  );
};

export default ManageUsers;