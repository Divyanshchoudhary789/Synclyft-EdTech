const rateLimit = require("express-rate-limit");
const { makeStore } = require("../utils/securityUtils.js");

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: "Too Many OTP requests. Please try again later!"
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: makeStore("otp"),
});


module.exports = otpLimiter;
