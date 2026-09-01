const express = require('express');
const isAuthenticated = require('../middlewares/authMiddleware.js');
const authorizeRoles = require('../middlewares/authorizeRoles.js');
const { validate } = require('../middlewares/validationMiddleware.js');
const { recommendationSchemas, reportSchemas } = require('../utils/validationSchemas.js');

const {
  createRecommendation,
  listRecommendations,
  getRecommendation,
  updateRecommendation,
  deleteRecommendation,
  assignRecommendationToBatch,
  assignRecommendationToStudent,
  getRecommendationAssignments
} = require('../controllers/recommendationController.js');

const recommendationRouter = express.Router();

recommendationRouter.use(isAuthenticated, authorizeRoles('college-admin'));

recommendationRouter.post('/', validate(recommendationSchemas.createRecommendation, 'body'), createRecommendation);
recommendationRouter.get('/', validate(reportSchemas.paginationSchema, 'query'), listRecommendations);
recommendationRouter.get('/assignments', validate(reportSchemas.paginationSchema, 'query'), getRecommendationAssignments);
recommendationRouter.get('/:recommendationId', validate(recommendationSchemas.recommendationIdParam, 'params'), getRecommendation);
recommendationRouter.put('/:recommendationId', validate(recommendationSchemas.recommendationIdParam, 'params'), validate(recommendationSchemas.updateRecommendation, 'body'), updateRecommendation);
recommendationRouter.delete('/:recommendationId', validate(recommendationSchemas.recommendationIdParam, 'params'), deleteRecommendation);
recommendationRouter.post('/:recommendationId/assign-batch', validate(recommendationSchemas.recommendationIdParam, 'params'), validate(recommendationSchemas.assignRecommendationToBatch, 'body'), assignRecommendationToBatch);
recommendationRouter.post('/:recommendationId/assign-student', validate(recommendationSchemas.recommendationIdParam, 'params'), validate(recommendationSchemas.assignRecommendationToStudent, 'body'), assignRecommendationToStudent);

module.exports = recommendationRouter;
