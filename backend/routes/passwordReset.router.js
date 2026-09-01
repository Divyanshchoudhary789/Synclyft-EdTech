const express = require("express");
const passwordResetRouter = express.Router();
const otpLimiter = require("../middlewares/rateLimiter.js");
const { validate } = require("../middlewares/validationMiddleware.js");
const { passwordResetSchemas } = require("../utils/validationSchemas.js");

const {
    forgotPassword,
    resetPassword,
    verifyResetToken
} = require("../controllers/passwordResetController.js");

passwordResetRouter.post("/forgot", otpLimiter, validate(passwordResetSchemas.forgotPassword, 'body'), forgotPassword);
passwordResetRouter.post("/reset", validate(passwordResetSchemas.resetPassword, 'body'), resetPassword);
passwordResetRouter.get("/verify/:token", validate(passwordResetSchemas.verifyToken, 'params'), verifyResetToken);

module.exports = passwordResetRouter;
