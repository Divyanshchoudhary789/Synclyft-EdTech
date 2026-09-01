const multer = require("multer");
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true);
    }
    else {
        cb(new Error("Only PDF's are Allowed!"), false);
    }
};



const uploadResume = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }

});



module.exports = uploadResume;