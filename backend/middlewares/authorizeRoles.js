const User = require("../models/userModel");

/**
 * Role gate. The access-token JWT carries a fresh `role` (re-signed on every
 * refresh from the DB), so the common path is a cheap in-memory check with no
 * DB round-trip. For `college-admin` we additionally confirm the account is
 * still Approved, since a Pending/Rejected admin must not reach protected data.
 */
const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required." });
        }

        const role = req.user.role;
        if (!role || !allowedRoles.includes(role)) {
            return res.status(403).json({
                message: `Your account (${role || "unknown"}) is not allowed to access this resource.`,
            });
        }

        if (role === "college-admin") {
            const user = await User.findById(req.user.id).select("role status").lean();
            if (!user) return res.status(404).json({ message: "User not found!" });
            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({ message: "Your role has changed. Please sign in again." });
            }
            if (user.status && user.status !== "Approved") {
                return res.status(403).json({ message: "Your college account is not active." });
            }
        }

        next();
    };
};

module.exports = authorizeRoles;
