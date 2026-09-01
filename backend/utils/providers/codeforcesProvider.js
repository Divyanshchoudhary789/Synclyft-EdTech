const axios = require('axios');
const logger = require('../../services/loggerService.js');

async function fetchCodeforcesData(username) {
  try {
    const res = await axios.get(`https://codeforces.com/api/user.info?handles=${username}`, { timeout: 6000 });
    if (res.data.status !== 'OK') return null;

    const user = res.data.result[0];
    return {
      username: user.handle,
      bio: `${user.firstName || ''} ${user.lastName || ''} ${user.organization || ''}`,
      realName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      avatarUrl: user.avatar || '',
      stats: {
        rating: user.rating || 0,
        rank: user.rank || 'unranked',
        maxRating: user.maxRating || 0,
        maxRank: user.maxRank || 'unranked',
        contribution: user.contribution || 0,
        friendOfCount: user.friendOfCount || 0,
        totalSolved: 0,
        totalSubmissions: 0
      }
    };
  } catch (error) {
    logger.error(`Codeforces Error for ${username}:`, error.message);
    return null;
  }
}

module.exports = { fetchCodeforcesData };