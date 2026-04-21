import axios from "axios";
const API = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export async function register({ userName, email, password }) {
  const response = await api.post("/api/auth/register", {
    userName,
    email,
    password,
  });
  return response;
}
export async function login({ email, password }) {
  const response = await api.post("/api/auth/login", {
    identifier: email,
    password,
  });
  return response;
}

export async function getMe() {
  const response = await api.get("/api/auth/getME");
  return response;
}

export async function logout() {
  const response = await api.get("/api/auth/logout");
  return response;
}
