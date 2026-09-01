const crypto = require("crypto");
const { s3 } = require("../config/cloudflare-config.js");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");

const compressImage = async (buffer) => {
    try {
        return await sharp(buffer)
            .webp({ quality: 80, lossless: false })
            .toBuffer();
    } catch (error) {
        return buffer;
    }
};

const compressPDF = async (buffer) => {
    try {
        const pdfDoc = await PDFDocument.load(buffer);
        const compressedBytes = await pdfDoc.save({ 
            useObjectStreams: true, 
            addGlyphsHtml: false 
        });
        return Buffer.from(compressedBytes);
    } catch (error) {
        return buffer;
    }
};

const uploadToR2 = async (file, folder = "uploads") => {
    if (!file || !file.buffer || !file.mimetype) {
        throw new Error("Invalid file payload provided for upload");
    }

    let subFolder;
    let finalBuffer = file.buffer;
    let finalMimeType = file.mimetype;
    let fileExtension = file.originalname.split(".").pop();

    const isImage = file.mimetype.startsWith("image/");
    const isPDF = file.mimetype === "application/pdf";

    if (isImage) {
        subFolder = "images";
        const compressed = await compressImage(file.buffer);
        
        if (Buffer.compare(compressed, file.buffer) !== 0) {
            fileExtension = "webp";
            finalMimeType = "image/webp";
            finalBuffer = compressed;
        }
    } else if (isPDF) {
        subFolder = "resumes";
        finalBuffer = await compressPDF(file.buffer);
    } else {
        throw new Error("Unsupported file type extension");
    }

    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    const key = `${folder}/${subFolder}/${fileName}`;

    await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: finalBuffer,
        ContentType: finalMimeType
    }));

    return {
        url: `${process.env.R2_PUBLIC_URL}/${key}`,
        key
    };
};

module.exports = uploadToR2;