// controllers/notificationController.js

import Notification from "../models/Notification.js";
import User from "../models/Users.js";

/* ------------------------------------------
   Create Notification
------------------------------------------- */
export const createNotification = async (req, res) => {
    try {
        const userId = req?.user?._id || req?.user?.id

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admin can create notifications.",
            });
        }

        const {
            title,
            body,
            color,
            dateFrom,
            dateTo,
            active,
        } = req.body;
        console.log("req.bodyy=====?", req.body);


        if (!title || !body || !dateFrom || !dateTo) {
            return res.status(400).json({
                success: false,
                message: "Title, body, dateFrom and dateTo are required.",
            });
        }

        // Optional user validation
        if (userId) {
            const userExists = await User.findById(userId);
            if (!userExists) {
                return res.status(404).json({
                    success: false,
                    message: "User not found.",
                });
            }
        }

        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);

        const notification = await Notification.create({
            userId: userId || null,
            title,
            body,
            color: color || "#3B82F6",
            dateFrom: fromDate,
            dateTo: toDate,
            active: active ?? true,
        });

        return res.status(201).json({
            success: true,
            message: "Notification created successfully.",
            notification,
        });
    } catch (error) {
        console.error("Create Notification Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message,
        });
    }
};

/* ------------------------------------------
   Update Notification
------------------------------------------- */
export const updateNotification = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admin can update notifications.",
            });
        }

        const { id } = req.params;

        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found.",
            });
        }

        const updateData = { ...req.body };

        if (updateData.dateFrom) {
            const fromDate = new Date(updateData.dateFrom);
            fromDate.setUTCHours(0, 0, 0, 0);
            updateData.dateFrom = fromDate;
        }

        if (updateData.dateTo) {
            const toDate = new Date(updateData.dateTo);
            toDate.setUTCHours(23, 59, 59, 999);
            updateData.dateTo = toDate;
        }

        Object.assign(notification, updateData);

        await notification.save();

        return res.status(200).json({
            success: true,
            message: "Notification updated successfully.",
            notification,
        });
    } catch (error) {
        console.error("Update Notification Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message,
        });
    }
};

/* ------------------------------------------
   Get All Notifications (Admin)
------------------------------------------- */
export const getAllNotifications = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admin can view notifications.",
            });
        }

        const {
            page = 1,
            limit = 10,
            search = "",
        } = req.query;

        const query = {};

        if (search.trim()) {
            const regex = new RegExp(search.trim(), "i");

            query.$or = [
                { title: regex },
                { body: regex },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .populate("userId", "name email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),

            Notification.countDocuments(query),
        ]);

        const formattedNotifications = notifications.map((notification) => ({
            ...notification,
            _id: notification._id.toString(),
        }));

        return res.status(200).json({
            success: true,
            message: "Notifications fetched successfully",
            notifications: formattedNotifications,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error("Get Notifications Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while fetching notifications.",
            error: error.message,
        });
    }
};

/* ------------------------------------------
   Get Active Notifications
------------------------------------------- */
export const getActiveNotifications = async (req, res) => {
    try {
        const today = new Date();

        const notifications = await Notification.find({
            active: true,
            dateFrom: { $lte: today },
            dateTo: { $gte: today },
        })
            .sort({ createdAt: -1 });

        // Today's month and day
        const month = today.getUTCMonth() + 1;
        const day = today.getUTCDate();

        // Users whose birthday is today
        const birthdays = await User.aggregate([
            {
                $match: {
                    isActive: true,
                    dateOfBirth: { $ne: null },
                },
            },
            {
                $addFields: {
                    birthMonth: { $month: "$dateOfBirth" },
                    birthDay: { $dayOfMonth: "$dateOfBirth" },
                },
            },
            {
                $match: {
                    birthMonth: month,
                    birthDay: day,
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    profilePhoto: 1,
                    email: 1,
                    dateOfBirth: 1,
                    department: 1,
                    designation: 1,
                },
            },
        ]);

        return res.status(200).json({
            success: true,
            count: notifications.length,
            notifications,
            birthdayCount: birthdays.length,
            birthdays,
        });
    } catch (error) {
        console.error("Get Active Notifications Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message,
        });
    }
};

/* ------------------------------------------
   Activate / Inactivate Notification
------------------------------------------- */
export const inactiveNotification = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admin can update notifications.",
            });
        }

        const { id } = req.params;

        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found.",
            });
        }

        notification.active = !notification.active;

        await notification.save();

        return res.status(200).json({
            success: true,
            message: `Notification ${notification.active ? "activated" : "deactivated"
                } successfully.`,
            notification,
        });
    } catch (error) {
        console.error("Inactive Notification Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message,
        });
    }
};

/* ------------------------------------------
   Delete Notification
------------------------------------------- */
export const deleteNotification = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admin can delete notifications.",
            });
        }

        const { id } = req.params;

        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found.",
            });
        }

        await Notification.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Notification deleted successfully.",
        });
    } catch (error) {
        console.error("Delete Notification Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message,
        });
    }
};