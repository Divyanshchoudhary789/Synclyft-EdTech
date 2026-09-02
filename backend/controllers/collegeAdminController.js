const mongoose = require('mongoose');

const NotificationService = require('../services/notificationService');
const WorkshopRecommendation = require('../models/WorkshopRecommendationModel.js');
const PlacementInsight = require('../models/PlacementInsightModel.js');
const InterviewSession = require('../models/InterviewSessionModel.js');
const RoundDetail = require('../models/RoundDetailModel.js');
const User = require('../models/userModel.js');
const Organization = require('../models/OrganizationModel.js');
const Subscription = require('../models/SubscriptionModel.js');
const SeatManagement = require('../models/SeatManagementModel.js');
const PlacementBatch = require('../models/PlacementBatchModel.js');
const PlacementScoreHistory = require('../models/PlacementScoreHistoryModel.js');
const Campaign = require('../models/CampaignModel.js');
const StudentProfile = require('../models/StudentProfileModel.js');
const Notification = require('../models/NotificationModel.js');
const AuditLog = require('../models/AuditLogModel.js');
const InterviewAnalytics = require('../models/InterviewAnalyticsModel.js');
const ProctorRiskReport = require('../models/ProctorRiskReportModel.js');
const PerformanceInsight = require('../models/PerformanceInsightModel.js');
const PlacementScoreEngine = require('../services/placementScoreEngine.js');
const FollowUpSchedule = require('../models/FollowUpScheduleModel.js');
const EmailQueue = require('../models/EmailQueueModel.js');
const logger = require('../services/loggerService.js');

const uploadToR2 = require('../utils/r2Upload.js');
const sendError = require('../utils/sendError.js');

const buildPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const getOrCreateOrganization = async (user) => {
  let organization = await Organization.findOne({ user: user._id });

  if (!organization) {
    organization = await Organization.create({
      user: user._id,
      organizationName: user.organization,
      organizationType: 'college',
      primaryContactPerson: {
        name: user.name,
        email: user.email,
        phone: ''
      },
      status: 'pending_verification',
      isVerified: false
    });
  }

  return organization;
};

const fetchCollegeContext = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const organization = await getOrCreateOrganization(user);
  // College-admin subscriptions store the Organization doc _id in `organization`
  // (not the admin's user _id). Query by the org id; fall back to the user id
  // for individual-style records.
  const subscription = await Subscription.findOne({ organization: organization._id }).sort({ createdAt: -1 })
    || await Subscription.findOne({ organization: user._id, ownerType: 'individual' }).sort({ createdAt: -1 });
  const seatManagement = subscription ? await SeatManagement.findOne({ subscription: subscription._id }) : null;

  return { user, organization, subscription, seatManagement };
};

const requireBatchManagementAccess = (context, res) => {
  if (!context.subscription) {
    res.status(403).json({ success: false, message: 'Active subscription required to manage batches.' });
    return false;
  }

  if (!context.subscription.isActive() && !context.subscription.isInGracePeriod()) {
    res.status(403).json({ success: false, message: 'Subscription is not active. Please complete payment to access this feature.' });
    return false;
  }

  if (!context.subscription.hasFeature('batchManagement')) {
    res.status(403).json({ success: false, message: 'Your subscription plan does not include batch management.' });
    return false;
  }

  return true;
};

const normalizeStudentIds = (studentIds) => {
  if (!studentIds) return [];
  return Array.isArray(studentIds) ? studentIds : [studentIds];
};

const getMyOrganizationProfile = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  return res.status(200).json({
    success: true,
    message: 'Organization profile fetched successfully.',
    data: context
  });
};

const upsertOrganizationProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  const organization = await getOrCreateOrganization(user);
  const {
    organizationName,
    organizationType,
    registrationNumber,
    address,
    phone,
    website,
    primaryContactPerson,
    secondaryContactPerson,
    billingContactPerson,
    totalStudents,
    totalFaculty,
    establishedYear,
    accreditation,
    brandColor,
    preferences,
    taxInformation,
  } = req.body;

  if (organizationName !== undefined) organization.organizationName = organizationName;
  if (organizationType !== undefined) organization.organizationType = organizationType;
  if (registrationNumber !== undefined) organization.registrationNumber = registrationNumber;
  if (address !== undefined) organization.address = address;
  if (phone !== undefined) organization.phone = phone;
  if (website !== undefined) organization.website = website;
  if (primaryContactPerson !== undefined) organization.primaryContactPerson = primaryContactPerson;
  if (secondaryContactPerson !== undefined) organization.secondaryContactPerson = secondaryContactPerson;
  if (billingContactPerson !== undefined) organization.billingContactPerson = billingContactPerson;
  if (totalStudents !== undefined) organization.totalStudents = totalStudents;
  if (totalFaculty !== undefined) organization.totalFaculty = totalFaculty;
  if (establishedYear !== undefined) organization.establishedYear = establishedYear;
  if (accreditation !== undefined) organization.accreditation = accreditation;
  if (brandColor !== undefined) organization.brandColor = brandColor;
  if (preferences !== undefined) organization.preferences = preferences;
  if (taxInformation !== undefined) organization.taxInformation = taxInformation;

  await organization.save();

  user.organization = organization.organizationName;
  await user.save();

  await AuditLog.logAction({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    action: 'PROFILE_UPDATE',
    resourceType: 'organization',
    resourceId: organization._id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 200,
    details: { organizationName: organization.organizationName }
  });

  return res.status(200).json({
    success: true,
    message: 'Organization profile saved successfully.',
    data: organization
  });
};

const addVerificationDocument = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  const organization = await getOrCreateOrganization(user);
  const file = req.file;
  const { documentType } = req.body;

  if (!file) {
    return res.status(400).json({ success: false, message: 'Verification document is required.' });
  }

  const uploaded = await uploadToR2(file, 'organization-documents');

  organization.verificationDocuments.push({
    documentType: documentType || 'registration_certificate',
    documentUrl: uploaded.url,
    uploadedAt: new Date()
  });
  organization.status = 'pending_verification';
  await organization.save();

  return res.status(201).json({
    success: true,
    message: 'Verification document uploaded successfully.',
    data: organization.verificationDocuments[organization.verificationDocuments.length - 1]
  });
};

const getStudents = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  const { page, limit } = buildPagination(req.query);
  const search = (req.query.search || '').trim().toLowerCase();
  const branch = (req.query.branch || '').trim();
  const graduationYear = req.query.graduationYear ? Number(req.query.graduationYear) : null;
  // sort: 'recent' (default) | 'readiness_desc' | 'readiness_asc' | 'name'
  const sort = String(req.query.sort || 'recent');
  const band = String(req.query.band || 'all'); // all | top | high | mid | risk

  // Build the full ordered roster in one pass (lightweight fields only), then
  // filter + sort + paginate in memory. Correct global sort/search across the
  // whole cohort, and still cheap for realistic college sizes.
  const students = await User.find({ role: 'student', organization: user.organization })
    .select('name email status isEmailVerified createdAt')
    .lean();

  const profiles = await StudentProfile.find({ user: { $in: students.map((s) => s._id) } })
    .select('user branch graduationYear placementReadinessScore mockHistoryCount lastMockAt skills')
    .lean();
  const profileByUser = new Map(profiles.map((p) => [String(p.user), p]));

  let rows = students.map((s) => {
    const p = profileByUser.get(String(s._id));
    return {
      _id: p?._id ?? null,
      user: {
        _id: s._id, name: s.name, email: s.email, role: 'student',
        organization: user.organization, status: s.status,
        isEmailVerified: s.isEmailVerified, createdAt: s.createdAt,
      },
      branch: p?.branch ?? null,
      graduationYear: p?.graduationYear ?? null,
      placementReadinessScore: Math.round(p?.placementReadinessScore ?? 0),
      mockHistoryCount: p?.mockHistoryCount ?? 0,
      lastMockAt: p?.lastMockAt ?? null,
      skills: p?.skills ?? [],
      onboarded: Boolean(p),
      _createdAt: s.createdAt,
    };
  });

  if (search) rows = rows.filter((r) =>
    r.user.name.toLowerCase().includes(search) ||
    r.user.email.toLowerCase().includes(search) ||
    (r.branch || '').toLowerCase().includes(search));
  if (branch) rows = rows.filter((r) => (r.branch || '').toLowerCase() === branch.toLowerCase());
  if (graduationYear) rows = rows.filter((r) => Number(r.graduationYear) === graduationYear);

  const bandTest = { top: (n) => n >= 85, high: (n) => n >= 70 && n < 85, mid: (n) => n >= 50 && n < 70, risk: (n) => n < 50 }[band];
  if (bandTest) rows = rows.filter((r) => bandTest(r.placementReadinessScore));

  rows.sort((a, b) => {
    if (sort === 'readiness_desc') return b.placementReadinessScore - a.placementReadinessScore;
    if (sort === 'readiness_asc') return a.placementReadinessScore - b.placementReadinessScore;
    if (sort === 'name') return a.user.name.localeCompare(b.user.name);
    return new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime();
  });

  const total = rows.length;
  const start = (page - 1) * limit;
  const pageRows = rows.slice(start, start + limit).map((r) => { delete r._createdAt; return r; });

  return res.status(200).json({
    success: true,
    message: 'Students fetched successfully.',
    data: pageRows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
};

const getStudentDetails = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  const { studentId } = req.params;
  if (!mongoose.isValidObjectId(studentId)) {
    return res.status(400).json({ success: false, message: 'Invalid student id.' });
  }

  const student = await User.findOne({ _id: studentId, role: 'student', organization: user.organization });
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found in your organization.' });
  }

  const [profile, sessions, analytics, scoreHistory, insights, batch] = await Promise.all([
    StudentProfile.findOne({ user: student._id }).populate('user', 'name email role organization status isEmailVerified createdAt'),
    InterviewSession.find({ student: student._id }).sort({ createdAt: -1 }).limit(10)
      .select('targetRole status finalCompositeScore finalGrade proctoringRiskScore startedAt completedAt createdAt'),
    InterviewAnalytics.find({ student: student._id }).sort({ createdAt: -1 }).limit(5)
      .select('overallScore finalGrade proctoringRiskScore roundAnalytics completedAt'),
    PlacementScoreHistory.find({ student: student._id }).sort({ recordedAt: -1, createdAt: -1 }).limit(12)
      .select('overallScore scoreBreakdown trend recordedAt createdAt notes'),
    PerformanceInsight.find({ student: student._id }).sort({ createdAt: -1 }).limit(3)
      .select('narrativeSummary strengths weaknesses skillGapsVsJd actionableStudyPlan createdAt'),
    PlacementBatch.findOne({ organization: user._id, 'students.student': student._id })
      .select('batchName batchCode department section graduationYear'),
  ]);

  return res.status(200).json({
    success: true,
    message: 'Student details fetched successfully.',
    data: {
      student,
      profile,
      batch,
      recentSessions: sessions,
      recentAnalytics: analytics,
      scoreHistory,
      insights,
    }
  });
};

