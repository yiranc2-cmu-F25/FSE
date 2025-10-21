import { Router } from "express";
import { auth } from "../middleware/JWT.js";
import User from "../entities/User.js";

const router = Router();

router.get("/:id", auth, async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: "not_found" });
    res.json({
      id: String(u._id ?? u.id ?? u.userId),
      username: u.username,
      status: u.sharedstatus ?? "UNDEFINED",
      avatarColor: u.avatarColor,
    });
  } catch (err) { next(err); }
});

export default router;
