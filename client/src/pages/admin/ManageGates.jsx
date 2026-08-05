import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../components/layout/PageContainer";
import { 
  fetchAllGates, 
  createGateProfile, 
  updateGateProfile,
  deleteGateProfile 
} from "../../services/adminService";

const ManageGates = () => {
  const navigate = useNavigate();

  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editGateId, setEditGateId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    isSuccess: false,
  });

  const initialFormState = {
    gateName: "",
    gateCode: "",
    qrId: "",
    slug: "",
    gateType: "MAIN",
    latitude: "",
    longitude: "",
    radius: 50,
    isActive: true,
  };

  const [gateForm, setGateForm] = useState(initialFormState);

  useEffect(() => {
    loadGates();
  }, []);

  const loadGates = async () => {
    try {
      setLoading(true);
      const data = await fetchAllGates();
      setGates(data.gates || []);
    } catch (error) {
      console.error("Error loading gates:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (gate = null) => {
    setIsEditing(!!gate);
    setEditGateId(gate?._id || null);
    setGateForm(gate ? {
      gateName: gate.gateName || "",
      gateCode: gate.gateCode || "",
      qrId: gate.qrId || "",
      slug: gate.slug || "",
      gateType: gate.gateType || "MAIN",
      latitude: gate.latitude || "",
      longitude: gate.longitude || "",
      radius: gate.radius || 50,
      isActive: gate.isActive ?? true,
    } : initialFormState);
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedData = {
        ...gateForm,
        latitude: Number(gateForm.latitude),
        longitude: Number(gateForm.longitude),
        radius: Number(gateForm.radius),
      };

      if (isEditing) {
        await updateGateProfile(editGateId, formattedData);
        setConfirmModal({
          isOpen: true,
          title: "Success",
          message: "Gate profile updated successfully!",
          isSuccess: true,
          onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
        });
      } else {
        await createGateProfile(formattedData);
        setConfirmModal({
          isOpen: true,
          title: "Success",
          message: "New campus gate created successfully!",
          isSuccess: true,
          onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
        });
      }

      setShowModal(false);
      loadGates();
    } catch (err) {
      setConfirmModal({
        isOpen: true,
        title: "Error",
        message: err.response?.data?.message || (isEditing ? "Failed to update gate." : "Failed to create gate."),
        isSuccess: false,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      });
    }
  };

  const handleDelete = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Gate",
      message: `Are you sure you want to delete gate: ${name}?`,
      isSuccess: false,
      onConfirm: async () => {
        try {
          await deleteGateProfile(id);
          loadGates();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          setConfirmModal({
            isOpen: true,
            title: "Error",
            message: "Failed to delete gate.",
            isSuccess: false,
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  };

  const filteredGates = gates.filter((g) => 
    g.gateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.gateCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageContainer>
      <div className="flex flex-col min-h-screen bg-slate-100 max-w-md mx-auto shadow-2xl overflow-x-hidden">
        
        <header className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div>
            <h1 className="text-base font-bold tracking-wide">Manage Gates</h1>
            <p className="text-[11px] text-slate-400">Total Checkpoints: {gates.length}</p>
          </div>
          <button 
            onClick={() => navigate("/admin/dashboard")}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          >
            Dashboard
          </button>
        </header>

        <main className="p-4 space-y-4 pb-12 flex-1">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search gate name, code, slug..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-amber-600 shadow-sm"
            />
            <button 
              onClick={() => openModal()}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition whitespace-nowrap"
            >
              + Add Gate
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 text-center py-10 animate-pulse">Loading gates...</p>
          ) : filteredGates.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">No gates found.</p>
          ) : (
            <div className="space-y-3">
              {filteredGates.map((g) => (
                <div key={g._id || g.slug} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="min-w-0 pr-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-xs truncate">{g.gateName}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${g.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {g.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Code: <span className="font-semibold text-slate-700">{g.gateCode}</span> | Type: {g.gateType}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Coords: {g.latitude}, {g.longitude} ({g.radius}m radius)</p>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => openModal(g)}
                      className="text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(g._id, g.gateName)}
                      className="text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-bold text-slate-900 mb-4">
                {isEditing ? "Edit Campus Gate" : "Add New Campus Gate"}
              </h3>
              <form onSubmit={handleFormSubmit} className="space-y-3">
                <input 
                  type="text" placeholder="Gate Name (e.g. Main Gate)" required 
                  value={gateForm.gateName} onChange={e => setGateForm({...gateForm, gateName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-amber-600"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" placeholder="Gate Code (e.g. MG01)" required 
                    value={gateForm.gateCode} onChange={e => setGateForm({...gateForm, gateCode: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-amber-600 uppercase"
                  />
                  <input 
                    type="text" placeholder="QR ID (e.g. main-gate)" required 
                    value={gateForm.qrId} onChange={e => setGateForm({...gateForm, qrId: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-amber-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" placeholder="URL Slug (e.g. main-gate)" required 
                    value={gateForm.slug} onChange={e => setGateForm({...gateForm, slug: e.target.value.toLowerCase()})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-amber-600 lowercase"
                  />
                  <input 
                    type="text" placeholder="Gate Type (e.g. MAIN)" required 
                    value={gateForm.gateType} onChange={e => setGateForm({...gateForm, gateType: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-amber-600 uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number" step="any" placeholder="Latitude" required 
                    value={gateForm.latitude} onChange={e => setGateForm({...gateForm, latitude: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-amber-600"
                  />
                  <input 
                    type="number" step="any" placeholder="Longitude" required 
                    value={gateForm.longitude} onChange={e => setGateForm({...gateForm, longitude: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-amber-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number" placeholder="Radius (meters)" min="1" 
                    value={gateForm.radius} onChange={e => setGateForm({...gateForm, radius: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-amber-600"
                  />
                  <select 
                    value={String(gateForm.isActive)} onChange={e => setGateForm({...gateForm, isActive: e.target.value === 'true'})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-amber-600"
                  >
                    <option value="true">Status: Active</option>
                    <option value="false">Status: Inactive</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl text-xs font-semibold">Cancel</button>
                  <button type="submit" className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl text-xs font-semibold">
                    {isEditing ? "Save Changes" : "Create Gate"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl text-center space-y-4">
              <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>
              
              <div className="flex gap-2 pt-2">
                {!confirmModal.isSuccess && confirmModal.title.includes("Delete") ? (
                  <>
                    <button 
                      onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
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
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-xs font-semibold transition shadow-md shadow-amber-600/20"
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

export default ManageGates;