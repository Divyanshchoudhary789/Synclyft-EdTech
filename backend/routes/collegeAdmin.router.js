const express = require('express');

const isAuthenticated = require('../middlewares/authMiddleware.js');
const authorizeRoles = require('../middlewares/authorizeRoles.js');
const uploadImage = require('../middlewares/uploadImage.js');
const uploadValidation = require('../middlewares/uploadValidation.js');
const { validate } = require('../middlewares/validationMiddleware.js');
const { collegeAdminSchemas, reportSchemas, collegeInsightsSchemas, recommendationSchemas } = require('../utils/validationSchemas.js');
const { asyncHandler } = require('../utils/errorHandler.js');

const {
  getMyOrganizationProfile,
  upsertOrganizationProfile,
  addVerificationDocument,
  createBatch,
  listBatches,
  getBatchById,
  updateBatch,
  archiveBatch,
  unarchiveBatch,
  deleteBatch,
  addStudentsToBatch,
  removeStudentsFromBatch,
  getBatchCampaigns,
  getStudents,
  getStudentDetails,
  getSeatSummary,
  allocateSeat,
  releaseSeat,
  createCampaign,
  assignCampaignToBatches,
  getCampaignAssignments,
  revokeCampaignAssignment,
  listCampaigns,
  updateCampaign,
  getDashboard,
  getAnalyticsDashboard,
  getStudentsWithAnalytics,
  getStudentsWhoMissedAptitude,
  getTopPlacementReadyCandidates,
  compareBatches,
  generateWorkshopRecommendations,
  getUniversityLevelAIInsights,
  getBatchReadinessStats,
  getDecliningStudents,
  getAIComparativeReport,
  createFollowUp,
  sendBulkNotification,
  assignCampaignToStudents,
  updateStudentIntelligenceProfile,
  getStudentScoreHistory,
  recalculateReadinessScores,
  getCampaignResults,
  askCollegeInsights
} = require('../controllers/collegeAdminController.js');
const {
  getBatchPerformanceReport,
  getBatchPerformanceDashboard,
  getOrganizationPerformanceDashboard,
  downloadBatchPerformanceReport,
  getStudentReportForCollegeAdmin,
  getStudentPerformanceDashboardForCollegeAdmin,
  downloadStudentReportForCollegeAdmin
} = require('../controllers/performanceReportController.js');

const collegeAdminRouter = express.Router();

collegeAdminRouter.use(isAuthenticated, authorizeRoles('college-admin'));

collegeAdminRouter.get('/dashboard', asyncHandler(getDashboard));
collegeAdminRouter.get('/analytics/students', asyncHandler(getStudentsWithAnalytics));
collegeAdminRouter.get('/analytics/dashboard', validate(reportSchemas.downloadQuery, 'query'), asyncHandler(getAnalyticsDashboard));
collegeAdminRouter.get('/organization/me', asyncHandler(getMyOrganizationProfile));
collegeAdminRouter.put('/update/organization/me', validate(collegeAdminSchemas.upsertOrganizationProfile, 'body'), asyncHandler(upsertOrganizationProfile));
collegeAdminRouter.post('/organization/me/verification-documents', uploadImage.single('document'), uploadValidation, validate(collegeAdminSchemas.addVerificationDocument, 'body'), asyncHandler(addVerificationDocument));

collegeAdminRouter.post('/batches', validate(collegeAdminSchemas.createBatch, 'body'), asyncHandler(createBatch));
collegeAdminRouter.get('/batches', validate(reportSchemas.paginationSchema, 'query'), asyncHandler(listBatches));
collegeAdminRouter.get('/batches/:batchId', validate(collegeAdminSchemas.batchIdParam, 'params'), asyncHandler(getBatchById));
collegeAdminRouter.patch('/batches/:batchId', validate(collegeAdminSchemas.batchIdParam, 'params'), validate(collegeAdminSchemas.updateBatch, 'body'), asyncHandler(updateBatch));
collegeAdminRouter.patch('/batches/:batchId/archive', validate(collegeAdminSchemas.batchIdParam, 'params'), asyncHandler(archiveBatch));
collegeAdminRouter.patch('/batches/:batchId/unarchive', validate(collegeAdminSchemas.batchIdParam, 'params'), asyncHandler(unarchiveBatch));
collegeAdminRouter.delete('/batches/:batchId', validate(collegeAdminSchemas.batchIdParam, 'params'), asyncHandler(deleteBatch));
collegeAdminRouter.post('/batches/:batchId/students', validate(collegeAdminSchemas.batchIdParam, 'params'), validate(collegeAdminSchemas.addStudentsToBatch, 'body'), asyncHandler(addStudentsToBatch));
collegeAdminRouter.delete('/batches/:batchId/students', validate(collegeAdminSchemas.batchIdParam, 'params'), validate(collegeAdminSchemas.removeStudentsFromBatch, 'body'), asyncHandler(removeStudentsFromBatch));
collegeAdminRouter.get('/batches/:batchId/campaigns', validate(collegeAdminSchemas.batchIdParam, 'params'), asyncHandler(getBatchCampaigns));

collegeAdminRouter.get('/students', validate(reportSchemas.paginationSchema, 'query'), asyncHandler(getStudents));
collegeAdminRouter.get('/students/:studentId', validate(collegeAdminSchemas.studentIdParam, 'params'), asyncHandler(getStudentDetails));

collegeAdminRouter.get('/seats/summary', asyncHandler(getSeatSummary));
collegeAdminRouter.post('/seats/allocate', validate(collegeAdminSchemas.allocateSeat, 'body'), asyncHandler(allocateSeat));
collegeAdminRouter.post('/seats/release', validate(collegeAdminSchemas.releaseSeat, 'body'), asyncHandler(releaseSeat));

