import express from "express";
import { register, login,getAllUsers,deleteUser,updateUser , toggleUserStatus } from "../controller/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", protect,register);
router.post("/login", login);
router.get("/getAllUsers", protect,getAllUsers);
router.delete("/:id", protect, deleteUser);
router.put("/:id", protect, updateUser);
router.patch("/users/:userId/status", protect, toggleUserStatus);
        
export default router;
