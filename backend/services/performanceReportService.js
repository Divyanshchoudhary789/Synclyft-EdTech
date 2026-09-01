const User = require('../models/userModel.js');
const StudentProfile = require('../models/StudentProfileModel.js');
const InterviewSession = require('../models/InterviewSessionModel.js');
const PerformanceInsight = require('../models/PerformanceInsightModel.js');
const PlacementBatch = require('../models/PlacementBatchModel.js');

const parseOptionalDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildDateRange = (query) => {
  const from = parseOptionalDate(query.from);
  const to = parseOptionalDate(query.to);

  if (!from && !to) {
    return null;
  }

  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return range;
};

const applyDateRange = (query = {}, dateRange) => {
  if (!dateRange) {
    return query;
  }

  return {
    ...query,
    createdAt: dateRange
  };
};

const getApprovedCollegeAdminByOrganization = async (organizationName) => {
  return User.findOne({
    role: 'college-admin',
    organization: organizationName,
    status: 'Approved'
  }).sort({ createdAt: 1 });
};

const getStudentBatch = async (studentId, organizationName) => {
  const collegeAdmin = await getApprovedCollegeAdminByOrganization(organizationName);
  if (!collegeAdmin) {
    return null;
  }

  return PlacementBatch.findOne({
    organization: collegeAdmin._id,
    'students.student': studentId,
    'students.status': 'active',
    status: { $ne: 'archived' }
  })
    .sort({ updatedAt: -1 })
    .populate('students.student', 'name email role organization status isEmailVerified')
    .populate('campaignAssignments.campaign', 'title deadline isActive config assignmentMode targetDepartment targetBatch');
};

const getPlatformBreakdown = (codingProfiles = {}) => {
  return Object.entries(codingProfiles).reduce((accumulator, [platform, profile]) => {
    if (profile && profile.isVerified) {
      accumulator.verifiedPlatforms.push(platform);
    }
    return accumulator;
  }, { verifiedPlatforms: [] });
};

const buildBatchStudentFilters = (query = {}) => {
  const filters = {};

  if (query.branch) {
    filters.branch = String(query.branch).trim();
  }

  if (query.graduationYear) {
    const graduationYear = Number(query.graduationYear);
    if (!Number.isNaN(graduationYear)) {
      filters.graduationYear = graduationYear;
    }
  }

  if (query.targetRole) {
    filters.targetRole = String(query.targetRole).trim();
  }

  return filters;
};

const matchesBatchStudentFilters = (studentRow, filters) => {
  if (filters.branch && String(studentRow.branch || '').toLowerCase() !== filters.branch.toLowerCase()) {
    return false;
  }

  if (filters.graduationYear && Number(studentRow.graduationYear) !== Number(filters.graduationYear)) {
    return false;
  }

  if (filters.targetRole && String(studentRow.targetRole || '').toLowerCase() !== filters.targetRole.toLowerCase()) {
    return false;
  }

  return true;
};

