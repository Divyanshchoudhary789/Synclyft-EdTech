const PDFDocument = require('pdfkit');

const User = require('../models/userModel.js');
const PlacementBatch = require('../models/PlacementBatchModel.js');
const AuditLog = require('../models/AuditLogModel.js');
const sendError = require('../utils/sendError.js');

const { buildStudentReport, buildBatchReport, buildDashboardReport, buildOrganizationReport } = require('../services/performanceReportService.js');
const { consumeEntitlement } = require('../middlewares/seatAccessMiddleware.js');

const buildFilename = (prefix, format) => `${prefix}-${Date.now()}.${format}`;

const getDownloadFormat = (req) => {
  const format = String(req.query.format || 'pdf').toLowerCase();
  return format === 'csv' ? 'csv' : 'pdf';
};

const writeHeader = (doc, title, subtitle) => {
  doc.fontSize(20).text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text(subtitle, { align: 'center' });
  doc.moveDown(1);
  doc.fillColor('#000');
};

const writeKeyValue = (doc, label, value) => {
  const normalized = Array.isArray(value) ? value.join(', ') : value ?? 'N/A';
  doc.fontSize(10).text(`${label}: ${normalized}`);
};

const writeSection = (doc, title) => {
  doc.moveDown(0.5);
  doc.fontSize(13).text(title, { underline: true });
  doc.moveDown(0.25);
};

const writeList = (doc, values) => {
  if (!values || values.length === 0) {
    doc.fontSize(10).text('N/A');
    return;
  }

  values.forEach((value) => {
    doc.fontSize(10).text(`- ${value}`);
  });
};

const writeTableRows = (doc, rows, formatter) => {
  if (!rows || rows.length === 0) {
    doc.fontSize(10).text('N/A');
    return;
  }

  rows.forEach((row, index) => {
    doc.fontSize(10).text(`${index + 1}. ${formatter(row)}`);
  });
};

const renderStudentPdf = (doc, report) => {
  writeHeader(doc, 'Student Performance Report', `Generated at ${report.generatedAt.toLocaleString()}`);

  writeSection(doc, 'Student Details');
  writeKeyValue(doc, 'Name', report.student.name);
  writeKeyValue(doc, 'Email', report.student.email);
  writeKeyValue(doc, 'Organization', report.student.organization);
  writeKeyValue(doc, 'Batch', report.batch ? `${report.batch.batchName} (${report.batch.batchCode})` : 'N/A');
  writeKeyValue(doc, 'Branch', report.profile?.branch);
  writeKeyValue(doc, 'Graduation Year', report.profile?.graduationYear);
  writeKeyValue(doc, 'Target Role', report.profile?.targetRole);
  writeKeyValue(doc, 'Placement Readiness Score', report.profile?.placementReadinessScore || 0);

  writeSection(doc, 'Key Metrics');
  writeKeyValue(doc, 'Total Sessions', report.metrics.totalSessions);
  writeKeyValue(doc, 'Completed Sessions', report.metrics.completedSessions);
  writeKeyValue(doc, 'Average Score', report.metrics.averageScore);
  writeKeyValue(doc, 'Best Score', report.metrics.bestScore);
  writeKeyValue(doc, 'Latest Score', report.metrics.latestScore);
  writeKeyValue(doc, 'Average Risk', report.metrics.averageRisk);
  writeKeyValue(doc, 'Insights Count', report.metrics.insightsCount);
  writeKeyValue(doc, 'Verified Platforms', report.profile?.verifiedPlatforms || []);

  writeSection(doc, 'Strengths');
  writeList(doc, report.insights?.strengths || []);

  writeSection(doc, 'Weaknesses');
  writeList(doc, report.insights?.weaknesses || []);

  writeSection(doc, 'Skill Gaps');
  writeList(doc, report.insights?.skillGapsVsJd || []);

  writeSection(doc, 'Action Plan');
  if (report.insights?.actionableStudyPlan?.length > 0) {
    report.insights.actionableStudyPlan.forEach((item) => {
      doc.fontSize(10).text(`- ${item.topic} | ${item.focusArea} | ${item.recommendedAction} [${item.priority}]`);
    });
  } else {
    doc.fontSize(10).text('N/A');
  }

  writeSection(doc, 'Recent Sessions');
  if (report.recentSessions.length === 0) {
    doc.fontSize(10).text('No interview sessions found.');
  } else {
    report.recentSessions.forEach((session, index) => {
      doc.fontSize(10).text(`${index + 1}. ${session.targetRole} | ${session.finalGrade || 'Pending'} | Score: ${session.finalCompositeScore || 0} | Risk: ${session.proctoringRiskScore || 0}`);
    });
  }

  writeSection(doc, 'Performance Trend');
  writeTableRows(doc, report.trendSeries || [], (point) => `${point.period} | Sessions: ${point.totalSessions} | Avg Score: ${point.averageScore} | Avg Risk: ${point.averageRisk}`);
};

