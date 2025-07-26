import axios from "axios";

export const axiosClient = axios.create({
  baseURL: "https://example.com/api",
  headers: { "Content-Type": "application/json" },
  timeout: 5000,
  withCredentials: true,
});
