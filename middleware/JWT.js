import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
import User from "../entities/User.js";
import { USER_STATUS } from "../constants/userStatus.js";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const isProd = process.env.NODE_ENV === "production";
const requireAuth = process.env.REQUIRE_AUTH !== "false";

// jwt middleware
// example useage: app.get('/protected', auth, (req, res) => { ... });

export async function auth(req, res, next) {
    if (!requireAuth) {
        next();
        return;
    }

    const token = req.cookies.jwt_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" })
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const userId = String(payload.userId ?? payload.sub ?? "");
        
        // Check user status from database (not JWT) - status can change anytime
        const user = await User.findById(userId);
        if (!user) {
            res.clearCookie("jwt_token", { 
                httpOnly: true, 
                secure: isProd, 
                sameSite: "lax",
                path: "/" 
            });
            return res.status(401).json({ error: "Unauthorized", reason: "User not found" });
        }
        
        const userObj = user.toObject ? user.toObject() : user;
        
        // If user is inactive, logout and return error
        if (userObj.status === USER_STATUS.INACTIVE) {
            res.clearCookie("jwt_token", { 
                httpOnly: true, 
                secure: isProd, 
                sameSite: "lax",
                path: "/" 
            });
            
            // Disconnect socket if available
            const socketInstance = req.app.get("socketInstance");
            if (socketInstance && userObj.username) {
                socketInstance.disconnectUser(userObj.username);
            }
            
            return res.status(403).json({ error: "Account inactive", reason: "Your account has been deactivated" });
        }
        
        req.username = userObj.username; // Use database username (not JWT)
        req.userId = userId;
        req.role = userObj.role; // Use database role (not JWT)
        req.user = { id: userId, username: userObj.username, role: userObj.role };
        next();
    } catch (err){
        return res.status(403).json({ error: "Forbidden", reason: err.name });
    }
}


export async function authView(req, res, next) {
  const token = req.cookies.jwt_token;
  if (!token) return res.redirect("/");

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = String(payload.userId ?? payload.sub ?? "");
    
    // Check user status from database (not JWT) - status can change anytime
    const user = await User.findById(userId);
    if (!user) {
      // User not found, clear cookie and redirect
      res.clearCookie("jwt_token", { 
        httpOnly: true, 
        secure: isProd, 
        sameSite: "lax",
        path: "/" 
      });
      return res.redirect("/?inactive=true");
    }
    
    const userObj = user.toObject ? user.toObject() : user;
    
    // If user is inactive, logout and redirect to splash page with error modal
    if (userObj.status === USER_STATUS.INACTIVE) {
      res.clearCookie("jwt_token", { 
        httpOnly: true, 
        secure: isProd, 
        sameSite: "lax",
        path: "/" 
      });
      
      // Disconnect socket if available
      const socketInstance = req.app.get("socketInstance");
      if (socketInstance && userObj.username) {
        socketInstance.disconnectUser(userObj.username);
      }
      
      return res.redirect("/?inactive=true");
    }
    
    req.username = userObj.username; // Use database username (not JWT)
    req.userId = userId;
    req.role = userObj.role; // Use database role (not JWT)
    req.user = { id: userId, username: userObj.username, role: userObj.role };
    next();
  } catch (err) {
    return res.redirect("/");
  }
}

export function setAuthCookie(res, userId, username, role, expiresInHr) {
    const expiresIn = `${expiresInHr}h`;
    const token = jwt.sign(
        { userId: String(userId), username, role },
        JWT_SECRET,
        { expiresIn }
    );
    res.cookie("jwt_token", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "lax" : "lax",
        maxAge: expiresInHr * 60 * 60 * 1000,
        path: "/",
    });

    return token;
}

export function clearAuthCookie(res) {
    res.clearCookie("jwt_token", { 
        httpOnly: true, 
        secure: isProd, 
        sameSite: isProd ? "lax" : "lax",
        path: "/" 
    });
    res.json({ ok: true });
}

// Optional auth middleware - sets req.userId if token exists, but doesn't require it
export function optionalAuth(req, res, next) {
    const token = req.cookies.jwt_token;
    if (!token) {
        // No token, continue without user info
        next();
        return;
    }
    
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const userId = String(payload.userId ?? payload.sub ?? "");
        req.username = payload.username;
        req.userId = userId;
        req.role = payload.role;
        req.user = { id: userId, username: payload.username, role: payload.role };
    } catch (err) {
        // Invalid token, continue without user info
        // Don't set req.userId
    }
    
    next();
}