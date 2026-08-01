import api from "../api/axios";

export const googleLogin = (credential) =>
  api.post("/auth/google", { credential });

export const registerStudent = (data) =>
  api.post("/auth/register", data);

export const getCurrentUser = () =>
  api.get("/auth/me");