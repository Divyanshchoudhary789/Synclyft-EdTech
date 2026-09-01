const User = require('../models/userModel.js');
const PlacementBatch = require('../models/PlacementBatchModel.js');
const Campaign = require('../models/CampaignModel.js');

const getOwningCollegeAdmin = async (studentUser) => {
  return User.findOne({
    role: 'college-admin',
    organization: studentUser.organization,
    status: 'Approved'
  }).sort({ createdAt: 1 });
};

const getActiveStudentBatch = async (studentUser) => {
  const collegeAdmin = await getOwningCollegeAdmin(studentUser);
  if (!collegeAdmin) {
    return { collegeAdmin: null, batch: null };
  }

  const batch = await PlacementBatch.findOne({
    organization: collegeAdmin._id,
    'students.student': studentUser._id,
    'students.status': 'active',
    status: { $ne: 'archived' }
  })
    .sort({ updatedAt: -1 })
    .populate('students.student', 'name email role organization status isEmailVerified')
    .populate('campaignAssignments.campaign', 'title deadline isActive config assignmentMode targetDepartment targetBatch');

  return { collegeAdmin, batch };
};

const getMyBatch = async (req, res) => {
  const student = await User.findById(req.user.id).select('name email role organization status');
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found.' });
  }

  const { batch } = await getActiveStudentBatch(student);

  if (!batch) {
    return res.status(404).json({ success: false, message: 'No active batch found for your account.' });
  }

  return res.status(200).json({
    success: true,
    message: 'Student batch fetched successfully.',
    data: batch
  });
};

const getCampaignInbox = async (req, res) => {
  const student = await User.findById(req.user.id).select('name email role organization status');
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found.' });
  }

  const { page = 1, limit = 10 } = req.query;
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (safePage - 1) * safeLimit;

  const { collegeAdmin, batch } = await getActiveStudentBatch(student);
  if (!collegeAdmin || !batch) {
    return res.status(404).json({ success: false, message: 'No active batch found for your account.' });
  }

  const query = {
    creator: collegeAdmin._id,
    isActive: true,
    deadline: { $gte: new Date() },
    $or: [
      { 'assignedBatches.batch': batch._id },
      { targetBatch: batch.graduationYear },
      { targetDepartment: batch.department }
    ]
  };

  const [campaigns, total] = await Promise.all([
    Campaign.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    Campaign.countDocuments(query)
  ]);

  return res.status(200).json({
    success: true,
    message: 'Campaign inbox fetched successfully.',
    data: {
      batch,
      campaigns
    },
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit)
    }
  });
};

const getCampaignById = async (req, res) => {
  const student = await User.findById(req.user.id).select('name email role organization status');
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found.' });
  }

  const { collegeAdmin, batch } = await getActiveStudentBatch(student);
  if (!collegeAdmin || !batch) {
    return res.status(404).json({ success: false, message: 'No active batch found for your account.' });
  }

  const campaign = await Campaign.findOne({
    _id: req.params.campaignId,
    creator: collegeAdmin._id,
    isActive: true,
    $or: [
      { 'assignedBatches.batch': batch._id },
      { targetBatch: batch.graduationYear },
      { targetDepartment: batch.department }
    ]
  });

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found or not assigned to your batch.' });
  }

  return res.status(200).json({
    success: true,
    message: 'Campaign fetched successfully.',
    data: campaign
  });
};

module.exports = {
  getMyBatch,
  getCampaignInbox,
  getCampaignById
};