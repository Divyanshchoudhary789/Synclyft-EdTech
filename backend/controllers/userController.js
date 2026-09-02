const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const crypto = require("crypto");

const User = require("../models/userModel.js");
const Otp = require("../models/otpModel.js");
const StudentProfile = require("../models/StudentProfileModel.js");
const Organization = require("../models/OrganizationModel.js");
const NotificationPreference = require("../models/NotificationPreferenceModel.js");
const NotificationService = require("../services/notificationService");

const generateOtp = require("../utils/generateOtp.js");
const {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    REFRESH_TOKEN_TTL_DAYS,
} = require("../utils/generateToken.js");
const { sendOtpEmail, sendWelcomeEmail } = require("../services/emailService.js");
const sendError = require("../utils/sendError.js");
const logger = require("../services/loggerService.js");

const normalizeEmail = (email) => email.trim().toLowerCase();
const isDevelopment = process.env.NODE_ENV === "development";

const ACCESS_COOKIE_MS = 15 * 60 * 1000;
const REFRESH_COOKIE_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

const baseCookie = {
    httpOnly: true,
    secure: !isDevelopment,
    sameSite: isDevelopment ? "lax" : "none",
};

const setAuthCookie = (res, token) => {
    res.cookie("token", token, { ...baseCookie, maxAge: ACCESS_COOKIE_MS });
};

const setRefreshCookie = (res, token) => {
    // Scoped to /api/auth so it is only sent to refresh / logout endpoints.
    res.cookie("refreshToken", token, { ...baseCookie, path: "/api/auth", maxAge: REFRESH_COOKIE_MS });
};

const clearAuthCookies = (res) => {
    res.cookie("token", "", { ...baseCookie, expires: new Date(0) });
    res.cookie("refreshToken", "", { ...baseCookie, path: "/api/auth", expires: new Date(0) });
};

/**
 * Issues a fresh access + refresh token pair, persists the hashed refresh token
 * on the user document (single active session per user — a new login or refresh
 * invalidates older refresh tokens) and sets both cookies.
 * Returns the access token for callers that also echo it in the response body.
 */
const issueSession = async (res, user) => {
    const accessToken = generateAccessToken(user._id, user.role, user.organization);
    const refreshToken = generateRefreshToken();
    await User.updateOne({ _id: user._id }, { $set: { refreshToken: hashToken(refreshToken) } });
    setAuthCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);
    return accessToken;
};

// Validates account status before authentication. A suspended account is blocked
// for every role; college-admins additionally need Super-Admin approval.
const checkUserStatus = (user, res) => {
    if (user.status === 'Suspended') {
        return res.status(403).json({ message: "Your account has been suspended. Contact support for help." });
    }
    if (user.role === 'college-admin') {
        if (user.status === 'Pending') {
            return res.status(403).json({ message: "Your account is awaiting approval from the Super Admin." });
        }
        if (user.status === 'Rejected') {
            return res.status(403).json({ message: "Your registration request was rejected by the Super Admin." });
        }
    }
    return null;
};

const handleOAuthUserCreation = async (req, res, oauthDetails) => {
    try {
        const { email, name, oauthId, profilePic, provider } = oauthDetails;

        let query = {};
        if (provider === "google") query = { googleId: oauthId };
        if (provider === "linkedin") query = { linkedinId: oauthId };
        if (provider === "github") query = { githubId: oauthId };

        let user = await User.findOne(query);
        let isNewUser = false;

        if (!user) {
            user = await User.findOne({ email: email });

            if (user) {
                if (provider === "google") user.googleId = oauthId;
                if (provider === "linkedin") user.linkedinId = oauthId;
                if (provider === "github") user.githubId = oauthId;
                user.isEmailVerified = true;
                await user.save();
            } else {
                isNewUser = true;
                const randomPassword = crypto.randomBytes(16).toString("hex");
                const hashedPassword = await bcrypt.hash(randomPassword, 12);

                const userFields = {
                    name: name.trim(),
                    email: email,
                    password: hashedPassword,
                    role: "student",
                    isEmailVerified: true,
                    profilePicture: profilePic,
                    organization: "Enter Organization Name",
                    status: "Approved"
                };

                if (provider === "google") userFields.googleId = oauthId;
                if (provider === "linkedin") userFields.linkedinId = oauthId;
                if (provider === "github") userFields.githubId = oauthId;

                user = await User.create(userFields);
                await StudentProfile.create({ user: user._id });
                await NotificationPreference.create({ user: user._id });
                const loginUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : "#";
                sendWelcomeEmail(user.email, user.name, loginUrl).catch(() => { });
            }
        }

        // Intercept unauthorized access attempts from restricted accounts
        const statusError = checkUserStatus(user, res);
        if (statusError) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(statusError.message)}`);
        }

        await issueSession(res, user);

        if (req.logout) {
            req.logout((err) => { if (err) logger.error("Session logout error:", err); });
        }

        // OAuth is a browser navigation, not an XHR — redirect back to the app.
        // New students land on onboarding; returning users on their dashboard.
        const base = process.env.FRONTEND_URL || "http://localhost:3000";
        const dest = isNewUser ? "/onboarding" : "/dashboard";
        return res.redirect(`${base}${dest}`);

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=${encodeURIComponent("Sign-in failed. Please try again.")}`);
    }
};