const buildBreakdown = (rows, keyGetter) => {
  return rows.reduce((accumulator, row) => {
    const key = keyGetter(row) || 'Unknown';
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
};

const calculateAverage = (values) => {
  const validValues = values.filter(value => typeof value === 'number' && !Number.isNaN(value));
  return validValues.length ? Math.round(validValues.reduce((sum, value) => sum + value, 0) / validValues.length) : 0;
};

const buildPerformanceBand = (score) => {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 50) return 'needs-focus';
  return 'at-risk';
};

const normalizeGranularity = (value) => {
  const normalized = String(value || 'monthly').toLowerCase();
  if (['daily', 'weekly', 'monthly'].includes(normalized)) {
    return normalized;
  }
  return 'monthly';
};

const buildTrendBucketKey = (date, granularity) => {
  const normalizedDate = new Date(date);
  if (Number.isNaN(normalizedDate.getTime())) {
    return 'Unknown';
  }

  if (granularity === 'daily') {
    return normalizedDate.toISOString().slice(0, 10);
  }

  if (granularity === 'weekly') {
    const start = new Date(normalizedDate);
    const day = start.getUTCDay();
    const diff = start.getUTCDate() - day + (day === 0 ? -6 : 1);
    start.setUTCDate(diff);
    return start.toISOString().slice(0, 10);
  }

  return `${normalizedDate.getUTCFullYear()}-${String(normalizedDate.getUTCMonth() + 1).padStart(2, '0')}`;
};

const buildTrendSeries = (sessions = [], granularity = 'monthly') => {
  const buckets = new Map();

  sessions.forEach((session) => {
    const bucketKey = buildTrendBucketKey(session.completedAt || session.startedAt || session.createdAt, granularity);
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        period: bucketKey,
        totalSessions: 0,
        completedSessions: 0,
        averageScore: 0,
        averageRisk: 0,
        gradeBreakdown: { A: 0, B: 0, C: 0, D: 0, Pending: 0 },
        _scoreSum: 0,
        _riskSum: 0
      });
    }

    const bucket = buckets.get(bucketKey);
    bucket.totalSessions += 1;
    if (session.status === 'completed') {
      bucket.completedSessions += 1;
      bucket._scoreSum += session.finalCompositeScore || 0;
    }

    bucket._riskSum += session.proctoringRiskScore || 0;
    const grade = session.finalGrade || 'Pending';
    bucket.gradeBreakdown[grade] = (bucket.gradeBreakdown[grade] || 0) + 1;
  });

  return Array.from(buckets.values())
    .map((bucket) => ({
      period: bucket.period,
      totalSessions: bucket.totalSessions,
      completedSessions: bucket.completedSessions,
      averageScore: bucket.completedSessions ? Math.round(bucket._scoreSum / bucket.completedSessions) : 0,
      averageRisk: bucket.totalSessions ? Math.round(bucket._riskSum / bucket.totalSessions) : 0,
      gradeBreakdown: bucket.gradeBreakdown
    }))
    .sort((left, right) => String(left.period).localeCompare(String(right.period)));
};

const buildTopAndRiskStudents = (students = []) => {
  const topStudents = [...students]
    .sort((left, right) => right.averageScore - left.averageScore)
    .slice(0, 5)
    .map(student => ({
      studentId: student.studentId,
      name: student.name,
      branch: student.branch,
      graduationYear: student.graduationYear,
      averageScore: student.averageScore,
      placementReadinessScore: student.placementReadinessScore,
      readinessBand: student.readinessBand
    }));

  const atRiskStudents = [...students]
    .filter(student => student.readinessBand === 'at-risk' || student.averageScore < 50)
    .sort((left, right) => left.averageScore - right.averageScore)
    .slice(0, 10)
    .map(student => ({
      studentId: student.studentId,
      name: student.name,
      branch: student.branch,
      graduationYear: student.graduationYear,
      averageScore: student.averageScore,
      placementReadinessScore: student.placementReadinessScore,
      readinessBand: student.readinessBand
    }));

  return { topStudents, atRiskStudents };
};

const buildChartCards = (report) => {
  if (report.scope === 'student') {
    return [
      { key: 'sessions', label: 'Total Sessions', value: report.metrics.totalSessions },
      { key: 'completed', label: 'Completed Sessions', value: report.metrics.completedSessions },
      { key: 'score', label: 'Average Score', value: report.metrics.averageScore },
      { key: 'risk', label: 'Average Risk', value: report.metrics.averageRisk },
      { key: 'readiness', label: 'Placement Readiness', value: report.metrics.placementReadinessScore }
    ];
  }

  return [
    { key: 'students', label: 'Active Students', value: report.metrics.activeStudents },
    { key: 'sessions', label: 'Total Sessions', value: report.metrics.totalSessions },
    { key: 'score', label: 'Average Interview Score', value: report.metrics.averageInterviewScore },
    { key: 'risk', label: 'Average Risk', value: report.metrics.averageRiskScore },
    { key: 'atRisk', label: 'At Risk Students', value: report.metrics.atRiskStudentsCount }
  ];
};

