import { Router } from "express";
import { body } from "express-validator";
import {
  deleteAvatar,
  login,
  logout,
  me,
  register,
  updateProfile,
  uploadAvatar,
} from "../controllers/authController.js";
import { avatarUpload } from "../middleware/avatarUpload.js";
import { authRequired } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 2, max: 80 }),
    body("email").trim().isEmail().normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
    }),
    body("password").isLength({ min: 8, max: 128 }),
    validate,
  ],
  register,
);
router.post(
  "/login",
  [
    body("email").trim().isEmail().normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
    }),
    body("password").isLength({ min: 1, max: 128 }),
    validate,
  ],
  login,
);
router.get("/me", authRequired, me);
router.put(
  "/profile",
  authRequired,
  [
    body("name").optional().trim().isLength({ min: 2, max: 80 }),
    body("headline").optional().isString().trim().isLength({ max: 120 }),
    body("bio").optional().isString().trim().isLength({ max: 1000 }),
    body("location").optional().isString().trim().isLength({ max: 100 }),
    body("timezone").optional().isString().trim().isLength({ max: 100 }),
    body("website")
      .optional({ checkFalsy: true })
      .isURL({ require_tld: false, protocols: ["http", "https"] }),
    body("github")
      .optional({ checkFalsy: true })
      .isURL({ require_tld: false, protocols: ["http", "https"] }),
    body("linkedin")
      .optional({ checkFalsy: true })
      .isURL({ require_tld: false, protocols: ["http", "https"] }),
    body("skills").optional().isArray({ max: 20 }),
    body("currentPassword").optional().isLength({ max: 128 }),
    body("newPassword").optional().isLength({ min: 8, max: 128 }),
    validate,
  ],
  updateProfile,
);
router.post(
  "/avatar",
  authRequired,
  avatarUpload.single("avatar"),
  uploadAvatar,
);
router.delete("/avatar", authRequired, deleteAvatar);
router.post("/logout", authRequired, logout);
export default router;
