const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const test = require("node:test");

const {
    saveDocument,
    getDocument,
    deleteDocument,
    appendDocumentHistory,
    clearDocumentHistory,
} = require("../services/documentStore");

function createTestDocument() {
    return {
        id: `${randomUUID()}.pdf`,
        history: [],
        summary: "Cached summary",
    };
}

test("stores, retrieves, and deletes a document", () => {
    const document = createTestDocument();
    saveDocument(document);

    assert.equal(getDocument(document.id), document);
    assert.equal(deleteDocument(document.id), true);
    assert.equal(getDocument(document.id), undefined);
});

test("retains only the six history entries used by the AI service", () => {
    const document = createTestDocument();
    saveDocument(document);

    for (let index = 0; index < 4; index += 1) {
        appendDocumentHistory(
            document.id,
            { role: "user", content: `question-${index}` },
            { role: "assistant", content: `answer-${index}` }
        );
    }

    assert.equal(document.history.length, 6);
    assert.equal(document.history[0].content, "question-1");
    assert.equal(document.history[5].content, "answer-3");

    assert.equal(clearDocumentHistory(document.id), true);
    assert.deepEqual(document.history, []);
    assert.equal(document.summary, "Cached summary");
    deleteDocument(document.id);
});

test("returns false when mutating a missing document", () => {
    const missingDocumentId = `${randomUUID()}.pdf`;

    assert.equal(
        appendDocumentHistory(missingDocumentId, {
            role: "user",
            content: "question",
        }),
        false
    );
    assert.equal(clearDocumentHistory(missingDocumentId), false);
    assert.equal(deleteDocument(missingDocumentId), false);
});
