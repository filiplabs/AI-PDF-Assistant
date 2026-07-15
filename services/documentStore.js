const documents = new Map();

function saveDocument(document) {
    documents.set(document.id, document);
}

function getDocument(documentId) {
    return documents.get(documentId);
}

function deleteDocument(documentId) {
    return documents.delete(documentId);
}

module.exports = {
    saveDocument,
    getDocument,
    deleteDocument,
};