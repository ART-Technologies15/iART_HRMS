import axiosInstance from "./axiosInstance";

/* ==========================================================
   Dashboard
========================================================== */

export const getAssetDashboard = async () => {
    const res = await axiosInstance.get("/assests/dashboard");
    return res.data;
};

/* ==========================================================
   Inventory
========================================================== */

export const createAsset = async (data) => {
    const res = await axiosInstance.post("/assests", data);
    return res.data;
};

export const getAllAssets = async (params = {}) => {
    const res = await axiosInstance.get("/assests", {
        params,
    });
    return res.data;
};

export const getAssetById = async (assetId) => {
    const res = await axiosInstance.get(`/assests/${assetId}`);
    return res.data;
};

export const updateAsset = async (assetId, data) => {
    const res = await axiosInstance.put(`/assests/${assetId}`, data);
    return res.data;
};

export const deleteAsset = async (assetId) => {
    const res = await axiosInstance.delete(`/assests/${assetId}`);
    return res.data;
};

export const toggleAssetStatus = async (assetId) => {
    const res = await axiosInstance.patch(`/assests/toggle-status/${assetId}`);
    return res.data;
};

/* ==========================================================
   Assignment
========================================================== */

export const assignAsset = async (assetId, data) => {
    const res = await axiosInstance.post(
        `/assests/assign/${assetId}`,
        data
    );
    return res.data;
};

export const returnAsset = async (assetId, data) => {
    const res = await axiosInstance.post(
        `/assests/return/${assetId}`,
        data
    );
    return res.data;
};

export const transferAsset = async (assetId, data) => {
    const res = await axiosInstance.post(
        `/assests/transfer/${assetId}`,
        data
    );
    return res.data;
};

/* ==========================================================
   Reports / History
========================================================== */

export const getAssignedAssets = async (params = {}) => {
    const res = await axiosInstance.get(
        "/assests/assigned/list",
        {
            params,
        }
    );
    return res.data;
};

export const getEmployeeAssets = async (employeeId, params = {}) => {
    const res = await axiosInstance.get(
        `/assests/employee/${employeeId}`,
        {
            params,
        }
    );
    return res.data;
};

export const getAssetHistory = async (assetId) => {
    const res = await axiosInstance.get(
        `/assests/history/${assetId}`
    );
    return res.data;
};