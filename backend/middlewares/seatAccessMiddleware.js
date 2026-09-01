const mongoose = require('mongoose');
const Subscription = require('../models/SubscriptionModel');
const SeatManagement = require('../models/SeatManagementModel');
const User = require('../models/userModel');

const logger = require('../services/loggerService.js');

/**
 * Resolves the student's entitlements and attaches them to the request:
 *   - req.seatContext  : active seat (college seat OR own individual subscription seat)
 *   - req.studentTrials : the student's free trial allowance
 *
 * Does NOT deny access; `requireActiveSeat` is the gate.
 */
const resolveSeatContext = async (req, res, next) => {
    try {
        const studentId = req.user?.id;
        if (!studentId) {
            return res.status(401).json({ message: 'Unauthorized, Access Denied!' });
        }

        const user = await User.findById(studentId).select('role trials');
        if (!user) {
            return res.status(404).json({ message: 'User not found!' });
        }

        req.studentTrials = user.trials || null;

        const seat = await SeatManagement.findOne({
            'enrolledStudents.student': new mongoose.Types.ObjectId(studentId),
            'enrolledStudents.status': 'active'
        }).populate('subscription');

        if (seat && seat.subscription) {
            const enrollment = seat.enrolledStudents.find(
                (e) => e.student.toString() === studentId.toString() && e.status === 'active'
            );
            req.seatContext = { subscription: seat.subscription, seat, enrollment };
        } else {
            req.seatContext = null;
        }

        return next();
    } catch (err) {
        logger.error('resolveSeatContext error:', err);
        return res.status(500).json({ message: 'Internal server error while resolving seat context.' });
    }
};

/**
 * Gate middleware. Allows access if the student has EITHER:
 *   - an active seat on an active subscription that includes `feature` and has
 *     remaining monthly `usage` quota, OR
 *   - remaining free `usage` trial credits.
 *
 * Dependency: must run after `resolveSeatContext`. Sets req.entitlementSource
 * ('seat' | 'trial') so controllers know which counter to consume.
 */
const requireActiveSeat = (options = {}) => {
    const { feature, usage } = options;

    return (req, res, next) => {
        const seatCtx = req.seatContext;
        const trials = req.studentTrials;

        let seatAllowed = false;
        if (seatCtx && seatCtx.subscription) {
            const sub = seatCtx.subscription;
            const active = sub.isActive() || sub.isInGracePeriod();
            const hasFeature = !feature || sub.hasFeature(feature);
            const hasQuota = !usage || !sub.isLimitExceeded(usage);
            seatAllowed = active && hasFeature && hasQuota;
        }

        let trialAllowed = false;
        if (trials && trials.isActive && usage) {
            const bucket = trials[usage];
            if (bucket && bucket.used < bucket.total) {
                trialAllowed = true;
            }
        }

        if (!seatAllowed && !trialAllowed) {
            const seatExhausted = seatCtx && seatCtx.subscription && usage && seatCtx.subscription.isLimitExceeded(usage);
            if (seatExhausted) {
                return res.status(429).json({
                    success: false,
                    code: 'QUOTA_EXCEEDED',
                    message: `Your institution's monthly quota for "${usage}" has been exhausted.`
                });
            }
            return res.status(403).json({
                success: false,
                code: 'NO_ENTITLEMENT',
                message: 'This feature requires an active subscription, an allocated seat, or remaining trial credits. Upgrade or request a seat from your institution.'
            });
        }

        req.entitlementSource = seatAllowed ? 'seat' : 'trial';
        return next();
    };
};

/**
 * Consumes one unit of the entitlement actually used. If access came from a
 * seat/subscription we increment its monthly usage counter; if from a trial we
 * increment the student's trial `used` counter. Must be called AFTER a paid
 * action has succeeded, with `req.entitlementSource` set by the gate.
 */
const consumeEntitlement = async (req, usageType) => {
    if (!usageType) return;

    if (req.entitlementSource === 'seat' && req.seatContext && req.seatContext.subscription) {
        await Subscription.findByIdAndUpdate(
            req.seatContext.subscription._id,
            { $inc: { [`currentMonthUsage.${usageType}`]: 1 } }
        );
    } else if (req.entitlementSource === 'trial' && req.user && req.user.id) {
        await User.findByIdAndUpdate(
            req.user.id,
            { $inc: { [`trials.${usageType}.used`]: 1 } }
        );
    }
};

module.exports = { resolveSeatContext, requireActiveSeat, consumeEntitlement };
