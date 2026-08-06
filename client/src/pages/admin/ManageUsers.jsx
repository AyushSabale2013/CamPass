import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../components/layout/PageContainer";
import { 
  fetchAllUsers, 
  createUserProfile, 
  updateUserProfile,
  deleteUserProfile 
} from "../../services/adminService";

const HOSTELS = ["Godavari", "Krishna", "Brahmaputra", "Indrayani"];

const ManageUsers = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    isSuccess: false,
  });

  const initialFormState = {
    name: "",
    email: "",
    mis: "",
    phone: "",
    userType: "hosteller",
    hostel: HOSTELS[0],
    room: "",
    role: "student",
  };

  const [userForm, setUserForm] = useState(initialFormState);

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
    const parts = emailVal.split("@");
    setUserForm(prev => ({
      ...prev,
      email: emailVal,
      mis: parts.length > 0 && parts[0].trim() !== "" ? parts[0].trim() : prev.mis
    }));
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setUserForm(prev => ({
      ...prev,
      role: newRole,
      userType: newRole === "security" || newRole === "admin" ? "dayscholar" : "hosteller",
      hostel: newRole === "security" || newRole === "admin" ? "N/A" : HOSTELS[0],
      room: newRole === "security" || newRole === "admin" ? "N/A" : "",
    }));
  };

  const handleUserTypeChange = (e) => {
    const newUserType = e.target.value;
    setUserForm(prev => ({
      ...prev,
      userType: newUserType,
      hostel: newUserType === "dayscholar" ? "N/A" : HOSTELS[0],
      room: newUserType === "dayscholar" ? "N/A" : "",
    }));
  };

  const openModal = (user = null) => {
    setIsEditing(!!user);
    setEditUserId(user?._id || null);
    setUserForm(user ? {
      name: user.name || "",
      email: user.email || "",
      mis: user.mis || "",
      phone: user.phone || "",
      userType: user.userType || "dayscholar",
      hostel: user.hostel || HOSTELS[0],
      room: user.room || "",
      role: user.role || "student",
    } : initialFormState);
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const { email, mis, ...updatePayload } = userForm;
        await updateUserProfile(editUserId, updatePayload);
        setConfirmModal({
          isOpen: true,
          title: "Success",
          message: "User profile updated successfully!",
          isSuccess: true,
          onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
        });
      } else {
        const payload = {
          ...userForm,
          googleId: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        };
        await createUserProfile(payload);
        setConfirmModal({
          isOpen: true,
          title: "Success",
          message: "New system user created successfully!",
          isSuccess: true,
          onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
        });
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      setConfirmModal({
        isOpen: true,
        title: "Error",
        message: err.response?.data?.message || (isEditing ? "Failed to update user." : "Failed to create user."),
        isSuccess: false,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      });
    }
  };

  const handleDelete = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete User",
      message: `Are you sure you want to completely remove ${name} from the system?`,
      isSuccess: false,
      onConfirm: async () => {
        try {
          await deleteUserProfile(id);
          loadUsers();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          setConfirmModal({
            isOpen: true,
            title: "Error",
            message: "Failed to delete user.",
            isSuccess: false,
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.mis?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <PageContainer>
      <div className="flex flex-col min-h-screen bg-slate-50 max-w-md mx-auto shadow-2xl overflow-x-hidden border-x border-slate-200">
        
        {/* Top Header */}
        <header className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-lg">
          <div>
            <h1 className="text-base font-extrabold tracking-tight">Manage Users</h1>
            <p className="text-[11px] text-indigo-200 font-medium">Total Directory: {users.length}</p>
          </div>
          <button 
            onClick={() => navigate("/admin/dashboard")}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
          >
            Dashboard
          </button>
        </header>

        {/* Content Area */}
        <main className="p-4 space-y-4 pb-16 flex-1">
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search name, email, MIS..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm transition"
            />
            <button 
              onClick={() => openModal()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-3 rounded-2xl text-xs font-black shadow-md shadow-emerald-600/20 transition whitespace-nowrap active:scale-95 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
              Add
            </button>
          </div>

          {/* Role Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-slate-200/80 p-1 rounded-2xl">
            {["all", "student", "security", "admin"].map((tab) => (
              <button
                key={tab}
                onClick={() => setRoleFilter(tab)}
                className={`py-1.5 rounded-xl text-[11px] font-bold capitalize transition-all ${
                  roleFilter === tab ? "bg-white text-indigo-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Users List Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 font-medium">Fetching directory...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-2">
              <svg className="w-8 h-8 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
              <p className="text-xs font-bold text-slate-700">No users found</p>
              <p className="text-[11px] text-slate-400">Try adjusting your search criteria or role filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <div key={u._id} className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                  <div className="min-w-0 pr-3 flex-1">
                    <h4 className="font-extrabold text-slate-900 text-xs truncate">{u.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate font-medium">{u.email}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap items-center">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                        u.role === 'security' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {u.role}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-slate-100 text-slate-700">
                        {u.mis || "N/A"}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                        {u.userType}
                      </span>
                      {u.userType === 'hosteller' && u.hostel && u.hostel !== 'N/A' && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-slate-100 text-slate-500">
                          {u.hostel} • {u.room}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => openModal(u)}
                      className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-xl transition active:scale-95"
                      title="Edit User"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(u._id, u.name)}
                      className="text-rose-600 bg-rose-50 hover:bg-rose-100 p-2 rounded-xl transition active:scale-95"
                      title="Delete User"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  {isEditing ? "Edit System User Profile" : "Add New System User"}
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input 
                    type="text" placeholder="e.g. Rahul Powar" required 
                    value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input 
                    type="email" placeholder="student@iiitp.ac.in" required 
                    disabled={isEditing}
                    value={userForm.email} onChange={handleEmailChange}
                    className={`w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium ${isEditing ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"}`}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">MIS / ID</label>
                    <input 
                      type="text" placeholder="MIS Number" required 
                      disabled={isEditing}
                      value={userForm.mis} onChange={e => setUserForm({...userForm, mis: e.target.value})}
                      className={`w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium ${isEditing ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                    <input 
                      type="text" placeholder="10-digit mobile" required 
                      value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">System Role</label>
                    <select 
                      value={userForm.role} onChange={handleRoleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="student">Student</option>
                      <option value="security">Security Guard</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">User Type</label>
                    {userForm.role === "student" ? (
                      <select 
                        value={userForm.userType} onChange={handleUserTypeChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        <option value="hosteller">Hosteller</option>
                        <option value="dayscholar">Day Scholar</option>
                      </select>
                    ) : (
                      <input 
                        type="text" disabled 
                        value="Day Scholar"
                        className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-400 font-medium cursor-not-allowed"
                      />
                    )}
                  </div>
                </div>

                {userForm.role === "student" && userForm.userType === "hosteller" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hostel Block</label>
                      <select 
                        value={userForm.hostel} onChange={e => setUserForm({...userForm, hostel: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        {HOSTELS.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Room Number</label>
                      <input 
                        type="text" placeholder="e.g. 204" required 
                        value={userForm.room} onChange={e => setUserForm({...userForm, room: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl text-xs font-bold transition">Cancel</button>
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-xs font-extrabold shadow-md shadow-indigo-600/20 transition">
                    {isEditing ? "Save Changes" : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl text-center space-y-4 border border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">{confirmModal.title}</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{confirmModal.message}</p>
              
              <div className="flex gap-2 pt-2">
                {!confirmModal.isSuccess && confirmModal.title.includes("Delete") ? (
                  <>
                    <button 
                      onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl text-xs font-bold transition"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={confirmModal.onConfirm}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-2xl text-xs font-bold transition shadow-md shadow-rose-600/20"
                    >
                      Confirm
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={confirmModal.onConfirm}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-xs font-bold transition shadow-md shadow-indigo-600/20"
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