const renderBatchPdf = (doc, report) => {
  writeHeader(doc, 'Batch Performance Report', `Generated at ${report.generatedAt.toLocaleString()}`);

  if (report.filters && Object.keys(report.filters).length > 0) {
    writeSection(doc, 'Applied Filters');
    writeKeyValue(doc, 'Branch', report.filters.branch || 'All');
    writeKeyValue(doc, 'Graduation Year', report.filters.graduationYear || 'All');
    writeKeyValue(doc, 'Target Role', report.filters.targetRole || 'All');
  }

  writeSection(doc, 'Batch Details');
  writeKeyValue(doc, 'Batch Name', report.batch.batchName);
  writeKeyValue(doc, 'Batch Code', report.batch.batchCode);
  writeKeyValue(doc, 'Academic Year', report.batch.academicYear);
  writeKeyValue(doc, 'Graduation Year', report.batch.graduationYear);
  writeKeyValue(doc, 'Department', report.batch.department);
  writeKeyValue(doc, 'Section', report.batch.section || 'N/A');
  writeKeyValue(doc, 'Status', report.batch.status);
  writeKeyValue(doc, 'Active Students', report.metrics.activeStudents);

  writeSection(doc, 'Summary Metrics');
  writeKeyValue(doc, 'Average Readiness Score', report.metrics.averageReadinessScore);
  writeKeyValue(doc, 'Average Interview Score', report.metrics.averageInterviewScore);
  writeKeyValue(doc, 'Average Risk Score', report.metrics.averageRiskScore);
  writeKeyValue(doc, 'Total Sessions', report.metrics.totalSessions);
  writeKeyValue(doc, 'Total Insights', report.metrics.totalInsights);
  writeKeyValue(doc, 'At Risk Students', report.metrics.atRiskStudentsCount || 0);

  writeSection(doc, 'Breakdown Summary');
  writeKeyValue(doc, 'By Branch', Object.entries(report.metrics.breakdownByBranch || {}).map(([key, value]) => `${key}: ${value}`).join(' | ') || 'N/A');
  writeKeyValue(doc, 'By Graduation Year', Object.entries(report.metrics.breakdownByGraduationYear || {}).map(([key, value]) => `${key}: ${value}`).join(' | ') || 'N/A');
  writeKeyValue(doc, 'By Readiness Band', Object.entries(report.metrics.breakdownByReadinessBand || {}).map(([key, value]) => `${key}: ${value}`).join(' | ') || 'N/A');
  writeKeyValue(doc, 'Grade Distribution', Object.entries(report.metrics.gradeBreakdown || {}).map(([key, value]) => `${key}: ${value}`).join(' | ') || 'N/A');

  writeSection(doc, 'Top Performer');
  if (report.metrics.topPerformer) {
    writeKeyValue(doc, 'Name', report.metrics.topPerformer.name);
    writeKeyValue(doc, 'Email', report.metrics.topPerformer.email);
    writeKeyValue(doc, 'Average Score', report.metrics.topPerformer.averageScore);
    writeKeyValue(doc, 'Placement Readiness', report.metrics.topPerformer.placementReadinessScore);
  } else {
    doc.fontSize(10).text('N/A');
  }

  writeSection(doc, 'Top Students');
  writeTableRows(doc, report.topStudents || [], (student) => `${student.name} | ${student.branch || 'N/A'} | Score: ${student.averageScore} | Readiness: ${student.placementReadinessScore}`);

  writeSection(doc, 'At Risk Students');
  writeTableRows(doc, report.atRiskStudents || [], (student) => `${student.name} | ${student.branch || 'N/A'} | Score: ${student.averageScore} | Readiness: ${student.placementReadinessScore}`);

  writeSection(doc, 'Student Snapshot');
  if (report.students.length === 0) {
    doc.fontSize(10).text('No active students in this batch.');
  } else {
    report.students.slice(0, 20).forEach((student, index) => {
      doc.fontSize(10).text(`${index + 1}. ${student.name} | ${student.branch || 'N/A'} | Score: ${student.averageScore} | Readiness: ${student.placementReadinessScore}`);
    });
  }

  writeSection(doc, 'Performance Trend');
  writeTableRows(doc, report.trendSeries || [], (point) => `${point.period} | Sessions: ${point.totalSessions} | Avg Score: ${point.averageScore} | Avg Risk: ${point.averageRisk}`);
};

