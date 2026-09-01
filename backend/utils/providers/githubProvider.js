const axios = require('axios');
const logger = require('../../services/loggerService.js');

async function fetchGitHubData(username) {
  try {
    const config = process.env.GITHUB_TOKEN
      ? { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}`, 'User-Agent': 'EdTech-App' } }
      : { headers: { 'User-Agent': 'EdTech-App' } };

    const profileRes = await axios.get(`https://api.github.com/users/${username}`, config);
    const profileData = profileRes.data;

    const reposRes = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100`, config);
    const totalStars = Array.isArray(reposRes.data)
      ? reposRes.data.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0)
      : 0;

    console.log(profileData, totalStars);

    return {
      username: profileData.login,
      bio: profileData.bio || '',
      realName: profileData.name || '',
      avatarUrl: profileData.avatar_url || '',
      htmlUrl: profileData.html_url || '',
      portfolioUrl: profileData.blog || '',
      stats: {
        publicRepos: profileData.public_repos || 0,
        starsEarned: totalStars,
        followers: profileData.followers || 0,
        following: profileData.following || 0
      }
    };
  } catch (error) {
    logger.error(`GitHub API Error for ${username}:`, error.message);
    return null;
  }
}

module.exports = { fetchGitHubData };