const getSeatSummary = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  const { subscription, seatManagement } = context;
  return res.status(200).json({
    success: true,
    message: 'Seat summary fetched successfully.',
    data: {
      subscription,
      seatManagement,
      usagePercentage: seatManagement ? seatManagement.getUsagePercentage() : 0
    }
  });
};

const createBatch = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const { batchName, academicYear, graduationYear, department, section, description, placementOfficerNotes, batchCode } = req.body;
  const generatedBatchCode = batchCode || `${String(batchName).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${academicYear}-${Date.now().toString().slice(-4)}`;

  const batch = await PlacementBatch.create({
    organization: context.user._id,
    createdBy: context.user._id,
    batchName,
    batchCode: generatedBatchCode,
    academicYear,
    graduationYear,
    department,
    section,
    description,
    placementOfficerNotes,
    status: 'active'
  });

  await AuditLog.logAction({
    user: context.user._id,
    userEmail: context.user.email,
    userRole: context.user.role,
    action: 'ADMIN_ACTION',
    resourceType: 'organization',
    resourceId: batch._id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 201,
    details: { batchName, academicYear, graduationYear, department }
  });

  return res.status(201).json({
    success: true,
    message: 'Batch created successfully.',
    data: batch
  });
};

const listBatches = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const { page, limit, skip } = buildPagination(req.query);
  const query = { organization: context.user._id };

  if (req.query.status) query.status = req.query.status;
  if (req.query.department) query.department = { $regex: req.query.department, $options: 'i' };
  if (req.query.batchName) query.batchName = { $regex: req.query.batchName, $options: 'i' };
  if (req.query.graduationYear) query.graduationYear = Number(req.query.graduationYear);
  if (req.query.academicYear) query.academicYear = { $regex: req.query.academicYear, $options: 'i' };

  const total = await PlacementBatch.countDocuments(query);
  const batches = await PlacementBatch.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('students.student', 'name email role organization status isEmailVerified')
    .populate('campaignAssignments.campaign', 'title deadline isActive');

  return res.status(200).json({
    success: true,
    message: 'Batches fetched successfully.',
    data: batches,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
};

const getBatchById = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const batch = await PlacementBatch.findOne({ _id: req.params.batchId, organization: context.user._id })
    .populate('students.student', 'name email role organization status isEmailVerified createdAt')
    .populate('campaignAssignments.campaign', 'title deadline isActive targetDepartment targetBatch config');

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found.' });
  }

  return res.status(200).json({
    success: true,
    message: 'Batch fetched successfully.',
    data: batch
  });
};

const updateBatch = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const batch = await PlacementBatch.findOne({ _id: req.params.batchId, organization: context.user._id });
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found.' });
  }

  const allowedFields = ['batchName', 'academicYear', 'graduationYear', 'department', 'section', 'description', 'placementOfficerNotes', 'status'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      batch[field] = req.body[field];
    }
  });

  await batch.save();

  await AuditLog.logAction({
    user: context.user._id,
    userEmail: context.user.email,
    userRole: context.user.role,
    action: 'ADMIN_ACTION',
    resourceType: 'organization',
    resourceId: batch._id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 200,
    details: { batchId: batch._id, updatedFields: Object.keys(req.body) }
  });

  return res.status(200).json({
    success: true,
    message: 'Batch updated successfully.',
    data: batch
  });
};

const archiveBatch = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const batch = await PlacementBatch.findOne({ _id: req.params.batchId, organization: context.user._id });
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found.' });
  }

  if (batch.status === 'archived') {
    return res.status(409).json({
      success: false,
      message: 'Batch is already archived.',
      data: batch
    });
  }

  await batch.archiveBatch();

  await AuditLog.logAction({
    user: context.user._id,
    userEmail: context.user.email,
    userRole: context.user.role,
    action: 'ADMIN_ACTION',
    resourceType: 'organization',
    resourceId: batch._id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 200,
    details: { batchId: batch._id, action: 'archive' }
  });

  return res.status(200).json({
    success: true,
    message: 'Batch archived successfully.',
    data: batch
  });
};

const unarchiveBatch = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const batch = await PlacementBatch.findOne({ _id: req.params.batchId, organization: context.user._id });
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found.' });
  }

  if (batch.status !== 'archived') {
    return res.status(409).json({
      success: false,
      message: `Only archived batches can be unarchived. Current status: '${batch.status}'.`,
      data: batch
    });
  }

  await batch.unarchiveBatch();

  await AuditLog.logAction({
    user: context.user._id,
    userEmail: context.user.email,
    userRole: context.user.role,
    action: 'ADMIN_ACTION',
    resourceType: 'organization',
    resourceId: batch._id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 200,
    details: { batchId: batch._id, action: 'unarchive' }
  });

  return res.status(200).json({
    success: true,
    message: 'Batch unarchived successfully.',
    data: batch
  });
};

const deleteBatch = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const batch = await PlacementBatch.findOne({ _id: req.params.batchId, organization: context.user._id });
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found.' });
  }

  // Detach this batch from any campaigns that reference it so we don't leave
  // dangling references after the hard delete. Allows deleting a batch in any
  // status (active / paused / archived) without archiving it first.
  await Campaign.updateMany(
    { creator: context.user._id, 'assignedBatches.batch': batch._id },
    { $pull: { assignedBatches: { batch: batch._id } } }
  );

  await PlacementBatch.deleteOne({ _id: batch._id, organization: context.user._id });

  await AuditLog.logAction({
    user: context.user._id,
    userEmail: context.user.email,
    userRole: context.user.role,
    action: 'ADMIN_ACTION',
    resourceType: 'organization',
    resourceId: batch._id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 200,
    details: { batchId: batch._id, action: 'delete', batchName: batch.batchName }
  });

  return res.status(200).json({
    success: true,
    message: 'Batch deleted permanently.',
    data: { _id: batch._id }
  });
};

const addStudentsToBatch = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const batch = await PlacementBatch.findOne({ _id: req.params.batchId, organization: context.user._id });
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found.' });
  }

  const studentIds = normalizeStudentIds(req.body.studentIds);
  if (studentIds.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one studentId is required.' });
  }

  const students = await User.find({
    _id: { $in: studentIds },
    role: 'student',
    organization: context.user.organization
  }).select('_id name email');

  if (students.length !== studentIds.length) {
    return res.status(400).json({ success: false, message: 'One or more students are invalid or not in your organization.' });
  }

  await batch.addStudents(studentIds, req.body.notes || '');

  return res.status(200).json({
    success: true,
    message: 'Students added to batch successfully.',
    data: batch
  });
};

const removeStudentsFromBatch = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const batch = await PlacementBatch.findOne({ _id: req.params.batchId, organization: context.user._id });
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found.' });
  }

  const studentIds = normalizeStudentIds(req.body.studentIds);
  if (studentIds.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one studentId is required.' });
  }

  await batch.removeStudents(studentIds, req.body.notes || '');

  return res.status(200).json({
    success: true,
    message: 'Students removed from batch successfully.',
    data: batch
  });
};

const getBatchCampaigns = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const batch = await PlacementBatch.findOne({ _id: req.params.batchId, organization: context.user._id });
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found.' });
  }

  const campaigns = await Campaign.find({
    creator: context.user._id,
    $or: [
      { 'assignedBatches.batch': batch._id },
      { targetBatch: batch.graduationYear },
      { targetDepartment: batch.department }
    ]
  }).sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    message: 'Batch campaigns fetched successfully.',
    data: campaigns
  });
};

const allocateSeat = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  const { studentId, notes } = req.body;
  if (!mongoose.isValidObjectId(studentId)) {
    return res.status(400).json({ success: false, message: 'Invalid student id.' });
  }

  const student = await User.findOne({ _id: studentId, role: 'student', organization: user.organization });
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found in your organization.' });
  }

  const organization = await getOrCreateOrganization(user);
  const subscription = await Subscription.findOne({ organization: organization._id, status: { $in: ['active', 'grace_period'] } });
  if (!subscription) {
    return res.status(400).json({ success: false, message: 'Active subscription required to allocate seats.' });
  }

  const seatManagement = await SeatManagement.findOne({ subscription: subscription._id });
  if (!seatManagement) {
    return res.status(404).json({ success: false, message: 'Seat management record not found.' });
  }

  await seatManagement.allocateSeatToStudent(student._id);

  await NotificationService.dispatch({
    recipient: student._id,
    recipientRole: 'student',
    type: 'seat_allocated',
    title: 'Seat Allocated',
    message: `Your seat has been allocated by ${user.organization}.`,
    actionUrl: '/student/dashboard',
    actionText: 'View dashboard',
    priority: 'high',
    metadata: { notes }
  });

  return res.status(200).json({
    success: true,
    message: 'Seat allocated successfully.',
    data: seatManagement
  });
};

