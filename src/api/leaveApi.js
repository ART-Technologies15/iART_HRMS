// src/api/leaveApi.js
import axiosInstance from "./axiosInstance";



export const applyLeave = async (data) => {
  const res = await axiosInstance.post(`/leave/apply-leave`, data);
  return res.data;
};


export const getMyLeaves = async (userId, params = {}) => {
  const res = await axiosInstance.get(`/leave/my-leaves/${userId}`, { params });
  return res.data;
};

export const getLeavesForAdmin = async (params = {}) => {
  const res = await axiosInstance.get(`/leave/admin`, { params });
  return res.data;
};

export const updateLeaveStatus = async (leaveId, payload) => {
  const res = await axiosInstance.patch(`/leave/update/${leaveId}`, payload);
  return res.data;
};

export const editLeave = async (leaveId, payload) => {
  const res = await axiosInstance.patch(
    `/leave/update-leave/${leaveId}`,
    payload
  );
  return res.data;
};

// USER: cancel
export const cancelLeave = (leaveId, userId) =>
  updateLeaveStatus(leaveId, { action: "cancel", userId });

// USER: reapply (cancelled → pending)
export const reapplyLeave = (leaveId, userId) =>
  updateLeaveStatus(leaveId, { action: "reapply", userId });

// ADMIN: approve
export const adminApproveLeave = (leaveId, adminId) =>
  updateLeaveStatus(leaveId, { action: "approved", adminId });

// ADMIN: reject
export const adminRejectLeave = (leaveId, adminId, rejectionReason) =>
  updateLeaveStatus(leaveId, { action: "rejected", adminId, rejectionReason });

// ADMIN: mark pending
export const adminMarkPending = (leaveId, adminId) =>
  updateLeaveStatus(leaveId, { action: "pending", adminId });
