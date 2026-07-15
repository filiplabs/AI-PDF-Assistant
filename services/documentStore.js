const documents = new Map();
const HISTORY_ENTRY_LIMIT = 6;

function saveDocument(document) {
    documents.set(document.id, document);
}

function getDocument(documentId) {
    return documents.get(documentId);
}

function deleteDocument(documentId) {
    return documents.delete(documentId);
}

function appendDocumentHistory(documentId, ...entries) {
    const document = documents.get(documentId);

    if (!document) {
        return false;
    }

    document.history.push(...entries);

    if (document.history.length > HISTORY_ENTRY_LIMIT) {
        document.history.splice(
            0,
            document.history.length - HISTORY_ENTRY_LIMIT
        );
    }

    return true;
}

function clearDocumentHistory(documentId) {
    const document = documents.get(documentId);

    if (!document) {
        return false;
    }

    document.history = [];
    return true;
}

module.exports = {
    saveDocument,
    getDocument,
    deleteDocument,
    appendDocumentHistory,
    clearDocumentHistory,
};
