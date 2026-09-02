// Definitive resume-file validation. multer's fileFilter only sees the
// browser-declared MIME type (unreliable across OS/browser). This checks the
// actual bytes: a real PDF starts with "%PDF-". Runs after multer so
// `req.file.buffer` is available.
//
// `required` — when true, a missing file is a 400. When false (resume is
// optional on that route), a missing file just passes through.

const logger = require("../services/loggerService.js");

const PDF_MAGIC = Buffer.from("%PDF-");

module.exports = (required = true) => (req, res, next) => {
    try {
        const file = req.file;

        if (!file) {
            if (required) {
                return res.status(400).json({ success: false, message: "Please upload your resume." });
            }
            return next();
        }

        const buf = file.buffer;
        const looksLikePdf = Buffer.isBuffer(buf) && buf.length > 4 && buf.subarray(0, 5).equals(PDF_MAGIC);

        if (!looksLikePdf) {
            return res.status(400).json({
                success: false,
                code: "INVALID_RESUME_FILE",
                message: "That file isn't a valid PDF. Export or re-save your resume as a PDF and try again.",
            });
        }

        // The bytes are a genuine PDF — normalise the MIME so every downstream
        // consumer (R2 upload, pdf-parse) sees a proper PDF regardless of what
        // the browser declared.
        req.file.mimetype = "application/pdf";
        if (!/\.pdf$/i.test(req.file.originalname || "")) {
            req.file.originalname = `${(req.file.originalname || "resume").replace(/\.[^.]+$/, "")}.pdf`;
        }

        return next();
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return res.status(400).json({ success: false, message: "Could not read the uploaded file." });
    }
};
