const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const EmailQueue = require("../models/EmailQueueModel");
const { getIO } = require("../config/socket");
const logger = require("./loggerService");

let transporter;

const getEnv = (...keys) => {
    for (const key of keys) {
        if (process.env[key]) {
            return process.env[key];
        }
    }
    return undefined;
};

const getTransporter = () => {
    if (transporter) {
        return transporter;
    }

    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const isGmailSmtp = host === "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === "true"
        : port === 465;
    const user = isGmailSmtp ? getEnv("SMTP_USER", "GMAIL_USER") : process.env.SMTP_USER;
    const pass = isGmailSmtp ? getEnv("SMTP_PASS", "GMAIL_APP_PASS") : process.env.SMTP_PASS;

    if (!user || !pass) {
        throw new Error(
            isGmailSmtp
                ? "Missing required email environment variables: SMTP_USER/SMTP_PASS or GMAIL_USER/GMAIL_APP_PASS"
                : "Missing required email environment variables: SMTP_USER and SMTP_PASS"
        );
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        family: 4,
        auth: {
            user,
            pass,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
        dnsTimeout: 10000,
        requireTLS: !secure,
        tls: {
            servername: host,
        },
    });

    return transporter;
};

const isSmtpConnectionError = (err) => {
    return ["ETIMEDOUT", "ENETUNREACH", "ECONNREFUSED", "ECONNRESET"].includes(err?.code)
        && err?.command === "CONN";
};

const getSenderEmail = () => {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const emailUser = host === "smtp.gmail.com" ? getEnv("MAIL_FROM", "GMAIL_USER") : process.env.MAIL_FROM;

    if (!emailUser) {
        throw new Error(
            host === "smtp.gmail.com"
                ? "Missing required email environment variable: MAIL_FROM or GMAIL_USER"
                : "Missing required email environment variable: MAIL_FROM"
        );
    }
    return emailUser;
};

const getAppUrl = () => {
    return process.env.FRONTEND_URL || "#";
};

const handleEmailError = (err, clientMessage) => {
    if (isSmtpConnectionError(err)) {
        logger.error(
            `Email Send Error: SMTP connection failed (${err.code}) at ${err.address || "unknown address"}:${err.port || "unknown port"}. Check env variables.`
        );
    } else {
        logger.error("Email Send Error:", err);
    }

    const emailError = new Error(clientMessage);
    emailError.cause = err;
    emailError.statusCode = 503;
    throw emailError;
};

const baseFooter = (year) => `
    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
    <p style="font-size: 13px; color: #666;">You received this email from Synclyft - EdTech platform notifications.</p>
    <p style="font-size: 12px; color: #999;">&copy; ${year} Synclyft. All rights reserved.</p>
`;

const baseStyles = `
    font-family: Arial, sans-serif;
    max-width: 620px;
    margin: auto;
    padding: 24px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: #fff;
`;

const renderButton = (url, text, color) => `
    <div style="margin: 28px 0; text-align: center;">
        <a href="${url}" style="background-color: ${color}; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: bold;">
            ${text}
        </a>
    </div>
`;

const sendMail = async (mailOptions) => {
    try {
        const result = await getTransporter().sendMail(mailOptions);
        logger.info(`Mail sent successfully: ${result.messageId} to ${mailOptions.to}`);
        return result;
    } catch (err) {
        handleEmailError(err, "Unable to send email right now. Please try again later.");
    }
};

const queueEmail = async (options) => {
    const {
        to,
        subject,
        html,
        text,
        type,
        priority = "normal",
        recipientId,
        recipientName,
        recipientRole = "student",
        templateData,
        metadata
    } = options;

    if (!to || !subject || !type) {
        throw new Error("Email queue requires: to, subject, type");
    }

    const emailUser = getSenderEmail();

    const queueDoc = await EmailQueue.create({
        to,
        from: emailUser,
        subject,
        html,
        text,
        templateData,
        type,
        priority,
        recipient: recipientId ? new mongoose.Types.ObjectId(recipientId) : undefined,
        recipientName,
        recipientRole,
        metadata
    });

    logger.info(`Email queued: ${type} to ${to} (priority: ${priority})`);
    return queueDoc;
};

