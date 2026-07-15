const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const { UPLOAD_DIRECTORY } = require("../config/uploadConfig");
const {
    resolveUploadPath,
    getStoredDocumentFilePath,
    deleteUploadedFile,
} = require("../services/fileService");

test("resolves valid stored filenames inside the upload directory", () => {
    const storedName = `${randomUUID()}.pdf`;

    assert.equal(
        getStoredDocumentFilePath(storedName),
        path.join(UPLOAD_DIRECTORY, storedName)
    );
});

test("rejects traversal and paths outside the upload directory", () => {
    assert.throws(
        () => getStoredDocumentFilePath(`..${path.sep}secret.pdf`),
        /invalid/i
    );
    assert.throws(
        () => resolveUploadPath(path.resolve(UPLOAD_DIRECTORY, "..", "secret.pdf")),
        /outside/i
    );
});

test("deletes upload files idempotently", async (context) => {
    const testFilePath = path.join(
        UPLOAD_DIRECTORY,
        `${randomUUID()}-file-service-test.pdf`
    );

    context.after(async () => {
        await fs.rm(testFilePath, { force: true });
    });

    await fs.writeFile(testFilePath, "test fixture");
    assert.equal(await deleteUploadedFile(testFilePath), true);
    assert.equal(await deleteUploadedFile(testFilePath), false);
});
