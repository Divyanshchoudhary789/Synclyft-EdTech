const User = require("../models/userModel");


const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(500).json({ message: "User Context Missing" });
        }

        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({
                message: `Role (${user.role}) is not allowed to access this resource.`
            });
        }

        next();
    }
}

module.exports = authorizeRoles;