const jwt = require("jsonwebtoken");
const logger = require("../services/loggerService.js");


const isAuthenticated = async (req, res, next) => {
    try {

        const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;

        if (!token) {
            return res.status(401).json({ message: "Please Login!" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        res.status(401).json({ message: "Unauthorized, Access Denied!" });
    }
}


module.exports = isAuthenticated;