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
