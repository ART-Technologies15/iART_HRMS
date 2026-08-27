import express from "express";
import {
    register,
    login,
    getAllUsers,
    getProfile,
    deleteUser,
    updateUser,
    getPendingVerificationRequests,
    getWebsiteContacts,
    websiteTrainingSubmit,
    reviewAllPendingVerification,
    websiteContactUs,
    reviewPendingVerification,
    toggleUserStatus,
    getAllUsersPhoneBook,
    getWebsiteTraining,
    createCareerPost,
    updateCareerPost,
    closeCareerPost,
    getAllCareerPosts,
    getWebsiteOpportunities,
    getOpportunities,
    getOpportunitiesDetails,
    applyForCareer,
    getCareerPostById,
    updateCareerApplicationStatus,
    getClientInvoiceNumber,
    createClientInvoiceNumber
} from "../controller/authController.js";
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
    { name: "resume", maxCount: 1 },
]);

const uploadResume = upload.fields([
    { name: "resume", maxCount: 1 },
]);


router.post("/register", protect, uploadFields, register);
router.post("/login", login);
router.get("/getAllUsers", protect, getAllUsers);
router.get("/getAllUsersPhoneBook", protect, getAllUsersPhoneBook);
router.get("/getProfile", protect, getProfile);
router.get("/getPendingVerificationRequests", protect, getPendingVerificationRequests);
router.delete("/:id", protect, deleteUser);
router.put("/:id", protect, uploadFields, updateUser);
router.patch("/users/:userId/status", protect, toggleUserStatus);
router.patch("/actionPendingVerification/:id", protect, reviewPendingVerification);
router.patch("/actionPendingVerification/:id/review-all", protect, reviewAllPendingVerification);

router.get("/website-contacts", protect, getWebsiteContacts);
router.get("/website-training", protect, getWebsiteTraining);
router.post("/career-posts", protect, createCareerPost);
router.put("/career-post/:id", protect, updateCareerPost);
router.put("/career-post/:id/close", protect, closeCareerPost);
router.get("/career-posts", protect, getAllCareerPosts);
router.get("/website-opportunities", protect, getWebsiteOpportunities);
router.get("/career-posts/:id", protect, getCareerPostById);
router.put("/application-update/:id", protect, updateCareerApplicationStatus);

router.post("/client-invoice", protect, createClientInvoiceNumber);
router.get("/client-invoice/next-number", protect, getClientInvoiceNumber);

// ********************************************************WEBISTE API's ROUTES**********************************************************************
router.post("/contact-us", websiteContactUs);
router.post("/training-submit", uploadFields, websiteTrainingSubmit);
router.get("/career", getOpportunities);
router.get("/career/:id", getOpportunitiesDetails);
router.post("/career/apply", uploadResume, applyForCareer);


export default router;