const googleAuthCallback = async (req, res) => {
    if (!req.user) return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);

    const oauthDetails = {
        email: normalizeEmail(req.user.emails[0].value),
        name: req.user.displayName,
        oauthId: req.user.id,
        profilePic: req.user.photos && req.user.photos.length > 0 ? req.user.photos[0].value : "",
        provider: "google"
    };

    return handleOAuthUserCreation(req, res, oauthDetails);
};

const linkedinAuthCallback = async (req, res) => {
    if (!req.user) return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);

    const oauthDetails = {
        email: normalizeEmail(req.user.emails[0].value),
        name: req.user.displayName,
        oauthId: req.user.id,
        profilePic: req.user.photos && req.user.photos.length > 0 ? req.user.photos[0].value : "",
        provider: "linkedin"
    };

    return handleOAuthUserCreation(req, res, oauthDetails);
};

const githubAuthCallback = async (req, res) => {
    if (!req.user) return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);

    const oauthDetails = {
        email: req.user.emails && req.user.emails.length > 0 ? normalizeEmail(req.user.emails[0].value) : "",
        name: req.user.displayName || req.user.username,
        oauthId: req.user.id,
        profilePic: req.user.photos && req.user.photos.length > 0 ? req.user.photos[0].value : (req.user._json && req.user._json.avatar_url) || "",
        provider: "github"
    };

    return handleOAuthUserCreation(req, res, oauthDetails);
};

const sendLoginOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required!" });

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) return res.status(404).json({ message: "User not found!" });

        const statusError = checkUserStatus(user, res);
        if (statusError) return res.status(statusError.status).json({ message: statusError.message });

        // Rate limiting enforcement for OTP generation intervals
        const existingOtp = await Otp.findOne({ email: user.email, type: "login" });
        if (existingOtp && Date.now() - existingOtp.createdAt.getTime() < 30000) {
            return res.status(429).json({ message: "Wait 30 seconds before requesting another OTP" });
        }

        const otp = generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 12);

        await Otp.deleteMany({ email: user.email, type: "login" });

        const otpDoc = await Otp.create({
            email: user.email,
            otp: hashedOtp,
            type: "login",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        try {
            await sendOtpEmail(user.email, otp);
        } catch (err) {
            await Otp.deleteOne({ _id: otpDoc._id });
            throw err;
        }

        return res.status(200).json({ message: "OTP sent Successfully" });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const verifyLoginOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: "Email and otp are required!" });

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(404).json({ message: "User not found!" });

        const otpDoc = await Otp.findOne({ email: user.email, type: "login" });
        if (!otpDoc) return res.status(400).json({ message: "OTP Expired!" });

        const isValid = await bcrypt.compare(otp, otpDoc.otp);
        if (!isValid) return res.status(400).json({ message: "Invalid OTP" });

        await Otp.deleteOne({ _id: otpDoc._id });

        const accessToken = await issueSession(res, user);

        return res.status(200).json({ success: true, message: "Login Successful", user, token: accessToken });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const loginUsingPass = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Both Email and Password are required!" });

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail }).select("+password");
        if (!user) return res.status(404).json({ message: "User not found!" });

        const statusError = checkUserStatus(user, res);
        if (statusError) return statusError;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(400).json({ message: "Invalid Password." });

        user.password = undefined;
        const accessToken = await issueSession(res, user);

        return res.status(200).json({ success: true, message: "Login Successful.", user, token: accessToken });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const logout = async (req, res) => {
    try {
        const rt = req.cookies?.refreshToken;
        if (rt) {
            // Best-effort: invalidate the stored refresh token so it can't be replayed.
            await User.updateOne({ refreshToken: hashToken(rt) }, { $unset: { refreshToken: 1 } });
        }
        clearAuthCookies(res);
        return res.status(200).json({ success: true, message: "Logged Out Successfully" });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

/**
 * Rotates the refresh token and issues a new access token.
 * Reads the httpOnly `refreshToken` cookie, matches its hash against a user,
 * then replaces it (rotation). A missing/unknown token clears cookies + 401.
 */
const refreshAccessToken = async (req, res) => {
    try {
        const rt = req.cookies?.refreshToken;
        if (!rt) {
            clearAuthCookies(res);
            return res.status(401).json({ success: false, message: "No refresh token" });
        }

        const user = await User.findOne({ refreshToken: hashToken(rt) }).select("+refreshToken");
        if (!user) {
            clearAuthCookies(res);
            return res.status(401).json({ success: false, message: "Session expired, please log in again" });
        }

        const statusError = checkUserStatus(user, res);
        if (statusError) return statusError;

        const accessToken = await issueSession(res, user);
        return res.status(200).json({ success: true, message: "Token refreshed", token: accessToken });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User Not Found!" });

        return res.status(200).json({ message: "User Fetched Successfully", user });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

/**
 * Changes the signed-in user's password. Verifies the current password, sets the
 * new hash, and rotates the refresh token so other sessions are logged out.
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current and new password are required." });
        }
        if (String(newPassword).length < 8) {
            return res.status(400).json({ message: "New password must be at least 8 characters." });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({ message: "New password must be different from the current one." });
        }

        const user = await User.findById(req.user.id).select("+password");
        if (!user) return res.status(404).json({ message: "User not found." });
        if (!user.password) {
            return res.status(400).json({ message: "This account signs in with a social provider and has no password to change." });
        }

        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok) return res.status(400).json({ message: "Current password is incorrect." });

        user.password = await bcrypt.hash(newPassword, 12);
        user.refreshToken = undefined; // invalidate every other session
        await user.save();

        // Re-issue this session so the caller stays signed in.
        const accessToken = await issueSession(res, user);

        return res.status(200).json({ success: true, message: "Password updated. Other devices have been signed out.", token: accessToken });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

/**
 * Re-sends an OTP for an in-progress signup or login by regenerating just the
 * code and keeping the existing OTP doc's payload. Lets the client resend
 * without re-collecting (and re-storing) the password.
 */
const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const type = req.body.type === "login" ? "login" : "Signup";
        if (!email) return res.status(400).json({ message: "Email is required!" });

        const normalizedEmail = normalizeEmail(email);
        const existing = await Otp.findOne({ email: normalizedEmail, type });
        if (!existing) {
            return res.status(400).json({ message: "No pending verification. Please start again." });
        }
        // updatedAt moves on every resend, so this throttles each resend by 30s.
        const lastTouched = (existing.updatedAt || existing.createdAt).getTime();
        if (Date.now() - lastTouched < 30000) {
            return res.status(429).json({ message: "Wait 30 seconds before requesting another OTP" });
        }

        const otp = generateOtp();
        existing.otp = await bcrypt.hash(otp, 12);
        existing.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await existing.save();

        try {
            await sendOtpEmail(normalizedEmail, otp);
        } catch (err) {
            throw err;
        }

        return res.status(200).json({ success: true, message: "OTP resent successfully" });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const sendSignupOtpForStudent = async (req, res) => {
    try {
        const { name, email, organization, password } = req.body;
        if (!name || !email || !password || !organization) {
            return res.status(400).json({ message: "All Fields are required!" });
        }

        const normalizedEmail = normalizeEmail(email);
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) return res.status(400).json({ message: "Email is Already Used!" });

        const existingOtp = await Otp.findOne({ email: normalizedEmail, type: "Signup" });
        if (existingOtp && Date.now() - existingOtp.createdAt.getTime() < 30000) {
            return res.status(429).json({ message: "Wait 30 seconds before requesting another OTP" });
        }

        const otp = generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 12);
        const hashedPassword = await bcrypt.hash(password, 12);

        await Otp.deleteMany({ email: normalizedEmail, type: "Signup" });

        const otpDoc = await Otp.create({
            email: normalizedEmail,
            otp: hashedOtp,
            type: "Signup",
            payload: { name: name.trim(), role: "student", password: hashedPassword, organization },
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        try {
            await sendOtpEmail(normalizedEmail, otp);
        } catch (err) {
            await Otp.deleteOne({ _id: otpDoc._id });
            throw err;
        }

        return res.status(200).json({ success: true, message: "OTP sent Successfully" });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const verifySignupOtpForStudent = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required!" });

        const normalizedEmail = normalizeEmail(email);
        const otpDoc = await Otp.findOne({ email: normalizedEmail, type: "Signup" });
        if (!otpDoc) return res.status(400).json({ message: "OTP Expired!" });

        const isValid = await bcrypt.compare(otp, otpDoc.otp);
        if (!isValid) return res.status(400).json({ success: false, message: "Invalid OTP" });

        const user = await User.create({
            name: otpDoc.payload.name,
            email: normalizedEmail,
            role: otpDoc.payload.role,
            password: otpDoc.payload.password,
            organization: otpDoc.payload.organization,
            status: "Approved",
            isEmailVerified: true
        });

        await StudentProfile.create({ user: user._id });
        await NotificationPreference.create({ user: user._id });
        const loginUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : "#";
        sendWelcomeEmail(user.email, user.name, loginUrl).catch(() => { });

        await Otp.deleteOne({ _id: otpDoc._id });

        const accessToken = await issueSession(res, user);

        return res.status(201).json({ success: true, message: "Account Created Successfully", user, token: accessToken });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const sendSignupOtpForCollegeAdmin = async (req, res) => {
    try {
        const { name, email, organization, password } = req.body;
        if (!name || !email || !organization || !password) {
            return res.status(400).json({ message: "All Fields are required!" });
        }

        const normalizedEmail = normalizeEmail(email);
        const emailDomain = normalizedEmail.split("@")[1];
        const forbiddenDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "live.com"];

        // Explicit restriction of commercial public domains for domain compliance
        if (forbiddenDomains.includes(emailDomain)) {
            return res.status(400).json({
                message: "Personal email addresses are not permitted for College Admin registration. Please use your official email ID."
            });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) return res.status(400).json({ message: "Email is Already Used!" });

        const existingOtp = await Otp.findOne({ email: normalizedEmail, type: "Signup" });
        if (existingOtp && Date.now() - existingOtp.createdAt.getTime() < 30000) {
            return res.status(429).json({ message: "Wait 30 seconds before requesting another OTP" });
        }

        const otp = generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 12);
        const hashedPassword = await bcrypt.hash(password, 12);

        await Otp.deleteMany({ email: normalizedEmail, type: "Signup" });

        const otpDoc = await Otp.create({
            email: normalizedEmail,
            otp: hashedOtp,
            type: "Signup",
            payload: { name: name.trim(), role: "college-admin", password: hashedPassword, collegeDomain: emailDomain, organization },
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        try {
            await sendOtpEmail(normalizedEmail, otp);
        } catch (err) {
            await Otp.deleteOne({ _id: otpDoc._id });
            throw err;
        }

        return res.status(200).json({ success: true, message: "OTP sent Successfully" });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const verifySignupOtpForCollegeAdmin = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required!" });

        const normalizedEmail = normalizeEmail(email);
        const otpDoc = await Otp.findOne({ email: normalizedEmail, type: "Signup" });
        if (!otpDoc) return res.status(400).json({ message: "OTP Expired!" });

        const isValid = await bcrypt.compare(otp, otpDoc.otp);
        if (!isValid) return res.status(400).json({ success: false, message: "Invalid OTP" });

        // Account is generated with default 'Pending' state enforced via schema hooks
        const user = await User.create({
            name: otpDoc.payload.name,
            email: normalizedEmail,
            role: otpDoc.payload.role,
            password: otpDoc.payload.password,
            isEmailVerified: true,
            collegeDomain: otpDoc.payload.collegeDomain,
            organization: otpDoc.payload.organization
        });

        await NotificationPreference.create({ user: user._id });
        const loginUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : "#";
        sendWelcomeEmail(user.email, user.name, loginUrl).catch(() => { });

        await Organization.findOneAndUpdate(
            { user: user._id },
            {
                $setOnInsert: {
                    user: user._id,
                    organizationName: otpDoc.payload.organization,
                    organizationType: "college",
                    primaryContactPerson: {
                        name: otpDoc.payload.name,
                        email: normalizedEmail
                    },
                    status: "pending_verification"
                }
            },
            { upsert: true, new: true }
        );

        await Otp.deleteOne({ _id: otpDoc._id });

        return res.status(201).json({
            success: true,
            message: "OTP Verification successful! Your account is created and pending approval from the Super Admin."
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};



module.exports = {
    googleAuthCallback, linkedinAuthCallback, githubAuthCallback,
    loginUsingPass, sendLoginOtp, verifyLoginOtp, logout, refreshAccessToken, getCurrentUser, resendOtp, changePassword,
    sendSignupOtpForStudent, verifySignupOtpForStudent,
    sendSignupOtpForCollegeAdmin, verifySignupOtpForCollegeAdmin
};
