// Single source of truth for connected coding platforms is
// `StudentProfile.externalMetrics.<platform>` (flat, typed fields). Older code
// expected `User.codingProfiles.<platform>` = `{ isVerified, username, stats }`.
// This normaliser bridges the two so dashboards / reports / the sync cron can
// all read one shape.

const PLATFORM_KEYS = ["github", "leetcode", "codeforces", "hackerrank"];

// Fields that are metadata / presentational, not stats.
const META = new Set([
    "username", "isVerified", "verificationToken", "lastSyncedAt", "_id", "stats",
    "profileUrl", "avatarUrl", "htmlUrl", "portfolioUrl", "bio",
]);

/**
 * @param {object} externalMetrics - StudentProfile.externalMetrics (plain object or lean)
 * @returns {Record<string, { isVerified: boolean, username: string, lastSyncedAt: Date|null, stats: Record<string, any> }>}
 */
function normalizeExternalMetrics(externalMetrics = {}) {
    const src = externalMetrics && typeof externalMetrics.toObject === "function"
        ? externalMetrics.toObject()
        : (externalMetrics || {});
    const out = {};
    for (const key of PLATFORM_KEYS) {
        const p = src[key];
        if (!p || !p.username) continue;
        const stats = {};
        for (const [k, v] of Object.entries(p)) {
            if (META.has(k)) continue;
            if (typeof v === "number" || Array.isArray(v) || (typeof v === "string" && v)) stats[k] = v;
        }
        out[key] = {
            isVerified: Boolean(p.isVerified),
            username: p.username || "",
            lastSyncedAt: p.lastSyncedAt || null,
            stats,
        };
    }
    return out;
}

/** List of verified platform names, e.g. ['github', 'leetcode']. */
function verifiedPlatformList(externalMetrics = {}) {
    const n = normalizeExternalMetrics(externalMetrics);
    return Object.entries(n).filter(([, p]) => p.isVerified).map(([k]) => k);
}

/**
 * Flatten a provider's `{ stats: {...}, ...topLevel }` result into the
 * `externalMetrics.<platform>.<field>` dot-path `$set` the schema expects.
 * Never writes `undefined`/`null`.
 */
function buildPlatformUpdate(platformKey, remoteData) {
    const s = remoteData?.stats || {};
    const set = { [`externalMetrics.${platformKey}.lastSyncedAt`]: new Date() };
    const put = (field, value) => {
        if (value !== undefined && value !== null) set[`externalMetrics.${platformKey}.${field}`] = value;
    };

    if (platformKey === "leetcode") {
        put("easySolved", s.easySolved);
        put("mediumSolved", s.mediumSolved);
        put("hardSolved", s.hardSolved);
        put("totalSolved", s.totalSolved);
        put("contestRating", s.contestRating);
        put("globalRanking", s.globalRanking);
        put("reputation", s.reputation);
        put("streak", s.streak);
        put("totalActiveDays", s.totalActiveDays);
        put("attendedContestsCount", s.attendedContestsCount);
    } else if (platformKey === "github") {
        put("bio", remoteData.bio);
        put("avatarUrl", remoteData.avatarUrl);
        put("htmlUrl", remoteData.htmlUrl);
        put("portfolioUrl", remoteData.portfolioUrl);
        put("publicRepos", s.publicRepos);
        put("starsEarned", s.starsEarned);
        put("followers", s.followers);
        put("following", s.following);
    } else if (platformKey === "codeforces") {
        put("rating", s.rating);
        put("rank", s.rank);
        put("maxRating", s.maxRating);
        put("maxRank", s.maxRank);
        put("avatarUrl", remoteData.avatarUrl);
        put("contribution", s.contribution);
        put("friendOfCount", s.friendOfCount);
        put("totalSolved", s.totalSolved);
        put("totalSubmissions", s.totalSubmissions);
    } else if (platformKey === "hackerrank") {
        put("badgesCount", s.badgesCount);
        put("followersCount", s.followersCount);
        put("totalSubmissions", s.totalSubmissions);
        put("badges", s.badges);
        put("certificates", s.certificates);
    }
    return set;
}

module.exports = { normalizeExternalMetrics, verifiedPlatformList, buildPlatformUpdate, PLATFORM_KEYS };
