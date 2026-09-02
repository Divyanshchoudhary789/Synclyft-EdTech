/**
 * Local-dev helper — creates (or resets) a verified college-admin ("officer")
 * plus its Organization so the officer app can be exercised end-to-end.
 *
 *   node scripts/seedTestOfficer.js
 *
 * Safe to delete. Only ever touches the single hard-coded test account.
 */
require('../config/env.js');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/userModel.js');
const Organization = require('../models/OrganizationModel.js');

const EMAIL = 'test.officer.local@example.com';
const PASSWORD = 'TestOfficer@123';
const NAME = 'Test Officer';
const ORG = 'Local Dev College';

(async () => {
  await mongoose.connect(process.env.MONGODB_URL);
  const hash = await bcrypt.hash(PASSWORD, 12);

  let user = await User.findOne({ email: EMAIL }).select('+password');
  if (!user) {
    user = await User.create({
      name: NAME,
      email: EMAIL,
      password: hash,
      role: 'college-admin',
      organization: ORG,
      isEmailVerified: true,
    });
    console.log('Created test officer:', EMAIL);
  }

  // A pre-save hook forces new college-admins to 'Pending'; write the approved
  // status directly so the local test account can sign in.
  await User.updateOne(
    { _id: user._id },
    { $set: { password: hash, role: 'college-admin', status: 'Approved', isEmailVerified: true, approvedAt: new Date() } }
  );
  console.log('Approved test officer:', EMAIL);

  let org = await Organization.findOne({ user: user._id });
  if (!org) {
    org = await Organization.create({
      user: user._id,
      organizationName: ORG,
      organizationType: 'college',
      primaryContactPerson: { name: NAME, email: EMAIL },
    });
    console.log('  + Organization');
  }

  console.log(`\n  email:    ${EMAIL}\n  password: ${PASSWORD}\n`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
