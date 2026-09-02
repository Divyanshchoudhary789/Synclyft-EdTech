const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

// Some browsers / OSes report a PDF's MIME type as "application/octet-stream"
// (or an empty string, which multipart turns into "application/octet-stream").
// Accept those when the filename clearly says .pdf — the buffer's magic bytes
// are then verified by `validateResumeUpload` before anything trusts the file.
const GENERIC_MIMES = new Set([
    "application/octet-stream",
    "binary/octet-stream",
    "application/x-pdf",
    "application/download",
    "",
]);

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (file.mimetype === "application/pdf") return cb(null, true);
    if (ext === ".pdf" && GENERIC_MIMES.has(file.mimetype)) return cb(null, true);
    return cb(new Error("Resume must be a PDF file."), false);
};

const uploadResume = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});

module.exports = uploadResume;
