import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../components/layout/PageContainer";
import { 
  fetchAllGates, 
  createGateProfile, 
  deleteGateProfile 
} from "../../services/adminService";

const ManageGates = () => {
  const navigate = useNavigate();

  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [gateForm, setGateForm] = useState({
    gateName: "",
    gateCode: "",
    qrId: "",
    slug: "",
    gateType: "MAIN",
    latitude: "",
    longitude: "",
    radius: 50,
    isActive: true,
  });

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

  const handleCreateGate = async (e) => {
    e.preventDefault();
    try {
      // Ensure numerical types are properly parsed before sending to backend
      const formattedData = {
        ...gateForm,
        latitude: Number(gateForm.latitude),
        longitude: Number(gateForm.longitude),
        radius: Number(gateForm.radius),
      };

      await createGateProfile(formattedData);
      setShowModal(false);
      setGateForm({
        gateName: "",
        gateCode: "",
        qrId: "",
        slug: "",
        gateType: "MAIN",
        latitude: "",
        longitude: "",
        radius: 50,
        isActive: true,
      });
      loadGates();
      alert("Gate created successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create gate.");
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete gate: ${name}?`)) {
      try {
        await deleteGateProfile(id);
        loadGates();
      } catch (err) {
        alert("Failed to delete gate.");
      }
    }
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
              onClick={() => setShowModal(true)}
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
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-xs truncate">{g.gateName}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${g.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {g.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Code: <span className="font-semibold text-slate-700">{g.gateCode}</span> | Type: {g.gateType}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Coords: {g.latitude}, {g.longitude} ({g.radius}m radius)</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(g._id, g.gateName)}
                    className="text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-bold text-slate-900 mb-4">Add New Campus Gate</h3>
              <form onSubmit={handleCreateGate} className="space-y-3">
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
                    value={gateForm.isActive} onChange={e => setGateForm({...gateForm, isActive: e.target.value === 'true'})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-amber-600"
                  >
                    <option value="true">Status: Active</option>
                    <option value="false">Status: Inactive</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl text-xs font-semibold">Cancel</button>
                  <button type="submit" className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl text-xs font-semibold">Create Gate</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </PageContainer>
  );
};

export default ManageGates;