import axios from "../api/axios";

export const getGateDetails = (slug) => {
    return axios.get(`/gate/details/${slug}`);
};

export const verifyGate = (data) => {
    return axios.post("/gate/verify", data);
};

export const getGateHistory = (limit = 5) => {
    return axios.get(`/gate/history?limit=${limit}`);
};

export const getGateHistoryPage = ({ page = 1, limit = 15, status } = {}) => {
    const params = new URLSearchParams({ page, limit });

    if (status) {
        params.set("status", status);
    }

    return axios.get(`/gate/history?${params.toString()}`);
};

// Approval workflow — Student
export const submitGateRequest = (data) => {
    return axios.post("/gate/requests", data);
};

export const getMyRequests = (limit = 10) => {
    return axios.get(`/gate/requests/mine?limit=${limit}`);
};

// Approval workflow — Security Guard
export const getPendingRequests = () => {
    return axios.get("/gate/requests/pending");
};

export const approveGateRequest = (id) => {
    return axios.post(`/gate/requests/${id}/approve`);
};

export const rejectGateRequest = (id, rejectionNote = "") => {
    return axios.post(`/gate/requests/${id}/reject`, { rejectionNote });
};

// Security Guard API Services
export const getSecurityLogs = (type = "today", section = "all", page = 1, limit = 50) => {
    const params = new URLSearchParams({ type, section, page, limit });
    return axios.get(`/gate/security-logs?${params.toString()}`);
};

// Security Guard Bus Logs (Datewise College Bus Entries / Exits)
export const getBusLogs = (date = "", status = "") => {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    if (status) params.append("status", status);
    return axios.get(`/gate/bus-logs?${params.toString()}`);
};