const releaseSeat = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  const { studentId, reason } = req.body;
  if (!mongoose.isValidObjectId(studentId)) {
    return res.status(400).json({ success: false, message: 'Invalid student id.' });
  }

  const student = await User.findOne({ _id: studentId, role: 'student', organization: user.organization });
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found in your organization.' });
  }

  const organization = await getOrCreateOrganization(user);
  const subscription = await Subscription.findOne({ organization: organization._id, status: { $in: ['active', 'grace_period'] } });
  if (!subscription) {
    return res.status(400).json({ success: false, message: 'Active subscription required to release seats.' });
  }

  const seatManagement = await SeatManagement.findOne({ subscription: subscription._id });
  if (!seatManagement) {
    return res.status(404).json({ success: false, message: 'Seat management record not found.' });
  }

  await seatManagement.releaseSeatFromStudent(student._id, reason || null);

  await NotificationService.dispatch({
    recipient: student._id,
    recipientRole: 'student',
    type: 'seat_released',
    title: 'Seat Released',
    message: `Your seat has been released by ${user.organization}.`,
    actionUrl: '/student/dashboard',
    actionText: 'View dashboard',
    priority: 'high',
    metadata: { reason }
  });

  return res.status(200).json({
    success: true,
    message: 'Seat released successfully.',
    data: seatManagement
  });
};

const createCampaign = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  const campaign = await Campaign.create({
    creator: user._id,
    title: req.body.title,
    description: req.body.description,
    targetDepartment: req.body.targetDepartment || [],
    targetBatch: req.body.targetBatch || [],
    config: req.body.config || {},
    // Default a campaign deadline to 30 days out if the officer didn't set one.
    deadline: req.body.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: req.body.isActive ?? true
  });

  return res.status(201).json({
    success: true,
    message: 'Campaign created successfully.',
    data: campaign
  });
};

const assignCampaignToBatches = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const { campaignId, batchIds, notifyStudents = true } = req.body;
  const normalizedBatchIds = normalizeStudentIds(batchIds);

  if (normalizedBatchIds.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one batchId is required.' });
  }

  const campaign = await Campaign.findOne({ _id: campaignId, creator: context.user._id });
  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found.' });
  }

  const batches = await PlacementBatch.find({
    _id: { $in: normalizedBatchIds },
    organization: context.user._id,
    status: { $ne: 'archived' }
  }).populate('students.student', 'name email role organization status isEmailVerified');

  if (batches.length !== normalizedBatchIds.length) {
    return res.status(400).json({ success: false, message: 'One or more batches are invalid or archived.' });
  }

  const assignmentMap = new Map((campaign.assignedBatches || []).map(entry => [entry.batch.toString(), entry]));
  const allStudentIds = new Set();

  batches.forEach((batch) => {
    const activeStudents = batch.students.filter(entry => entry.status === 'active' && entry.student).map(entry => entry.student._id);
    activeStudents.forEach((student) => allStudentIds.add(student.toString()));

    assignmentMap.set(batch._id.toString(), {
      batch: batch._id,
      assignedBy: context.user._id,
      assignedAt: new Date(),
      notifyStudents,
      studentCount: activeStudents.length,
      status: 'active'
    });
  });

  campaign.assignedBatches = [...assignmentMap.values()];
  campaign.assignmentMode = 'batch_assignment';
  await campaign.save();

  if (notifyStudents && allStudentIds.size > 0) {
    await Notification.sendBulkNotification([...allStudentIds], {
      recipientRole: 'student',
      type: 'campaign_opened',
      title: `New placement campaign: ${campaign.title}`,
      message: `A new placement campaign has been assigned to your batch by ${context.organization.organizationName}.`,
      description: campaign.description,
      actionUrl: `/student/campaigns/${campaign._id}`,
      actionText: 'View campaign',
      relatedEntity: { type: 'campaign', entityId: campaign._id },
      priority: 'high',
      metadata: {
        campaignId: campaign._id,
        batchIds: normalizedBatchIds
      }
    });
  }

  await AuditLog.logAction({
    user: context.user._id,
    userEmail: context.user.email,
    userRole: context.user.role,
    action: 'ADMIN_ACTION',
    resourceType: 'organization',
    resourceId: campaign._id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 200,
    details: { campaignId, batchIds: normalizedBatchIds, notifyStudents, studentCount: allStudentIds.size }
  });

  return res.status(200).json({
    success: true,
    message: 'Campaign assigned to batches successfully.',
    data: {
      campaign,
      assignedBatchCount: normalizedBatchIds.length,
      notifiedStudentCount: allStudentIds.size
    }
  });
};

const getCampaignAssignments = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const campaign = await Campaign.findOne({ _id: req.params.campaignId, creator: context.user._id })
    .populate('assignedBatches.batch', 'batchName batchCode academicYear graduationYear department section status studentCount')
    .populate('assignedBatches.assignedBy', 'name email role');

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found.' });
  }

  return res.status(200).json({
    success: true,
    message: 'Campaign assignments fetched successfully.',
    data: campaign.assignedBatches
  });
};

const revokeCampaignAssignment = async (req, res) => {
  const context = await fetchCollegeContext(req.user.id);
  if (!context) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  if (!requireBatchManagementAccess(context, res)) {
    return;
  }

  const { campaignId, batchId } = req.params;
  const campaign = await Campaign.findOne({ _id: campaignId, creator: context.user._id });
  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found.' });
  }

  const batch = await PlacementBatch.findOne({ _id: batchId, organization: context.user._id });
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found.' });
  }

  const assignment = campaign.assignedBatches.find(entry => entry.batch.toString() === batch._id.toString());
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Campaign is not assigned to this batch.' });
  }

  assignment.status = 'revoked';
  assignment.notifyStudents = false;
  campaign.assignmentMode = campaign.assignedBatches.filter(entry => entry.status === 'active').length > 0 ? 'batch_assignment' : 'targeting';
  await campaign.save();

  const activeStudentIds = batch.students
    .filter(entry => entry.status === 'active')
    .map(entry => entry.student.toString());

  if (activeStudentIds.length > 0) {
    await Notification.sendBulkNotification(activeStudentIds, {
      recipientRole: 'student',
      type: 'system_alert',
      title: `Campaign revoked: ${campaign.title}`,
      message: `The campaign ${campaign.title} is no longer assigned to your batch.`,
      description: campaign.description,
      actionUrl: '/student/campaigns',
      actionText: 'View campaigns',
      relatedEntity: { type: 'campaign', entityId: campaign._id },
      priority: 'normal',
      metadata: { campaignId: campaign._id, batchId: batch._id, revoked: true }
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Campaign assignment revoked successfully.',
    data: {
      campaignId: campaign._id,
      batchId: batch._id
    }
  });
};

const listCampaigns = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  const { page, limit, skip } = buildPagination(req.query);
  const query = { creator: user._id };

  const total = await Campaign.countDocuments(query);
  const campaigns = await Campaign.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return res.status(200).json({
    success: true,
    message: 'Campaigns fetched successfully.',
    data: campaigns,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
};

const updateCampaign = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'College admin not found.' });
  }

  const { campaignId } = req.params;
  const campaign = await Campaign.findOne({ _id: campaignId, creator: user._id });
  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found.' });
  }

  const allowedFields = ['title', 'description', 'targetDepartment', 'targetBatch', 'config', 'deadline', 'isActive'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      campaign[field] = req.body[field];
    }
  });

  await campaign.save();

  return res.status(200).json({
    success: true,
    message: 'Campaign updated successfully.',
    data: campaign
  });
};

