import express from "express";
import {
  getUserProfileController,
  loginController,
  logoutController,
  requestPasswordResetController,
  passwordResetController,
  udpatePasswordController,
  updateProfileController,
  updateProfilePicController,
  requestRegisterController,
  verifyregisterController,
} from "../controllers/userController.js";
import { isAuth } from "../middlewares/authMiddleware.js";
import { singleUpload } from "../middlewares/multer.js";
import { rateLimit } from "express-rate-limit";

// RATE LIMITER
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  // store: ... , // Use an external store for consistency across multiple server instances.
});

//router object
const router = express.Router();

//routes
// register request 
router.post("/request-register", limiter, requestRegisterController);

//register
router.post("/register", limiter, verifyregisterController);


//login
router.post("/login", limiter, loginController);

//profile
router.get("/profile", isAuth, getUserProfileController);

//logout
router.get("/logout", isAuth, logoutController);

// uopdate profile
router.put("/profile-update", isAuth, updateProfileController);

// updte password
router.put("/update-password", isAuth, udpatePasswordController);

// update profile pic
router.put("/update-picture", isAuth, singleUpload, updateProfilePicController);

// Request OTP for password reset
router.post("/request-reset-password", requestPasswordResetController);

// reset PASSWORD
router.post("/reset-password", passwordResetController);

//export
export default router;
