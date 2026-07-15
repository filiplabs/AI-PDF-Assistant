const path = require("path");
const { randomInt } = require("crypto");

const PDF_MIME_TYPE = "application/pdf";
const PDF_FILE_EXTENSION = ".pdf";
const MAX_PDF_FILE_SIZE = 15 * 1024 * 1024;
const UPLOAD_DIRECTORY = path.resolve(__dirname, "..", "uploads");

function createStoredPdfFilename() {
    return `${Date.now()}-${randomInt(1_000_000_000)}${PDF_FILE_EXTENSION}`;
}

module.exports = {
    PDF_MIME_TYPE,
    PDF_FILE_EXTENSION,
    MAX_PDF_FILE_SIZE,
    UPLOAD_DIRECTORY,
    createStoredPdfFilename,
};
