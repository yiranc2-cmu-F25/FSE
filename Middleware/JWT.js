import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const isProd = process.env.NODE_ENV === "production";

// jwt middleware
// example useage: app.get('/protected', auth, (req, res) => { ... });
export function auth(req, res, next) {
    const token = req.cookies.jwt_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" })
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.username = payload.username;
        next();
    } catch {
        return res.status(403).json({ error: "Forbidden", reason: err.name });
    }
}

export function setAuthCookie(res, username, expiresInHr) {
    const expiresIn = `${expiresInHr}h`;
    const token = jwt.sign({ username: username }, JWT_SECRET, { expiresIn: expiresIn });

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
        secure: true, 
        sameSite: "lax", 
        path: "/" 
    });
}