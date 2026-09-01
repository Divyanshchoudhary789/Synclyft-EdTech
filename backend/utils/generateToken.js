const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Short-lived access token (sent as the `token` cookie + optionally in the body
// for non-browser clients). Keep the payload minimal — role is re-checked from
// the DB only on endpoints that need fresh state.
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";

// Opaque refresh token: 7 days by default, stored only as a SHA-256 hash on the
// user document so a DB leak can't be replayed.
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7);

const generateAccessToken = (userId, role, organization) =>
    jwt.sign(
        { id: userId, role, organization: organization || undefined, typ: "access" },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );

const generateRefreshToken = () => crypto.randomBytes(48).toString("hex");

const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    ACCESS_TOKEN_TTL,
    REFRESH_TOKEN_TTL_DAYS,
    // Back-compat alias (older imports expected a single function).
    generateToken: generateAccessToken,
};
