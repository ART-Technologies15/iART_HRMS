import axios from "axios";
import { toast } from "react-toastify";

const apiUrl = import.meta.env.VITE_API_URL;

const triggerLogout = () => window.dispatchEvent(new Event("force-logout"));

const axiosInstance = axios.create({
  baseURL: apiUrl,
});

// Attach token automatically
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

let isRedirecting = false;
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;

    const isSessionExpired =
      status === 401 || message === "Session expired. Please login again.";

    if (isSessionExpired && !isRedirecting) {
      isRedirecting = true;

      toast.error("Session expired. Please login again.", {
        position: "top-center",
        autoClose: 1500,
      });

      // Clear token
      localStorage.removeItem("token");

      // Wait for toast → redirect only once
      triggerLogout();
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