const processQueuedEmail = async (queueDoc) => {
    await queueDoc.markAsProcessing();
    const emailUser = getSenderEmail();

    const mailOptions = {
        from: `"Synclyft - EdTech" <${emailUser}>`,
        to: queueDoc.to,
        replyTo: process.env.MAIL_REPLY_TO || emailUser,
        subject: queueDoc.subject,
        html: queueDoc.html,
        text: queueDoc.text,
    };

    const result = await getTransporter().sendMail(mailOptions);
    await queueDoc.markAsSent();
    logger.info(`Queued email sent: ${queueDoc.type} to ${queueDoc.to}, messageId: ${result.messageId}`);
    return result;
};

const buildLoginUrl = () => {
    const frontendUrl = process.env.FRONTEND_URL;
    return frontendUrl ? `${frontendUrl}/login` : "#";
};

const buildResetUrl = (token) => {
    const frontendUrl = process.env.FRONTEND_URL;
    return frontendUrl ? `${frontendUrl}/reset-password?token=${token}` : "#";
};

const getYear = () => new Date().getFullYear();

const sendOtpEmail = async (email, otp) => {
    const emailUser = getSenderEmail();
    const mailOptions = {
        from: `"Synclyft - EdTech" <${emailUser}>`,
        to: email,
        replyTo: process.env.MAIL_REPLY_TO || emailUser,
        subject: "Your Verification OTP - Synclyft - EdTech",
        html: `
            <div style="${baseStyles}">
                <h2 style="color: #031677; margin-top: 0;">Verification OTP</h2>
                <p style="font-size: 15px; color: #222;">Use the OTP below to verify your account:</p>
                <div style="
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 6px;
                    color: #031677;
                    margin: 20px 0;
                ">
                    ${otp}
                </div>
                <p style="font-size: 14px; color: #555;">This OTP will expire in 5 minutes.</p>
                <p style="font-size: 14px; color: #555;">If you did not request this OTP, please ignore this email.</p>
                ${baseFooter(getYear())}
            </div>
        `,
        text: `Your verification OTP is ${otp}. It will expire in 5 minutes.`,
    };

    return sendMail(mailOptions);
};

const sendWelcomeEmail = async (email, name, loginUrl) => {
    const url = loginUrl || buildLoginUrl();
    await queueEmail({
        to: email,
        subject: "Welcome to Synclyft - EdTech",
        type: "welcome",
        priority: "normal",
        recipientName: name,
        html: `
            <div style="${baseStyles}">
                <h2 style="color: #031677; margin-top: 0;">Welcome ${name || 'there'}!</h2>
                <p style="font-size: 15px; color: #222; line-height: 1.6;">Your account has been successfully created on <b>Synclyft - EdTech</b>. We are excited to have you on board.</p>
                <p style="font-size: 14px; color: #555; line-height: 1.6;">You can now log in to your dashboard using your registered email and password.</p>
                ${renderButton(url, 'Login to Dashboard', '#031677')}
                <p style="font-size: 13px; color: #666;">If the button doesn't work, copy paste this URL into your browser: ${url}</p>
                ${baseFooter(getYear())}
            </div>
        `,
        text: `Welcome to Synclyft - EdTech, ${name}! Your account has been created successfully.`,
    });
};

const sendApprovalEmail = async (email, name, organization) => {
    const loginUrl = buildLoginUrl();
    await queueEmail({
        to: email,
        subject: "Account Approved - Synclyft - EdTech",
        type: "approval",
        priority: "high",
        recipientName: name,
        html: `
            <div style="${baseStyles}">
                <h2 style="color: #4CAF50; margin-top: 0;">Hello ${name},</h2>
                <p style="font-size: 15px; color: #222; line-height: 1.6;">Great news! Your request to register as a <b>College Admin</b> for <b>${organization}</b> has been verified and <b>Approved</b> by our Super Admin team.</p>
                <p style="font-size: 14px; color: #555; line-height: 1.6;">Your institutional dashboard is now unlocked. You can log in using your registered official email address and password.</p>
                ${renderButton(loginUrl, 'Login to Dashboard', '#031677')}
                <p style="font-size: 13px; color: #666;">If the button above doesn't work, copy paste this URL into your browser: ${loginUrl}</p>
                ${baseFooter(getYear())}
            </div>
        `,
        text: `Your College Admin account for ${organization} has been approved. Login at ${loginUrl}`,
    });
};

