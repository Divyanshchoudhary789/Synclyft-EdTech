const rateLimit = require("express-rate-limit");


const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: "Too Many OTP requests. Please try again later!"
    },
    standardHeaders: true,
    legacyHeaders: false,
});


module.exports = otpLimiter;