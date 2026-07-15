const messageInput = document.querySelector("#message-input");
const characterCount = document.querySelector("#character-count");
const messageForm = document.querySelector(".message-form");
const pdfInput = document.querySelector("#pdf-input");
const uploadBox = document.querySelector("#upload-box");
const uploadStatus = document.querySelector("#upload-status");
const uploadFileName = document.querySelector("#upload-file-name");
const uploadError = document.querySelector("#upload-error");
const documentsContainer = document.querySelector("#documents-container");
const documentCount = document.querySelector(".document-count");
const sendButton = document.querySelector(".send-button");

const documents = [];

function updateCharacterCount() {
    const currentLength = messageInput.value.length;
    characterCount.textContent = `${currentLength} / 2000`;
}

function resizeMessageInput() {
    messageInput.style.height = "auto";
    messageInput.style.height = `${Math.min(messageInput.scrollHeight, 150)}px`;
}

function updateSendButton() {
    const hasMessage = messageInput.value.trim().length > 0;
    const hasDocuments = documents.length > 0;
    const chatIsEnabled = !messageInput.disabled;

    sendButton.disabled = !(hasMessage && hasDocuments && chatIsEnabled);
}

function formatFileSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showUploadError(message) {
    uploadError.textContent = message;
    uploadError.hidden = false;
}

function clearUploadError() {
    uploadError.textContent = "";
    uploadError.hidden = true;
}

function setChatEnabled(enabled) {
    messageInput.disabled = !enabled;

    messageInput.placeholder = enabled
        ? "Ask anything about your PDFs..."
        : "Upload a PDF to start asking questions...";

    updateSendButton();
}

function renderDocuments() {
    documentCount.textContent = documents.length;

    if (documents.length === 0) {
        documentsContainer.innerHTML = `
            <div class="empty-documents" id="empty-documents">
                <div class="empty-documents-icon">📄</div>
                <p>No documents uploaded</p>
                <span>Your PDFs will appear here.</span>
            </div>
        `;

        setChatEnabled(false);
        return;
    }

    documentsContainer.innerHTML = `
        <div class="document-list">
            ${documents
                .map(
                    (document, index) => `
                        <article class="document-item ${index === 0 ? "active" : ""}">
                            <div class="document-icon">📄</div>

                            <div class="document-info">
                                <span class="document-name" title="${document.name}">
                                    ${document.name}
                                </span>

                                <span class="document-meta">
                                    ${formatFileSize(document.size)} · Ready
                                </span>
                            </div>

                            <button
                                class="remove-document"
                                type="button"
                                data-document-id="${document.id}"
                                aria-label="Remove ${document.name}"
                            >
                                ×
                            </button>
                        </article>
                    `
                )
                .join("")}
        </div>
    `;

    setChatEnabled(true);
}

function removeDocument(documentId) {
    const documentIndex = documents.findIndex(
        (document) => document.id === documentId
    );

    if (documentIndex === -1) {
        return;
    }

    documents.splice(documentIndex, 1);
    renderDocuments();
}

function isPdf(file) {
    return (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
    );
}

async function processSelectedFile(file) {
    clearUploadError();

    if (!isPdf(file)) {
        showUploadError("Please upload a PDF file.");
        pdfInput.value = "";
        return;
    }

    const maximumFileSize = 15 * 1024 * 1024;

    if (file.size > maximumFileSize) {
        showUploadError("The PDF must be smaller than 15 MB.");
        pdfInput.value = "";
        return;
    }

    const duplicateDocument = documents.some(
        (document) =>
            document.name === file.name &&
            document.size === file.size
    );

    if (duplicateDocument) {
        showUploadError("This PDF has already been added.");
        pdfInput.value = "";
        return;
    }

    uploadFileName.textContent = file.name;
    uploadStatus.hidden = false;
    uploadBox.style.pointerEvents = "none";
    uploadBox.style.opacity = "0.65";

    try {
        const formData = new FormData();
        formData.append("pdf", file);

        const response = await fetch("/api/pdfs/upload", {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "PDF upload failed.");
        }

        documents.push({
            id: data.document.id,
            name: data.document.name,
            size: data.document.size,
            storedName: data.document.storedName,
        });

        renderDocuments();
    } catch (error) {
        showUploadError(error.message);
    } finally {
        uploadStatus.hidden = true;
        uploadBox.style.pointerEvents = "";
        uploadBox.style.opacity = "";
        pdfInput.value = "";
    }
}

messageInput.addEventListener("input", () => {
    updateCharacterCount();
    resizeMessageInput();
    updateSendButton();
});

messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        if (!sendButton.disabled) {
            messageForm.requestSubmit();
        }
    }
});

messageForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message || documents.length === 0) {
        return;
    }

    console.log("User message:", message);

    messageInput.value = "";
    updateCharacterCount();
    resizeMessageInput();
    updateSendButton();
});

pdfInput.addEventListener("change", () => {
    const selectedFile = pdfInput.files[0];

    if (selectedFile) {
        processSelectedFile(selectedFile);
    }
});

uploadBox.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadBox.classList.add("dragging");
});

uploadBox.addEventListener("dragleave", () => {
    uploadBox.classList.remove("dragging");
});

uploadBox.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadBox.classList.remove("dragging");

    const droppedFile = event.dataTransfer.files[0];

    if (droppedFile) {
        processSelectedFile(droppedFile);
    }
});

documentsContainer.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".remove-document");

    if (!removeButton) {
        return;
    }

    removeDocument(removeButton.dataset.documentId);
});

updateCharacterCount();
renderDocuments();
updateSendButton();