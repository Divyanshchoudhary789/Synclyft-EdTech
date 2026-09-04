const path = require('path');
const fs = require('fs');

/**
 * Seller / issuer details printed on every invoice.
 * Everything is env-overridable so the same build works for any legal entity
 * without a code change. Sensible Synclyft defaults otherwise.
 */
const COMPANY = {
  name: process.env.COMPANY_NAME || 'Synclyft AI Technologies',
  tagline: process.env.COMPANY_TAGLINE || 'Placement readiness, on data.',
  // Accepts a literal "\n" (dotenv keeps it literal in unquoted values), a real
  // newline, or a "|" — any of them splits the address into lines.
  addressLines: (process.env.COMPANY_ADDRESS || 'Jaipur, Rajasthan 302017\nIndia')
    .split(/\\n|\r?\n|\s*\|\s*/)
    .map((l) => l.trim())
    .filter(Boolean),
  email: process.env.COMPANY_EMAIL || 'billing@synclyft.in',
  phone: process.env.COMPANY_PHONE || '',
  website: process.env.COMPANY_WEBSITE || 'https://synclyft.in',
  gstin: process.env.COMPANY_GSTIN || '',
  pan: process.env.COMPANY_PAN || '',
  cin: process.env.COMPANY_CIN || '',
  // HSN/SAC for "Online educational / software services"
  sac: process.env.COMPANY_SAC || '998434',
  // Optional bank block for NEFT/RTGS payers (only printed if a name is set)
  bank: {
    name: process.env.COMPANY_BANK_NAME || '',
    accountName: process.env.COMPANY_BANK_ACCOUNT_NAME || process.env.COMPANY_NAME || 'Synclyft AI Technologies',
    accountNumber: process.env.COMPANY_BANK_ACCOUNT_NUMBER || '',
    ifsc: process.env.COMPANY_BANK_IFSC || '',
    branch: process.env.COMPANY_BANK_BRANCH || '',
  },
  supportEmail: process.env.COMPANY_SUPPORT_EMAIL || process.env.COMPANY_EMAIL || 'support@synclyft.in',
};

const assetPath = (name) => {
  const p = path.join(__dirname, '..', 'assets', name);
  try {
    return fs.existsSync(p) ? p : null;
  } catch {
    return null;
  }
};

/** Absolute path to the logo file, or null if it isn't bundled. */
const LOGO_PATH = assetPath('logo.png');

/** Unicode fonts (₹ glyph + clean type). Falls back to Helvetica if missing. */
const FONTS = {
  regular: assetPath('NotoSans-Regular.ttf'),
  bold: assetPath('NotoSans-Bold.ttf'),
};

const BRAND = {
  primary: '#0062FF',
  ink: '#15171C',
  muted: '#6B7280',
  faint: '#9CA3AF',
  line: '#E5E2D9',
  panel: '#F7F6F3',
  green: '#149A5C',
  red: '#D64545',
  amber: '#B7791F',
};

module.exports = { COMPANY, LOGO_PATH, FONTS, BRAND };
