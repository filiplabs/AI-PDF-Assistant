const assert = require("node:assert/strict");
const test = require("node:test");

const { getDocumentSummary } = require("../services/summaryService");

function createDocument() {
    return { text: "Extracted PDF text", summary: null };
}

test("generates and caches a document summary", async () => {
    const document = createDocument();
    let requestCount = 0;
    const generateSummary = async () => {
        requestCount += 1;
        return "Generated summary";
    };

    assert.equal(
        await getDocumentSummary(document, generateSummary),
        "Generated summary"
    );
    assert.equal(
        await getDocumentSummary(document, generateSummary),
        "Generated summary"
    );
    assert.equal(requestCount, 1);
});

test("shares one request between concurrent summary calls", async () => {
    const document = createDocument();
    let resolveSummary;
    let requestCount = 0;
    const generateSummary = () => {
        requestCount += 1;
        return new Promise((resolve) => {
            resolveSummary = resolve;
        });
    };

    const firstRequest = getDocumentSummary(document, generateSummary);
    const secondRequest = getDocumentSummary(document, generateSummary);

    await Promise.resolve();
    assert.equal(requestCount, 1);
    resolveSummary("Shared summary");
    assert.deepEqual(
        await Promise.all([firstRequest, secondRequest]),
        ["Shared summary", "Shared summary"]
    );
});

test("allows summary generation to be retried after a failure", async () => {
    const document = createDocument();
    let requestCount = 0;
    const generateSummary = async () => {
        requestCount += 1;

        if (requestCount === 1) {
            throw new Error("OpenAI unavailable");
        }

        return "Recovered summary";
    };

    await assert.rejects(
        getDocumentSummary(document, generateSummary),
        /OpenAI unavailable/
    );
    assert.equal(
        await getDocumentSummary(document, generateSummary),
        "Recovered summary"
    );
    assert.equal(requestCount, 2);
});
