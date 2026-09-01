const AsyncHandler = require('../utils/errorHandler').asyncHandler;
const sendError = require('../utils/sendError');
const mongoose = require('mongoose');
const RecommendationService = require('../services/recommendationService');
const WorkshopRecommendation = require('../models/WorkshopRecommendationModel');
const RecommendationAssignment = require('../models/RecommendationAssignmentModel');
const User = require('../models/userModel');
const AuditLog = require('../models/AuditLogModel');
const Organization = require('../models/OrganizationModel');
const Subscription = require('../models/SubscriptionModel');
const SeatManagement = require('../models/SeatManagementModel');
const logger = require('../services/loggerService.js');

const getOrCreateOrganization = async (user) => {
  let organization = await Organization.findOne({ user: user._id });
  if (!organization) {
    organization = await Organization.create({
      user: user._id,
      organizationName: user.organization,
      organizationType: 'college',
      primaryContactPerson: { name: user.name, email: user.email, phone: '' },
      status: 'pending_verification',
      isVerified: false
    });
  }
  return organization;
};

const fetchCollegeContext = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;
  const organization = await getOrCreateOrganization(user);
  const subscription = await Subscription.findOne({ organization: organization._id }).sort({ createdAt: -1 })
    || await Subscription.findOne({ organization: user._id, ownerType: 'individual' }).sort({ createdAt: -1 });
  const seatManagement = subscription ? await SeatManagement.findOne({ subscription: subscription._id }) : null;
  return { user, organization, subscription, seatManagement };
};

const createRecommendation = async (req, res) => {
    try {
        const context = await fetchCollegeContext(req.user.id);
        if (!context) {
            return res.status(404).json({ success: false, message: 'College admin not found.' });
        }

        const recommendation = await RecommendationService.createRecommendation({
            ...req.body,
            organization: context.user._id
        }, req.user.id);

        return res.status(201).json({
            success: true,
            message: 'Recommendation created successfully.',
            data: recommendation
        });
    } catch (err) {
        logger.error('createRecommendation error:', err);
        return sendError(res, err);
    }
};

const listRecommendations = async (req, res) => {
    try {
        const context = await fetchCollegeContext(req.user.id);
        if (!context) {
            return res.status(404).json({ success: false, message: 'College admin not found.' });
        }

        const result = await RecommendationService.listRecommendations(context.user._id, req.query);
        return res.status(200).json({
            success: true,
            message: 'Recommendations fetched successfully.',
            data: result.recommendations,
            pagination: result.pagination
        });
    } catch (err) {
        logger.error('listRecommendations error:', err);
        return sendError(res, err);
    }
};

const getRecommendation = async (req, res) => {
    try {
        const context = await fetchCollegeContext(req.user.id);
        if (!context) {
            return res.status(404).json({ success: false, message: 'College admin not found.' });
        }

        const recommendation = await WorkshopRecommendation.findOne({
            _id: req.params.recommendationId,
            organization: context.user._id
        });

        if (!recommendation) {
            return res.status(404).json({ success: false, message: 'Recommendation not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Recommendation fetched successfully.',
            data: recommendation
        });
    } catch (err) {
        logger.error('getRecommendation error:', err);
        return sendError(res, err);
    }
};

const updateRecommendation = async (req, res) => {
    try {
        const context = await fetchCollegeContext(req.user.id);
        if (!context) {
            return res.status(404).json({ success: false, message: 'College admin not found.' });
        }

        const recommendation = await RecommendationService.updateRecommendation(
            req.params.recommendationId,
            context.user._id,
            req.body
        );

        if (!recommendation) {
            return res.status(404).json({ success: false, message: 'Recommendation not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Recommendation updated successfully.',
            data: recommendation
        });
    } catch (err) {
        logger.error('updateRecommendation error:', err);
        return sendError(res, err);
    }
};

const deleteRecommendation = async (req, res) => {
    try {
        const context = await fetchCollegeContext(req.user.id);
        if (!context) {
            return res.status(404).json({ success: false, message: 'College admin not found.' });
        }

        const recommendation = await RecommendationService.deleteRecommendation(
            req.params.recommendationId,
            context.user._id
        );

        if (!recommendation) {
            return res.status(404).json({ success: false, message: 'Recommendation not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Recommendation deleted successfully.'
        });
    } catch (err) {
        logger.error('deleteRecommendation error:', err);
        return sendError(res, err);
    }
};

const assignRecommendationToBatch = async (req, res) => {
    try {
        const context = await fetchCollegeContext(req.user.id);
        if (!context) {
            return res.status(404).json({ success: false, message: 'College admin not found.' });
        }

        const result = await RecommendationService.assignRecommendationToBatch(
            req.params.recommendationId,
            context.user._id,
            req.body.batchId,
            req.user.id,
            req.body
        );

        return res.status(200).json({
            success: result.success,
            message: result.message,
            data: result.data
        });
    } catch (err) {
        logger.error('assignRecommendationToBatch error:', err);
        return sendError(res, err);
    }
};

const assignRecommendationToStudent = async (req, res) => {
    try {
        const context = await fetchCollegeContext(req.user.id);
        if (!context) {
            return res.status(404).json({ success: false, message: 'College admin not found.' });
        }

        const result = await RecommendationService.assignRecommendationToStudent(
            req.params.recommendationId,
            context.user._id,
            req.body.studentId,
            req.user.id,
            req.body
        );

        return res.status(200).json({
            success: result.success,
            message: result.message,
            data: result.data
        });
    } catch (err) {
        logger.error('assignRecommendationToStudent error:', err);
        return sendError(res, err);
    }
};

const getRecommendationAssignments = async (req, res) => {
    try {
        const context = await fetchCollegeContext(req.user.id);
        if (!context) {
            return res.status(404).json({ success: false, message: 'College admin not found.' });
        }

        const result = await RecommendationService.getRecommendationAssignments(context.user._id, req.query);
        return res.status(200).json({
            success: true,
            message: 'Recommendation assignments fetched successfully.',
            data: result.assignments,
            pagination: result.pagination
        });
    } catch (err) {
        logger.error('getRecommendationAssignments error:', err);
        return sendError(res, err);
    }
};

module.exports = {
    createRecommendation,
    listRecommendations,
    getRecommendation,
    updateRecommendation,
    deleteRecommendation,
    assignRecommendationToBatch,
    assignRecommendationToStudent,
    getRecommendationAssignments
};
