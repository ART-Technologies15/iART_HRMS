import express from "express";
import { createAsset, getAllAssets, getAssetById, updateAsset, deleteAsset, assignAsset, returnAsset, transferAsset, getAssignedAssets, toggleAssetStatus, getEmployeeAssets, getAssetHistory, getAssetDashboard } from "../controller/assestsController.js";
import { protect } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();
const storage = multer.memoryStorage();

export const upload = multer({ storage });

const uploadFields = upload.fields([
    { name: "file", maxCount: 1 },
]);

/* ==========================================================
   Dashboard
========================================================== */
router.get("/dashboard", protect, getAssetDashboard);

/* ==========================================================
   Inventory
========================================================== */
router.post("/", protect, createAsset);
router.get("/", protect, getAllAssets);
router.get("/:id", getAssetById);
router.put("/:id", protect, updateAsset);
router.delete("/:id", protect, deleteAsset);
router.patch("/toggle-status/:id", protect, toggleAssetStatus);

/* ==========================================================
   Assignment
========================================================== */
router.post("/assign/:id", protect, assignAsset);
router.post("/return/:id", protect, returnAsset);
router.post("/transfer/:id", protect, transferAsset);

/* ==========================================================
   Reports / History
========================================================== */
router.get("/assigned/list", protect, getAssignedAssets);
router.get("/employee/:employeeId", protect, getEmployeeAssets);
router.get("/history/:id", protect, getAssetHistory);

export default router;
