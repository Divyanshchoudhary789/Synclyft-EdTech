const rateLimit = require("express-rate-limit");

const submissionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 min window
    max: 10,
    message: {
        success: false,
        message: "Too many submissions. Please slow down!"
    },
    standardHeaders: true,
    legacyHeaders: false,
});


module.exports = submissionLimiter;