const buildChartSeries = (report) => {
  if (report.scope === 'student') {
    return {
      sessions: report.trendSeries || [],
      grades: report.metrics.gradeBreakdown || {},
      strengths: report.insights?.strengths || [],
      weaknesses: report.insights?.weaknesses || []
    };
  }

  return {
    sessions: report.trendSeries || [],
    branchBreakdown: report.metrics.breakdownByBranch || {},
    graduationYearBreakdown: report.metrics.breakdownByGraduationYear || {},
    readinessBreakdown: report.metrics.breakdownByReadinessBand || {},
    gradeBreakdown: report.metrics.gradeBreakdown || {}
  };
};

const buildDashboardReport = (report) => {
  if (report.scope === 'organization') {
    return {
      scope: report.scope,
      generatedAt: report.generatedAt,
      filters: report.filters || {},
      cards: report.cards || buildChartCards(report),
      series: report.series || buildChartSeries(report),
      topStudents: report.topStudents || [],
      atRiskStudents: report.atRiskStudents || [],
      batchSeries: report.batchSeries || [],
      trendGranularity: report.metrics?.trendGranularity || 'monthly',
      entity: {
        organization: report.organization,
        summary: report.summary || {
          activeStudents: report.metrics.activeStudents,
          activeBatches: report.metrics.activeBatches,
          totalBatches: report.metrics.totalBatches,
          averageReadinessScore: report.metrics.averageReadinessScore,
          averageInterviewScore: report.metrics.averageInterviewScore,
          averageRiskScore: report.metrics.averageRiskScore
        }
      }
    };
  }

  return {
    scope: report.scope,
    generatedAt: report.generatedAt,
    filters: report.filters || {},
    cards: buildChartCards(report),
    series: buildChartSeries(report),
    topStudents: report.topStudents || [],
    atRiskStudents: report.atRiskStudents || [],
    trendGranularity: report.metrics?.trendGranularity || 'monthly',
    entity: report.scope === 'student'
      ? {
          student: report.student,
          profile: report.profile,
          batch: report.batch
        }
      : {
          batch: report.batch,
          summary: {
            activeStudents: report.metrics.activeStudents,
            totalStudents: report.metrics.totalStudents,
            averageReadinessScore: report.metrics.averageReadinessScore,
            averageInterviewScore: report.metrics.averageInterviewScore,
            averageRiskScore: report.metrics.averageRiskScore
          }
        }
  };
};

const computeSessionMetrics = (sessions = []) => {
  const completedSessions = sessions.filter(session => session.status === 'completed');
  const totalScore = completedSessions.reduce((sum, session) => sum + (session.finalCompositeScore || 0), 0);
  const totalRisk = sessions.reduce((sum, session) => sum + (session.proctoringRiskScore || 0), 0);

  const gradeBreakdown = sessions.reduce((accumulator, session) => {
    const grade = session.finalGrade || 'Pending';
    accumulator[grade] = (accumulator[grade] || 0) + 1;
    return accumulator;
  }, { A: 0, B: 0, C: 0, D: 0, Pending: 0 });

  return {
    totalSessions: sessions.length,
    completedSessions: completedSessions.length,
    averageScore: completedSessions.length ? Math.round(totalScore / completedSessions.length) : 0,
    bestScore: completedSessions.length ? Math.max(...completedSessions.map(session => session.finalCompositeScore || 0)) : 0,
    latestScore: sessions[0]?.finalCompositeScore || 0,
    averageRisk: sessions.length ? Math.round(totalRisk / sessions.length) : 0,
    gradeBreakdown
  };
};