const sendRejectionEmail = async (email, name, organization, reason) => {
    await queueEmail({
        to: email,
        subject: "Update on your College Admin Request - Synclyft - EdTech",
        type: "rejection",
        priority: "high",
        recipientName: name,
        html: `
            <div style="${baseStyles}">
                <h2 style="color: #d9534f; margin-top: 0;">Hello ${name},</h2>
                <p style="font-size: 15px; color: #222; line-height: 1.6;">Thank you for submitting your verification request as a College Admin for <b>${organization}</b>.</p>
                <p style="font-size: 14px; color: #555; line-height: 1.6;">Regrettably, your request has been <b>Declined</b> by our Super Admin team at this time due to the following reason:</p>
                <div style="background-color: #f2dede; color: #a94442; padding: 15px; border-radius: 5px; border-left: 5px solid #d9534f; margin: 20px 0; font-style: italic;">
                    "${reason || "Criteria mismatch"}"
                </div>
                <p style="font-size: 14px; color: #555; line-height: 1.6;">If you believe this was an error or want to re-apply with valid credentials, please contact our support team or try signing up again with correct details.</p>
                ${baseFooter(getYear())}
            </div>
        `,
        text: `Your College Admin request for ${organization} was declined. Reason: ${reason || "Criteria mismatch"}`,
    });
};

const sendPasswordResetEmail = async (email, name, token) => {
    const resetUrl = buildResetUrl(token);
    await queueEmail({
        to: email,
        subject: "Reset Your Password - Synclyft - EdTech",
        type: "password_reset",
        priority: "high",
        recipientName: name,
        html: `
            <div style="${baseStyles}">
                <h2 style="color: #031677; margin-top: 0;">Password Reset Request</h2>
                <p style="font-size: 15px; color: #222; line-height: 1.6;">Hello ${name || 'there'},</p>
                <p style="font-size: 14px; color: #555; line-height: 1.6;">We received a request to reset your password for your Synclyft account. Click the button below to set a new password:</p>
                ${renderButton(resetUrl, 'Reset Password', '#031677')}
                <p style="font-size: 13px; color: #666;">If the button doesn't work, copy paste this URL into your browser: ${resetUrl}</p>
                <p style="font-size: 13px; color: #d9534f;">This link will expire in 15 minutes.</p>
                <p style="font-size: 14px; color: #555;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
                ${baseFooter(getYear())}
            </div>
        `,
        text: `Reset your password using this link: ${resetUrl}. This link expires in 15 minutes.`,
    });
};

const sendEmailVerificationEmail = async (email, name, token) => {
    const appUrl = getAppUrl();
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;
    await queueEmail({
        to: email,
        subject: "Verify Your Email - Synclyft - EdTech",
        type: "email_verification",
        priority: "normal",
        recipientName: name,
        html: `
            <div style="${baseStyles}">
                <h2 style="color: #031677; margin-top: 0;">Verify Your Email</h2>
                <p style="font-size: 15px; color: #222; line-height: 1.6;">Hello ${name || 'there'},</p>
                <p style="font-size: 14px; color: #555; line-height: 1.6;">Thank you for signing up! Please verify your email address by clicking the button below:</p>
                ${renderButton(verifyUrl, 'Verify Email', '#031677')}
                <p style="font-size: 13px; color: #666;">If the button doesn't work, copy paste this URL into your browser: ${verifyUrl}</p>
                <p style="font-size: 13px; color: #d9534f;">This link will expire in 24 hours.</p>
                ${baseFooter(getYear())}
            </div>
        `,
        text: `Verify your email using this link: ${verifyUrl}. This link expires in 24 hours.`,
    });
};