collegeAdminRouter.post('/campaigns', validate(collegeAdminSchemas.createCampaign, 'body'), asyncHandler(createCampaign));
collegeAdminRouter.get('/campaigns', asyncHandler(listCampaigns));
collegeAdminRouter.post('/campaigns/assign-to-batches', validate(collegeAdminSchemas.assignCampaignToBatches, 'body'), asyncHandler(assignCampaignToBatches));
collegeAdminRouter.get('/campaigns/:campaignId/assignments', validate(collegeAdminSchemas.campaignAssignmentParam, 'params'), asyncHandler(getCampaignAssignments));
collegeAdminRouter.patch('/campaigns/:campaignId/assignments/:batchId/revoke', asyncHandler(revokeCampaignAssignment));
collegeAdminRouter.patch('/campaigns/:campaignId', validate(collegeAdminSchemas.campaignIdParam, 'params'), validate(collegeAdminSchemas.updateCampaign, 'body'), asyncHandler(updateCampaign));

collegeAdminRouter.get('/insights/students-missed-aptitude', validate(collegeInsightsSchemas.missedAptitude, 'query'), asyncHandler(getStudentsWhoMissedAptitude));
collegeAdminRouter.get('/insights/top-candidates', validate(collegeInsightsSchemas.topCandidates, 'query'), asyncHandler(getTopPlacementReadyCandidates));
collegeAdminRouter.get('/insights/compare-batches', validate(collegeInsightsSchemas.compareBatches, 'query'), asyncHandler(compareBatches));
collegeAdminRouter.get('/insights/workshop-recommendations', asyncHandler(generateWorkshopRecommendations));
collegeAdminRouter.get('/insights/university-level', validate(collegeInsightsSchemas.universityInsights, 'query'), asyncHandler(getUniversityLevelAIInsights));
collegeAdminRouter.post('/insights/ask', asyncHandler(askCollegeInsights));
collegeAdminRouter.get('/insights/batch-readiness/:batchId', validate(collegeInsightsSchemas.batchReadinessQuery, 'params'), asyncHandler(getBatchReadinessStats));
collegeAdminRouter.get('/insights/declining-students', validate(collegeInsightsSchemas.decliningStudentsQuery, 'query'), asyncHandler(getDecliningStudents));
collegeAdminRouter.get('/insights/ai-comparative-report', validate(collegeInsightsSchemas.aiComparativeReport, 'query'), asyncHandler(getAIComparativeReport));
collegeAdminRouter.post('/insights/recalculate-scores', validate(collegeAdminSchemas.recalculateScores, 'body'), asyncHandler(recalculateReadinessScores));

collegeAdminRouter.post('/follow-ups', validate(recommendationSchemas.createFollowUp, 'body'), asyncHandler(createFollowUp));

collegeAdminRouter.post('/notifications/send-bulk', validate(recommendationSchemas.bulkNotificationQuery, 'body'), asyncHandler(sendBulkNotification));

collegeAdminRouter.post('/campaigns/:campaignId/assign-students', validate(collegeAdminSchemas.campaignIdParam, 'params'), validate(recommendationSchemas.assignCampaignToStudents, 'body'), asyncHandler(assignCampaignToStudents));
collegeAdminRouter.get('/campaigns/:campaignId/results', validate(collegeAdminSchemas.campaignIdParam, 'params'), asyncHandler(getCampaignResults));

collegeAdminRouter.put('/students/:studentId/intelligence-profile', validate(collegeAdminSchemas.studentIdParam, 'params'), validate(recommendationSchemas.updateStudentIntelligence, 'body'), asyncHandler(updateStudentIntelligenceProfile));
collegeAdminRouter.get('/students/:studentId/score-history', validate(collegeAdminSchemas.studentIdParam, 'params'), validate(recommendationSchemas.scoreHistoryQuery, 'query'), asyncHandler(getStudentScoreHistory));

collegeAdminRouter.get('/reports/dashboard', validate(reportSchemas.downloadQuery, 'query'), asyncHandler(getOrganizationPerformanceDashboard));
collegeAdminRouter.get('/reports/students/:studentId', validate(reportSchemas.studentIdParam, 'params'), validate(reportSchemas.downloadQuery, 'query'), asyncHandler(getStudentReportForCollegeAdmin));
collegeAdminRouter.get('/reports/students/:studentId/dashboard', validate(reportSchemas.studentIdParam, 'params'), validate(reportSchemas.downloadQuery, 'query'), asyncHandler(getStudentPerformanceDashboardForCollegeAdmin));
collegeAdminRouter.get('/reports/students/:studentId/download', validate(reportSchemas.studentIdParam, 'params'), validate(reportSchemas.downloadQuery, 'query'), asyncHandler(downloadStudentReportForCollegeAdmin));
collegeAdminRouter.get('/reports/batches/:batchId', validate(reportSchemas.batchIdParam, 'params'), validate(reportSchemas.downloadQuery, 'query'), asyncHandler(getBatchPerformanceReport));
collegeAdminRouter.get('/reports/batches/:batchId/dashboard', validate(reportSchemas.batchIdParam, 'params'), validate(reportSchemas.downloadQuery, 'query'), asyncHandler(getBatchPerformanceDashboard));
collegeAdminRouter.get('/reports/batches/:batchId/download', validate(reportSchemas.batchIdParam, 'params'), validate(reportSchemas.downloadQuery, 'query'), asyncHandler(downloadBatchPerformanceReport));

module.exports = collegeAdminRouter;