const buildStudentReport = async ({ studentId, organizationName, query = {} }) => {
  const student = await User.findOne({ _id: studentId, organization: organizationName }).select('-password');
  if (!student) {
    return null;
  }

  const dateRange = buildDateRange(query);
  const granularity = normalizeGranularity(query.granularity);
  const profile = await StudentProfile.findOne({ user: student._id }).populate('user', 'name email role organization status isEmailVerified codingProfiles');

  const [sessions, insights, batch] = await Promise.all([
    InterviewSession.find(applyDateRange({ student: student._id }, dateRange)).sort({ createdAt: -1 }),
    PerformanceInsight.find(applyDateRange({ student: student._id }, dateRange)).sort({ createdAt: -1 }),
    getStudentBatch(student._id, organizationName)
  ]);

  const sessionMetrics = computeSessionMetrics(sessions);
  const trendSeries = buildTrendSeries(sessions, granularity);
  const platformBreakdown = getPlatformBreakdown(student.codingProfiles || {});
  const latestInsight = insights[0] || null;
  const recentSessions = sessions.slice(0, 5).map(session => ({
    id: session._id,
    status: session.status,
    targetRole: session.targetRole,
    preferredCodingLanguage: session.preferredCodingLanguage,
    finalCompositeScore: session.finalCompositeScore,
    finalGrade: session.finalGrade,
    proctoringRiskScore: session.proctoringRiskScore,
    startedAt: session.startedAt,
    completedAt: session.completedAt
  }));

  return {
    generatedAt: new Date(),
    scope: 'student',
    student: {
      id: student._id,
      name: student.name,
      email: student.email,
      organization: student.organization,
      role: student.role,
      status: student.status
    },
    profile: profile ? {
      branch: profile.branch,
      graduationYear: profile.graduationYear,
      cgpa: profile.cgpa,
      attendance: profile.attendance,
      targetRole: profile.targetRole,
      expectedCTC: profile.expectedCTC,
      skills: profile.skills || [],
      projectsCount: (profile.projects || []).length,
      placementReadinessScore: profile.placementReadinessScore,
      preferredInterviewLanguage: profile.preferredInterviewLanguage,
      codingLanguageChoices: profile.codingLanguageChoices || [],
      externalMetrics: profile.externalMetrics || {},
      verifiedPlatforms: platformBreakdown.verifiedPlatforms
    } : null,
    batch: batch ? {
      id: batch._id,
      batchName: batch.batchName,
      batchCode: batch.batchCode,
      academicYear: batch.academicYear,
      graduationYear: batch.graduationYear,
      department: batch.department,
      section: batch.section,
      status: batch.status,
      studentCount: batch.studentCount
    } : null,
    metrics: {
      ...sessionMetrics,
      insightsCount: insights.length,
      placementReadinessScore: profile?.placementReadinessScore || 0,
      verifiedPlatformCount: platformBreakdown.verifiedPlatforms.length,
      trendGranularity: granularity
    },
    insights: latestInsight ? {
      narrativeSummary: latestInsight.narrativeSummary,
      strengths: latestInsight.strengths || [],
      weaknesses: latestInsight.weaknesses || [],
      skillGapsVsJd: latestInsight.skillGapsVsJd || [],
      actionableStudyPlan: latestInsight.actionableStudyPlan || []
    } : null,
    recentSessions,
    trendSeries,
    recentInsights: insights.slice(0, 3).map(insight => ({
      id: insight._id,
      narrativeSummary: insight.narrativeSummary,
      strengths: insight.strengths || [],
      weaknesses: insight.weaknesses || [],
      skillGapsVsJd: insight.skillGapsVsJd || []
    }))
  };
};

