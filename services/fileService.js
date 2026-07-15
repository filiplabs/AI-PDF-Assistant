const fs = require("fs/promises");
const path = require("path");

const { UPLOAD_DIRECTORY } = require("../config/uploadConfig");

function resolveUploadPath(filePath) {
    if (typeof filePath !== "string" || !filePath.trim()) {
        throw new TypeError("An upload file path is required.");
    }

    const resolvedPath = path.resolve(filePath);
    const relativePath = path.relative(UPLOAD_DIRECTORY, resolvedPath);
    const isOutsideUploadDirectory =
        relativePath === "" ||
        relativePath === ".." ||
        relativePath.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativePath);

    if (isOutsideUploadDirectory) {
        throw new Error("The file path is outside the upload directory.");
    }

    return resolvedPath;
}

function getStoredDocumentFilePath(storedName) {
    if (
        typeof storedName !== "string" ||
        !storedName.trim() ||
        path.basename(storedName) !== storedName
    ) {
        throw new Error("The stored document filename is invalid.");
    }

    return resolveUploadPath(path.join(UPLOAD_DIRECTORY, storedName));
}

async function deleteFileIfExists(filePath) {
    try {
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        if (error.code === "ENOENT") {
            return false;
        }

        throw error;
    }
}

function deleteUploadedFile(filePath) {
    return deleteFileIfExists(resolveUploadPath(filePath));
}

async function cleanUpUploadedFile(filePath) {
    if (!filePath) {
        return;
    }

    try {
        await deleteUploadedFile(filePath);
    } catch (cleanupError) {
        console.error("Unable to clean up a failed PDF upload.", cleanupError);
    }
}

function deleteStoredDocumentFile(storedName) {
    return deleteFileIfExists(getStoredDocumentFilePath(storedName));
}

module.exports = {
    resolveUploadPath,
    getStoredDocumentFilePath,
    deleteUploadedFile,
    cleanUpUploadedFile,
    deleteStoredDocumentFile,
};
