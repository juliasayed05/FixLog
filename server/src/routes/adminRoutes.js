import { Router } from "express";
import { body, param, query } from "express-validator";
import { authRequired, allowRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  activateUser,
  changeUserRole,
  deleteUser,
  getAdminOverview,
  listAdminAudit,
  listAdminUsers,
  suspendUser,
} from "../controllers/adminController.js";

const router = Router();
router.use(authRequired, allowRoles("Admin"));
router.get("/overview", getAdminOverview);
router.get(
  "/users",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("role")
      .optional({ checkFalsy: true })
      .isIn(["Developer", "Lead", "Admin"]),
    query("state").optional({ checkFalsy: true }).isIn(["active", "suspended"]),
    validate,
  ],
  listAdminUsers,
);
router.patch(
  "/users/:id/role",
  [
    param("id").isMongoId(),
    body("role").isIn(["Developer", "Lead", "Admin"]),
    validate,
  ],
  changeUserRole,
);
router.patch(
  "/users/:id/suspend",
  [
    param("id").isMongoId(),
    body("reason")
      .optional({ nullable: true })
      .isString()
      .trim()
      .isLength({ max: 500 }),
    validate,
  ],
  suspendUser,
);
router.patch(
  "/users/:id/activate",
  [param("id").isMongoId(), validate],
  activateUser,
);
router.delete("/users/:id", [param("id").isMongoId(), validate], deleteUser);
router.get(
  "/audit",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    validate,
  ],
  listAdminAudit,
);
export default router;
