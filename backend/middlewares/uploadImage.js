const multer = require("multer");
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    }
    else {
        cb(new Error("Only Images are Allowed!"), false);
    }
};



const uploadImage = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 3 * 1024 * 1024 // 3MB
    }

});



module.exports = uploadImage;