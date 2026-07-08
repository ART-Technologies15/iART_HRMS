import mongoose from "mongoose";
import AssetInventory from "../models/AssetInventory.js";
import AssetAssignment from "../models/AssetAssignment.js";
import User from "../models/Users.js";

/* ==========================================================
   CREATE ASSET
   ========================================================== */
export const createAsset = async (req, res) => {
    try {
        const {
            assetCode,
            assetName,
            category,
            brand,
            model,
            serialNumber,
            purchaseDate,
            purchasePrice,
            warrantyExpiry,
            vendor,
            condition,
            notes,
            status
        } = req.body;

        if (!assetCode || !assetName || !category) {
            return res.status(400).json({
                success: false,
                message: "Asset Code, Asset Name and Category are required.",
            });
        }

        const exists = await AssetInventory.findOne({
            $or: [
                { assetCode: assetCode.trim() },
                ...(serialNumber
                    ? [{ serialNumber: serialNumber.trim() }]
                    : []),
            ],
        }).lean();

        if (exists) {
            return res.status(400).json({
                success: false,
                message:
                    exists.assetCode === assetCode
                        ? "Asset code already exists."
                        : "Serial number already exists.",
            });
        }

        const asset = await AssetInventory.create({
            assetCode: assetCode.trim().toUpperCase(),
            assetName: assetName.trim(),
            category,
            brand,
            model,
            serialNumber,
            purchaseDate,
            purchasePrice,
            warrantyExpiry,
            vendor,
            condition,
            notes,
            status
        });

        return res.status(201).json({
            success: true,
            message: "Asset created successfully.",
            asset,
        });
    } catch (err) {
        console.error("Create Asset Error:", err);

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message,
        });
    }
};

/* ==========================================================
   GET ALL ASSET
   ========================================================== */
export const getAllAssets = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            category = "",
            status = "",
            condition = "",
            brand = "",
            assigned = "",
            isActive = "",
        } = req.query;

        const query = {};

        if (search) {
            const regex = new RegExp(search, "i");

            query.$or = [
                { assetCode: regex },
                { assetName: regex },
                { category: regex },
                { brand: regex },
                { model: regex },
                { serialNumber: regex },
                { vendor: regex },
            ];
        }

        if (category) query.category = category;
        if (status) query.status = status;
        if (condition) query.condition = condition;
        if (brand) query.brand = brand;

        if (isActive !== "") {
            query.isActive = isActive === "true";
        }

        if (assigned === "true") {
            query.currentAssignedTo = { $ne: null };
        }

        if (assigned === "false") {
            query.currentAssignedTo = null;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [assets, total] = await Promise.all([
            AssetInventory.find(query)
                .populate(
                    "currentAssignedTo",
                    "employeeId name designation department profilePhoto role"
                )
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),

            AssetInventory.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            message: "Assets fetched successfully.",
            assets,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message,
        });
    }
};

/* ==========================================================
   GET ASSET BY ID
   ========================================================== */
export const getAssetById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Asset Id.",
            });
        }

        const asset = await AssetInventory.findById(id)
            .populate(
                "currentAssignedTo",
                "employeeId name designation department email mobile profilePhoto"
            )
            .lean();

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: "Asset not found.",
            });
        }

        return res.status(200).json({
            success: true,
            asset,
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message,
        });
    }
};

/* ==========================================================
   UPDATE ASSET
   ========================================================== */
