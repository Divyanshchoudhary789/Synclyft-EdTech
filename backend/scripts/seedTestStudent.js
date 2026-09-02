/**
 * Local-dev helper — creates (or resets) a verified test student so the student
 * app can be exercised end-to-end without a live inbox for the OTP email.
 *
 *   node scripts/seedTestStudent.js
 *
 * Safe to delete. Only ever touches the single hard-coded test account.
 */
require('../config/env.js');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/userModel.js');
const StudentProfile = require('../models/StudentProfileModel.js');
const NotificationPreference = require('../models/NotificationPreferenceModel.js');

const EMAIL = 'test.student.local@example.com';
const PASSWORD = 'TestStudent@123';
const NAME = 'Test Student';
const ORG = 'Local Dev College';

(async () => {
  await mongoose.connect(process.env.MONGODB_URL);
  const hash = await bcrypt.hash(PASSWORD, 12);

  let user = await User.findOne({ email: EMAIL }).select('+password');
  if (user) {
    user.password = hash;
    user.status = 'Approved';
    user.isEmailVerified = true;
    await user.save();
    console.log('Reset existing test student:', EMAIL);
  } else {
    user = await User.create({
      name: NAME,
      email: EMAIL,
      password: hash,
      role: 'student',
      organization: ORG,
      status: 'Approved',
      isEmailVerified: true,
    });
    console.log('Created test student:', EMAIL);
  }

  if (!(await StudentProfile.findOne({ user: user._id }))) {
    await StudentProfile.create({ user: user._id });
    console.log('  + StudentProfile');
  }
  if (!(await NotificationPreference.findOne({ user: user._id }))) {
    await NotificationPreference.create({ user: user._id });
    console.log('  + NotificationPreference');
  }

  console.log(`\n  email:    ${EMAIL}\n  password: ${PASSWORD}\n`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
