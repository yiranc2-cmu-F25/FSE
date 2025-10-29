import { Router } from "express";
import { getAnnouncements, postAnnouncement} from "../controllers/announcementController.js";
import { auth } from "../middleware/JWT.js";


const router = Router();

router.get("/announcements", auth, getAnnouncements);
router.post("/announcements", auth, postAnnouncement);

export default router;