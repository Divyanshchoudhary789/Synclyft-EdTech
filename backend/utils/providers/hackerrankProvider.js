const axios = require('axios');
const logger = require('../../services/loggerService.js');

const HR_PRIMARY_BASE = "https://www.hackerrank.com/rest/contests/master/hackers";
const HR_BACKUP_BASE = "https://www.hackerrank.com/rest/hackers";

const ENDPOINTS = {
  profile: "/profile",
  badges: "/badges",
  certificates: "/certificates",
  submissions: "/submission_histories"
};

async function _fetchEndpoint(username, endpointName, pathSuffix) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json"
  };

  const urls = [
    `${HR_PRIMARY_BASE}/${username}${pathSuffix}`,
    `${HR_BACKUP_BASE}/${username}${pathSuffix}`
  ];

  for (const url of urls) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await axios.get(url, { headers, timeout: 8000 });
        if (response.data) return response.data;
      } catch (error) {
        if (error.response) {
          if (error.response.status === 404) {
            if (endpointName === "profile" && url === urls[urls.length - 1]) {
              throw new Error("PROFILE_NOT_FOUND");
            }
            break;
          }
          if (error.response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          if (error.response.status >= 500) {
            continue;
          }
        }
        if (attempt === 3) break;
      }
    }
  }
  return {};
}

async function fetchHackerRankData(username) {
  try {
    const keys = Object.keys(ENDPOINTS);
    const promises = keys.map(key => _fetchEndpoint(username, key, ENDPOINTS[key]));
    
    const [profileRes, badgesRes, certsRes, submissionsRes] = await Promise.all(promises);

    const profileModel = profileRes?.model || {};
    if (!profileModel.username && !profileModel.name) {
      if (Object.keys(profileModel).length === 0) return null;
    }

    const bioParts = [
      profileModel.short_bio || '',
      profileModel.jobs_headline || '',
      profileModel.personal_first_name || ''
    ].filter(Boolean).join(' ');

    const badgesList = Array.isArray(badgesRes?.models) ? badgesRes.models : [];
    const formattedBadges = badgesList
      .filter(b => b && b.badge_name)
      .map(b => ({ name: b.badge_name, stars: b.stars || 0 }));

    const certsList = Array.isArray(certsRes?.data) ? certsRes.data : [];
    const formattedCerts = certsList
      .filter(c => c && c.attributes?.certificate_title)
      .map(c => ({ title: c.attributes.certificate_title }));

    let totalSubmissions = 0;
    if (submissionsRes && typeof submissionsRes === 'object' && !Array.isArray(submissionsRes)) {
      totalSubmissions = Object.values(submissionsRes).reduce((acc, val) => {
        return typeof val === 'number' ? acc + val : acc;
      }, 0);
    }

    return {
      username: profileModel.username || username,
      bio: bioParts,
      stats: {
        badgesCount: formattedBadges.length || parseInt(profileModel.level) || 0,
        followersCount: parseInt(profileModel.followers_count) || 0,
        totalSubmissions: totalSubmissions,
        badges: formattedBadges,
        certificates: formattedCerts
      }
    };
  } catch (error) {
    if (error.message === "PROFILE_NOT_FOUND") {
      logger.error(`HackerRank profile completely missing for ${username}`);
      return null;
    }
    logger.error(`HackerRank Pipeline Error for ${username}: ${error.message}`);
    return null;
  }
}

module.exports = { fetchHackerRankData };