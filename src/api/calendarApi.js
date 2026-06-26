import axiosInstance from "./axiosInstance";

// Get all months or specific month
export const getCalendar = async (params = {}) => {
  try {
    const res = await axiosInstance.get("/calendar", { params });
    return res.data;
  } catch (error) {
    return error.response?.data;
  }
};

// Add or update a calendar month
export const saveCalendarMonth = async (data) => {
  try {
    const res = await axiosInstance.post("/calendar", data);
    return res.data;
  } catch (error) {
    return error.response?.data;
  }
};

// Delete a calendar month by document ID
export const deleteCalendarMonth = async (id) => {
  try {
    const res = await axiosInstance.delete(`/calendar/${id}`);
    return res.data;
  } catch (error) {
    return error.response?.data;
  }
};

// Auto-generate weekends for full year
export const generateWeekends = async (year) => {
  try {
    const res = await axiosInstance.post("/calendar/generate-weekends", {
      year,
    });
    return res.data;
  } catch (error) {
    return error.response?.data;
  }
};
