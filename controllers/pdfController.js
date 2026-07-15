const {
    summarizeDocument,
    answerDocumentQuestion,
} = require("../services/aiService");
const {
    saveDocument,
    getDocument,
    deleteDocument,
    appendDocumentHistory,
    clearDocumentHistory,
} = require("../services/documentStore");
const {
    cleanUpUploadedFile,
    deleteStoredDocumentFile,
} = require("../services/fileService");
const { extractPdfText } = require("../services/pdfService");
const { sendErrorResponse } = require("../utils/httpResponse");

function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

function createDocumentRecord(uploadedFile, pdfData, summary) {
    return {
        id: uploadedFile.filename,
        name: uploadedFile.originalname,
        storedName: uploadedFile.filename,
        size: uploadedFile.size,
        pages: pdfData.pages,
        characters: pdfData.text.length,
        text: pdfData.text,
        summary,
        history: [],
    };
}

function serializeDocument(document) {
    return {
        id: document.id,
        name: document.name,
        storedName: document.storedName,
        size: document.size,
        pages: document.pages,
        characters: document.characters,
        summary: document.summary,
    };
}

async function uploadPdf(request, response, next) {
    const uploadedFile = request.file;

    if (!uploadedFile) {
        return sendErrorResponse(response, 400, "No PDF file was uploaded.");
    }

    try {
        const pdfData = await extractPdfText(uploadedFile.path);

        if (!isNonEmptyString(pdfData.text)) {
            await cleanUpUploadedFile(uploadedFile.path);
            return sendErrorResponse(
                response,
                422,
                "This PDF appears to be scanned. OCR support is coming soon."
            );
        }

        const summary = await summarizeDocument(pdfData.text);
        const document = createDocumentRecord(uploadedFile, pdfData, summary);
        saveDocument(document);

        return response.status(201).json({
            success: true,
            message: "PDF uploaded and analyzed successfully.",
            document: serializeDocument(document),
        });
    } catch (error) {
        await cleanUpUploadedFile(uploadedFile.path);
        return next(error);
    }
}

async function askPdf(request, response, next) {
    try {
        const { documentId, question } = request.body || {};

        if (!isNonEmptyString(documentId)) {
            return sendErrorResponse(
                response,
                400,
                "Document ID is required."
            );
        }

        if (!isNonEmptyString(question)) {
            return sendErrorResponse(
                response,
                400,
                "Please enter a question."
            );
        }

        const document = getDocument(documentId);

        if (!document) {
            return sendErrorResponse(
                response,
                404,
                "Document not found. Please upload the PDF again."
            );
        }

        const answer = await answerDocumentQuestion(
            document.text,
            question,
            document.history
        );

        appendDocumentHistory(
            documentId,
            { role: "user", content: question },
            { role: "assistant", content: answer }
        );

        return response.json({
            success: true,
            answer,
        });
    } catch (error) {
        return next(error);
    }
}

function clearPdfChat(request, response) {
    const { documentId } = request.body || {};

    if (!isNonEmptyString(documentId)) {
        return sendErrorResponse(response, 400, "Document ID is required.");
    }

    if (!clearDocumentHistory(documentId)) {
        return sendErrorResponse(response, 404, "Document not found.");
    }

    return response.json({
        success: true,
        message: "Conversation history cleared.",
    });
}

async function removePdf(request, response, next) {
    try {
        const { documentId } = request.params;
        const document = getDocument(documentId);

        if (!document) {
            return sendErrorResponse(response, 404, "Document not found.");
        }

        await deleteStoredDocumentFile(document.storedName);
        deleteDocument(documentId);

        return response.json({
            success: true,
            message: "PDF deleted successfully.",
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    uploadPdf,
    askPdf,
    clearPdfChat,
    removePdf,
};
