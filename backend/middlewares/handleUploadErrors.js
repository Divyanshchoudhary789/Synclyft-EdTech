// Turns multer / fileFilter errors into clean 4xx responses. Without this a
// rejected upload (wrong type, > size limit) bubbles to the generic error
// handler as a 500.

const multer = require("multer");

const handleUploadErrors = (err, req, res, next) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ success: false, code: "FILE_TOO_LARGE", message: "That file is too large. The limit is 5 MB." });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({ success: false, code: "UNEXPECTED_FILE", message: "Unexpected file field." });
        }
        return res.status(400).json({ success: false, code: err.code, message: "Upload failed. Please try a different file." });
    }

    // fileFilter rejections (e.g. non-PDF resume) arrive as plain Errors.
    if (err.message && /pdf|image|file/i.test(err.message)) {
        return res.status(400).json({ success: false, code: "INVALID_FILE_TYPE", message: err.message });
    }

    return next(err);
};

module.exports = { handleUploadErrors };
