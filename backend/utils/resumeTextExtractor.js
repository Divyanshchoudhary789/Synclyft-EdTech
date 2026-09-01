const pdfParse = require('pdf-parse');
const logger = require('../services/loggerService.js');


// Extracts raw text from an uploaded resume buffer.
// Currently supports PDF. Extend here for .docx via mammoth if needed.
const extractResumeText = async (buffer, mimetype) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error('Resume buffer is empty or invalid');
    }

    if (mimetype === 'application/pdf') {
        const parsed = await pdfParse(buffer);
        return (parsed.text || '').replace(/\s+/g, ' ').trim();
    }

    throw new Error(`Unsupported resume file type: ${mimetype || 'unknown'}`);
};


module.exports = { extractResumeText };
