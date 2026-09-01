const axios = require('axios');
const logger = require('../../services/loggerService.js');

async function fetchLeetCodeData(username) {
  const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

  const query = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        username
        githubUrl
        twitterUrl
        linkedinUrl
        profile {
          realName
          aboutMe
          school
          websites
          countryName
          ranking
          reputation
        }
        submitStats {
          acSubmissionNum { difficulty count submissions }
          totalSubmissionNum { difficulty count submissions }
        }
        userCalendar {
          streak
          totalActiveDays
        }
      }
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        topPercentage
        badge { name }
      }
    }
  `;

  try {
    const response = await axios.post(LEETCODE_GRAPHQL_URL, {
      query,
      variables: { username }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 8000
    });

    const userData = response.data?.data?.matchedUser;
    const contestData = response.data?.data?.userContestRanking;

    if (!userData) return null;

    const stats = userData.submitStats?.acSubmissionNum || [];

    return {
      username: userData.username,
      bio: userData.profile?.aboutMe || '',
      ranking: userData.profile?.ranking || 0,
      realName: userData.profile?.realName || '',
      socialLinks: {
        github: userData.githubUrl || '',
        linkedin: userData.linkedinUrl || ''
      },
      stats: {
        easySolved: stats.find(d => d.difficulty === 'Easy')?.count || 0,
        mediumSolved: stats.find(d => d.difficulty === 'Medium')?.count || 0,
        hardSolved: stats.find(d => d.difficulty === 'Hard')?.count || 0,
        totalSolved: stats.find(d => d.difficulty === 'All')?.count || 0,
        contestRating: contestData ? Math.round(contestData.rating) : 0,
        globalRanking: userData.profile?.ranking || 0,
        reputation: userData.profile?.reputation || 0,
        streak: userData.userCalendar?.streak || 0,
        totalActiveDays: userData.userCalendar?.totalActiveDays || 0,
        attendedContestsCount: contestData ? contestData.attendedContestsCount : 0
      }
    };
  } catch (error) {
    logger.error(`LeetCode Fetch Error for ${username}:`, error.message);
    return null;
  }
}

module.exports = { fetchLeetCodeData };