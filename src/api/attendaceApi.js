import axiosInstance from "./axiosInstance";

// Punch In
export const punchInAPI = async () => {
  const res = await axiosInstance.post("/attendance/punch-in");
  return res.data;
};

// Punch Out
export const punchOutAPI = async () => {
  const res = await axiosInstance.post("/attendance/punch-out");
  return res.data;
};

// Get Today's Punch Status
export const getTodayStatusAPI = async () => {
  const res = await axiosInstance.get("/attendance/today");
  return res.data;
};

// Monthly working hours
export const getMonthlyWorkingHoursAPI = async (userId, month, year) => {
  const res = await axiosInstance.get(`/attendance/monthly-hours/${userId}`, {
    params: { month, year },
  });
  return res.data;
};

// Punctuality stats
export const getPunctualityAPI = async (userId, month, year) => {
  const res = await axiosInstance.get(`/attendance/punctuality/${userId}`, {
    params: { month, year },
  });
  return res.data;
};

// Attendance between dates
export const getUserAttendance = async (userId, startDate, endDate) => {
  const res = await axiosInstance.get(`/attendance/records/${userId}`, {
    params: { startDate, endDate },
  });
  return res.data;
};

// Update attendance (Admin)
export const updateAttendanceAPI = async (payload) => {
  const res = await axiosInstance.put(`/attendance/update-attendance`, payload);
  return res.data;
};

// Admin: attendance by date
export const getAttendanceByDate = async (date) => {
  const res = await axiosInstance.get(`/admin/date/${date}`);
  return res.data;
};

// Admin: attendance by date (new route)
export const getAdminAttendanceByDate = async (date) => {
  const res = await axiosInstance.get(`/attendance/admin/date/${date}`);
  return res.data;
};

export const getAdminMonthlyAttendance = async (month, year) => {
  const res = await axiosInstance.get(`/attendance/admin/monthly`, {
    params: { month, year },
  });
  return res.data;
};