const getStudentPerformanceReport = async (req, res) => {
  const requester = await User.findById(req.user.id).select('organization email role');
  if (!requester) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const report = await buildStudentReport({
    studentId: req.user.id,
    organizationName: requester.organization,
    query: req.query
  });

  if (!report) {
    return res.status(404).json({ success: false, message: 'Student report not found.' });
  }

  if (req.seatContext && req.seatContext.subscription) {
    await consumeEntitlement(req, 'studentReports');
  }

  AuditLog.logAction({
    user: req.user.id,
    userEmail: requester.email || 'system',
    userRole: 'student',
    action: 'API_ACCESS',
    resourceType: 'student',
    resourceId: report.student.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 200,
    details: { scope: 'student', type: 'summary' }
  }).catch(() => null);

  return res.status(200).json({
    success: true,
    message: 'Student performance report fetched successfully.',
    data: report
  });
};

const getStudentPerformanceDashboard = async (req, res) => {
  const requester = await User.findById(req.user.id).select('organization email role');
  if (!requester) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const report = await buildStudentReport({
    studentId: req.user.id,
    organizationName: requester.organization,
    query: req.query
  });

  if (!report) {
    return res.status(404).json({ success: false, message: 'Student report not found.' });
  }

  if (req.seatContext && req.seatContext.subscription) {
    await consumeEntitlement(req, 'studentReports');
  }

  return res.status(200).json({
    success: true,
    message: 'Student performance dashboard fetched successfully.',
    data: buildDashboardReport(report)
  });
};

const downloadMyPerformanceReport = async (req, res) => {
  const requester = await User.findById(req.user.id).select('organization email role');
  if (!requester) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const report = await buildStudentReport({
    studentId: req.user.id,
    organizationName: requester.organization,
    query: req.query
  });

  if (!report) {
    return res.status(404).json({ success: false, message: 'Student report not found.' });
  }

  if (req.seatContext && req.seatContext.subscription) {
    await consumeEntitlement(req, 'studentReports');
  }

  const format = getDownloadFormat(req);

  await AuditLog.logAction({
    user: req.user.id,
    userEmail: requester.email || 'system',
    userRole: 'student',
    action: 'DATA_EXPORT',
    resourceType: 'student',
    resourceId: report.student.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 200,
    details: { scope: 'student', format }
  }).catch(() => null);

  if (format === 'csv') {
    const fileName = buildFilename(`student-performance-${req.user.id}`, 'csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(studentReportToCsv(report));
  }

  const fileName = buildFilename(`student-performance-${req.user.id}`, 'pdf');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);
  renderStudentPdf(doc, report);
  doc.end();
};

const getBatchPerformanceReport = async (req, res) => {
  const requester = await User.findById(req.user.id).select('email role');
  if (!requester) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const report = await buildBatchReport({
    batchId: req.params.batchId,
    organizationUserId: req.user.id,
    query: req.query
  });

  if (!report) {
    return res.status(404).json({ success: false, message: 'Batch report not found.' });
  }

  AuditLog.logAction({
    user: req.user.id,
    userEmail: requester.email || 'system',
    userRole: 'college-admin',
    action: 'API_ACCESS',
    resourceType: 'organization',
    resourceId: report.batch.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 200,
    details: { scope: 'batch', type: 'summary' }
  }).catch(() => null);

  return res.status(200).json({
    success: true,
    message: 'Batch performance report fetched successfully.',
    data: report
  });
};

const getBatchPerformanceDashboard = async (req, res) => {
  const requester = await User.findById(req.user.id).select('email role');
  if (!requester) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const report = await buildBatchReport({
    batchId: req.params.batchId,
    organizationUserId: req.user.id,
    query: req.query
  });

  if (!report) {
    return res.status(404).json({ success: false, message: 'Batch report not found.' });
  }

  return res.status(200).json({
    success: true,
    message: 'Batch performance dashboard fetched successfully.',
    data: buildDashboardReport(report)
  });
};

