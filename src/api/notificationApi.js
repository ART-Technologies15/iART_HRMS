import axiosInstance from "./axiosInstance";

/* ------------------------------------------
   Create Notification
------------------------------------------ */
export const createNotification = async (data) => {
    const res = await axiosInstance.post("/notifications", data);
    return res.data;
};

/* ------------------------------------------
   Update Notification
------------------------------------------ */
export const updateNotification = async (id, data) => {
    const res = await axiosInstance.put(`/notifications/${id}`, data);
    return res.data;
};

/* ------------------------------------------
   Get All Notifications (Admin)
------------------------------------------ */
export const getAllNotifications = async ({
    page = 1,
    limit = 10,
    search = "",
} = {}) => {
    const res = await axiosInstance.get("/notifications", {
        params: {
            page,
            limit,
            search,
        },
    });

    return res.data;
};

/* ------------------------------------------
   Get Active Notifications
------------------------------------------ */
export const getActiveNotifications = async () => {
    const res = await axiosInstance.get("/notifications/active");
    return res.data;
};

/* ------------------------------------------
   Activate / Deactivate Notification
------------------------------------------ */
export const toggleNotificationStatus = async (id) => {
    const res = await axiosInstance.patch(`/notifications/${id}/status`);
    return res.data;
};

/* ------------------------------------------
   Delete Notification
------------------------------------------ */
export const deleteNotification = async (id) => {
    const res = await axiosInstance.delete(`/notifications/${id}`);
    return res.data;
};