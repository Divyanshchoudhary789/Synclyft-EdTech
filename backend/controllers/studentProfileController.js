const StudentProfile = require("../models/StudentProfileModel.js");
const User = require('../models/userModel.js');

const uploadToR2 = require("../utils/r2Upload.js");
const deleteFromR2 = require("../utils/deleteFromR2.js");
const sendError = require("../utils/sendError");
const logger = require("../services/loggerService.js");


const updateProfilePicture = async (req, res) => {
    try {
        const userId = req.user.id;
        const newPicture = req.file;

        const profile = await StudentProfile.findOne({ user: userId });
        if (!profile) {
            return res.status(404).json({ message: "Student Profile not found!" });
        }

        //deleting old profile picture
        if (profile.profilePictureKey) {
            await deleteFromR2(profile.profilePictureKey);
        }

        //uploading new profile picture
        const result = await uploadToR2(newPicture);

        profile.profilePicture = result.url;
        profile.profilePictureKey = result.key;

        await profile.save();

        return res.status(200).json({ success: true, message: "User Profile Picture Updated Successfully." });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}

const addProfileDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const resume = req.file;
        let { branch, graduationYear, cgpa, attendance, targetRole, expectedCTC, skills, projects, preferredInterviewLanguage, codingLanguageChoices } = req.body;

        if (!branch || !graduationYear || !cgpa || !attendance || !targetRole || !expectedCTC || !skills || !projects || !preferredInterviewLanguage || !codingLanguageChoices) {
            return res.status(400).json({ message: "All Fields are required!" });
        }

        const profile = await StudentProfile.findOne({ user: userId });
        if (!profile) {
            return res.status(404).json({ message: "User Profile not found!" });
        }

        if (typeof expectedCTC === 'string') expectedCTC = JSON.parse(expectedCTC);
        if (typeof projects === 'string') projects = JSON.parse(projects);

        const result = await uploadToR2(resume);

        profile.branch = branch;
        profile.graduationYear = graduationYear;
        profile.cgpa = cgpa;
        profile.attendance = attendance;
        profile.targetRole = targetRole;
        profile.expectedCTC = {
            min: Number(expectedCTC.min) || 0,
            max: Number(expectedCTC.max) || 0
        };
        profile.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
        profile.projects = projects;
        profile.preferredInterviewLanguage = preferredInterviewLanguage;
        profile.codingLanguageChoices = Array.isArray(codingLanguageChoices) ? codingLanguageChoices : codingLanguageChoices.split(',').map(s => s.trim());
        profile.resumeUrl = result.url;
        profile.resumeKey = result.key;

        await profile.save();

        return res.status(200).json({ success: true, message: "Profile details Added Successfully" });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}



const getProfileDetails = async (req, res) => {
    try {

        const userId = req.user.id;

        const profile = await StudentProfile.findOne({ user: userId })
            .populate("user", "name email role organization isEmailVerified");

        if (!profile) {
            return res.status(404).json({ message: "student Profile not found!" });
        }

        return res.status(200).json({ success: true, message: "Student Profile Fetched Successfully.", profile });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}



const updateProfileDetails = async (req, res) => {
    try {

        const userId = req.user.id;
        const newResume = req.file;
        let { branch, graduationYear, cgpa, attendance, targetRole, expectedCTC, skills, projects, preferredInterviewLanguage, codingLanguageChoices } = req.body;

        const profile = await StudentProfile.findOne({ user: userId });
        if (!profile) {
            return res.status(404).json({ message: "Student Profile not found!" });
        }

        if (expectedCTC && typeof expectedCTC === 'string') expectedCTC = JSON.parse(expectedCTC);
        if (projects && typeof projects === 'string') projects = JSON.parse(projects);

        if (branch) {
            profile.branch = branch;
        }
        if (graduationYear) {
            profile.graduationYear = graduationYear;
        }
        if (cgpa) {
            profile.cgpa = cgpa;
        }
        if (attendance) {
            profile.attendance = attendance;
        }
        if (targetRole) {
            profile.targetRole = targetRole;
        }
        if (expectedCTC) {
            profile.expectedCTC = {
                min: Number(expectedCTC.min) || profile.expectedCTC.min,
                max: Number(expectedCTC.max) || profile.expectedCTC.max
            };
        }
        if (skills) {
            profile.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
        }
        if (projects) {
            profile.projects = projects;
        }
        if (preferredInterviewLanguage) {
            profile.preferredInterviewLanguage = preferredInterviewLanguage;
        }
        if (codingLanguageChoices) {
            profile.codingLanguageChoices = Array.isArray(codingLanguageChoices) ? codingLanguageChoices : codingLanguageChoices.split(',').map(s => s.trim());
        }

        if (newResume) {

            //deleting old resume
            if (profile.resumeKey) {
                await deleteFromR2(profile.resumeKey);
            }

            //uploading new updated resume
            const result = await uploadToR2(newResume);

            profile.resumeUrl = result.url;
            profile.resumeKey = result.key;

        }


        await profile.save();

        return res.status(200).json({ success: true, message: "Student Profile Updated Successfully.", profile });


    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}


module.exports = { updateProfilePicture, addProfileDetails, getProfileDetails, updateProfileDetails };