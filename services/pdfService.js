const fs = require("fs/promises");
const { PDFParse } = require("pdf-parse");

const PAGE_MARKER_PATTERN = /^--\s+\d+\s+of\s+\d+\s+--\r?$/gm;

function removeGeneratedPageMarkers(text) {
    return text.replace(PAGE_MARKER_PATTERN, "");
}

async function extractPdfText(filePath) {
    const buffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: buffer });

    try {
        const result = await parser.getText();

        return {
            text: removeGeneratedPageMarkers(result.text || ""),
            pages: result.total || 0,
        };
    } finally {
        await parser.destroy();
    }
}

module.exports = {
    extractPdfText,
};
