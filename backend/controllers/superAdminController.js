const { sendApprovalEmail, sendRejectionEmail } = require("../services/emailService.js");
const NotificationService = require("../services/notificationService");
const sendError = require("../utils/sendError");
const logger = require("../services/loggerService.js");
const User = require("../models/userModel.js");
const Organization = require("../models/OrganizationModel.js");
const Subscription = require("../models/SubscriptionModel.js");
const SeatManagement = require("../models/SeatManagementModel.js");
const Billing = require("../models/BillingModel.js");
const StudentProfile = require("../models/StudentProfileModel.js");
const AuditLog = require("../models/AuditLogModel.js");

const buildPagination = (query) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    return { page, limit, skip: (page - 1) * limit };
};

const escapeCsvValue = (value) => {
    if (value === null || value === undefined) {
        return '';
    }

    const normalized = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
};

const buildAuditLogQuery = (query) => {
    const auditQuery = {};

    if (query.userId) auditQuery.user = query.userId;
    if (query.userEmail) auditQuery.userEmail = query.userEmail;
    if (query.userRole) auditQuery.userRole = query.userRole;
    if (query.action) auditQuery.action = query.action;
    if (query.resourceType) auditQuery.resourceType = query.resourceType;
    if (query.resourceId) auditQuery.resourceId = query.resourceId;
    if (query.status) auditQuery.status = query.status;
    if (query.method) auditQuery.method = query.method;
    if (query.search) {
        const searchRegex = { $regex: query.search, $options: 'i' };
        auditQuery.$or = [
            { userEmail: searchRegex },
            { action: searchRegex },
            { resourceType: searchRegex },
            { endpoint: searchRegex },
            { errorMessage: searchRegex }
        ];
    }

    if (query.from || query.to) {
        auditQuery.timestamp = {};
        if (query.from) {
            auditQuery.timestamp.$gte = new Date(query.from);
        }
        if (query.to) {
            auditQuery.timestamp.$lte = new Date(query.to);
        }
    }

    if (query.hasSensitiveData !== undefined) {
        auditQuery.hasSensitiveData = query.hasSensitiveData === 'true';
    }

    return auditQuery;
};

