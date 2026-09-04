const axios = require('axios');
const logger = require('../../services/loggerService.js');

const BASE = 'https://api.github.com';

async function ghGet(path, useToken) {
  const headers = { 'User-Agent': 'EdTech-App', Accept: 'application/vnd.github+json' };
  if (useToken && process.env.GITHUB_TOKEN) headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  return axios.get(`${BASE}${path}`, { headers, timeout: 8000 });
}

// Try authenticated first (5000 req/hr); if the token is missing/expired/revoked
// (401/403) fall back to unauthenticated (60 req/hr) so the feature still works.
async function ghGetResilient(path) {
  const hasToken = Boolean(process.env.GITHUB_TOKEN);
  if (hasToken) {
    try {
      return await ghGet(path, true);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        logger.warn(`GitHub token rejected (${status}) — retrying unauthenticated`);
      } else {
        throw err;
      }
    }
  }
  return ghGet(path, false);
}

async function fetchGitHubData(username) {
  try {
    const profileRes = await ghGetResilient(`/users/${encodeURIComponent(username)}`);
    const p = profileRes.data;

    let totalStars = 0;
    try {
      const reposRes = await ghGetResilient(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`);
      if (Array.isArray(reposRes.data)) {
        totalStars = reposRes.data.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
      }
    } catch (e) {
      logger.warn(`GitHub repos fetch failed for ${username}: ${e.message}`);
    }

    return {
      username: p.login,
      bio: p.bio || '',
      realName: p.name || '',
      avatarUrl: p.avatar_url || '',
      htmlUrl: p.html_url || '',
      portfolioUrl: p.blog || '',
      stats: {
        publicRepos: p.public_repos || 0,
        starsEarned: totalStars,
        followers: p.followers || 0,
        following: p.following || 0,
      },
    };
  } catch (error) {
    const status = error.response?.status;
    if (status === 404) {
      logger.warn(`GitHub user not found: ${username}`);
    } else {
      logger.error(`GitHub API error for ${username}: ${error.message}`);
    }
    return null;
  }
}

module.exports = { fetchGitHubData };
