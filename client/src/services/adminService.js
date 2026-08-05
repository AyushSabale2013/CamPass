import axios from "axios";

// Dynamically points to your backend API URL (falls back to localhost:5000)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Helper function to attach the Bearer token for authorization
const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

// 1. Fetch Admin Profile & Overview Stats
export const fetchAdminDashboard = async () => {
    const response = await axios.get(`${API_URL}/admin/profile`, getAuthHeaders());
    return response.data;
};

// 2. Global System Reset
export const resetSystemData = async () => {
    const response = await axios.post(`${API_URL}/admin/reset-data`, {}, getAuthHeaders());
    return response.data;
};

// --- USER MANAGEMENT API CALLS ---

export const fetchAllUsers = async () => {
    const response = await axios.get(`${API_URL}/admin/users`, getAuthHeaders());
    return response.data;
};

export const createUserProfile = async (userData) => {
    const response = await axios.post(`${API_URL}/admin/users`, userData, getAuthHeaders());
    return response.data;
};

export const updateUserProfile = async (id, userData) => {
    const response = await axios.put(`${API_URL}/admin/users/${id}`, userData, getAuthHeaders());
    return response.data;
};

export const deleteUserProfile = async (id) => {
    const response = await axios.delete(`${API_URL}/admin/users/${id}`, getAuthHeaders());
    return response.data;
};

// --- GATE MANAGEMENT API CALLS ---

export const fetchAllGates = async () => {
    const response = await axios.get(`${API_URL}/admin/gates`, getAuthHeaders());
    return response.data;
};

export const createGateProfile = async (gateData) => {
    const response = await axios.post(`${API_URL}/admin/gates`, gateData, getAuthHeaders());
    return response.data;
};

export const updateGateProfile = async (id, gateData) => {
    const response = await axios.put(`${API_URL}/admin/gates/${id}`, gateData, getAuthHeaders());
    return response.data;
};

export const deleteGateProfile = async (id) => {
    const response = await axios.delete(`${API_URL}/admin/gates/${id}`, getAuthHeaders());
    return response.data;
};

// --- LOGS EXPORT API CALL ---

export const exportSystemLogs = async () => {
    const response = await axios.get(`${API_URL}/admin/logs/export`, getAuthHeaders());
    return response.data;
};