const StudentProfile = require("../models/StudentProfileModel.js");
const crypto = require("crypto");

const githubProvider = require("../utils/providers/githubProvider.js");
const codeforcesProvider = require("../utils/providers/codeforcesProvider.js");
const leetcodeProvider = require("../utils/providers/leetcodeProvider.js");
const hackerrankProvider = require("../utils/providers/hackerrankProvider.js");

const getProviderFetcher = (platform) => {
    const map = {
        github: githubProvider.fetchGitHubData,
        codeforces: codeforcesProvider.fetchCodeforcesData,
        leetcode: leetcodeProvider.fetchLeetCodeData,
        hackerrank: hackerrankProvider.fetchHackerRankData
    };
    return map[platform.toLowerCase()];
};

const initiateVerification = async (req, res) => {
    try {
        const { platform, username } = req.body;
        const userId = req.user.id;

        if (!getProviderFetcher(platform)) {
            return res.status(400).json({ message: 'Invalid platform specified.' });
        }

        const duplicateQuery = {};
        duplicateQuery[`externalMetrics.${platform.toLowerCase()}.username`] = username;
        duplicateQuery[`externalMetrics.${platform.toLowerCase()}.isVerified`] = true;

        const existingProfile = await StudentProfile.findOne(duplicateQuery);
        if (existingProfile && existingProfile.user.toString() !== userId) {
            return res.status(400).json({ message: 'This profile username is already verified by another student!' });
        }

        const token = `ED-${platform.toUpperCase().substring(0, 2)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        const updateData = {};
        updateData[`externalMetrics.${platform.toLowerCase()}.username`] = username;
        updateData[`externalMetrics.${platform.toLowerCase()}.verificationToken`] = token;
        updateData[`externalMetrics.${platform.toLowerCase()}.isVerified`] = false;

        await StudentProfile.findOneAndUpdate({ user: userId }, { $set: updateData }, { upsert: true });

        return res.status(200).json({
            message: `Token generated. Please paste '${token}' inside your profile bio/first name field on ${platform}.`,
            token: token
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const verifyProfile = async (req, res) => {
    try {
        const { platform } = req.body;
        const userId = req.user.id;

        const studentProfile = await StudentProfile.findOne({ user: userId });
        const platformKey = platform.toLowerCase();
        const config = studentProfile?.externalMetrics?.[platformKey];

        if (!config || !config.username || !config.verificationToken) {
            return res.status(400).json({ message: 'Please initiate verification first.' });
        }

        const fetcher = getProviderFetcher(platform);
        const remoteData = await fetcher(config.username);

        if (!remoteData) {
            return res.status(404).json({ message: `Could not sync data from ${platform}. Check username.` });
        }

        const bioText = (remoteData.bio || '').toLowerCase();
        const realNameText = (remoteData.realName || '').toLowerCase();
        const targetToken = config.verificationToken.toLowerCase();

        const isTokenPresent = bioText.includes(targetToken) || realNameText.includes(targetToken);

        if (!isTokenPresent && process.env.NODE_ENV !== 'development') {
            return res.status(400).json({ message: `Verification token ${config.verificationToken} not found in profile bio.` });
        }

        if (platformKey === 'leetcode' && remoteData.socialLinks?.github) {
            const currentGitUser = studentProfile.externalMetrics?.github?.username;
            if (currentGitUser && !remoteData.socialLinks.github.toLowerCase().includes(currentGitUser.toLowerCase())) {
                return res.status(400).json({ message: "Verification Failed. LeetCode profile's linked GitHub account does not match your system verified GitHub!" });
            }
        }

        const updateData = {};
        updateData[`externalMetrics.${platformKey}.isVerified`] = true;
        updateData[`externalMetrics.${platformKey}.lastSyncedAt`] = new Date();

        if (platformKey === 'leetcode') {
            updateData[`externalMetrics.leetcode.easySolved`] = remoteData.stats.easySolved;
            updateData[`externalMetrics.leetcode.mediumSolved`] = remoteData.stats.mediumSolved;
            updateData[`externalMetrics.leetcode.hardSolved`] = remoteData.stats.hardSolved;
            updateData[`externalMetrics.leetcode.totalSolved`] = remoteData.stats.totalSolved;
            updateData[`externalMetrics.leetcode.contestRating`] = remoteData.stats.contestRating;
            updateData[`externalMetrics.leetcode.globalRanking`] = remoteData.stats.globalRanking;
            updateData[`externalMetrics.leetcode.reputation`] = remoteData.stats.reputation;
            updateData[`externalMetrics.leetcode.streak`] = remoteData.stats.streak;
            updateData[`externalMetrics.leetcode.totalActiveDays`] = remoteData.stats.totalActiveDays;
            updateData[`externalMetrics.leetcode.attendedContestsCount`] = remoteData.stats.attendedContestsCount;
        } else if (platformKey === 'github') {
            updateData[`externalMetrics.github.bio`] = remoteData.bio;
            updateData[`externalMetrics.github.avatarUrl`] = remoteData.avatarUrl;
            updateData[`externalMetrics.github.htmlUrl`] = remoteData.htmlUrl;
            updateData[`externalMetrics.github.portfolioUrl`] = remoteData.portfolioUrl;
            updateData[`externalMetrics.github.publicRepos`] = remoteData.stats.publicRepos;
            updateData[`externalMetrics.github.starsEarned`] = remoteData.stats.starsEarned;
            updateData[`externalMetrics.github.followers`] = remoteData.stats.followers;
            updateData[`externalMetrics.github.following`] = remoteData.stats.following;
        } else if (platformKey === 'codeforces') {
            updateData[`externalMetrics.codeforces.rating`] = remoteData.stats.rating;
            updateData[`externalMetrics.codeforces.rank`] = remoteData.stats.rank;
            updateData[`externalMetrics.codeforces.maxRating`] = remoteData.stats.maxRating;
            updateData[`externalMetrics.codeforces.maxRank`] = remoteData.stats.maxRank;
            updateData[`externalMetrics.codeforces.avatarUrl`] = remoteData.avatarUrl;
            updateData[`externalMetrics.codeforces.contribution`] = remoteData.stats.contribution;
            updateData[`externalMetrics.codeforces.friendOfCount`] = remoteData.stats.friendOfCount;
            updateData[`externalMetrics.codeforces.totalSolved`] = remoteData.stats.totalSolved;
            updateData[`externalMetrics.codeforces.totalSubmissions`] = remoteData.stats.totalSubmissions;
        } else if (platformKey === 'hackerrank') {
            updateData[`externalMetrics.hackerrank.badgesCount`] = remoteData.stats.badgesCount;
            updateData[`externalMetrics.hackerrank.followersCount`] = remoteData.stats.followersCount;
            updateData[`externalMetrics.hackerrank.totalSubmissions`] = remoteData.stats.totalSubmissions;
            updateData[`externalMetrics.hackerrank.badges`] = remoteData.stats.badges;
            updateData[`externalMetrics.hackerrank.certificates`] = remoteData.stats.certificates;
        }

        const updated = await StudentProfile.findOneAndUpdate({ user: userId }, { $set: updateData }, { new: true });

        return res.status(200).json({
            message: `${platform} profile verified successfully! Data synced.`,
            data: updated.externalMetrics[platformKey]
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const syncProfile = async (req, res) => {
    try {
        const { platform } = req.body;
        const userId = req.user.id;
        const platformKey = platform.toLowerCase();

        const studentProfile = await StudentProfile.findOne({ user: userId });
        const config = studentProfile?.externalMetrics?.[platformKey];

        if (!config || !config.isVerified) {
            return res.status(400).json({ message: 'Profile must be verified before syncing.' });
        }

        const fetcher = getProviderFetcher(platform);
        const remoteData = await fetcher(config.username);

        if (!remoteData) {
            return res.status(500).json({ message: 'Failed to fetch fresh data.' });
        }

        const updateData = {};
        updateData[`externalMetrics.${platformKey}.lastSyncedAt`] = new Date();

        if (platformKey === 'leetcode') {
            updateData[`externalMetrics.leetcode.easySolved`] = remoteData.stats.easySolved;
            updateData[`externalMetrics.leetcode.mediumSolved`] = remoteData.stats.mediumSolved;
            updateData[`externalMetrics.leetcode.hardSolved`] = remoteData.stats.hardSolved;
            updateData[`externalMetrics.leetcode.totalSolved`] = remoteData.stats.totalSolved;
            updateData[`externalMetrics.leetcode.contestRating`] = remoteData.stats.contestRating;
            updateData[`externalMetrics.leetcode.globalRanking`] = remoteData.stats.globalRanking;
            updateData[`externalMetrics.leetcode.reputation`] = remoteData.stats.reputation;
            updateData[`externalMetrics.leetcode.streak`] = remoteData.stats.streak;
            updateData[`externalMetrics.leetcode.totalActiveDays`] = remoteData.stats.totalActiveDays;
            updateData[`externalMetrics.leetcode.attendedContestsCount`] = remoteData.stats.attendedContestsCount;
        } else if (platformKey === 'github') {
            updateData[`externalMetrics.github.bio`] = remoteData.bio;
            updateData[`externalMetrics.github.avatarUrl`] = remoteData.avatarUrl;
            updateData[`externalMetrics.github.htmlUrl`] = remoteData.htmlUrl;
            updateData[`externalMetrics.github.portfolioUrl`] = remoteData.portfolioUrl;
            updateData[`externalMetrics.github.publicRepos`] = remoteData.stats.publicRepos;
            updateData[`externalMetrics.github.starsEarned`] = remoteData.stats.starsEarned;
            updateData[`externalMetrics.github.followers`] = remoteData.stats.followers;
            updateData[`externalMetrics.github.following`] = remoteData.stats.following;
        } else if (platformKey === 'codeforces') {
            updateData[`externalMetrics.codeforces.rating`] = remoteData.stats.rating;
            updateData[`externalMetrics.codeforces.rank`] = remoteData.stats.rank;
            updateData[`externalMetrics.codeforces.maxRating`] = remoteData.stats.maxRating;
            updateData[`externalMetrics.codeforces.maxRank`] = remoteData.stats.maxRank;
            updateData[`externalMetrics.codeforces.avatarUrl`] = remoteData.avatarUrl;
            updateData[`externalMetrics.codeforces.contribution`] = remoteData.stats.contribution;
            updateData[`externalMetrics.codeforces.friendOfCount`] = remoteData.stats.friendOfCount;
            updateData[`externalMetrics.codeforces.totalSolved`] = remoteData.stats.totalSolved;
            updateData[`externalMetrics.codeforces.totalSubmissions`] = remoteData.stats.totalSubmissions;
        } else if (platformKey === 'hackerrank') {
            updateData[`externalMetrics.hackerrank.badgesCount`] = remoteData.stats.badgesCount;
            updateData[`externalMetrics.hackerrank.followersCount`] = remoteData.stats.followersCount;
            updateData[`externalMetrics.hackerrank.totalSubmissions`] = remoteData.stats.totalSubmissions;
            updateData[`externalMetrics.hackerrank.badges`] = remoteData.stats.badges;
            updateData[`externalMetrics.hackerrank.certificates`] = remoteData.stats.certificates;
        }

        const updated = await StudentProfile.findOneAndUpdate({ user: userId }, { $set: updateData }, { new: true });

        return res.status(200).json({
            message: 'Stats synced successfully!',
            data: updated.externalMetrics[platformKey]
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = { initiateVerification, verifyProfile, syncProfile };