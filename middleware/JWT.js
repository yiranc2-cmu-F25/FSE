import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../entities/User.js";
import { USER_STATUS } from "../constants/userStatus.js";
import { toPlainObject } from "../utils/toPlainObject.js";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const isProd = process.env.NODE_ENV === "production";
const requireAuth = process.env.REQUIRE_AUTH !== "false";

const COOKIE_NAME = "jwt_token";
const INACTIVE_REDIRECT = "/?inactive=true";

function cookieOptions() {
  return { httpOnly: true, secure: isProd, sameSite: "lax", path: "/" };
}

function clearJwtCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

/**
 * Verifies the token and loads the user it refers to from the database.
 * The database is the source of truth for status/username because an admin
 * can change them while the JWT is still valid.
 * @throws on an invalid or expired token
 */
async function resolveTokenUser(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  const userId = String(payload.userId ?? payload.sub ?? "");
  const user = toPlainObject(await User.findById(userId));
  return { payload, userId, user };
}

function attachUser(req, { userId, user, role }) {
  req.username = user.username; // database username, not the one in the JWT
  req.userId = userId;
  req.role = role;
  req.user = { id: userId, username: user.username, role };
}

/** Clears the auth cookie and drops the user's sockets (account deactivated). */
function evictInactiveUser(req, res, user) {
  clearJwtCookie(res);
  const socketInstance = req.app.get("socketInstance");
  if (socketInstance && user.username) {
    socketInstance.disconnectUser(user.username);
  }
}

/**
 * API auth: requires a valid cookie for an active user, else responds with JSON.
 * Usage: app.get("/protected", auth, handler)
 */
export async function auth(req, res, next) {
  if (!requireAuth) return next();

  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { payload, userId, user } = await resolveTokenUser(token);
    if (!user) {
      clearJwtCookie(res);
      return res
        .status(401)
        .json({ error: "Unauthorized", reason: "User not found" });
    }
    if (user.status === USER_STATUS.INACTIVE) {
      evictInactiveUser(req, res, user);
      return res
        .status(403)
        .json({
          error: "Account inactive",
          reason: "Your account has been deactivated",
        });
    }
    attachUser(req, { userId, user, role: payload.role });
    next();
  } catch (err) {
    return res.status(403).json({ error: "Forbidden", reason: err.name });
  }
}

/** Page auth: like `auth`, but redirects to the splash page instead of returning JSON. */
export async function authView(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.redirect("/");

  try {
    const { payload, userId, user } = await resolveTokenUser(token);
    if (!user) {
      clearJwtCookie(res);
      return res.redirect(INACTIVE_REDIRECT);
    }
    if (user.status === USER_STATUS.INACTIVE) {
      evictInactiveUser(req, res, user);
      return res.redirect(INACTIVE_REDIRECT);
    }
    attachUser(req, { userId, user, role: payload.role });
    next();
  } catch {
    return res.redirect("/");
  }
}

/**
 * Optional auth: populates req.user when a valid cookie is present but never
 * rejects anonymous requests. Inactive accounts are still logged out.
 */
export async function optionalAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();

  try {
    const { payload, userId, user } = await resolveTokenUser(token);
    if (!user) {
      clearJwtCookie(res);
      return next();
    }
    if (user.status === USER_STATUS.INACTIVE) {
      evictInactiveUser(req, res, user);
      return res.redirect(INACTIVE_REDIRECT);
    }
    attachUser(req, { userId, user, role: user.role || payload.role });
  } catch {
    // Invalid token: continue as an anonymous visitor.
  }
  next();
}

export function setAuthCookie(res, userId, username, role, expiresInHr) {
  const token = jwt.sign(
    { userId: String(userId), username, role },
    JWT_SECRET,
    {
      expiresIn: `${expiresInHr}h`,
    },
  );
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: expiresInHr * 60 * 60 * 1000,
  });
  return token;
}

export function clearAuthCookie(res) {
  clearJwtCookie(res);
  res.json({ ok: true });
}
