import { Router } from "express";
import { authView } from "../middleware/JWT.js";
import {
  requireAdminPage,
  renderUserList,
  renderUserEdit,
} from "../controllers/adminPageController.js";

// Server-rendered "Administer User Profile" pages. Mounted at /admin/users.
const router = Router();

router.get("/", authView, requireAdminPage, renderUserList);
router.get("/:id/edit", authView, requireAdminPage, renderUserEdit);

export default router;
