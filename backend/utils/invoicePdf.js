const { COMPANY, LOGO_PATH, FONTS, BRAND } = require('./companyInfo');

// Font aliases — Unicode (₹) when the TTFs are bundled, else the PDF standard set.
const F = { reg: 'Helvetica', bold: 'Helvetica-Bold', oblique: 'Helvetica-Oblique' };
function setupFonts(doc) {
  if (FONTS.regular && FONTS.bold) {
    try {
      doc.registerFont('Inv-Regular', FONTS.regular);
      doc.registerFont('Inv-Bold', FONTS.bold);
      F.reg = 'Inv-Regular';
      F.bold = 'Inv-Bold';
      F.oblique = 'Inv-Regular';
    } catch { /* fall back to standard fonts */ }
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────
const CUR = { INR: '₹', USD: '$', EUR: '€' };

function money(n, currency = 'INR') {
  const sym = CUR[currency] || '';
  const v = Number(n || 0);
  return `${sym}${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return `${String(dt.getDate()).padStart(2, '0')} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}
function fmtDateShort(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return `${String(dt.getDate()).padStart(2, '0')} ${MONTHS[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`;
}

// Indian-system number-to-words for the "amount in words" line.
function amountInWords(num, currency = 'INR') {
  const rupees = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - rupees) * 100);
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (n) => (n < 20 ? a[n] : `${b[Math.floor(n / 10)]}${n % 10 ? ' ' + a[n % 10] : ''}`);
  const three = (n) => {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return `${h ? a[h] + ' Hundred' + (r ? ' ' : '') : ''}${r ? two(r) : ''}`;
  };
  const words = (n) => {
    if (n === 0) return 'Zero';
    let out = '';
    const crore = Math.floor(n / 1e7); n %= 1e7;
    const lakh = Math.floor(n / 1e5); n %= 1e5;
    const thousand = Math.floor(n / 1e3); n %= 1e3;
    if (crore) out += three(crore) + ' Crore ';
    if (lakh) out += three(lakh) + ' Lakh ';
    if (thousand) out += three(thousand) + ' Thousand ';
    if (n) out += three(n);
    return out.trim();
  };
  const unit = currency === 'USD' ? ['Dollars', 'Cents'] : currency === 'EUR' ? ['Euros', 'Cents'] : ['Rupees', 'Paise'];
  let s = `${words(rupees)} ${unit[0]}`;
  if (paise) s += ` and ${words(paise)} ${unit[1]}`;
  return s + ' Only';
}

const STATUS_META = {
  completed: { label: 'PAID', color: BRAND.green },
  pending: { label: 'PAYMENT DUE', color: BRAND.amber },
  failed: { label: 'PAYMENT FAILED', color: BRAND.red },
  refunded: { label: 'REFUNDED', color: BRAND.muted },
};

const PAYMENT_METHOD_LABEL = {
  credit_card: 'Credit card', debit_card: 'Debit card', bank_transfer: 'Bank transfer',
  upi: 'UPI', net_banking: 'Net banking', wallet: 'Wallet',
};

/**
 * Render a professional invoice into an existing PDFKit doc.
 *
 * @param {PDFKit.PDFDocument} doc  a fresh `new PDFDocument({ size: 'A4', margin: 50 })`
 * @param {object} invoice          Billing document (lean or hydrated)
 * @param {object} buyer            { name, email, phone, addressLines:[], gstin, stateCode }
 */