export const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;

        const asset = await AssetInventory.findById(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: "Asset not found.",
            });
        }

        const {
            assetCode,
            assetName,
            category,
            brand,
            model,
            serialNumber,
            purchaseDate,
            purchasePrice,
            warrantyExpiry,
            vendor,
            condition,
            status,
            notes,
        } = req.body;

        if (
            assetCode &&
            assetCode !== asset.assetCode
        ) {
            const exists = await AssetInventory.findOne({
                assetCode,
                _id: { $ne: id },
            }).lean();

            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: "Asset Code already exists.",
                });
            }

            asset.assetCode = assetCode.toUpperCase();
        }

        if (
            serialNumber &&
            serialNumber !== asset.serialNumber
        ) {
            const exists = await AssetInventory.findOne({
                serialNumber,
                _id: { $ne: id },
            }).lean();

            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: "Serial Number already exists.",
                });
            }

            asset.serialNumber = serialNumber;
        }

        if (assetName !== undefined) asset.assetName = assetName;
        if (category !== undefined) asset.category = category;
        if (brand !== undefined) asset.brand = brand;
        if (model !== undefined) asset.model = model;
        if (purchaseDate !== undefined) asset.purchaseDate = purchaseDate;
        if (purchasePrice !== undefined) asset.purchasePrice = purchasePrice;
        if (warrantyExpiry !== undefined) asset.warrantyExpiry = warrantyExpiry;
        if (vendor !== undefined) asset.vendor = vendor;
        if (condition !== undefined) asset.condition = condition;
        if (status !== undefined) asset.status = status;
        if (notes !== undefined) asset.notes = notes;

        await asset.save();

        return res.status(200).json({
            success: true,
            message: "Asset updated successfully.",
            asset,
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message,
        });
    }
};

/* ==========================================================
   DELETE ASSET (SOFT DELETE)
   ========================================================== */
export const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Asset Id.",
            });
        }

        const asset = await AssetInventory.findById(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: "Asset not found.",
            });
        }

        // Don't allow deletion if asset is currently assigned
        if (asset.status === "Assigned") {
            return res.status(400).json({
                success: false,
                message: "Assigned asset cannot be deleted.",
            });
        }

        // Delete assignment history
        await AssetAssignment.deleteMany({
            assetId: asset._id,
        });

        // Delete asset
        await AssetInventory.findByIdAndDelete(asset._id);

        return res.status(200).json({
            success: true,
            message: "Asset deleted successfully.",
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message,
        });
    }
};

/* ==========================================================
   ACTIVATE/INACTIVATE ASSET
   ========================================================== */
export const toggleAssetStatus = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Asset Id.",
            });
        }

        const asset = await AssetInventory.findById(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: "Asset not found.",
            });
        }

        // Prevent disabling an assigned asset
        if (asset.isActive && asset.status === "Assigned") {
            return res.status(400).json({
                success: false,
                message: "Assigned asset cannot be deactivated.",
            });
        }

        // Toggle status
        asset.isActive = !asset.isActive;

        await asset.save();

        return res.status(200).json({
            success: true,
            message: `Asset ${asset.isActive ? "activated" : "deactivated"
                } successfully.`,
            asset,
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message,
        });
    }
};

/* ==========================================================
   ASSIGN ASSET
   ========================================================== */
export const assignAsset = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            employeeId,
            expectedReturnDate,
            remarks,
        } = req.body;

        if (!id || !employeeId) {
            return res.status(400).json({
                success: false,
                message: "assetId and employeeId are required",
            });
        }

        const asset = await AssetInventory.findById(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: "Asset not found",
            });
        }

        if (!asset.isActive) {
            return res.status(400).json({
                success: false,
                message: "Asset is inactive",
            });
        }

        if (asset.status !== "Available") {
            return res.status(400).json({
                success: false,
                message: `Asset is currently ${asset.status}`,
            });
        }

        const assignment = await AssetAssignment.create({
            assetId: id,
            employeeId,
            assignedBy: req.user._id,
            expectedReturnDate,
            remarks,
            assignmentStatus: "Assigned",
            conditionAtAssignment: asset.condition,
        });

        asset.status = "Assigned";
        asset.currentAssignedTo = employeeId;

        await asset.save();

        return res.status(201).json({
            success: true,
            message: "Asset assigned successfully",
            assignment,
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Error assigning asset",
            error: err.message,
        });
    }
};

/* ==========================================================
   RETURN ASSET
   ========================================================== */
