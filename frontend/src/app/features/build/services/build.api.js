import axios from "axios";

const server = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: server,
  withCredentials: true,
});

export const buildRequest = async ({ prompt, chatId }) => {
  const response = await api.post("/api/build/create", { prompt, chatId });
  return response.data;
};
