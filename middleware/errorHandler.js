const { cleanUpUploadedFile } = require("../services/fileService");
const { sendErrorResponse } = require("../utils/httpResponse");

async function errorHandler(error, request, response, next) {
    await cleanUpUploadedFile(request.file?.path);

    if (response.headersSent) {
        return next(error);
    }

    if (error.code === "LIMIT_FILE_SIZE") {
        return sendErrorResponse(
            response,
            400,
            "The PDF must be smaller than 15 MB."
        );
    }

    return sendErrorResponse(
        response,
        400,
        error.message || "Something went wrong."
    );
}

module.exports = errorHandler;
