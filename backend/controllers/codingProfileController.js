const StudentProfile = require("../models/StudentProfileModel.js");
const crypto = require("crypto");
const logger = require("../services/loggerService.js");

const githubProvider = require("../utils/providers/githubProvider.js");
const codeforcesProvider = require("../utils/providers/codeforcesProvider.js");
const leetcodeProvider = require("../utils/providers/leetcodeProvider.js");
const hackerrankProvider = require("../utils/providers/hackerrankProvider.js");
const { buildPlatformUpdate } = require("../utils/codingProfiles.js");

const PROVIDERS = {
    github: githubProvider.fetchGitHubData,
    codeforces: codeforcesProvider.fetchCodeforcesData,
    leetcode: leetcodeProvider.fetchLeetCodeData,
    hackerrank: hackerrankProvider.fetchHackerRankData,
};

// Where the student should paste the verification token, per platform.
const TOKEN_LOCATION = {
    github: "your GitHub profile Bio or Name field",
    leetcode: "your LeetCode profile Summary (About) or Name field",
    codeforces: "your Codeforces first-name / last-name field",
    hackerrank: "your HackerRank profile Bio",
};

const getProviderFetcher = (platform) => PROVIDERS[String(platform || "").toLowerCase()];

const initiateVerification = async (req, res) => {
    try {
        const { platform, username } = req.body;
        const userId = req.user.id;
        const platformKey = String(platform).toLowerCase();

        if (!getProviderFetcher(platformKey)) {
            return res.status(400).json({ success: false, message: "That platform isn't supported yet." });
        }

        // Fail fast if the username doesn't exist on the platform.
        const remoteData = await getProviderFetcher(platformKey)(username.trim());
        if (!remoteData) {
            return res.status(404).json({
                success: false,
                code: "PLATFORM_USER_NOT_FOUND",
                message: `We couldn't find "${username.trim()}" on ${platform}. Double-check the username.`,
            });
        }

        // Block claiming a username already verified by someone else.
        const dup = await StudentProfile.findOne({
            [`externalMetrics.${platformKey}.username`]: username.trim(),
            [`externalMetrics.${platformKey}.isVerified`]: true,
        }).select("user").lean();
        if (dup && String(dup.user) !== String(userId)) {
            return res.status(409).json({ success: false, code: "USERNAME_TAKEN", message: `That ${platform} account is already linked to another student.` });
        }

        const token = `ED-${platformKey.substring(0, 2).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

        await StudentProfile.findOneAndUpdate(
            { user: userId },
            {
                $set: {
                    [`externalMetrics.${platformKey}.username`]: username.trim(),
                    [`externalMetrics.${platformKey}.verificationToken`]: token,
                    [`externalMetrics.${platformKey}.isVerified`]: false,
                },
            },
            { upsert: true }
        );

        return res.status(200).json({
            success: true,
            token,
            location: TOKEN_LOCATION[platformKey] || "your public profile bio",
            message: `Paste "${token}" into ${TOKEN_LOCATION[platformKey] || "your profile bio"}, then hit Verify.`,
        });
    } catch (error) {
        logger.error("initiateVerification failed", { platform: req.body?.platform, error: error.message });
        return res.status(500).json({ success: false, message: "Couldn't start verification. Please try again." });
    }
};

const verifyProfile = async (req, res) => {
    try {
        const { platform } = req.body;
        const userId = req.user.id;
        const platformKey = String(platform).toLowerCase();

        const studentProfile = await StudentProfile.findOne({ user: userId });
        const config = studentProfile?.externalMetrics?.[platformKey];

        if (!config || !config.username || !config.verificationToken) {
            return res.status(400).json({ success: false, code: "NOT_INITIATED", message: "Generate a verification token first." });
        }

        const remoteData = await getProviderFetcher(platformKey)(config.username);
        if (!remoteData) {
            return res.status(502).json({
                success: false,
                code: "PLATFORM_UNREACHABLE",
                message: `Couldn't reach ${platform} right now. Wait a moment and try Verify again.`,
            });
        }

        const haystack = `${remoteData.bio || ""} ${remoteData.realName || ""}`.toLowerCase();
        const token = config.verificationToken.toLowerCase();
        const tokenPresent = haystack.includes(token);

        // In non-production we let people skip the bio step to speed up testing.
        const bypass = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
        if (!tokenPresent && !bypass) {
            return res.status(400).json({
                success: false,
                code: "TOKEN_NOT_FOUND",
                message: `We couldn't find ${config.verificationToken} in ${TOKEN_LOCATION[platformKey] || "your profile"}. Add it (it can be anywhere in the text), save, and try again.`,
            });
        }

        // LeetCode extra check: if the profile links a GitHub and the student has
        // a verified GitHub, they must match.
        if (platformKey === "leetcode" && remoteData.socialLinks?.github) {
            const ghUser = studentProfile.externalMetrics?.github?.username;
            if (ghUser && studentProfile.externalMetrics?.github?.isVerified &&
                !remoteData.socialLinks.github.toLowerCase().includes(ghUser.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    code: "GITHUB_MISMATCH",
                    message: "The GitHub linked on your LeetCode profile doesn't match your verified GitHub account.",
                });
            }
        }

        const set = buildPlatformUpdate(platformKey, remoteData);
        set[`externalMetrics.${platformKey}.isVerified`] = true;

        const updated = await StudentProfile.findOneAndUpdate(
            { user: userId },
            { $set: set },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: `${platform} connected. Your stats are now feeding your readiness score.`,
            data: updated.externalMetrics[platformKey],
        });
    } catch (error) {
        logger.error("verifyProfile failed", { platform: req.body?.platform, error: error.message, stack: error.stack });
        return res.status(500).json({ success: false, message: "Verification failed unexpectedly. Please try again." });
    }
};

const syncProfile = async (req, res) => {
    try {
        const { platform } = req.body;
        const userId = req.user.id;
        const platformKey = String(platform).toLowerCase();

        const studentProfile = await StudentProfile.findOne({ user: userId });
        const config = studentProfile?.externalMetrics?.[platformKey];

        if (!config || !config.isVerified) {
            return res.status(400).json({ success: false, code: "NOT_VERIFIED", message: `Connect your ${platform} account before syncing.` });
        }

        const remoteData = await getProviderFetcher(platformKey)(config.username);
        if (!remoteData) {
            return res.status(502).json({ success: false, code: "PLATFORM_UNREACHABLE", message: `Couldn't reach ${platform}. Try again shortly.` });
        }

        const updated = await StudentProfile.findOneAndUpdate(
            { user: userId },
            { $set: buildPlatformUpdate(platformKey, remoteData) },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: `${platform} stats refreshed.`,
            data: updated.externalMetrics[platformKey],
        });
    } catch (error) {
        logger.error("syncProfile failed", { platform: req.body?.platform, error: error.message });
        return res.status(500).json({ success: false, message: "Sync failed. Please try again." });
    }
};

module.exports = { initiateVerification, verifyProfile, syncProfile };
