const sendError = require("../utils/sendError");
const logger = require("../services/loggerService.js");


const uploadValidation = (req, res, next) => {
    try {

        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No File Uploaded!" });
        }

        next();

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}


module.exports = uploadValidation;