const buildOrganizationReport = async ({ organizationUserId, organizationName, query = {} }) => {
  const dateRange = buildDateRange(query);
  const granularity = normalizeGranularity(query.granularity);

  const [batches, students] = await Promise.all([
    PlacementBatch.find({ organization: organizationUserId }).sort({ createdAt: -1 }),
    User.find({ role: 'student', organization: organizationName }).select('_id name email role organization status createdAt codingProfiles')
  ]);

  const studentIds = students.map(student => student._id);
  const profiles = await StudentProfile.find({ user: { $in: studentIds } }).populate('user', 'name email role organization status createdAt codingProfiles');
  const [sessions, insights] = await Promise.all([
    InterviewSession.find(applyDateRange({ student: { $in: studentIds } }, dateRange)).sort({ createdAt: -1 }),
    PerformanceInsight.find(applyDateRange({ student: { $in: studentIds } }, dateRange)).sort({ createdAt: -1 })
  ]);

  const profileMap = new Map(profiles.filter(profile => profile.user).map(profile => [profile.user._id.toString(), profile]));
  const sessionMap = new Map();
  sessions.forEach((session) => {
    const key = session.student.toString();
    if (!sessionMap.has(key)) sessionMap.set(key, []);
    sessionMap.get(key).push(session);
  });

  const insightMap = new Map();
  insights.forEach((insight) => {
    const key = insight.student.toString();
    if (!insightMap.has(key)) insightMap.set(key, []);
    insightMap.get(key).push(insight);
  });

  const studentRows = students.map((student) => {
    const profile = profileMap.get(student._id.toString()) || null;
    const studentSessions = sessionMap.get(student._id.toString()) || [];
    const studentInsights = insightMap.get(student._id.toString()) || [];
    const metrics = computeSessionMetrics(studentSessions);

    return {
      studentId: student._id,
      name: student.name,
      email: student.email,
      branch: profile?.branch || '',
      graduationYear: profile?.graduationYear || null,
      targetRole: profile?.targetRole || '',
      placementReadinessScore: profile?.placementReadinessScore || 0,
      readinessBand: buildPerformanceBand(profile?.placementReadinessScore || 0),
      totalSessions: metrics.totalSessions,
      completedSessions: metrics.completedSessions,
      averageScore: metrics.averageScore,
      bestScore: metrics.bestScore,
      latestScore: metrics.latestScore,
      averageRisk: metrics.averageRisk,
      insightsCount: studentInsights.length,
      verifiedPlatformCount: getPlatformBreakdown(student.codingProfiles || {}).verifiedPlatforms.length
    };
  });

  const filteredStudents = studentRows;
  const filteredStudentIds = new Set(filteredStudents.map(row => row.studentId.toString()));
  const filteredSessions = sessions.filter(session => filteredStudentIds.has(session.student.toString()));
  const filteredInsights = insights.filter(insight => filteredStudentIds.has(insight.student.toString()));
  const trendSeries = buildTrendSeries(filteredSessions, granularity);
  const { topStudents, atRiskStudents } = buildTopAndRiskStudents(filteredStudents);

  const activeBatches = batches.filter(batch => batch.status !== 'archived');
  const batchRows = activeBatches.map((batch) => {
    const activeBatchStudents = (batch.students || []).filter(entry => entry.status === 'active');
    const batchStudentIds = new Set(activeBatchStudents.map(entry => entry.student.toString()));
    const batchSessions = sessions.filter(session => batchStudentIds.has(session.student.toString()));
    const batchInsights = insights.filter(insight => batchStudentIds.has(insight.student.toString()));
    const batchMetrics = computeSessionMetrics(batchSessions);

    return {
      batchId: batch._id,
      batchName: batch.batchName,
      batchCode: batch.batchCode,
      department: batch.department,
      graduationYear: batch.graduationYear,
      section: batch.section,
      studentCount: activeBatchStudents.length,
      averageScore: batchMetrics.averageScore,
      averageRisk: batchMetrics.averageRisk,
      completedSessions: batchMetrics.completedSessions,
      totalSessions: batchMetrics.totalSessions,
      insightsCount: batchInsights.length,
      readinessBand: buildPerformanceBand(calculateAverage(activeBatchStudents.map(entry => profileMap.get(entry.student.toString())?.placementReadinessScore || 0)))
    };
  });

  const batchSeries = batchRows
    .sort((left, right) => right.studentCount - left.studentCount)
    .slice(0, 10);

  const breakdownByBranch = buildBreakdown(filteredStudents, row => row.branch);
  const breakdownByGraduationYear = buildBreakdown(filteredStudents, row => row.graduationYear);
  const breakdownByReadinessBand = buildBreakdown(filteredStudents, row => row.readinessBand);
  const batchBreakdownByDepartment = buildBreakdown(batchRows, row => row.department);
  const gradeBreakdown = filteredSessions.reduce((accumulator, session) => {
    const grade = session.finalGrade || 'Pending';
    accumulator[grade] = (accumulator[grade] || 0) + 1;
    return accumulator;
  }, { A: 0, B: 0, C: 0, D: 0, Pending: 0 });

  return {
    generatedAt: new Date(),
    scope: 'organization',
    filters: {
      ...buildBatchStudentFilters(query),
      granularity
    },
    organization: {
      id: organizationUserId,
      name: organizationName
    },
    batches: batchRows,
    metrics: {
      activeStudents: filteredStudents.length,
      activeBatches: activeBatches.length,
      totalBatches: batches.length,
      totalSessions: filteredSessions.length,
      totalInsights: filteredInsights.length,
      averageReadinessScore: calculateAverage(filteredStudents.map(row => row.placementReadinessScore)),
      averageInterviewScore: calculateAverage(filteredStudents.map(row => row.averageScore)),
      averageRiskScore: calculateAverage(filteredStudents.map(row => row.averageRisk)),
      atRiskStudentsCount: atRiskStudents.length,
      breakdownByBranch,
      breakdownByGraduationYear,
      breakdownByReadinessBand,
      batchBreakdownByDepartment,
      gradeBreakdown,
      trendGranularity: granularity
    },
    trendSeries,
    cards: buildChartCards({
      scope: 'organization',
      metrics: {
        activeStudents: filteredStudents.length,
        totalSessions: filteredSessions.length,
        averageInterviewScore: calculateAverage(filteredStudents.map(row => row.averageScore)),
        averageRiskScore: calculateAverage(filteredStudents.map(row => row.averageRisk)),
        atRiskStudentsCount: atRiskStudents.length
      }
    }),
    series: buildChartSeries({
      scope: 'organization',
      trendSeries,
      metrics: {
        breakdownByBranch,
        breakdownByGraduationYear,
        breakdownByReadinessBand,
        gradeBreakdown
      }
    }),
    topStudents,
    atRiskStudents,
    batchSeries,
    summary: {
      topBatch: batchSeries[0] || null,
      topPerformer: topStudents[0] || null,
      lowestPerformer: [...filteredStudents].sort((a, b) => a.averageScore - b.averageScore)[0] || null
    }
  };
};

