const path = require("path");
const fs = require("fs/promises");

const { extractPdfText } = require("../services/pdfService");
const {
    summarizeDocument,
    answerDocumentQuestion,
} = require("../services/aiService");

const {
    saveDocument,
    getDocument,
    deleteDocument,
    clearDocumentHistory,
} = require("../services/documentStore");


async function uploadPdf(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No PDF file was uploaded.",
            });
        }

        const filePath = path.resolve(req.file.path);
        const pdfData = await extractPdfText(filePath);

        if (!pdfData.text || !pdfData.text.trim()) {
            return res.status(422).json({
                success: false,
                message:
                    "This PDF appears to be scanned. OCR support is coming soon.",
            });
        }

        const summary = await summarizeDocument(pdfData.text);

        const document = {
            id: req.file.filename,
            name: req.file.originalname,
            storedName: req.file.filename,
            size: req.file.size,
            pages: pdfData.pages,
            characters: pdfData.text.length,
            text: pdfData.text,
            summary,
            history: [],
        };

        saveDocument(document);

        return res.status(201).json({
            success: true,
            message: "PDF uploaded and analyzed successfully.",
            document: {
                id: document.id,
                name: document.name,
                storedName: document.storedName,
                size: document.size,
                pages: document.pages,
                characters: document.characters,
                summary: document.summary,
            },
        });
    } catch (error) {
        next(error);
    }
}

async function askPdf(req, res, next) {
    try {
        const { documentId, question } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                message: "Document ID is required.",
            });
        }

        if (!question || !question.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please enter a question.",
            });
        }

        const document = getDocument(documentId);

        if (!document) {
            return res.status(404).json({
                success: false,
                message:
                    "Document not found. Please upload the PDF again.",
            });
        }

        const answer = await answerDocumentQuestion(
            document.text,
            question,
            document.history
        );

        document.history.push(
            {
                role: "user",
                content: question,
            },
            {
                role: "assistant",
                content: answer,
            }
        );

        return res.json({
            success: true,
            answer,
        });
    } catch (error) {
        next(error);
    }
}
function clearPdfChat(req, res) {
    const { documentId } = req.body;

    if (!documentId) {
        return res.status(400).json({
            success: false,
            message: "Document ID is required.",
        });
    }

    const cleared = clearDocumentHistory(documentId);

    if (!cleared) {
        return res.status(404).json({
            success: false,
            message: "Document not found.",
        });
    }

    return res.json({
        success: true,
        message: "Conversation history cleared.",
    });
}
async function removePdf(req, res, next) {
    try {
        const { documentId } = req.params;

        const document = getDocument(documentId);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found.",
            });
        }

        const filePath = path.resolve(
            __dirname,
            "..",
            "uploads",
            document.storedName
        );

        try {
            await fs.unlink(filePath);
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }

        deleteDocument(documentId);

        return res.json({
            success: true,
            message: "PDF deleted successfully.",
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    uploadPdf,
    askPdf,
    clearPdfChat,
    removePdf,
};