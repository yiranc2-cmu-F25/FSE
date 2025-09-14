require('dotenv').config();

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;


// jwt middleware
// example useage: app.get('/protected', auth, (req, res) => { ... });
function auth(req, res, next) {
    const token = req.cookies.jwt_token;
    if (!token) return res.send("Unauthorized");

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.username = payload.username;
        next();
    } catch {
        return res.send("Forbidden");
    }
}

// helper function to sign a new token
// example useage: signToken(username, 2);
function signToken(username, expiresInHr) {
    const expiresIn = `${expiresInHr}h`;
    const token = jwt.sign({ username: username }, JWT_SECRET, { expiresIn: expiresIn });
    return token;
}

module.exports = { auth, signToken };
