const path = require("path");
const { extractPdfText } = require("../services/pdfService");

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

        return res.status(201).json({
            success: true,
            message: "PDF uploaded and analyzed successfully.",
            document: {
                id: req.file.filename,
                name: req.file.originalname,
                storedName: req.file.filename,
                size: req.file.size,
                pages: pdfData.pages,
                characters: pdfData.text.length,
            },
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    uploadPdf,
};