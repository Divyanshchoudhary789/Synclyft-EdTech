const mongoose = require('mongoose');
const Resume = require("../models/ResumeModel.js");
const { analyzeResumeATS, analyzeResumeFromText } = require("../services/geminiService.js");
const { extractResumeText } = require("../utils/resumeTextExtractor.js");
const { ApiError } = require("../utils/errorHandler.js");
const sendError = require("../utils/sendError");
const logger = require("../services/loggerService.js");


const buildResumeDocument = (body) => {
    const doc = {};
    const fields = [
        'title', 'templateId', 'targetRole', 'experienceLevel', 'targetJD',
        'personalInfo', 'education', 'experience', 'skills', 'projects', 'certificates'
    ];
    for (const field of fields) {
        if (body[field] !== undefined) doc[field] = body[field];
    }
    return doc;
};


// 1. Create a new resume
const saveResume = async (req, res) => {
    try {
        const resume = new Resume({
            ...buildResumeDocument(req.body),
            user: req.user.id
        });

        await resume.save();

        logger.info({ message: 'Resume created', resumeId: resume._id, userId: req.user.id });

        return res.status(201).json({
            success: true,
            message: 'Resume created successfully',
            resume
        });
    } catch (err) {
        logger.error({ message: 'saveResume error', error: err.message, stack: err.stack });
        return sendError(res, err);
    }
};


// 2. Update an existing resume (ownership enforced)
const updateResume = async (req, res) => {
    try {
        const { id } = req.params;

        const resume = await Resume.findOneAndUpdate(
            { _id: id, user: req.user.id },
            { $set: buildResumeDocument(req.body) },
            { new: true, runValidators: true }
        );

        if (!resume) {
            throw new ApiError(404, 'Resume not found');
        }

        logger.info({ message: 'Resume updated', resumeId: id, userId: req.user.id });

        return res.status(200).json({
            success: true,
            message: 'Resume updated successfully',
            resume
        });
    } catch (err) {
        logger.error({ message: 'updateResume error', error: err.message, stack: err.stack });
        return sendError(res, err);
    }
};


// 3. List resumes for the logged-in user (paginated, lean)
const getUserResumesHistory = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
        const skip = (page - 1) * limit;

        const filter = { user: req.user.id };

        const [resumes, total] = await Promise.all([
            Resume.find(filter)
                .select('title targetRole experienceLevel templateId updatedAt')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Resume.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            resumes,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        logger.error({ message: 'getUserResumesHistory error', error: err.message, stack: err.stack });
        return sendError(res, err);
    }
};


// 4. Fetch a single resume by id (ownership enforced)
const getResumeById = async (req, res) => {
    try {
        const { id } = req.params;

        const resume = await Resume.findOne({ _id: id, user: req.user.id });

        if (!resume) {
            throw new ApiError(404, 'Resume not found');
        }

        return res.status(200).json({ success: true, resume });
    } catch (err) {
        logger.error({ message: 'getResumeById error', error: err.message, stack: err.stack });
        return sendError(res, err);
    }
};


// 5. Delete a resume (ownership enforced)
const deleteResume = async (req, res) => {
    try {
        const { id } = req.params;

        const resume = await Resume.findOneAndDelete({ _id: id, user: req.user.id });

        if (!resume) {
            throw new ApiError(404, 'Resume not found');
        }

        logger.info({ message: 'Resume deleted', resumeId: id, userId: req.user.id });

        return res.status(200).json({
            success: true,
            message: 'Resume deleted successfully'
        });
    } catch (err) {
        logger.error({ message: 'deleteResume error', error: err.message, stack: err.stack });
        return sendError(res, err);
    }
};


// 6. Gemini ATS optimization agent
const optimizeResumeAI = async (req, res) => {
    try {
        const suggestions = await analyzeResumeATS(req.body);

        return res.status(200).json({ success: true, suggestions });
    } catch (err) {
        logger.error({ message: 'optimizeResumeAI error', error: err.message, stack: err.stack });
        return sendError(res, err);
    }
};


// 7. Analyze an uploaded resume file (PDF) against target job context
const analyzeResumeFile = async (req, res) => {
    try {
        if (!req.file) {
            throw new ApiError(400, 'Resume file is required');
        }

        const { targetRole, experienceLevel, targetJD } = req.body;

        const resumeText = await extractResumeText(req.file.buffer, req.file.mimetype);
        if (!resumeText || resumeText.length < 20) {
            throw new ApiError(422, 'Unable to extract readable text from the uploaded resume');
        }

        const analysis = await analyzeResumeFromText({
            resumeText,
            targetRole,
            experienceLevel,
            targetJD
        });

        return res.status(200).json({ success: true, analysis });
    } catch (err) {
        logger.error({ message: 'analyzeResumeFile error', error: err.message, stack: err.stack });
        return sendError(res, err);
    }
};


module.exports = {
    saveResume,
    updateResume,
    getUserResumesHistory,
    getResumeById,
    deleteResume,
    optimizeResumeAI,
    analyzeResumeFile
};