const getOrganizationPerformanceDashboard = async (req, res) => {
  const requester = await User.findById(req.user.id).select('organization email role');
  if (!requester) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const report = await buildOrganizationReport({
    organizationUserId: req.user.id,
    organizationName: requester.organization,
    query: req.query
  });

  return res.status(200).json({
    success: true,
    message: 'Organization performance dashboard fetched successfully. This can be used directly by charts on the college-admin home screen.',
    data: buildDashboardReport(report)
  });
};

const downloadBatchPerformanceReport = async (req, res) => {
  const requester = await User.findById(req.user.id).select('email role');
  if (!requester) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const report = await buildBatchReport({
    batchId: req.params.batchId,
    organizationUserId: req.user.id,
    query: req.query
  });

  if (!report) {
    return res.status(404).json({ success: false, message: 'Batch report not found.' });
  }

  const format = getDownloadFormat(req);

  await AuditLog.logAction({
    user: req.user.id,
    userEmail: requester.email || 'system',
    userRole: 'college-admin',
    action: 'DATA_EXPORT',
    resourceType: 'organization',
    resourceId: report.batch.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 200,
    details: { scope: 'batch', format }
  }).catch(() => null);

  if (format === 'csv') {
    const fileName = buildFilename(`batch-performance-${report.batch.batchCode}`, 'csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(batchReportToCsv(report));
  }

  const fileName = buildFilename(`batch-performance-${report.batch.batchCode}`, 'pdf');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);
  renderBatchPdf(doc, report);
  doc.end();
};

const getStudentReportForCollegeAdmin = async (req, res) => {
  const requester = await User.findById(req.user.id).select('organization email role');
  if (!requester) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const student = await User.findOne({
    _id: req.params.studentId,
    role: 'student',
    organization: requester.organization
  }).select('_id name email organization');

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found in your organization.' });
  }

  const report = await buildStudentReport({
    studentId: student._id,
    organizationName: student.organization,
    query: req.query
  });

  AuditLog.logAction({
    user: req.user.id,
    userEmail: requester.email || 'system',
    userRole: 'college-admin',
    action: 'API_ACCESS',
    resourceType: 'student',
    resourceId: student._id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 200,
    details: { scope: 'student', type: 'summary' }
  }).catch(() => null);

  return res.status(200).json({
    success: true,
    message: 'Student performance report fetched successfully.',
    data: report
  });
};

const getStudentPerformanceDashboardForCollegeAdmin = async (req, res) => {
  const requester = await User.findById(req.user.id).select('organization email role');
  if (!requester) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const student = await User.findOne({
    _id: req.params.studentId,
    role: 'student',
    organization: requester.organization
  }).select('_id organization');

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found in your organization.' });
  }

  const report = await buildStudentReport({
    studentId: student._id,
    organizationName: student.organization,
    query: req.query
  });

  if (!report) {
    return res.status(404).json({ success: false, message: 'Student report not found.' });
  }

  return res.status(200).json({
    success: true,
    message: 'Student performance dashboard fetched successfully.',
    data: buildDashboardReport(report)
  });
};

const downloadStudentReportForCollegeAdmin = async (req, res) => {
  const requester = await User.findById(req.user.id).select('organization email role');
  if (!requester) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const student = await User.findOne({
    _id: req.params.studentId,
    role: 'student',
    organization: requester.organization
  }).select('_id name email organization');

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found in your organization.' });
  }

  const report = await buildStudentReport({
    studentId: student._id,
    organizationName: student.organization,
    query: req.query
  });

  const format = getDownloadFormat(req);

  await AuditLog.logAction({
    user: req.user.id,
    userEmail: requester.email || 'system',
    userRole: 'college-admin',
    action: 'DATA_EXPORT',
    resourceType: 'student',
    resourceId: student._id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
    statusCode: 200,
    details: { scope: 'student', format }
  }).catch(() => null);

  if (format === 'csv') {
    const fileName = buildFilename(`student-performance-${student._id}`, 'csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(studentReportToCsv(report));
  }

  const fileName = buildFilename(`student-performance-${student._id}`, 'pdf');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);
  renderStudentPdf(doc, report);
  doc.end();
};

module.exports = {
  getStudentPerformanceReport,
  getStudentPerformanceDashboard,
  downloadMyPerformanceReport,
  getBatchPerformanceReport,
  getBatchPerformanceDashboard,
  getOrganizationPerformanceDashboard,
  downloadBatchPerformanceReport,
  getStudentReportForCollegeAdmin,
  getStudentPerformanceDashboardForCollegeAdmin,
  downloadStudentReportForCollegeAdmin
};