const buildBatchReport = async ({ batchId, organizationUserId, query = {} }) => {
  const batch = await PlacementBatch.findOne({ _id: batchId, organization: organizationUserId })
    .populate('students.student', 'name email role organization status isEmailVerified createdAt');

  if (!batch) {
    return null;
  }

  const activeStudents = batch.students.filter(entry => entry.status === 'active').map(entry => entry.student).filter(Boolean);
  const studentIds = activeStudents.map(student => student._id);
  const dateRange = buildDateRange(query);
  const granularity = normalizeGranularity(query.granularity);

  const [profiles, sessions, insights] = await Promise.all([
    StudentProfile.find({ user: { $in: studentIds } }),
    InterviewSession.find(applyDateRange({ student: { $in: studentIds } }, dateRange)).sort({ createdAt: -1 }),
    PerformanceInsight.find(applyDateRange({ student: { $in: studentIds } }, dateRange)).sort({ createdAt: -1 })
  ]);

  const profileMap = new Map(profiles.map(profile => [profile.user.toString(), profile]));
  const studentFilters = buildBatchStudentFilters(query);
  const sessionMap = new Map();
  sessions.forEach(session => {
    const key = session.student.toString();
    if (!sessionMap.has(key)) sessionMap.set(key, []);
    sessionMap.get(key).push(session);
  });

  const insightMap = new Map();
  insights.forEach(insight => {
    const key = insight.student.toString();
    if (!insightMap.has(key)) insightMap.set(key, []);
    insightMap.get(key).push(insight);
  });

  const studentRows = activeStudents.map((student) => {
    const studentProfile = profileMap.get(student._id.toString()) || null;
    const studentSessions = sessionMap.get(student._id.toString()) || [];
    const studentInsights = insightMap.get(student._id.toString()) || [];
    const metrics = computeSessionMetrics(studentSessions);

    return {
      studentId: student._id,
      name: student.name,
      email: student.email,
      branch: studentProfile?.branch || '',
      graduationYear: studentProfile?.graduationYear || batch.graduationYear,
      targetRole: studentProfile?.targetRole || '',
      cgpa: studentProfile?.cgpa ?? '',
      attendance: studentProfile?.attendance ?? '',
      placementReadinessScore: studentProfile?.placementReadinessScore || 0,
      readinessBand: buildPerformanceBand(studentProfile?.placementReadinessScore || 0),
      totalSessions: metrics.totalSessions,
      completedSessions: metrics.completedSessions,
      averageScore: metrics.averageScore,
      bestScore: metrics.bestScore,
      latestScore: metrics.latestScore,
      averageRisk: metrics.averageRisk,
      insightsCount: studentInsights.length,
      verifiedPlatformCount: getPlatformBreakdown(student.codingProfiles || {}).verifiedPlatforms.length
    };
  });

  const filteredStudents = studentRows.filter(row => matchesBatchStudentFilters(row, studentFilters));
  const filteredStudentIds = new Set(filteredStudents.map(row => row.studentId.toString()));
  const filteredSessions = sessions.filter(session => filteredStudentIds.has(session.student.toString()));
  const filteredInsights = insights.filter(insight => filteredStudentIds.has(insight.student.toString()));
  const trendSeries = buildTrendSeries(filteredSessions, granularity);
  let { topStudents, atRiskStudents } = buildTopAndRiskStudents(filteredStudents);

  const numericScores = filteredStudents.map(row => row.placementReadinessScore);
  const interviewScores = filteredStudents.map(row => row.averageScore);
  const risks = filteredStudents.map(row => row.averageRisk);

  const topPerformer = [...filteredStudents].sort((a, b) => b.averageScore - a.averageScore)[0] || null;
  const lowestPerformer = [...filteredStudents].sort((a, b) => a.averageScore - b.averageScore)[0] || null;
  atRiskStudents = filteredStudents.filter(student => student.readinessBand === 'at-risk' || student.averageScore < 50);
  const breakdownByBranch = buildBreakdown(filteredStudents, row => row.branch);
  const breakdownByGraduationYear = buildBreakdown(filteredStudents, row => row.graduationYear);
  const breakdownByReadinessBand = buildBreakdown(filteredStudents, row => row.readinessBand);
  const gradeBreakdown = filteredSessions.reduce((accumulator, session) => {
    const grade = session.finalGrade || 'Pending';
    accumulator[grade] = (accumulator[grade] || 0) + 1;
    return accumulator;
  }, { A: 0, B: 0, C: 0, D: 0, Pending: 0 });

  return {
    generatedAt: new Date(),
    scope: 'batch',
    filters: studentFilters,
    batch: {
      id: batch._id,
      batchName: batch.batchName,
      batchCode: batch.batchCode,
      academicYear: batch.academicYear,
      graduationYear: batch.graduationYear,
      department: batch.department,
      section: batch.section,
      status: batch.status,
      studentCount: batch.studentCount,
      placementOfficerNotes: batch.placementOfficerNotes
    },
    metrics: {
      activeStudents: filteredStudents.length,
      totalStudents: batch.students.length,
      averageReadinessScore: calculateAverage(numericScores),
      averageInterviewScore: calculateAverage(interviewScores),
      averageRiskScore: calculateAverage(risks),
      topPerformer,
      lowestPerformer,
      totalSessions: filteredSessions.length,
      totalInsights: filteredInsights.length,
      atRiskStudentsCount: atRiskStudents.length,
      breakdownByBranch,
      breakdownByGraduationYear,
      breakdownByReadinessBand,
      gradeBreakdown,
      trendGranularity: granularity
    },
    students: filteredStudents,
    trendSeries,
    topStudents,
    atRiskStudents,
    campaigns: batch.campaignAssignments || []
  };
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const normalized = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

const studentReportToCsv = (report) => {
  const rows = [
    ['field', 'value'],
    ['studentName', report.student.name],
    ['studentEmail', report.student.email],
    ['organization', report.student.organization],
    ['branch', report.profile?.branch || ''],
    ['graduationYear', report.profile?.graduationYear || ''],
    ['cgpa', report.profile?.cgpa ?? ''],
    ['attendance', report.profile?.attendance ?? ''],
    ['targetRole', report.profile?.targetRole || ''],
    ['placementReadinessScore', report.profile?.placementReadinessScore || 0],
    ['verifiedPlatforms', (report.profile?.verifiedPlatforms || []).join('; ')],
    ['batchName', report.batch?.batchName || ''],
    ['batchCode', report.batch?.batchCode || ''],
    ['totalSessions', report.metrics.totalSessions],
    ['completedSessions', report.metrics.completedSessions],
    ['averageScore', report.metrics.averageScore],
    ['bestScore', report.metrics.bestScore],
    ['latestScore', report.metrics.latestScore],
    ['averageRisk', report.metrics.averageRisk],
    ['insightsCount', report.metrics.insightsCount],
    ['strengths', (report.insights?.strengths || []).join('; ')],
    ['weaknesses', (report.insights?.weaknesses || []).join('; ')],
    ['skillGapsVsJd', (report.insights?.skillGapsVsJd || []).join('; ')],
    ['actionableStudyPlan', JSON.stringify(report.insights?.actionableStudyPlan || [])]
  ];

  return rows.map(row => row.map(csvEscape).join(',')).join('\n');
};

const batchReportToCsv = (report) => {
  const headers = [
    'studentId',
    'name',
    'email',
    'branch',
    'graduationYear',
    'cgpa',
    'attendance',
    'placementReadinessScore',
    'totalSessions',
    'completedSessions',
    'averageScore',
    'bestScore',
    'latestScore',
    'averageRisk',
    'insightsCount',
    'verifiedPlatformCount'
  ];

  const rows = [headers.join(',')];
  report.students.forEach((student) => {
    rows.push([
      student.studentId,
      student.name,
      student.email,
      student.branch,
      student.graduationYear,
      student.cgpa,
      student.attendance,
      student.placementReadinessScore,
      student.totalSessions,
      student.completedSessions,
      student.averageScore,
      student.bestScore,
      student.latestScore,
      student.averageRisk,
      student.insightsCount,
      student.verifiedPlatformCount
    ].map(csvEscape).join(','));
  });

  return rows.join('\n');
};

module.exports = {
  buildStudentReport,
  buildBatchReport,
  studentReportToCsv,
  batchReportToCsv,
  buildDateRange,
  parseOptionalDate,
  normalizeGranularity,
  buildTrendSeries,
  buildTopAndRiskStudents,
  buildDashboardReport,
  buildChartCards,
  buildChartSeries,
  buildOrganizationReport
};