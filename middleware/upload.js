const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "uploads/");
    },

    filename: (req, file, callback) => {
        const uniqueName = `${Date.now()}-${Math.round(
            Math.random() * 1e9
        )}${path.extname(file.originalname)}`;

        callback(null, uniqueName);
    },
});

const fileFilter = (req, file, callback) => {
    const isPdf =
        file.mimetype === "application/pdf" &&
        path.extname(file.originalname).toLowerCase() === ".pdf";

    if (!isPdf) {
        return callback(new Error("Please upload a PDF file."));
    }

    callback(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024,
    },
});

module.exports = upload;