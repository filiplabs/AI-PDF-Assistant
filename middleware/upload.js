const multer = require("multer");
const path = require("path");

const {
    PDF_MIME_TYPE,
    PDF_FILE_EXTENSION,
    MAX_PDF_FILE_SIZE,
    UPLOAD_DIRECTORY,
    createStoredPdfFilename,
} = require("../config/uploadConfig");

const storage = multer.diskStorage({
    destination: (_request, _file, callback) => {
        callback(null, UPLOAD_DIRECTORY);
    },

    filename: (_request, _file, callback) => {
        callback(null, createStoredPdfFilename());
    },
});

const fileFilter = (_request, file, callback) => {
    const isPdf =
        file.mimetype === PDF_MIME_TYPE &&
        path.extname(file.originalname).toLowerCase() === PDF_FILE_EXTENSION;

    if (!isPdf) {
        return callback(new Error("Please upload a PDF file."));
    }

    callback(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_PDF_FILE_SIZE,
    },
});

module.exports = upload;