const getPendingCollegeAdmins = async (req, res) => {
    try {
        const { page, limit, skip } = buildPagination(req.query);
        const pendingQuery = { role: "college-admin", status: "Pending" };

        const pendingCollegeAdmins = await User.find(pendingQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(pendingQuery);

        return res.status(200).json({
            success: true,
            message: "Pending College Admins Requests Fetched Successfully!",
            pendingCollegeAdmins,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}


const approveCollegeAdmin = async (req, res) => {
    try {

        const { id } = req.params;

        const collegeAdmin = await User.findById(id);
        if (!collegeAdmin) {
            return res.status(404).json({ message: "College Admin not found!" });
        }

        if (collegeAdmin.status === "Approved") {
            return res.status(400).json({ message: "College Admin is Already Approved." });
        }

        collegeAdmin.status = "Approved";
        collegeAdmin.approvedAt = Date.now();
        await collegeAdmin.save();

        await Organization.findOneAndUpdate(
            { user: collegeAdmin._id },
            {
                $setOnInsert: {
                    user: collegeAdmin._id,
                    organizationName: collegeAdmin.organization,
                    organizationType: "college",
                    primaryContactPerson: {
                        name: collegeAdmin.name,
                        email: collegeAdmin.email
                    },
                    status: "pending_verification"
                }
            },
            { upsert: true, new: true }
        );

        try {
            await sendApprovalEmail(collegeAdmin.email, collegeAdmin.name, collegeAdmin.organization);
        } catch (emailErr) {
            logger.warn("Approval email queuing failed but user approved:", emailErr);
        }

        try {
            await NotificationService.dispatch({
                recipient: collegeAdmin._id,
                recipientRole: 'college-admin',
                type: 'account_approved',
                title: 'Account Approved',
                message: `Your account has been approved by the Super Admin.`,
                actionUrl: '/dashboard',
                actionText: 'Go to Dashboard',
                priority: 'high',
                channels: { inApp: true, email: true }
            });
        } catch (notifErr) {
            logger.warn("In-app notification failed:", notifErr);
        }

        return res.status(200).json({
            success: true,
            message: `College Admin account for ${collegeAdmin.name} has been successfully approved.`
        });


    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}



const rejectCollegeAdmin = async (req, res) => {
    try {

        const { id } = req.params;
        const { reason } = req.body;

        const collegeAdmin = await User.findById(id);
        if (!collegeAdmin) {
            return res.status(404).json({ message: "College Admin not found!" });
        }

        if (collegeAdmin.role !== "college-admin") {
            return res.status(400).json({ message: "Provided user is not a College Admin." });
        }

        if (collegeAdmin.status === "Rejected") {
            return res.status(400).json({ message: "College Admin is already rejected." });
        }

        if (collegeAdmin.status === "Approved") {
            return res.status(400).json({ message: "Cannot reject an already approved College Admin." });
        }

        collegeAdmin.status = "Rejected";
        await collegeAdmin.save();

        await AuditLog.logAction({
            user: req.user.id,
            userEmail: req.user.email || "system",
            userRole: "super-admin",
            action: "ADMIN_ACTION",
            resourceType: "user",
            resourceId: collegeAdmin._id,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            endpoint: req.path,
            method: req.method,
            statusCode: 200,
            details: { decision: "rejected", reason: reason || "Criteria mismatch" }
        });

        try {
            await sendRejectionEmail(collegeAdmin.email, collegeAdmin.name, collegeAdmin.organization, reason || "Criteria mismatch");
        } catch (emailErr) {
            logger.warn("Rejection email queuing failed but user rejected:", emailErr);
        }

        try {
            await NotificationService.dispatch({
                recipient: collegeAdmin._id,
                recipientRole: 'college-admin',
                type: 'account_rejected',
                title: 'Account Rejected',
                message: `Your account registration has been rejected.${reason ? ' Reason: ' + reason : ''}`,
                actionUrl: '/login',
                actionText: 'Back to Login',
                priority: 'high',
                channels: { inApp: true, email: true }
            });
        } catch (notifErr) {
            logger.warn("In-app notification failed:", notifErr);
        }

        return res.status(200).json({
            success: true,
            message: `College Admin account for ${collegeAdmin.name} has been rejected.`
        });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}

const getPlatformOverview = async (req, res) => {
    try {
        const [students, collegeAdmins, superAdmins, pendingAdmins, organizations, activeSubscriptions, invoices, completedInvoices, seatManagementRecords] = await Promise.all([
            User.countDocuments({ role: "student" }),
            User.countDocuments({ role: "college-admin" }),
            User.countDocuments({ role: "super-admin" }),
            User.countDocuments({ role: "college-admin", status: "Pending" }),
            Organization.countDocuments({}),
            Subscription.countDocuments({ status: "active" }),
            Billing.countDocuments({}),
            Billing.countDocuments({ paymentStatus: "completed" }),
            SeatManagement.find({})
        ]);

        const totalSeats = seatManagementRecords.reduce((sum, record) => sum + (record.totalSeatsAllocated || 0), 0);
        const usedSeats = seatManagementRecords.reduce((sum, record) => sum + (record.usedSeats || 0), 0);
        const verifiedProfiles = await StudentProfile.countDocuments({ placementReadinessScore: { $gt: 0 } });

        return res.status(200).json({
            success: true,
            message: "Platform overview fetched successfully.",
            data: {
                users: { students, collegeAdmins, superAdmins, pendingAdmins },
                organizations,
                subscriptions: { activeSubscriptions },
                billing: { invoices, completedInvoices },
                seats: {
                    totalSeats,
                    usedSeats,
                    usagePercentage: totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0
                },
                verifiedProfiles
            }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getOrganizations = async (req, res) => {
    try {
        const { page, limit, skip } = buildPagination(req.query);
        const query = {};

        if (req.query.status) query.status = req.query.status;
        // Joi query validation coerces `isVerified` to a real boolean, but keep the
        // string check too for callers that hit this endpoint without validation.
        if (req.query.isVerified !== undefined && req.query.isVerified !== '') {
            query.isVerified = req.query.isVerified === true || req.query.isVerified === "true";
        }
        if (req.query.search) {
            const rx = { $regex: String(req.query.search).trim(), $options: "i" };
            query.$or = [
                { organizationName: rx },
                { registrationNumber: rx },
                { "primaryContactPerson.email": rx },
                { "primaryContactPerson.name": rx },
            ];
        }

        const organizations = await Organization.find(query)
            .populate("user", "name email role status")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Organization.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Organizations fetched successfully.",
            data: organizations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const updateOrganizationStatus = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const { status, isVerified } = req.body;

        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ message: "Organization not found!" });
        }

        if (status !== undefined) organization.status = status;
        if (isVerified !== undefined) organization.isVerified = isVerified;
        if (isVerified === true) {
            organization.verificationDate = new Date();
            // A freshly verified org should also be operationally active unless the
            // caller explicitly set another status in the same request.
            if (status === undefined && ['pending_verification', 'inactive'].includes(organization.status)) {
                organization.status = 'active';
            }
        }

        await organization.save();

        await AuditLog.logAction({
            user: req.user.id,
            userEmail: req.user.email || "system",
            userRole: "super-admin",
            action: "ADMIN_ACTION",
            resourceType: "organization",
            resourceId: organization._id,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            endpoint: req.path,
            method: req.method,
            statusCode: 200,
            details: { status: organization.status, isVerified: organization.isVerified }
        });

        return res.status(200).json({
            success: true,
            message: "Organization status updated successfully.",
            data: organization
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getPlatformStudents = async (req, res) => {
    try {
        const { page, limit, skip } = buildPagination(req.query);
        const search = (req.query.search || '').trim();
        const organization = (req.query.organization || '').trim();
        const status = (req.query.status || '').trim();

        const query = { role: 'student' };
        if (organization) query.organization = organization;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { organization: { $regex: search, $options: 'i' } },
            ];
        }

        const [students, total] = await Promise.all([
            User.find(query).select('name email organization status isEmailVerified createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            User.countDocuments(query),
        ]);

        const profiles = await StudentProfile.find({ user: { $in: students.map((s) => s._id) } })
            .select('user branch graduationYear placementReadinessScore mockHistoryCount').lean();
        const pByUser = new Map(profiles.map((p) => [String(p.user), p]));

        const rows = students.map((s) => ({
            ...s,
            branch: pByUser.get(String(s._id))?.branch ?? null,
            graduationYear: pByUser.get(String(s._id))?.graduationYear ?? null,
            placementReadinessScore: Math.round(pByUser.get(String(s._id))?.placementReadinessScore ?? 0),
            mockHistoryCount: pByUser.get(String(s._id))?.mockHistoryCount ?? 0,
        }));

        return res.status(200).json({
            success: true,
            message: 'Platform students fetched successfully.',
            data: rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        const target = await User.findById(userId);
        if (!target) return res.status(404).json({ message: 'User not found.' });
        if (target.role === 'super-admin') {
            return res.status(403).json({ message: 'Super-admin accounts cannot be modified here.' });
        }

        target.status = status;
        if (status === 'Suspended' || status === 'Rejected') {
            // Kill their session so a suspended user is signed out immediately.
            target.refreshToken = undefined;
        }
        await target.save();

        await AuditLog.logAction({
            user: req.user.id,
            userEmail: req.user.email || 'system',
            userRole: 'super-admin',
            action: 'ADMIN_ACTION',
            resourceType: 'user',
            resourceId: target._id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            endpoint: req.path,
            method: req.method,
            statusCode: 200,
            details: { status, targetRole: target.role },
        }).catch(() => null);

        return res.status(200).json({ success: true, message: `User marked ${status}.`, data: { _id: target._id, status: target.status } });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getAuditLogs = async (req, res) => {
    try {
        const { page, limit, skip } = buildPagination(req.query);
        const query = buildAuditLogQuery(req.query);

        const [auditLogs, total] = await Promise.all([
            AuditLog.find(query)
                .populate('user', 'name email role organization status')
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit),
            AuditLog.countDocuments(query)
        ]);

        AuditLog.logAction({
            user: req.user.id,
            userEmail: req.user.email || 'system',
            userRole: 'super-admin',
            action: 'API_ACCESS',
            resourceType: 'security',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            endpoint: req.path,
            method: req.method,
            statusCode: 200,
            details: { query: req.query }
        }).catch(() => null);

        return res.status(200).json({
            success: true,
            message: 'Audit logs fetched successfully.',
            data: auditLogs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getAuditLogById = async (req, res) => {
    try {
        const { auditLogId } = req.params;
        const auditLog = await AuditLog.findById(auditLogId).populate('user', 'name email role organization status');

        if (!auditLog) {
            return res.status(404).json({ message: 'Audit log not found!' });
        }

        AuditLog.logAction({
            user: req.user.id,
            userEmail: req.user.email || 'system',
            userRole: 'super-admin',
            action: 'API_ACCESS',
            resourceType: 'security',
            resourceId: auditLog._id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            endpoint: req.path,
            method: req.method,
            statusCode: 200,
            details: { auditLogId }
        }).catch(() => null);

        return res.status(200).json({
            success: true,
            message: 'Audit log fetched successfully.',
            data: auditLog
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getAuditLogSummary = async (req, res) => {
    try {
        const query = buildAuditLogQuery(req.query);
        const [actionBreakdown, roleBreakdown, statusBreakdown, total, sensitiveCount, recentCount] = await Promise.all([
            AuditLog.aggregate([
                { $match: query },
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            AuditLog.aggregate([
                { $match: query },
                { $group: { _id: '$userRole', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            AuditLog.aggregate([
                { $match: query },
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            AuditLog.countDocuments(query),
            AuditLog.countDocuments({ ...query, hasSensitiveData: true }),
            AuditLog.countDocuments({
                ...query,
                timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            })
        ]);

        AuditLog.logAction({
            user: req.user.id,
            userEmail: req.user.email || 'system',
            userRole: 'super-admin',
            action: 'API_ACCESS',
            resourceType: 'security',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            endpoint: req.path,
            method: req.method,
            statusCode: 200,
            details: { query: req.query }
        }).catch(() => null);

        return res.status(200).json({
            success: true,
            message: 'Audit log summary fetched successfully.',
            data: {
                total,
                recentCount,
                sensitiveCount,
                actionBreakdown,
                roleBreakdown,
                statusBreakdown
            }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const exportAuditLogs = async (req, res) => {
    try {
        const query = buildAuditLogQuery(req.query);
        const format = String(req.query.format || 'csv').toLowerCase();
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 1000, 1), 5000);

        const auditLogs = await AuditLog.find(query)
            .populate('user', 'name email role organization status')
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        if (format === 'json') {
            await AuditLog.logAction({
                user: req.user.id,
                userEmail: req.user.email || 'system',
                userRole: 'super-admin',
                action: 'DATA_EXPORT',
                resourceType: 'security',
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                endpoint: req.path,
                method: req.method,
                statusCode: 200,
                details: { format: 'json', count: auditLogs.length, query: req.query }
            });

            return res.status(200).json({
                success: true,
                message: 'Audit logs exported successfully.',
                count: auditLogs.length,
                data: auditLogs
            });
        }

        const headers = [
            'timestamp',
            'userEmail',
            'userRole',
            'action',
            'resourceType',
            'resourceId',
            'status',
            'statusCode',
            'method',
            'endpoint',
            'ipAddress',
            'duration',
            'hasSensitiveData',
            'errorMessage'
        ];

        const csvRows = [headers.join(',')];
        auditLogs.forEach((log) => {
            csvRows.push([
                log.timestamp,
                log.userEmail,
                log.userRole,
                log.action,
                log.resourceType,
                log.resourceId,
                log.status,
                log.statusCode,
                log.method,
                log.endpoint,
                log.ipAddress,
                log.duration,
                log.hasSensitiveData,
                log.errorMessage
            ].map(escapeCsvValue).join(','));
        });

        const fileName = `audit-logs-${Date.now()}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        AuditLog.logAction({
            user: req.user.id,
            userEmail: req.user.email || 'system',
            userRole: 'super-admin',
            action: 'DATA_EXPORT',
            resourceType: 'security',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            endpoint: req.path,
            method: req.method,
            statusCode: 200,
            details: { format: 'csv', count: auditLogs.length, query: req.query }
        }).catch(() => null);

        return res.status(200).send(csvRows.join('\n'));
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};


module.exports = { getPendingCollegeAdmins, approveCollegeAdmin, rejectCollegeAdmin, getPlatformOverview, getOrganizations, updateOrganizationStatus, getAuditLogs, getAuditLogById, getAuditLogSummary, exportAuditLogs, getPlatformStudents, updateUserStatus };