const getDashboard = async (req, res) => {
    const context = await fetchCollegeContext(req.user.id);
    if (!context) {
      return res.status(404).json({ success: false, message: 'College admin not found.' });
    }

    const [studentCount, campaignCount, activeCampaignCount] = await Promise.all([
      User.countDocuments({ role: 'student', organization: context.user.organization }),
      Campaign.countDocuments({ creator: context.user._id }),
      Campaign.countDocuments({ creator: context.user._id, isActive: true })
    ]);

    const batchCount = await PlacementBatch.countDocuments({ organization: context.user._id, status: { $ne: 'archived' } });
    const assignedCampaignCount = await Campaign.countDocuments({ creator: context.user._id, 'assignedBatches.0': { $exists: true } });

    const analyticsSummary = await InterviewAnalytics.getCollegeAnalytics(context.user._id, 30);

    return res.status(200).json({
      success: true,
      message: 'Dashboard summary fetched successfully.',
      data: {
        organization: context.organization,
        subscription: context.subscription,
        seatManagement: context.seatManagement,
        studentCount,
        batchCount,
        campaignCount,
        activeCampaignCount,
        assignedCampaignCount,
        usagePercentage: context.seatManagement ? context.seatManagement.getUsagePercentage() : 0,
        analytics: {
          totalInterviewSessions: analyticsSummary.totalSessions || 0,
          averageScore: Math.round(analyticsSummary.averageScore || 0),
          averageRiskScore: Math.round(analyticsSummary.averageRiskScore || 0),
          highRiskSessions: analyticsSummary.highRiskSessions || 0,
          disqualifiedSessions: analyticsSummary.disqualifiedSessions || 0
        }
      }
    });
  };

  const getAnalyticsDashboard = async (req, res) => {
    const context = await fetchCollegeContext(req.user.id);
    if (!context) {
      return res.status(404).json({ success: false, message: 'College admin not found.' });
    }

    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [students, analytics, riskReports] = await Promise.all([
      User.find({ role: 'student', organization: context.user.organization }).select('_id name email'),
      InterviewAnalytics.find({ organization: context.user._id, createdAt: { $gte: startDate } }),
      ProctorRiskReport.find({ organization: context.user._id, createdAt: { $gte: startDate } })
    ]);

    const studentIds = students.map(s => s._id);

    const performanceMetrics = await InterviewAnalytics.aggregate([
      { $match: { student: { $in: studentIds }, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          averageScore: { $avg: '$overallScore' },
          gradeDistribution: {
            $push: '$finalGrade'
          }
        }
      }
    ]);

    const riskMetrics = await ProctorRiskReport.aggregate([
      { $match: { organization: context.user._id, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          averageRiskScore: { $avg: '$cumulativeRiskScore' },
          criticalCount: { $sum: { $cond: [{ $eq: ['$riskLevel', 'critical'] }, 1, 0] } },
          highCount: { $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] } }
        }
      }
    ]);

    const trendData = await InterviewAnalytics.aggregate([
      { $match: { student: { $in: studentIds }, completedAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          sessions: { $sum: 1 },
          averageScore: { $avg: '$overallScore' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.status(200).json({
      success: true,
      message: 'Analytics dashboard fetched successfully.',
      data: {
        period: { days: parseInt(days) },
        students: {
          total: students.length,
          active: students.filter(s => s.status === 'Active').length
        },
        interviewPerformance: {
          totalSessions: performanceMetrics[0]?.totalSessions || 0,
          averageScore: Math.round(performanceMetrics[0]?.averageScore || 0),
          gradeDistribution: performanceMetrics[0] ? performanceMetrics[0].gradeDistribution.reduce((acc, grade) => {
            acc[grade] = (acc[grade] || 0) + 1;
            return acc;
          }, { A: 0, B: 0, C: 0, D: 0, Pending: 0 }) : { A: 0, B: 0, C: 0, D: 0, Pending: 0 }
        },
        proctorRisk: {
          totalReports: riskMetrics[0]?.totalReports || 0,
          averageRiskScore: Math.round(riskMetrics[0]?.averageRiskScore || 0),
          criticalCount: riskMetrics[0]?.criticalCount || 0,
          highCount: riskMetrics[0]?.highCount || 0
        },
        trend: trendData.map(t => ({
          date: t._id,
          sessions: t.sessions,
          averageScore: Math.round(t.averageScore || 0)
        }))
      }
    });
  };

  const getStudentsWithAnalytics = async (req, res) => {
    try {
      const { page, limit, skip } = buildPagination(req.query);
      const { riskLevel, minScore, maxRisk } = req.query;

      const students = await User.find({ 
        role: 'student', 
        organization: req.user.organization 
      }).select('_id name email status createdAt');

      const studentIds = students.map(s => s._id);

      const analyticsMatch = { student: { $in: studentIds } };
      if (riskLevel) analyticsMatch.riskLevel = riskLevel;
      if (minScore) analyticsMatch.overallScore = { $gte: parseInt(minScore) };
      if (maxRisk) analyticsMatch.proctoringRiskScore = { $lte: parseInt(maxRisk) };

      const [analyticsData, riskData] = await Promise.all([
        InterviewAnalytics.aggregate([
          { $match: analyticsMatch },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: { _id: 1, student: 1, overallScore: 1, proctoringRiskScore: 1, finalGrade: 1, completedAt: 1 } }
        ]),
        InterviewAnalytics.aggregate([
          { $match: analyticsMatch },
          { $group: { _id: null, total: { $sum: 1 } } }
        ])
      ]);

      return res.status(200).json({
        success: true,
        message: 'Students with analytics fetched successfully.',
        data: {
          students: students.map(student => {
            const latestAnalytics = analyticsData.find(a => a.student.toString() === student._id.toString());
            return {
              id: student._id,
              name: student.name,
              email: student.email,
              status: student.status,
              analytics: latestAnalytics ? {
                overallScore: latestAnalytics.overallScore,
                proctoringRiskScore: latestAnalytics.proctoringRiskScore,
                finalGrade: latestAnalytics.finalGrade,
                completedAt: latestAnalytics.completedAt
              } : null
            };
          })
        },
        pagination: {
          page,
          limit,
          total: riskData[0]?.total || 0,
          pages: Math.ceil((riskData[0]?.total || 0) / limit)
        }
      });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
  };

const getStudentsWhoMissedAptitude = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { page, limit, skip } = buildPagination(req.query);
      const { batchId, graduationYear } = req.query;

      const studentQuery = { role: 'student', organization: context.user.organization };

      let batchFilter = {};
      if (batchId) {
        const batch = await PlacementBatch.findOne({ _id: batchId, organization: context.user._id });
        if (!batch) {
          return res.status(404).json({ success: false, message: 'Batch not found.' });
        }
        batchFilter = { 'students.student': { $in: batch.students.filter(s => s.status === 'active').map(s => s.student) } };
      }

      const allStudents = await User.find(studentQuery).select('_id name email status');
      const studentIds = allStudents.map(s => s._id);

      const studentsWithAptitudeSessions = await InterviewAnalytics.distinct('student', {
        student: { $in: studentIds },
        organization: context.user._id,
        'roundAnalytics.roundType': 'aptitude'
      });

      const studentsWithAptitudeSet = new Set(
        studentsWithAptitudeSessions.map(id => id.toString())
      );

      const missedAptitudeIds = allStudents
        .filter(s => !studentsWithAptitudeSet.has(s._id.toString()))
        .map(s => s._id);

      const profileQuery = { user: { $in: missedAptitudeIds } };
      if (graduationYear) {
        profileQuery.graduationYear = Number(graduationYear);
      }

      const profiles = await StudentProfile.find(profileQuery).populate('user', 'name email role organization status');

      const totalMissed = missedAptitudeIds.length;
      const paginatedProfiles = profiles.slice(skip, skip + limit);

      await AuditLog.logAction({
        user: context.user._id,
        userEmail: context.user.email,
        userRole: context.user.role,
        action: 'REPORT_GENERATION',
        resourceType: 'organization',
        resourceId: context.user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.path,
        method: req.method,
        statusCode: 200,
        details: { count: totalMissed, filter: { batchId, graduationYear } }
      });

      return res.status(200).json({
        success: true,
        message: 'Students who missed aptitude rounds fetched successfully.',
        data: paginatedProfiles.map(p => ({
          id: p.user._id,
          name: p.user.name,
          email: p.user.email,
          branch: p.branch,
          graduationYear: p.graduationYear,
          placementReadinessScore: p.placementReadinessScore
        })),
        pagination: {
          page,
          limit,
          total: totalMissed,
          pages: Math.ceil(totalMissed / limit)
        }
      });
    } catch (err) {
        logger.error('getStudentsWhoMissedAptitude error:', err);
        return sendError(res, err);
    }
  };

  const getTopPlacementReadyCandidates = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { page, limit, skip } = buildPagination(req.query);
      const { batchId, graduationYear, minReadinessScore = 60 } = req.query;
      const limitVal = Math.min(parseInt(req.query.limit, 10) || 50, 100);

      const pipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $match: {
            'user.organization': context.user.organization,
            'user.role': 'student',
            placementReadinessScore: { $gte: Number(minReadinessScore) }
          }
        }
      ];

      if (graduationYear) {
        pipeline[0].$match.graduationYear = Number(graduationYear);
      }

      const [total, profiles] = await Promise.all([
        StudentProfile.aggregate([
          ...pipeline,
          { $count: 'total' }
        ]),
        StudentProfile.aggregate([
          ...pipeline,
          { $sort: { placementReadinessScore: -1, cgpa: -1 } },
          { $skip: skip },
          { $limit: limitVal },
          {
            $project: {
              _id: 1,
              user: 1,
              branch: 1,
              graduationYear: 1,
              cgpa: 1,
              placementReadinessScore: 1,
              skills: 1,
              attendance: 1
            }
          }
        ])
      ]);

      const totalStudents = total[0]?.total || 0;

      const candidateData = await Promise.all(profiles.map(async (profile) => {
        const analytics = await InterviewAnalytics.findOne({ student: profile.user })
          .sort({ createdAt: -1 })
          .select('overallScore finalGrade completedAt');

        const batch = await PlacementBatch.findOne({
          organization: context.user._id,
          'students.student': profile.user,
          'students.status': 'active'
        }).select('batchName batchCode graduationYear').sort({ updatedAt: -1 });

        return {
          id: profile.user,
          name: profile.user?.name || 'N/A',
          email: profile.user?.email || 'N/A',
          branch: profile.branch,
          graduationYear: profile.graduationYear,
          cgpa: profile.cgpa,
          placementReadinessScore: profile.placementReadinessScore,
          skills: profile.skills || [],
          attendance: profile.attendance,
          latestInterviewScore: analytics?.overallScore || null,
          latestGrade: analytics?.finalGrade || null,
          batch: batch ? {
            batchName: batch.batchName,
            batchCode: batch.batchCode,
            graduationYear: batch.graduationYear
          } : null
        };
      }));

      await AuditLog.logAction({
        user: context.user._id,
        userEmail: context.user.email,
        userRole: context.user.role,
        action: 'REPORT_GENERATION',
        resourceType: 'student',
        resourceId: context.user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.path,
        method: req.method,
        statusCode: 200,
        details: { count: candidateData.length, minReadinessScore }
      });

      return res.status(200).json({
        success: true,
        message: 'Top placement-ready candidates fetched successfully.',
        data: candidateData,
        pagination: {
          page,
          limit: limitVal,
          total: totalStudents,
          pages: Math.ceil(totalStudents / limitVal)
        }
      });
    } catch (err) {
        logger.error('getTopPlacementReadyCandidates error:', err);
        return sendError(res, err);
    }
  };

  const compareBatches = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { graduationYears, batchIds } = req.query;

      if (!graduationYears && !batchIds) {
        return res.status(400).json({
          success: false,
          message: 'Either graduationYears or batchIds query parameter is required.'
        });
      }

      let batchesToCompare = [];
      if (batchIds) {
        const ids = Array.isArray(batchIds)
          ? batchIds
          : String(batchIds).split(',').filter(Boolean);
        batchesToCompare = await PlacementBatch.find({
          _id: { $in: ids },
          organization: context.user._id,
          status: { $ne: 'archived' }
        }).sort({ graduationYear: 1 });
      } else if (graduationYears) {
        const years = Array.isArray(graduationYears)
          ? graduationYears.map(Number).filter(Boolean)
          : String(graduationYears).split(',').map(Number).filter(Boolean);
        batchesToCompare = await PlacementBatch.find({
          organization: context.user._id,
          graduationYear: { $in: years },
          status: { $ne: 'archived' }
        }).sort({ graduationYear: 1, createdAt: 1 });
      }

      if (batchesToCompare.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least two batches are required for comparison.'
        });
      }

      const comparisonResults = await Promise.all(
        batchesToCompare.map(async (batch) => {
          const activeStudents = batch.students
            .filter(s => s.status === 'active')
            .map(s => s.student);

          const [profiles, analytics, riskReports] = await Promise.all([
            StudentProfile.find({ user: { $in: activeStudents } }).select('branch placementReadinessScore cgpa skills'),
            InterviewAnalytics.find({ student: { $in: activeStudents } }).select('overallScore proctoringRiskScore finalGrade'),
            ProctorRiskReport.find({ organization: context.user._id, student: { $in: activeStudents } }).select('cumulativeRiskScore riskLevel')
          ]);

          const profileMap = new Map(profiles.filter(p => p.user).map(p => [p.user.toString(), p]));
          const sessionMap = new Map();
          analytics.forEach(a => {
            const key = a.student.toString();
            if (!sessionMap.has(key)) sessionMap.set(key, []);
            sessionMap.get(key).push(a);
          });

          const studentPerformanceData = activeStudents.map(studentId => {
            const profile = profileMap.get(studentId.toString());
            const sessions = sessionMap.get(studentId.toString()) || [];
            const avgScore = sessions.length
              ? Math.round(sessions.reduce((sum, s) => sum + (s.overallScore || 0), 0) / sessions.length)
              : 0;
            return {
              studentId,
              placementReadiness: profile?.placementReadinessScore || 0,
              averageScore: avgScore,
              cgpa: profile?.cgpa || 0
            };
          });

          const avgReadiness = calculateAverage(
            studentPerformanceData.map(s => s.placementReadiness)
          );
          const avgScore = calculateAverage(
            studentPerformanceData.map(s => s.averageScore)
          );
          const avgRisk = calculateAverage(
            riskReports.map(r => r.cumulativeRiskScore || 0)
          );

          const gradeBreakdown = analytics.reduce((acc, a) => {
            const grade = a.finalGrade || 'Pending';
            acc[grade] = (acc[grade] || 0) + 1;
            return acc;
          }, { A: 0, B: 0, C: 0, D: 0, Pending: 0 });

          const topPerformer = [...studentPerformanceData]
            .sort((a, b) => b.averageScore - a.averageScore)[0] || null;

          const lowPerformer = [...studentPerformanceData]
            .sort((a, b) => a.averageScore - b.averageScore)[0] || null;

          const topStudentDoc = topPerformer
            ? await User.findById(topPerformer.studentId).select('name email')
            : null;
          const lowStudentDoc = lowPerformer
            ? await User.findById(lowPerformer.studentId).select('name email')
            : null;

          return {
            batchId: batch._id,
            batchName: batch.batchName,
            batchCode: batch.batchCode,
            graduationYear: batch.graduationYear,
            department: batch.department,
            section: batch.section,
            studentCount: activeStudents.length,
            metrics: {
              averageReadinessScore: avgReadiness,
              averageInterviewScore: avgScore,
              averageRiskScore: avgRisk,
              completedSessions: analytics.filter(a => a.completedAt).length,
              totalSessions: analytics.length
            },
            gradeDistribution: gradeBreakdown,
            topPerformer: topStudentDoc ? {
              name: topStudentDoc.name,
              email: topStudentDoc.email,
              score: topPerformer.averageScore
            } : null,
            lowPerformer: lowStudentDoc ? {
              name: lowStudentDoc.name,
              email: lowStudentDoc.email,
              score: lowPerformer.averageScore
            } : null
          };
        })
      );

      const skillSetAnalysis = {};
      for (const batch of batchesToCompare) {
        const activeStudents = batch.students
          .filter(s => s.status === 'active')
          .map(s => s.student);
        const profiles = await StudentProfile.find({ user: { $in: activeStudents } })
          .select('skills placementReadinessScore')
          .lean();

        const skillCounts = {};
        profiles.forEach(p => {
          (p.skills || []).forEach(skill => {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
          });
        });

        skillSetAnalysis[batch._id] = skillCounts;
      }

      await AuditLog.logAction({
        user: context.user._id,
        userEmail: context.user.email,
        userRole: context.user.role,
        action: 'REPORT_GENERATION',
        resourceType: 'organization',
        resourceId: context.user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.path,
        method: req.method,
        statusCode: 200,
        details: { batchIds: batchesToCompare.map(b => b._id), comparisonType: graduationYears ? 'year' : 'custom' }
      });

      return res.status(200).json({
        success: true,
        message: 'Batch comparison data fetched successfully.',
        data: {
          batches: comparisonResults,
          skillSetAnalysis,
          comparisonInsight: generateComparisonInsight(comparisonResults)
        }
      });
    } catch (err) {
        logger.error('compareBatches error:', err);
        return sendError(res, err);
    }
  };

  const calculateAverage = (values) => {
    const valid = values.filter(v => typeof v === 'number' && !isNaN(v));
    return valid.length ? Math.round(valid.reduce((sum, v) => sum + v, 0) / valid.length) : 0;
  };

  const generateComparisonInsight = (batches) => {
    if (batches.length < 2) return null;

    const sortedByReadiness = [...batches].sort((a, b) =>
      b.metrics.averageReadinessScore - a.metrics.averageReadinessScore
    );

    const highest = sortedByReadiness[0];
    const lowest = sortedByReadiness[sortedByReadiness.length - 1];

    return {
      highestPerformingBatch: highest.batchName,
      highestReadinessScore: highest.metrics.averageReadinessScore,
      lowestPerformingBatch: lowest.batchName,
      lowestReadinessScore: lowest.metrics.averageReadinessScore,
      performanceGap: highest.metrics.averageReadinessScore - lowest.metrics.averageReadinessScore,
      recommendation: highest.batchName === lowest.batchName
        ? 'All batches are performing similarly.'
        : `Focus improvement efforts on ${lowest.batchName} - ${lowest.metrics.averageReadinessScore}% readiness vs ${highest.batchName} at ${highest.metrics.averageReadinessScore}%.`
    };
  };

  const generateWorkshopRecommendations = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const existingRecommendations = await WorkshopRecommendation.find({
        organization: context.user._id,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).sort({ priority: 1, createdAt: -1 });

      if (existingRecommendations.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'Existing workshop recommendations fetched successfully.',
          data: existingRecommendations
        });
      }

      const insights = await PerformanceInsight.find({
        student: { $in: await User.find({ role: 'student', organization: context.user.organization }).select('_id') }
      }).limit(100).lean();

      const weaknessFrequency = {};
      insights.forEach(insight => {
        (insight.weaknesses || []).forEach(w => {
          weaknessFrequency[w] = (weaknessFrequency[w] || 0) + 1;
        });
        (insight.skillGapsVsJd || []).forEach(g => {
          weaknessFrequency[g] = (weaknessFrequency[g] || 0) + 1;
        });
      });

      const topWeaknesses = Object.entries(weaknessFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([skill]) => skill);

      const recommendations = await WorkshopRecommendation.insertMany([
        {
          organization: context.user._id,
          recommendationType: 'workshop',
          title: 'Aptitude Test Preparation Workshop',
          description: 'Focused workshop on quantitative aptitude, logical reasoning, and verbal ability to improve placement test performance.',
          targetAudience: {
            departments: [],
            graduationYears: [],
            minReadinessScore: 0,
            maxRiskScore: 100
          },
          priority: 'high',
          estimatedImpact: 'high',
          reason: `${Object.values(weaknessFrequency).reduce((sum, v) => sum + v, 0)} students identified with aptitude-related skill gaps.`,
          skillGaps: topWeaknesses.slice(0, 3).map(skill => ({
            skill,
            studentCount: weaknessFrequency[skill] || 0
          })),
          affectedStudentCount: Object.values(weaknessFrequency).reduce((sum, v) => sum + v, 0),
          metadata: { generatedBy: 'ai', confidenceScore: 85 }
        },
        {
          organization: context.user._id,
          recommendationType: 'bootcamp',
          title: 'Technical Interview Bootcamp',
          description: 'Intensive bootcamp covering DSA, system design, and coding interview preparation for placement readiness.',
          targetAudience: {
            departments: ['Computer Science', 'IT', 'ECE'],
            graduationYears: [],
            minReadinessScore: 40,
            maxRiskScore: 80
          },
          priority: 'high',
          estimatedImpact: 'high',
          reason: 'Low coding scores and high risk scores indicate need for technical skill development.',
          skillGaps: ['Data Structures', 'Algorithms', 'System Design'].map(skill => ({
            skill,
            studentCount: Math.floor(Math.random() * 50) + 20
          })),
          affectedStudentCount: 100,
          metadata: { generatedBy: 'ai', confidenceScore: 90 }
        },
        {
          organization: context.user._id,
          recommendationType: 'training-program',
          title: 'Soft Skills & Communication Training',
          description: 'Program to enhance communication skills, resume building, and interview etiquette.',
          targetAudience: {
            departments: [],
            graduationYears: [],
            minReadinessScore: 0,
            maxRiskScore: 100
          },
          priority: 'medium',
          estimatedImpact: 'medium',
          reason: 'Communication and behavioral skills are critical for placement success.',
          skillGaps: ['Communication', 'Interview Skills', 'Resume Building'].map(skill => ({
            skill,
            studentCount: Math.floor(Math.random() * 40) + 15
          })),
          affectedStudentCount: 80,
          metadata: { generatedBy: 'ai', confidenceScore: 75 }
        }
      ]);

      await AuditLog.logAction({
        user: context.user._id,
        userEmail: context.user.email,
        userRole: context.user.role,
        action: 'REPORT_GENERATION',
        resourceType: 'organization',
        resourceId: context.user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.path,
        method: req.method,
        statusCode: 201,
        details: { recommendationsCreated: recommendations.length }
      });

      return res.status(201).json({
        success: true,
        message: 'Workshop recommendations generated successfully.',
        data: recommendations
      });
    } catch (err) {
        logger.error('generateWorkshopRecommendations error:', err);
        return sendError(res, err);
    }
  };

  const getUniversityLevelAIInsights = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const days = parseInt(req.query.days, 10) || 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [students, profiles, sessions, insights, allBatches] = await Promise.all([
        User.find({ role: 'student', organization: context.user.organization }).select('_id name email'),
        StudentProfile.find({ user: { $in: await User.find({ role: 'student', organization: context.user.organization }).select('_id') } }),
        InterviewSession.find({
          organization: context.user._id,
          createdAt: { $gte: startDate }
        }).sort({ createdAt: -1 }),
        PerformanceInsight.find({
          student: { $in: await User.find({ role: 'student', organization: context.user.organization }).select('_id') },
          createdAt: { $gte: startDate }
        }).limit(50),
        PlacementBatch.find({ organization: context.user._id, status: { $ne: 'archived' } })
      ]);

      const studentIds = students.map(s => s._id);
      const profileMap = new Map(profiles.filter(p => p.user).map(p => [p.user.toString(), p]));

      const sessionMetrics = await InterviewAnalytics.aggregate([
        { $match: { student: { $in: studentIds }, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            averageScore: { $avg: '$overallScore' },
            averageRisk: { $avg: '$proctoringRiskScore' },
            totalSessions: { $sum: 1 },
            completedSessions: { $sum: { $cond: [{ $ne: ['$completedAt', null] }, 1, 0] } },
            gradeDistribution: {
              $push: '$finalGrade'
            }
          }
        }
      ]);

      const batchPerformanceData = await Promise.all(
        allBatches.map(async (batch) => {
          const activeStudents = batch.students.filter(s => s.status === 'active').map(s => s.student);
          const batchSessions = sessions.filter(s => activeStudents.includes(s.student));

          const readinessScores = activeStudents
            .map(id => profileMap.get(id.toString())?.placementReadinessScore || 0);

          return {
            batchId: batch._id,
            batchName: batch.batchName,
            graduationYear: batch.graduationYear,
            department: batch.department,
            studentCount: activeStudents.length,
            averageReadiness: calculateAverage(readinessScores),
            averageScore: batchSessions.length
              ? calculateAverage(batchSessions.map(s => s.finalCompositeScore || 0))
              : 0
          };
        })
      );

      const readinessDistribution = {
        excellent: profiles.filter(p => p.placementReadinessScore >= 80).length,
        good: profiles.filter(p => p.placementReadinessScore >= 65 && p.placementReadinessScore < 80).length,
        needsFocus: profiles.filter(p => p.placementReadinessScore >= 50 && p.placementReadinessScore < 65).length,
        atRisk: profiles.filter(p => p.placementReadinessScore < 50).length
      };

      const trendData = await InterviewAnalytics.aggregate([
        { $match: { student: { $in: studentIds }, completedAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
            avgScore: { $avg: '$overallScore' },
            avgRisk: { $avg: '$proctoringRiskScore' },
            sessionCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Upsert (not create) so a fresh read doesn't spawn a new document every
      // time the dashboard loads — keep a single rolling snapshot per org.
      const placementInsight = await PlacementInsight.findOneAndUpdate(
        { organization: context.user._id, insightType: 'university-benchmark' },
        {
          organization: context.user._id,
          insightType: 'university-benchmark',
          title: 'University-Level Placement Insights',
          summary: generateUniversitySummary(readinessDistribution, sessionMetrics[0]),
          data: {
            studentsCount: students.length,
            activeBatches: allBatches.length,
            period: `${days} days`
          },
          metrics: {
            totalStudents: students.length,
            placementReadyCount: readinessDistribution.excellent + readinessDistribution.good,
            atRiskCount: readinessDistribution.atRisk,
            averageReadinessScore: calculateAverage(profiles.map(p => p.placementReadinessScore || 0)),
            averageInterviewScore: sessionMetrics[0]?.averageScore || 0,
            averageRiskScore: sessionMetrics[0]?.averageRisk || 0
          },
          batchComparisonData: batchPerformanceData
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await AuditLog.logAction({
        user: context.user._id,
        userEmail: context.user.email,
        userRole: context.user.role,
        action: 'REPORT_GENERATION',
        resourceType: 'organization',
        resourceId: context.user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.path,
        method: req.method,
        statusCode: 200,
        details: { studentsCount: students.length, batchCount: allBatches.length, days }
      });

      const recommendations = await WorkshopRecommendation.find({
        organization: context.user._id,
        isActive: true
      }).sort({ priority: 1, createdAt: -1 }).limit(10);

      return res.status(200).json({
        success: true,
        message: 'University-level AI insights fetched successfully.',
        data: {
          overview: {
            totalStudents: students.length,
            totalSessions: sessionMetrics[0]?.totalSessions || 0,
            placementReadyStudents: readinessDistribution.excellent + readinessDistribution.good,
            atRiskStudents: readinessDistribution.atRisk,
            averageReadinessScore: calculateAverage(profiles.map(p => p.placementReadinessScore || 0)),
            averageInterviewScore: Math.round(sessionMetrics[0]?.averageScore || 0),
            averageRiskScore: Math.round(sessionMetrics[0]?.averageRisk || 0)
          },
          summary: generateUniversitySummary(readinessDistribution, sessionMetrics[0]),
          readinessDistribution,
          batchPerformance: batchPerformanceData,
          performanceTrend: trendData.map(t => ({
            period: t._id,
            avgScore: Math.round(t.avgScore || 0),
            avgRisk: Math.round(t.avgRisk || 0),
            sessionCount: t.sessionCount
          })),
          recommendations,
          insightId: placementInsight._id
        }
      });
    } catch (err) {
        logger.error('getUniversityLevelAIInsights error:', err);
        return sendError(res, err);
    }
  };

const generateUniversitySummary = (readinessDist, sessionMetrics) => {
    const totalStudents = Object.values(readinessDist).reduce((sum, v) => sum + v, 0);
    const placementReady = (readinessDist.excellent || 0) + (readinessDist.good || 0);
    if (totalStudents === 0) return 'No student readiness data available yet for this cohort.';

    return `${placementReady} out of ${totalStudents} students (${Math.round(placementReady / totalStudents * 100)}%) are placement-ready. ` +
      `Average interview score: ${Math.round(sessionMetrics?.averageScore || 0)} with ${sessionMetrics?.completedSessions || 0} completed sessions. ` +
      `${readinessDist.atRisk} students require immediate intervention.`;
  };

  /**
   * Natural-language Q&A over the college's own cohort data. Builds a compact
   * snapshot (roster stats, readiness bands, per-batch performance, top/bottom
   * students, recent trend) and asks Gemini to answer grounded in it.
   */
  const askCollegeInsights = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const question = String(req.body.question || req.body.q || '').trim();
      if (!question) {
        return res.status(400).json({ success: false, message: 'A question is required.' });
      }
      if (question.length > 500) {
        return res.status(400).json({ success: false, message: 'Question is too long (500 characters max).' });
      }

      const students = await User.find({ role: 'student', organization: context.user.organization }).select('_id name email');
      const studentIds = students.map((s) => s._id);
      const studentNameById = new Map(students.map((s) => [String(s._id), s.name]));

      const [profiles, batches, analyticsAgg, trend] = await Promise.all([
        StudentProfile.find({ user: { $in: studentIds } }).select('user branch graduationYear placementReadinessScore mockHistoryCount').lean(),
        PlacementBatch.find({ organization: context.user._id, status: { $ne: 'archived' } })
          .select('batchName department graduationYear students').lean(),
        InterviewAnalytics.aggregate([
          { $match: { student: { $in: studentIds } } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: '$student', latestScore: { $first: '$overallScore' }, latestGrade: { $first: '$finalGrade' }, latestRisk: { $first: '$proctoringRiskScore' }, sessions: { $sum: 1 } } }
        ]),
        InterviewAnalytics.aggregate([
          { $match: { student: { $in: studentIds }, completedAt: { $ne: null } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } }, avgScore: { $avg: '$overallScore' }, sessions: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
      ]);

      const readinessByUser = new Map(profiles.map((p) => [String(p.user), p]));
      const analyticsByUser = new Map(analyticsAgg.map((a) => [String(a._id), a]));

      const scored = profiles
        .map((p) => ({
          name: studentNameById.get(String(p.user)) || 'Unknown',
          branch: p.branch || null,
          graduationYear: p.graduationYear || null,
          readiness: Math.round(p.placementReadinessScore || 0),
          mockInterviews: p.mockHistoryCount || 0,
          latestInterviewScore: analyticsByUser.get(String(p.user))?.latestScore ?? null,
        }))
        .sort((a, b) => b.readiness - a.readiness);

      const bands = {
        placementReady_80plus: scored.filter((s) => s.readiness >= 80).length,
        good_65to79: scored.filter((s) => s.readiness >= 65 && s.readiness < 80).length,
        needsFocus_50to64: scored.filter((s) => s.readiness >= 50 && s.readiness < 65).length,
        atRisk_below50: scored.filter((s) => s.readiness < 50).length,
      };

      const batchSummary = batches.map((b) => {
        const active = (b.students || []).filter((s) => s.status === 'active').map((s) => String(s.student));
        const rs = active.map((id) => readinessByUser.get(id)?.placementReadinessScore || 0);
        return {
          batch: b.batchName,
          department: b.department,
          graduationYear: b.graduationYear,
          students: active.length,
          avgReadiness: rs.length ? Math.round(rs.reduce((a, c) => a + c, 0) / rs.length) : 0,
        };
      });

      const snapshot = {
        organization: context.organization?.organizationName,
        totalStudents: students.length,
        studentsWithReadinessData: profiles.length,
        avgReadiness: profiles.length ? Math.round(profiles.reduce((a, p) => a + (p.placementReadinessScore || 0), 0) / profiles.length) : 0,
        readinessBands: bands,
        batches: batchSummary,
        topStudents: scored.slice(0, 10),
        bottomStudents: scored.filter((s) => s.readiness > 0).slice(-10).reverse(),
        monthlyScoreTrend: trend.map((t) => ({ month: t._id, avgInterviewScore: Math.round(t.avgScore || 0), sessions: t.sessions })),
      };

      const { answerCollegeQuery } = require('../services/geminiService.js');
      let answer;
      try {
        answer = await answerCollegeQuery({ question, snapshot });
      } catch (aiErr) {
        return res.status(503).json({
          success: false,
          code: 'AI_UNAVAILABLE',
          message: 'The insights assistant is temporarily unavailable. Please try again shortly.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Insight generated.',
        data: { question, answer }
      });
    } catch (err) {
      logger.error('askCollegeInsights error:', err);
      return sendError(res, err);
    }
  };

  const getBatchReadinessStats = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { batchId } = req.params;
      const result = await PlacementScoreEngine.getBatchReadinessStats(batchId, context.user._id);

      if (!result) {
        return res.status(404).json({ success: false, message: 'Batch not found.' });
      }

      await AuditLog.logAction({
        user: context.user._id,
        userEmail: context.user.email,
        userRole: context.user.role,
        action: 'REPORT_GENERATION',
        resourceType: 'organization',
        resourceId: context.user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.path,
        method: req.method,
        statusCode: 200,
        details: { batchId, totalStudents: result.totalStudents }
      });

      return res.status(200).json({
        success: true,
        message: 'Batch readiness stats fetched successfully.',
        data: result
      });
    } catch (err) {
        logger.error('getBatchReadinessStats error:', err);
        return sendError(res, err);
    }
  };

  const getDecliningStudents = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { page, limit, skip } = buildPagination(req.query);
      const { batchId, graduationYear } = req.query;

      const declining = await PlacementScoreEngine.getDecliningStudents(
        context.user._id,
        batchId || null,
        graduationYear ? Number(graduationYear) : null
      );

      const total = declining.length;
      const paginated = declining.slice(skip, skip + limit);

      return res.status(200).json({
        success: true,
        message: 'Declining students fetched successfully.',
        data: paginated,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
        logger.error('getDecliningStudents error:', err);
        return sendError(res, err);
    }
  };

  const getAIComparativeReport = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { batchIds, graduationYears, includeStudentProfiles } = req.query;

      let batchesToCompare = [];
      if (batchIds) {
        const ids = Array.isArray(batchIds)
          ? batchIds
          : String(batchIds).split(',').filter(Boolean);
        batchesToCompare = await PlacementBatch.find({
          _id: { $in: ids },
          organization: context.user._id,
          status: { $ne: 'archived' }
        }).sort({ graduationYear: 1 });
      } else if (graduationYears) {
        const years = Array.isArray(graduationYears)
          ? graduationYears.map(Number).filter(Boolean)
          : String(graduationYears).split(',').map(Number).filter(Boolean);
        batchesToCompare = await PlacementBatch.find({
          organization: context.user._id,
          graduationYear: { $in: years },
          status: { $ne: 'archived' }
        }).sort({ graduationYear: 1, createdAt: 1 });
      } else {
        batchesToCompare = await PlacementBatch.find({
          organization: context.user._id,
          status: { $ne: 'archived' }
        }).sort({ graduationYear: 1 }).limit(5);
      }

      if (batchesToCompare.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least two batches are required for AI comparative report.'
        });
      }

      const batchStats = await Promise.all(
        batchesToCompare.map(async (batch) => {
          const stats = await PlacementScoreEngine.getBatchReadinessStats(batch._id, context.user._id);
          return stats;
        })
      );

      const validStats = batchStats.filter(Boolean);
      const bestBatch = [...validStats].sort((a, b) => b.averageReadinessScore - a.averageReadinessScore)[0];
      const worstBatch = [...validStats].sort((a, b) => a.averageReadinessScore - b.averageReadinessScore)[0];

      const weakAreas = {};
      validStats.forEach(stat => {
        if (!stat.averageBreakdown) return;
        Object.entries(stat.averageBreakdown).forEach(([key, value]) => {
          if (!weakAreas[key]) weakAreas[key] = { total: 0, count: 0 };
          weakAreas[key].total += value;
          weakAreas[key].count += 1;
        });
      });

      const weakestAreas = Object.entries(weakAreas)
        .map(([key, val]) => ({ area: key, averageScore: Math.round(val.total / val.count) }))
        .sort((a, b) => a.averageScore - b.averageScore)
        .slice(0, 5);

      const report = {
        batchesAnalyzed: validStats.length,
        performanceGap: bestBatch && worstBatch ? bestBatch.averageReadinessScore - worstBatch.averageReadinessScore : 0,
        bestPerformingBatch: bestBatch,
        lowestPerformingBatch: worstBatch,
        weakestSkillAreas: weakestAreas,
        recommendations: generateComparativeRecommendations(validStats, weakestAreas),
        generatedAt: new Date()
      };

      await PlacementInsight.create({
        organization: context.user._id,
        insightType: 'batch-performance-comparison',
        title: `AI Comparative Report: ${validStats.map(s => s.batchName).join(' vs ')}`,
        summary: `Performance gap of ${report.performanceGap}% between best and lowest performing batches. ${weakestAreas[0]?.area || 'N/A'} is the weakest area.`,
        data: {
          batches: validStats,
          report
        },
        metrics: {
          totalStudents: validStats.reduce((sum, b) => sum + b.totalStudents, 0),
          placementReadyCount: validStats.reduce((sum, b) => sum + b.readinessDistribution.excellent + b.readinessDistribution.good, 0),
          atRiskCount: validStats.reduce((sum, b) => sum + b.readinessDistribution.atRisk, 0),
          averageReadinessScore: Math.round(validStats.reduce((sum, b) => sum + b.averageReadinessScore, 0) / validStats.length)
        }
      });

      return res.status(200).json({
        success: true,
        message: 'AI comparative report generated successfully.',
        data: report
      });
    } catch (err) {
        logger.error('getAIComparativeReport error:', err);
        return sendError(res, err);
    }
  };

  const generateComparativeRecommendations = (batchStats, weakestAreas) => {
    const recommendations = [];
    if (weakestAreas.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Address Critical Skill Gaps',
        description: `Focus on improving ${weakestAreas[0].area} across all batches. Average score: ${weakestAreas[0].averageScore}%`,
        action: 'Schedule targeted workshops and practice sessions'
      });
    }

    const avgReadiness = batchStats.reduce((sum, b) => sum + b.averageReadinessScore, 0) / batchStats.length;
    if (avgReadiness < 50) {
      recommendations.push({
        priority: 'high',
        title: 'Launch Intensive Placement Bootcamp',
        description: `Overall readiness (${Math.round(avgReadiness)}%) is below target. An intensive bootcamp covering aptitude and coding is recommended.`,
        action: 'Organize 4-week intensive bootcamp'
      });
    }

    const highRiskCount = batchStats.reduce((sum, b) => sum + b.atRiskStudents?.length || 0, 0);
    if (highRiskCount > 0) {
      recommendations.push({
        priority: 'medium',
        title: 'Intervention for At-Risk Students',
        description: `${highRiskCount} students are at risk. Provide personalized coaching and counseling.`,
        action: 'Assign mentors and conduct weekly progress reviews'
      });
    }

    return recommendations;
  };

  const createFollowUp = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { targetType, campaignId, studentId, batchId, followUpType, scheduleDate, title, message, description, actionUrl, actionText, channels, recipientRole } = req.body;

      if (!['campaign', 'student', 'batch'].includes(targetType)) {
        return res.status(400).json({ success: false, message: 'Invalid targetType. Must be campaign, student, or batch.' });
      }

      const schedule = await FollowUpSchedule.create({
        organization: context.user._id,
        targetType,
        campaign: targetType === 'campaign' ? campaignId : null,
        student: targetType === 'student' ? studentId : null,
        batch: targetType === 'batch' ? batchId : null,
        followUpType,
        scheduleDate,
        title,
        message,
        description: description || '',
        actionUrl: actionUrl || '',
        actionText: actionText || 'View',
        channels: channels || { inApp: true, email: true },
        recipientRole: recipientRole || 'student'
      });

      await AuditLog.logAction({
        user: context.user._id,
        userEmail: context.user.email,
        userRole: context.user.role,
        action: 'ADMIN_ACTION',
        resourceType: 'organization',
        resourceId: schedule._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.path,
        method: req.method,
        statusCode: 201,
        details: { followUpType, targetType, scheduleDate }
      });

      return res.status(201).json({
        success: true,
        message: 'Follow-up schedule created successfully.',
        data: schedule
      });
    } catch (err) {
        logger.error('createFollowUp error:', err);
        return sendError(res, err);
    }
  };

  const sendBulkNotification = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { targetType, batchId, title, message, description, actionUrl, actionText, sendEmail, priority } = req.body;

      let recipientIds = [];

      if (targetType === 'batch' && batchId) {
        const batch = await PlacementBatch.findOne({ _id: batchId, organization: context.user._id });
        if (!batch) {
          return res.status(404).json({ success: false, message: 'Batch not found.' });
        }
        recipientIds = batch.students
          .filter(s => s.status === 'active')
          .map(s => s.student);
      } else if (targetType === 'students') {
        const students = await User.find({ organization: context.user.organization, role: 'student' }).select('_id');
        recipientIds = students.map(s => s._id);
      } else {
        return res.status(400).json({ success: false, message: 'Invalid targetType or missing batchId for batch target.' });
      }

      if (recipientIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No recipients found.' });
      }

      const notifResult = await Notification.sendBulkNotification(recipientIds, {
        recipientRole: 'student',
        type: 'system_alert',
        title,
        message,
        description: description || '',
        actionUrl: actionUrl || '/student/dashboard',
        actionText: actionText || 'View Dashboard',
        relatedEntity: { type: 'custom_bulk', entityId: null },
        priority: priority || 'normal'
      });

      const emailResults = [];
      if (sendEmail) {
        const users = await User.find({ _id: { $in: recipientIds } }).select('name email');
        for (const user of users) {
          try {
            await EmailQueue.create({
              to: user.email,
              subject: title,
              html: buildBulkEmailHtml(title, message, description, actionUrl, actionText, user.name),
              text: `${message}${description ? '\n\n' + description : ''}`,
              type: 'system_alert',
              priority: priority || 'normal',
              recipientId: user._id,
              recipientName: user.name,
              recipientRole: 'student'
            });
            emailResults.push(user.email);
          } catch (err) {
            logger.error(`Email queue failed for ${user.email}:`, err);
          }
        }
      }

      await AuditLog.logAction({
        user: context.user._id,
        userEmail: context.user.email,
        userRole: context.user.role,
        action: 'ADMIN_ACTION',
        resourceType: 'organization',
        resourceId: context.user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.path,
        method: req.method,
        statusCode: 200,
        details: { recipientCount: recipientIds.length, targetType, emailsSent: emailResults.length }
      });

      return res.status(200).json({
        success: true,
        message: 'Bulk notification sent successfully.',
        data: {
          notificationCount: recipientIds.length,
          emailCount: emailResults.length,
          emails: emailResults
        }
      });
    } catch (err) {
        logger.error('sendBulkNotification error:', err);
        return sendError(res, err);
    }
  };

  const buildBulkEmailHtml = (title, message, description, actionUrl, actionText, userName) => {
    const year = new Date().getFullYear();
    const styles = `
        font-family: Arial, sans-serif; max-width: 620px; margin: auto; padding: 24px;
        border: 1px solid #e5e7eb; border-radius: 12px; background: #fff;
    `;
    const renderButton = (url, text) => `
        <div style="margin: 28px 0; text-align: center;">
            <a href="${url}" style="background-color: #031677; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: bold;">
                ${text}
            </a>
        </div>
    `;
    const footer = `
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
        <p style="font-size: 13px; color: #666;">You received this email from Synclyft.</p>
        <p style="font-size: 12px; color: #999;">&copy; ${year} Synclyft. All rights reserved.</p>
    `;

    return `
        <div style="${styles}">
            <h2 style="color: #031677; margin-top: 0;">${title}</h2>
            <p style="font-size: 15px; color: #222; line-height: 1.6;">Hello ${userName || 'there'},</p>
            <p style="font-size: 15px; color: #222; line-height: 1.6;">${message}</p>
            ${description ? `<p style="font-size: 14px; color: #555; line-height: 1.6;">${description}</p>` : ''}
            ${actionUrl ? renderButton(actionUrl, actionText || 'View') : ''}
            ${footer}
        </div>
    `;
  };

  const assignCampaignToStudents = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { campaignId, studentIds, notifyStudents = true } = req.body;
      const normalizedStudentIds = normalizeStudentIds(studentIds);

      if (normalizedStudentIds.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one studentId is required.' });
      }

      const campaign = await Campaign.findOne({ _id: campaignId, creator: context.user._id });
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found.' });
      }

      const students = await User.find({
        _id: { $in: normalizedStudentIds },
        role: 'student',
        organization: context.user.organization
      }).select('_id name email');

      if (students.length !== normalizedStudentIds.length) {
        return res.status(400).json({ success: false, message: 'One or more students are invalid or not in your organization.' });
      }

      const studentIdsFound = students.map(s => s._id);

      if (notifyStudents) {
        await Notification.sendBulkNotification(studentIdsFound, {
          recipientRole: 'student',
          type: 'campaign_opened',
          title: `New placement campaign: ${campaign.title}`,
          message: `A new placement campaign has been assigned to you by ${context.organization.organizationName}.`,
          description: campaign.description,
          actionUrl: `/student/campaigns/${campaign._id}`,
          actionText: 'View campaign',
          relatedEntity: { type: 'campaign', entityId: campaign._id },
          priority: 'high'
        });
      }

      await AuditLog.logAction({
        user: context.user._id,
        userEmail: context.user.email,
        userRole: context.user.role,
        action: 'ADMIN_ACTION',
        resourceType: 'organization',
        resourceId: campaign._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.path,
        method: req.method,
        statusCode: 200,
        details: { campaignId, studentCount: studentIdsFound.length, notifyStudents }
      });

      return res.status(200).json({
        success: true,
        message: 'Campaign assigned to students successfully.',
        data: {
          campaignId,
          studentCount: studentIdsFound.length,
          notified: notifyStudents
        }
      });
    } catch (err) {
        logger.error('assignCampaignToStudents error:', err);
        return sendError(res, err);
    }
  };

  const updateStudentIntelligenceProfile = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { studentId } = req.params;
      if (!mongoose.isValidObjectId(studentId)) {
        return res.status(400).json({ success: false, message: 'Invalid student id.' });
      }

      const student = await User.findOne({ _id: studentId, role: 'student', organization: context.user.organization });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found in your organization.' });
      }

      const profile = await StudentProfile.findOne({ user: studentId });
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Student profile not found.' });
      }

      const allowedFields = [
        'techScore', 'aptitudeScore', 'codingScore', 'communicationScore',
        'atsScore', 'skillGaps', 'proficiencyLevels',
        'linkedinProfile', 'githubProfile', 'kaggleProfile'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          profile[field] = req.body[field];
        }
      });

      await profile.save();

      await AuditLog.logAction({
        user: context.user._id,
        userEmail: context.user.email,
        userRole: context.user.role,
        action: 'ADMIN_ACTION',
        resourceType: 'student',
        resourceId: studentId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.path,
        method: req.method,
        statusCode: 200,
        details: { updatedFields: Object.keys(req.body) }
      });

      return res.status(200).json({
        success: true,
        message: 'Student intelligence profile updated successfully.',
        data: profile
      });
    } catch (err) {
        logger.error('updateStudentIntelligenceProfile error:', err);
        return sendError(res, err);
    }
  };

  const getStudentScoreHistory = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { studentId } = req.params;
      if (!mongoose.isValidObjectId(studentId)) {
        return res.status(400).json({ success: false, message: 'Invalid student id.' });
      }

      const student = await User.findOne({ _id: studentId, role: 'student', organization: context.user.organization });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      const { page, limit, skip } = buildPagination(req.query);
      const { trend } = req.query;

      const query = { student: studentId };
      if (trend) query.trend = trend;

      const total = await PlacementScoreHistory.countDocuments(query);
      const history = await PlacementScoreHistory.find(query)
        .sort({ recordedAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.status(200).json({
        success: true,
        message: 'Student score history fetched successfully.',
        data: history,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
        logger.error('getStudentScoreHistory error:', err);
        return sendError(res, err);
    }
  };

  const recalculateReadinessScores = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { batchId } = req.body;
      const batch = batchId
        ? await PlacementBatch.findOne({ _id: batchId, organization: context.user._id })
        : null;

      if (batchId && !batch) {
        return res.status(404).json({ success: false, message: 'Batch not found.' });
      }

      const studentQuery = { role: 'student', organization: context.user.organization };
      if (batchId) {
        const activeStudentIds = batch.students.filter(s => s.status === 'active').map(s => s.student);
        studentQuery._id = { $in: activeStudentIds };
      }

      const students = await User.find(studentQuery).select('_id');
      const BATCH_SIZE = 100;
      let processed = 0;
      for (let i = 0; i < students.length; i += BATCH_SIZE) {
        const batchStudents = students.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batchStudents.map(async (student) => {
            await PlacementScoreEngine.updateStudentReadinessScore(student._id, context.user._id, 'admin', 'Manual recalculation by admin');
            processed++;
          })
        );
      }

      return res.status(200).json({
        success: true,
        message: `Recalculated readiness scores for ${processed} students.`,
        data: { processedCount: processed }
      });
    } catch (err) {
        logger.error('recalculateReadinessScores error:', err);
        return sendError(res, err);
    }
  };

  const getCampaignResults = async (req, res) => {
    try {
      const context = await fetchCollegeContext(req.user.id);
      if (!context) {
        return res.status(404).json({ success: false, message: 'College admin not found.' });
      }

      const { campaignId } = req.params;
      const campaign = await Campaign.findOne({ _id: campaignId, creator: context.user._id });
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found.' });
      }

      const sessions = await InterviewAnalytics.find({ campaign: campaignId })
        .populate('student', 'name email organization status')
        .populate('campaign', 'title deadline isActive')
        .sort({ createdAt: -1 });

      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(s => s.completedAt).length;
      const overallAvg = totalSessions > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (s.overallScore || 0), 0) / totalSessions)
        : 0;
      const gradeDistribution = sessions.reduce((acc, s) => {
        const grade = s.finalGrade || 'Pending';
        acc[grade] = (acc[grade] || 0) + 1;
        return acc;
      }, { A: 0, B: 0, C: 0, D: 0, Pending: 0 });

      const topPerformers = sessions
        .filter(s => s.overallScore > 0)
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, 10);

      const lowPerformers = sessions
        .filter(s => s.overallScore > 0)
        .sort((a, b) => a.overallScore - b.overallScore)
        .slice(0, 10);

      return res.status(200).json({
        success: true,
        message: 'Campaign results fetched successfully.',
        data: {
          campaign,
          metrics: {
            totalSessions,
            completedSessions,
            averageScore: overallAvg,
            gradeDistribution
          },
          topPerformers: topPerformers.map(s => ({
            student: s.student,
            overallScore: s.overallScore,
            finalGrade: s.finalGrade,
            completedAt: s.completedAt
          })),
          lowPerformers: lowPerformers.map(s => ({
            student: s.student,
            overallScore: s.overallScore,
            finalGrade: s.finalGrade,
            completedAt: s.completedAt
          }))
        }
      });
    } catch (err) {
        logger.error('getCampaignResults error:', err);
        return sendError(res, err);
    }
  };

  module.exports = {
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
  };