import express from "express";
import { register, login, getAllUsers, getProfile, deleteUser, updateUser, toggleUserStatus, getAllUsersPhoneBook } from "../controller/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();
const storage = multer.memoryStorage();

export const upload = multer({ storage });

const uploadFields = upload.fields([
    { name: "panFile", maxCount: 1 },
    { name: "aadhaarFile", maxCount: 1 },
    { name: "cancelledChequeFile", maxCount: 1 },
    { name: "passbookFile", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
]);

router.post("/register", protect, uploadFields, register);
router.post("/login", login);
router.get("/getAllUsers", protect, getAllUsers);
router.get("/getAllUsersPhoneBook", protect, getAllUsersPhoneBook);
router.get("/getProfile", protect, getProfile);
router.delete("/:id", protect, deleteUser);
router.put("/:id", protect, uploadFields, updateUser);
router.patch("/users/:userId/status", protect, toggleUserStatus);

export default router;
