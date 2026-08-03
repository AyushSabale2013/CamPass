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