const fs = require("fs/promises");
const { PDFParse } = require("pdf-parse");

async function extractPdfText(filePath) {
    const buffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: buffer });

    try {
        const result = await parser.getText();

        return {
            text: result.text,
            pages: result.total,
        };
    } finally {
        await parser.destroy();
    }
}

module.exports = {
    extractPdfText,
};