import axiosInstance from "./axiosInstance";



export const loginUser = async (userData) => {
  try {
    const response = await axiosInstance.post("/auth/login", userData, {
      headers: { Authorization: "" },
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: "Login failed. Please try again." }
    );
  }
};

export const registerUser = async (userData) => {
  const res = await axiosInstance.post("/auth/register", userData);
  return res.data;
};

export const getAllUsers = async (params = {}) => {
  const res = await axiosInstance.get("/auth/getAllUsers", { params });
  return res.data;
};

export const getPhoneBook = async (params = {}) => {
  const res = await axiosInstance.get("/auth/getAllUsersPhoneBook", { params });
  return res.data;
};

export const getProfileAccount = async (params = {}) => {
  const res = await axiosInstance.get("/auth/getProfile", { params });
  return res.data;
};

export const updateUser = async (id, data) => {
  const res = await axiosInstance.put(`/auth/${id}`, data);
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await axiosInstance.delete(`/auth/${id}`);
  return res.data;
};

export const toggleUserStatus = async (userId, isActive) => {
  const res = await axiosInstance.patch(`/auth/users/${userId}/status`, {
    isActive,
  });
  return res.data;
};

export const getVerificationRequests = async (params = {}) => {
  const res = await axiosInstance.get("/auth/getPendingVerificationRequests", { params });
  return res.data;
};

export const reviewPendingVerification = async (id, data) => {
  const res = await axiosInstance.patch(`/auth/actionPendingVerification/${id}`, data);
  return res.data;
};

export const reviewAllPendingVerification = async (id) => {
  const res = await axiosInstance.patch(`/auth/actionPendingVerification/${id}/review-all`);
  return res.data;
};

export const getWebsiteContacts = async (params = {}) => {
  const res = await axiosInstance.get("/auth/website-contacts", { params });
  return res.data;
};

export const createCareerPost = async (data) => {
  const res = await axiosInstance.post("/auth/career-posts", data);
  return res.data;
};

export const updateCareerPost = async (id, data) => {
  const res = await axiosInstance.put(`/auth/career-post/${id}`, data);
  return res.data;
};

export const closeCareerPost = async (id, data) => {
  const res = await axiosInstance.put(`/auth/career-post/${id}/close`, data);
  return res.data;
};

export const getWebsiteOpportunities = async (params = {}) => {
  const res = await axiosInstance.get("/auth/website-opportunities", { params });
  return res.data;
};

export const getCareerPostById = async (id) => {
  const res = await axiosInstance.get(`/auth/career-posts/${id}`);
  return res.data;
};

export const updateCareerApplicationStatus = async (id, data) => {
  const res = await axiosInstance.put(`/auth/application-update/${id}`, data);
  return res.data;
};

export const getClientInvoiceNumber = async (params = {}) => {
  const res = await axiosInstance.get(`/auth/client-invoice/next-number`, { params });
  return res.data;
};

export const createClientInvoiceNumber = async (data) => {
  const res = await axiosInstance.post("/auth/client-invoice", data);
  return res.data;
};