export const returnAsset = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            returnedDate,
            conditionAtReturn,
            returnRemarks,
        } = req.body;

        const asset = await AssetInventory.findById(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: "Asset not found",
            });
        }

        const assignment = await AssetAssignment.findOne({
            assetId: id,
            assignmentStatus: "Assigned",
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "No active assignment found",
            });
        }

        assignment.assignmentStatus = "Returned";
        assignment.returnedDate = returnedDate || new Date();
        assignment.receivedBy = req.user._id;
        assignment.returnRemarks = returnRemarks;
        assignment.conditionAtReturn = conditionAtReturn;

        await assignment.save();

        asset.currentAssignedTo = null;

        asset.condition =
            conditionAtReturn === "Lost"
                ? "Lost"
                : conditionAtReturn || asset.condition;

        asset.status =
            conditionAtReturn === "Lost"
                ? "Lost"
                : conditionAtReturn === "Damaged"
                    ? "Repair"
                    : "Available";

        await asset.save();

        return res.status(200).json({
            success: true,
            message: "Asset returned successfully",
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Error returning asset",
            error: err.message,
        });
    }
};

/* ==========================================================
   TRANSFER ASSET
   ========================================================== */
export const transferAsset = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const {
            assetId,
            newEmployeeId,
            remarks,
        } = req.body;

        const asset = await AssetInventory.findById(assetId).session(session);

        if (!asset) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "Asset not found",
            });
        }

        const currentAssignment = await AssetAssignment.findOne({
            assetId,
            assignmentStatus: "Assigned",
        }).session(session);

        if (!currentAssignment) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "No active assignment found",
            });
        }

        currentAssignment.assignmentStatus = "Transferred";
        currentAssignment.returnedDate = new Date();
        currentAssignment.receivedBy = req.user._id;
        currentAssignment.returnRemarks = remarks;

        await currentAssignment.save({ session });

        const newAssignment = await AssetAssignment.create(
            [
                {
                    assetId,
                    employeeId: newEmployeeId,
                    assignedBy: req.user._id,
                    assignedDate: new Date(),
                    assignmentStatus: "Assigned",
                    remarks,
                    conditionAtAssignment: asset.condition,
                },
            ],
            { session }
        );

        asset.currentAssignedTo = newEmployeeId;

        await asset.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: "Asset transferred successfully",
            assignment: newAssignment[0],
        });
    } catch (err) {
        await session.abortTransaction();

        res.status(500).json({
            success: false,
            message: "Error transferring asset",
            error: err.message,
        });
    } finally {
        session.endSession();
    }
};

/* ==========================================================
   ASSIGNED ASSETS
   ========================================================== */
