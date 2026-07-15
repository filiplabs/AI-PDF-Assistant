function sendErrorResponse(response, statusCode, message) {
    return response.status(statusCode).json({
        success: false,
        message,
    });
}

module.exports = {
    sendErrorResponse,
};