const notificationSubjectMap = {
    interview_scheduled: 'Interview scheduled - Synclyft - EdTech',
    interview_completed: 'Interview completed - Synclyft - EdTech',
    result_available: 'Result available - Synclyft - EdTech',
    subscription_expiring: 'Subscription update - Synclyft - EdTech',
    subscription_expired: 'Subscription expired - Synclyft - EdTech',
    payment_due: 'Payment due - Synclyft - EdTech',
    payment_reminder: 'Payment reminder - Synclyft - EdTech',
    seat_allocated: 'Seat allocated - Synclyft - EdTech',
    seat_released: 'Seat released - Synclyft - EdTech',
    profile_update: 'Profile update - Synclyft - EdTech',
    system_alert: 'System alert - Synclyft - EdTech',
    achievement_unlocked: 'Achievement unlocked - Synclyft - EdTech',
    campaign_opened: 'New campaign available - Synclyft - EdTech',
    offer_available: 'Offer available - Synclyft - EdTech',
    deadline_approaching: 'Deadline approaching - Synclyft - EdTech',
    account_approved: 'Account approved - Synclyft - EdTech',
    account_rejected: 'Account update - Synclyft - EdTech',
    account_signup: 'Welcome to Synclyft - EdTech',
    assessment_assigned: 'New assessment assigned - Synclyft - EdTech',
    deadline_reminder: 'Deadline reminder - Synclyft - EdTech',
    performance_alert: 'Performance alert - Synclyft - EdTech',
    placement_drive_announcement: 'Placement drive announcement - Synclyft - EdTech',
    follow_up_pending: 'Follow-up reminder - Synclyft - EdTech',
    recommendation_assigned: 'New recommendation assigned - Synclyft - EdTech',
    batch_readiness_alert: 'Batch readiness alert - Synclyft - EdTech',
    declining_student_alert: 'Student performance alert - Synclyft - EdTech'
};

const sendNotificationEmail = async (email, name, notification) => {
    const appUrl = getAppUrl();
    const actionUrl = notification.actionUrl
        ? `${appUrl}${notification.actionUrl.startsWith('/') ? '' : '/'}${notification.actionUrl}`
        : appUrl;
    const subject = notificationSubjectMap[notification.type] || `Notification from Synclyft - EdTech`;

    const priorityBadge = notification.priority === 'urgent'
        ? `<span style="background-color: #d9534f; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">Urgent</span>`
        : notification.priority === 'high'
            ? `<span style="background-color: #f0ad4e; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">High</span>`
            : '';

    await queueEmail({
        to: email,
        subject,
        type: notification.type,
        priority: notification.priority === 'urgent' ? 'urgent' : notification.priority === 'high' ? 'high' : 'normal',
        recipientName: name,
        html: `
            <div style="${baseStyles}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h2 style="margin: 0; color: #031677;">Hello ${name || 'there'},</h2>
                    ${priorityBadge}
                </div>
                <p style="font-size: 15px; color: #222; line-height: 1.6;">${notification.message}</p>
                ${notification.description ? `<p style="font-size: 14px; color: #555; line-height: 1.6;">${notification.description}</p>` : ''}
                ${notification.actionUrl ? renderButton(actionUrl, notification.actionText || 'Open in Dashboard', '#031677') : ''}
                <p style="font-size: 12px; color: #6b7280;">Priority: ${notification.priority || 'normal'}</p>
                ${baseFooter(getYear())}
            </div>
        `,
        text: `${notification.message}${notification.description ? ' ' + notification.description : ''}`,
    });
};

const getEmailQueueStats = async () => {
    return EmailQueue.getQueueStats();
};

const getEmailsByStatus = async (status, limit = 50) => {
    return EmailQueue.find({ status })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

module.exports = {
    sendMail,
    queueEmail,
    processQueuedEmail,
    sendOtpEmail,
    sendWelcomeEmail,
    sendApprovalEmail,
    sendRejectionEmail,
    sendPasswordResetEmail,
    sendEmailVerificationEmail,
    sendNotificationEmail,
    getEmailQueueStats,
    getEmailsByStatus,
    getTransporter
};