function renderInvoicePdf(doc, invoice, buyer = {}) {
  setupFonts(doc);
  const M = doc.page.margins.left;
  const RIGHT = doc.page.width - doc.page.margins.right;
  const W = RIGHT - M;
  const currency = invoice.currency || 'INR';
  const gstEnabled = !!COMPANY.gstin && Number(invoice.tax || 0) > 0;

  const subtotal = Number(invoice.subtotal || 0);
  const discount = Number(invoice.discount || 0);
  const taxable = Math.max(subtotal - discount, 0);
  const tax = Number(invoice.tax || 0);
  const total = Number(invoice.totalAmount ?? (taxable + tax));
  const taxRatePct = taxable > 0 ? Math.round((tax / taxable) * 1000) / 10 : 0;

  const status = STATUS_META[invoice.paymentStatus] || { label: String(invoice.paymentStatus || '').toUpperCase(), color: BRAND.muted };

  // Intra-state (CGST+SGST) vs inter-state (IGST): compare 2-digit state codes.
  const sellerState = (process.env.COMPANY_STATE_CODE || (COMPANY.gstin || '').slice(0, 2)) || null;
  const buyerState = buyer.stateCode || (buyer.gstin || '').slice(0, 2) || null;
  const intraState = gstEnabled && sellerState && buyerState && sellerState === buyerState;

  // ── top accent bar ──
  doc.rect(0, 0, doc.page.width, 6).fill(BRAND.primary);
  doc.fillColor(BRAND.ink);

  let y = 46;

  // ── header: logo + company (left)  |  invoice title + status (right) ──
  if (LOGO_PATH) {
    try { doc.image(LOGO_PATH, M, y, { width: 42, height: 42 }); } catch { /* ignore */ }
  }
  const cx = M + (LOGO_PATH ? 54 : 0);
  doc.font(F.bold).fontSize(15).fillColor(BRAND.ink).text(COMPANY.name, cx, y);
  doc.font(F.reg).fontSize(8).fillColor(BRAND.muted);
  let cy = y + 19;
  if (COMPANY.tagline) { doc.text(COMPANY.tagline, cx, cy); cy += 11; }
  COMPANY.addressLines.forEach((l) => { doc.text(l, cx, cy); cy += 10; });
  const contactBits = [COMPANY.email, COMPANY.phone, (COMPANY.website || '').replace(/^https?:\/\//, '')].filter(Boolean);
  if (contactBits.length) { doc.text(contactBits.join('  ·  '), cx, cy); cy += 10; }
  const idBits = [COMPANY.gstin && `GSTIN: ${COMPANY.gstin}`, COMPANY.pan && `PAN: ${COMPANY.pan}`, COMPANY.cin && `CIN: ${COMPANY.cin}`].filter(Boolean);
  if (idBits.length) { doc.text(idBits.join('   '), cx, cy); cy += 10; }

  // right block
  doc.font(F.bold).fontSize(20).fillColor(BRAND.ink)
    .text(gstEnabled ? 'TAX INVOICE' : 'INVOICE', RIGHT - 220, y, { width: 220, align: 'right' });
  // status pill
  const pillW = doc.font(F.bold).fontSize(8).widthOfString(status.label) + 18;
  const pillX = RIGHT - pillW;
  const pillY = y + 27;
  doc.roundedRect(pillX, pillY, pillW, 15, 7.5).fill(status.color);
  doc.fillColor('#FFFFFF').text(status.label, pillX, pillY + 4, { width: pillW, align: 'center' });
  doc.fillColor(BRAND.ink);

  y = Math.max(cy, pillY + 15) + 16;

  // ── meta grid (invoice no / dates / period) ──
  doc.moveTo(M, y).lineTo(RIGHT, y).strokeColor(BRAND.line).lineWidth(1).stroke();
  y += 12;
  const meta = [
    ['Invoice number', invoice.invoiceNumber || '—'],
    ['Invoice date', fmtDate(invoice.invoiceDate)],
    ['Due date', fmtDate(invoice.dueDate)],
    ['Billing period', (invoice.billingPeriodStart || invoice.billingPeriodEnd)
      ? `${fmtDateShort(invoice.billingPeriodStart)} - ${fmtDateShort(invoice.billingPeriodEnd)}` : '—'],
  ];
  const colW = W / meta.length;
  meta.forEach(([k, v], i) => {
    const x = M + i * colW;
    doc.font(F.reg).fontSize(7).fillColor(BRAND.faint).text(k.toUpperCase(), x, y, { width: colW - 8 });
    doc.font(F.bold).fontSize(9).fillColor(BRAND.ink).text(String(v), x, y + 11, { width: colW - 8 });
  });
  y += 40;
  doc.moveTo(M, y).lineTo(RIGHT, y).strokeColor(BRAND.line).lineWidth(1).stroke();
  y += 16;

  // ── bill-to panel ──
  const billLines = [];
  if (buyer.name) billLines.push({ t: buyer.name, bold: true });
  (buyer.addressLines || []).forEach((l) => l && billLines.push({ t: l }));
  const c2 = [buyer.email, buyer.phone].filter(Boolean).join('  ·  ');
  if (c2) billLines.push({ t: c2 });
  if (buyer.gstin) billLines.push({ t: `GSTIN: ${buyer.gstin}` });
  if (billLines.length === 0) billLines.push({ t: '—' });

  const panelH = 24 + billLines.length * 12;
  doc.roundedRect(M, y, W, panelH, 8).fillAndStroke(BRAND.panel, BRAND.line);
  doc.font(F.bold).fontSize(7.5).fillColor(BRAND.faint).text('BILLED TO', M + 14, y + 10);
  let by = y + 22;
  billLines.forEach((l) => {
    doc.font(l.bold ? F.bold : F.reg).fontSize(l.bold ? 10 : 8.5)
      .fillColor(l.bold ? BRAND.ink : BRAND.muted).text(l.t, M + 14, by, { width: W - 28 });
    by += 12;
  });
  y += panelH + 20;

  // ── line-items table ──
  const items = (invoice.lineItems && invoice.lineItems.length)
    ? invoice.lineItems
    : [{
        description: invoice.subscription?.planType
          ? `${String(invoice.subscription.planType).replace(/_/g, ' ')} plan — subscription`
          : 'Synclyft subscription',
        quantity: 1, unitPrice: subtotal, totalPrice: subtotal,
      }];

  const cols = { num: M + 8, desc: M + 34, qty: RIGHT - 210, rate: RIGHT - 140, amt: RIGHT - 10 };
  // header
  doc.rect(M, y, W, 22).fill(BRAND.ink);
  doc.font(F.bold).fontSize(7.5).fillColor('#FFFFFF');
  doc.text('#', cols.num, y + 7);
  doc.text('DESCRIPTION', cols.desc, y + 7);
  doc.text('QTY', cols.qty - 20, y + 7, { width: 40, align: 'right' });
  doc.text('RATE', cols.rate - 20, y + 7, { width: 60, align: 'right' });
  doc.text('AMOUNT', cols.amt - 80, y + 7, { width: 80, align: 'right' });
  y += 22;

  doc.fillColor(BRAND.ink);
  items.forEach((it, i) => {
    const descOpts = { width: cols.qty - cols.desc - 24 };
    doc.font(F.bold).fontSize(9);
    const dh = doc.heightOfString(String(it.description || '—'), descOpts);
    const sacH = gstEnabled ? 10 : 0;
    const rowH = Math.max(dh + sacH + 14, 26);
    if (i % 2 === 1) doc.rect(M, y, W, rowH).fill(BRAND.panel).fillColor(BRAND.ink);
    doc.font(F.reg).fontSize(8.5).fillColor(BRAND.muted).text(String(i + 1), cols.num, y + 8);
    doc.font(F.bold).fontSize(9).fillColor(BRAND.ink).text(String(it.description || '—'), cols.desc, y + 8, descOpts);
    if (gstEnabled) doc.font(F.reg).fontSize(7).fillColor(BRAND.faint).text(`SAC ${COMPANY.sac}`, cols.desc, y + 8 + dh + 2, descOpts);
    doc.font(F.reg).fontSize(9).fillColor(BRAND.ink);
    doc.text(String(it.quantity ?? 1), cols.qty - 20, y + 8, { width: 40, align: 'right' });
    doc.text(money(it.unitPrice, currency), cols.rate - 40, y + 8, { width: 80, align: 'right' });
    doc.font(F.bold).text(money(it.totalPrice ?? (Number(it.unitPrice || 0) * Number(it.quantity || 1)), currency), cols.amt - 100, y + 8, { width: 100, align: 'right' });
    y += rowH;
    doc.moveTo(M, y).lineTo(RIGHT, y).strokeColor(BRAND.line).lineWidth(0.5).stroke();
  });
  y += 14;

  // ── totals (right column) ──
  const tX = RIGHT - 240;
  const tW = 240;
  const line = (label, value, opts = {}) => {
    doc.font(opts.bold ? F.bold : F.reg).fontSize(opts.bold ? 10 : 9)
      .fillColor(opts.color || (opts.bold ? BRAND.ink : BRAND.muted));
    doc.text(label, tX, y, { width: tW - 90 });
    doc.text(value, tX + tW - 110, y, { width: 110, align: 'right' });
    y += opts.gap ?? 15;
  };
  line('Subtotal', money(subtotal, currency));
  if (discount > 0) line('Discount', `- ${money(discount, currency)}`, { color: BRAND.green });
  if (gstEnabled) {
    line('Taxable value', money(taxable, currency));
    if (intraState) {
      line(`CGST @ ${(taxRatePct / 2).toFixed(taxRatePct % 2 ? 2 : 0)}%`, money(tax / 2, currency));
      line(`SGST @ ${(taxRatePct / 2).toFixed(taxRatePct % 2 ? 2 : 0)}%`, money(tax / 2, currency));
    } else {
      line(`IGST @ ${taxRatePct}%`, money(tax, currency));
    }
  } else if (tax > 0) {
    line(`Tax${taxRatePct ? ` @ ${taxRatePct}%` : ''}`, money(tax, currency));
  }
  // grand total band
  y += 4;
  doc.roundedRect(tX, y, tW, 30, 6).fill(BRAND.primary);
  doc.font(F.bold).fontSize(9).fillColor('#FFFFFF').text('TOTAL', tX + 14, y + 11);
  doc.fontSize(13).text(money(total, currency), tX + tW - 130, y + 8, { width: 116, align: 'right' });
  doc.fillColor(BRAND.ink);
  y += 44;

  // amount in words
  doc.font(F.reg).fontSize(7.5).fillColor(BRAND.faint).text('AMOUNT IN WORDS', M, y);
  doc.font(F.oblique).fontSize(9).fillColor(BRAND.muted)
    .text(amountInWords(total, currency), M, y + 11, { width: W });
  y += 34;

  doc.moveTo(M, y).lineTo(RIGHT, y).strokeColor(BRAND.line).lineWidth(1).stroke();
  y += 16;

  // ── payment details / how to pay ──
  doc.font(F.bold).fontSize(8).fillColor(BRAND.faint).text('PAYMENT', M, y);
  y += 13;
  doc.font(F.reg).fontSize(9).fillColor(BRAND.ink);

  if (invoice.paymentStatus === 'completed') {
    const rows = [
      ['Status', 'Paid in full'],
      ['Method', PAYMENT_METHOD_LABEL[invoice.paymentMethod] || (invoice.paymentMethod ? String(invoice.paymentMethod) : 'Online')],
      ['Payment date', fmtDate(invoice.paymentDate)],
      ['Reference', invoice.transactionId || '—'],
    ];
    rows.forEach(([k, v]) => {
      doc.font(F.reg).fontSize(8.5).fillColor(BRAND.muted).text(k, M, y, { width: 110 });
      doc.font(F.bold).fontSize(8.5).fillColor(BRAND.ink).text(String(v), M + 110, y, { width: W - 110 });
      y += 13;
    });
  } else if (invoice.paymentStatus === 'refunded') {
    doc.text(`Refunded ${money(invoice.refundAmount || total, currency)} on ${fmtDate(invoice.refundDate)}.`, M, y, { width: W });
    if (invoice.refundReason) { y += 13; doc.font(F.reg).fontSize(8.5).fillColor(BRAND.muted).text(`Reason: ${invoice.refundReason}`, M, y, { width: W }); }
    y += 13;
  } else {
    doc.fillColor(BRAND.amber).font(F.bold).fontSize(9)
      .text(`${money(total, currency)} due by ${fmtDate(invoice.dueDate)}.`, M, y, { width: W });
    y += 15;
    doc.fillColor(BRAND.ink);
    if (COMPANY.bank.name && COMPANY.bank.accountNumber) {
      doc.font(F.bold).fontSize(8).fillColor(BRAND.faint).text('BANK TRANSFER (NEFT / RTGS / IMPS)', M, y);
      y += 12;
      const bank = [
        ['Account name', COMPANY.bank.accountName],
        ['Account number', COMPANY.bank.accountNumber],
        ['IFSC', COMPANY.bank.ifsc],
        ['Bank', [COMPANY.bank.name, COMPANY.bank.branch].filter(Boolean).join(', ')],
      ].filter(([, v]) => v);
      bank.forEach(([k, v]) => {
        doc.font(F.reg).fontSize(8.5).fillColor(BRAND.muted).text(k, M, y, { width: 110 });
        doc.font(F.bold).fontSize(8.5).fillColor(BRAND.ink).text(String(v), M + 110, y, { width: W - 110 });
        y += 13;
      });
    } else {
      doc.font(F.reg).fontSize(8.5).fillColor(BRAND.muted)
        .text(`Pay securely from your billing dashboard, or contact ${COMPANY.supportEmail}.`, M, y, { width: W });
      y += 13;
    }
  }

  // ── footer (pinned near bottom) ──
  const footY = doc.page.height - doc.page.margins.bottom - 34;
  doc.moveTo(M, footY).lineTo(RIGHT, footY).strokeColor(BRAND.line).lineWidth(1).stroke();
  doc.font(F.reg).fontSize(7.5).fillColor(BRAND.faint)
    .text('This is a computer-generated invoice and does not require a physical signature.', M, footY + 8, { width: W, align: 'center' });
  doc.text(`Questions about this invoice? Email ${COMPANY.supportEmail}`, M, footY + 19, { width: W, align: 'center' });
}

module.exports = { renderInvoicePdf, amountInWords, money };
