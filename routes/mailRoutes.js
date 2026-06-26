import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { broadcast } from "../controller/MailController.js";

const router = express.Router();

router.post("/broadcast", protect, broadcast);

export default router;
