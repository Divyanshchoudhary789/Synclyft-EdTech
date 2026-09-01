const Organization = require('../models/OrganizationModel');

// A subscription/billing record's `organization` field stores EITHER:
//   - the Organization doc _id  (college-admin / 'organization' ownerType)
//   - the student's User _id     (individual ownerType)
// The schema `ref` is nominally 'User', so callers must NOT trust a populated
// `organization` doc for authorization. Always resolve ownership from the raw
// stored id against the authenticated user's candidate ids.
//
// Returns the set of ids that "own" data for this user:
//   [ user._id, <Organization doc _id if the user is an org admin> ]
async function resolveOwnerIds(req) {
  const userId = req.user.id;
  const ids = [userId];
  try {
    const org = await Organization.findOne({ user: userId }).select('_id').lean();
    if (org) ids.push(org._id.toString());
  } catch (err) {
    // Non-fatal: fall back to just the user id.
  }
  return ids;
}

// True when `ownerId` (raw subscription/billing.organization value) belongs to
// the authenticated user, either directly (individual) or via their org.
async function isOwnerOf(req, ownerId) {
    if (!ownerId) return false;
    const id = (ownerId._id || ownerId).toString();
    const candidateIds = await resolveOwnerIds(req);
    return candidateIds.includes(id);
}

module.exports = { resolveOwnerIds, isOwnerOf };
