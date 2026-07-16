const pendingSummaries = new WeakMap();

function generateSummary(text) {
    const { summarizeDocument } = require("./aiService");
    return summarizeDocument(text);
}

function hasCachedSummary(document) {
    return typeof document.summary === "string";
}

async function getDocumentSummary(document, createSummary = generateSummary) {
    if (hasCachedSummary(document)) {
        return document.summary;
    }

    const pendingSummary = pendingSummaries.get(document);

    if (pendingSummary) {
        return pendingSummary;
    }

    const summaryPromise = Promise.resolve()
        .then(() => createSummary(document.text))
        .then((summary) => {
            document.summary = summary;
            return summary;
        });

    pendingSummaries.set(document, summaryPromise);

    try {
        return await summaryPromise;
    } finally {
        if (pendingSummaries.get(document) === summaryPromise) {
            pendingSummaries.delete(document);
        }
    }
}

module.exports = { getDocumentSummary };
