const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");

const User = require("../models/userModel.js");
const Otp = require("../models/otpModel.js");
const {
    sendPasswordResetEmail
} = require("../services/emailService.js");
const sendError = require("../utils/sendError.js");

const normalizeEmail = (email) => email.trim().toLowerCase();
const isDevelopment = process.env.NODE_ENV === "development";

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required!" });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If an account exists with this email, you will receive a password reset link shortly."
            });
        }

        if (user.status === "Rejected") {
            return res.status(403).json({ message: "This account has been rejected." });
        }

        const existingOtp = await Otp.findOne({
            email: normalizedEmail,
            type: "password_reset",
            expiresAt: { $gt: new Date() }
        });

        if (existingOtp && Date.now() - existingOtp.createdAt.getTime() < 30000) {
            return res.status(429).json({ message: "Wait 30 seconds before requesting another reset link" });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = await bcrypt.hash(resetToken, 12);

        await Otp.deleteMany({ email: normalizedEmail, type: "password_reset" });

        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 15);

        await Otp.create({
            email: normalizedEmail,
            otp: hashedToken,
            type: "password_reset",
            payload: { userId: user._id.toString() },
            expiresAt: expiry,
        });

        try {
            await sendPasswordResetEmail(normalizedEmail, user.name, resetToken);
        } catch (emailErr) {
            await Otp.deleteMany({ email: normalizedEmail, type: "password_reset" });
            logger.warn("Password reset email failed:", emailErr);
            return res.status(503).json({ message: "Unable to send reset email. Please try again later." });
        }

        return res.status(200).json({
            success: true,
            message: "If an account exists with this email, you will receive a password reset link shortly."
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: "Token and new password are required!" });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long." });
        }

        const otpDocs = await Otp.find({
            type: "password_reset",
            expiresAt: { $gt: new Date() }
        });

        let matchedDoc = null;
        for (const doc of otpDocs) {
            const isValid = await bcrypt.compare(token, doc.otp);
            if (isValid) {
                matchedDoc = doc;
                break;
            }
        }

        if (!matchedDoc) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        const user = await User.findById(matchedDoc.payload.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.status === "Rejected") {
            return res.status(403).json({ message: "This account has been rejected." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        user.password = hashedPassword;
        await user.save();

        await Otp.deleteMany({ email: user.email, type: "password_reset" });

        return res.status(200).json({
            success: true,
            message: "Password reset successful. You can now log in with your new password."
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            return res.status(400).json({ message: "Token is required" });
        }

        const otpDocs = await Otp.find({
            type: "password_reset",
            expiresAt: { $gt: new Date() }
        });

        let isValid = false;
        for (const doc of otpDocs) {
            const match = await bcrypt.compare(token, doc.otp);
            if (match) {
                isValid = true;
                break;
            }
        }

        return res.status(200).json({
            success: true,
            valid: isValid,
            message: isValid ? "Token is valid" : "Token is invalid or expired"
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

module.exports = {
    forgotPassword,
    resetPassword,
    verifyResetToken
};