export const getAssignedAssets = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            department = "",
            designation = "",
            category = "",
        } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const assignmentQuery = {
            assignmentStatus: "Assigned",
        };

        const assetMatch = {};
        const employeeMatch = {};

        if (category) {
            assetMatch.category = category;
        }

        if (department) {
            employeeMatch.department = department;
        }

        if (designation) {
            employeeMatch.designation = designation;
        }

        if (search) {
            const regex = new RegExp(search, "i");

            assignmentQuery.$or = [
                { remarks: regex },
            ];

            assetMatch.$or = [
                { assetName: regex },
                { assetCode: regex },
                { serialNumber: regex },
                { brand: regex },
                { model: regex },
            ];

            employeeMatch.$or = [
                { name: regex },
                { employeeId: regex },
            ];
        }

        const [assignments, total] = await Promise.all([
            AssetAssignment.find(assignmentQuery)
                .populate({
                    path: "assetId",
                    match: assetMatch,
                })
                .populate({
                    path: "employeeId",
                    match: employeeMatch,
                    select:
                        "employeeId name department designation",
                })
                .populate("assignedBy", "name")
                .sort({ assignedDate: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),

            AssetAssignment.countDocuments({
                assignmentStatus: "Assigned",
            }),
        ]);

        const filtered = assignments.filter(
            (a) => a.assetId && a.employeeId
        );

        res.status(200).json({
            success: true,
            assignments: filtered,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

/* ==========================================================
   EMPLOYEE ASSET
   ========================================================== */
export const getEmployeeAssets = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const {
            search = "",
            status = "",
            page = 1,
            limit = 10,
        } = req.query;

        const query = {
            employeeId,
        };

        if (status) {
            query.assignmentStatus = status;
        }

        const assignments = await AssetAssignment.find(query)
            .populate({
                path: "assetId",
                match: search
                    ? {
                        $or: [
                            {
                                assetName: {
                                    $regex: search,
                                    $options: "i",
                                },
                            },
                            {
                                assetCode: {
                                    $regex: search,
                                    $options: "i",
                                },
                            },
                            {
                                serialNumber: {
                                    $regex: search,
                                    $options: "i",
                                },
                            },
                            {
                                category: {
                                    $regex: search,
                                    $options: "i",
                                },
                            },
                            {
                                brand: {
                                    $regex: search,
                                    $options: "i",
                                },
                            },
                            {
                                model: {
                                    $regex: search,
                                    $options: "i",
                                },
                            },
                        ],
                    }
                    : {},
                select:
                    "assetCode assetName category brand model serialNumber condition",
            })
            .populate("assignedBy", "name")
            .populate("receivedBy", "name")
            .sort({ assignedDate: -1 })
            .lean();

        // Remove records where populate didn't match search
        const filtered = assignments.filter((item) => item.assetId);

        const skip = (Number(page) - 1) * Number(limit);

        const paginated = filtered.slice(skip, skip + Number(limit));

        res.status(200).json({
            success: true,
            total: filtered.length,
            assets: paginated,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: filtered.length,
                totalPages: Math.ceil(filtered.length / Number(limit)),
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

/* ==========================================================
   ASSET HISTORY
   ========================================================== */
export const getAssetHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const asset = await AssetInventory.findById(id)
            .populate(
                "currentAssignedTo",
                "employeeId name department designation profilePhoto role"
            )
            .lean();

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: "Asset not found.",
            });
        }

        const history = await AssetAssignment.find({
            assetId: id,
        })
            .populate(
                "employeeId",
                "employeeId name department designation profilePhoto role"
            )
            .populate(
                "assignedBy",
                "employeeId name department designation profilePhoto role"
            )
            .populate(
                "receivedBy",
                "employeeId name department designation profilePhoto role"
            )
            .sort({
                assignedDate: -1,
            })
            .lean();

        res.status(200).json({
            success: true,
            asset,
            history,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

/* ==========================================================
   ASSET DASHBOARD
   ========================================================== */
export const getAssetDashboard = async (req, res) => {
    try {
        const today = new Date();

        const next30Days = new Date();
        next30Days.setDate(next30Days.getDate() + 30);

        const [
            totalAssets,
            assignedAssets,
            availableAssets,
            repairAssets,
            lostAssets,
            scrappedAssets,
            warrantyExpiring,
            recentAssignments,
        ] = await Promise.all([
            AssetInventory.countDocuments({
                isActive: true,
            }),

            AssetInventory.countDocuments({
                status: "Assigned",
                isActive: true,
            }),

            AssetInventory.countDocuments({
                status: "Available",
                isActive: true,
            }),

            AssetInventory.countDocuments({
                status: "Repair",
                isActive: true,
            }),

            AssetInventory.countDocuments({
                status: "Lost",
                isActive: true,
            }),

            AssetInventory.countDocuments({
                status: "Scrapped",
                isActive: true,
            }),

            AssetInventory.countDocuments({
                warrantyExpiry: {
                    $gte: today,
                    $lte: next30Days,
                },
                isActive: true,
            }),

            AssetAssignment.find({
                assignmentStatus: "Assigned",
            })
                .populate(
                    "assetId",
                    "assetCode assetName category"
                )
                .populate(
                    "employeeId",
                    "employeeId name"
                )
                .sort({
                    assignedDate: -1,
                })
                .limit(10)
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            dashboard: {
                totalAssets,
                assignedAssets,
                availableAssets,
                repairAssets,
                lostAssets,
                scrappedAssets,
                warrantyExpiring,
                recentAssignments,
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};