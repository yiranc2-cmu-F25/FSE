import User from "../entities/User.js";
import { PRIVILEGE_LEVEL } from "../constants/privilegeLevel.js";

// Middleware to check if user has certain privilege
export async function requireAdmin(req, res, next) {
    try {
        // userId should already be set by auth/authView middleware
        if (!req.userId) {
            return res.status(401).format({
                html: () => res.redirect("/"),
                json: () => res.json({ error: "Unauthorized" }),
                default: () => res.type("txt").send("Unauthorized"),
            });
        }

        const privilegeLevel = await User.getPrivilegeLevelById(req.userId);

        req.privilege = privilegeLevel;

        next();
    } catch (err) {
        console.error("Error checking privilege level:", err);
        return res.status(500).format({
            html: () => res.render("errorPages/404-pageNotFound"),
            json: () => res.json({ error: "Internal server error" }),
            default: () => res.type("txt").send("500 Internal Server Error"),
        });
    }
}
