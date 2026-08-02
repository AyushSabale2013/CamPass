import axios from "../api/axios";

export const verifyGate = (data) => {
    return axios.post("/gate/verify", data);
};