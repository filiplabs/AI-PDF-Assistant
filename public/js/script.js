const MAX_MESSAGE_LENGTH = 2000;
const MAX_PDF_SIZE = 15 * 1024 * 1024;
const MESSAGE_INPUT_MAX_HEIGHT = 150;

const SUGGESTION_PROMPTS = Object.freeze({
    search:
        "Find the important names, dates, amounts, deadlines, and terms in this document.",
    explain:
        "Explain the most important or complex sections of this document in simple terms.",
});

const elements = {
    messageInput: document.querySelector("#message-input"),
    characterCount: document.querySelector("#character-count"),
    messageForm: document.querySelector(".message-form"),
    sendButton: document.querySelector(".send-button"),
    pdfInput: document.querySelector("#pdf-input"),
    uploadBox: document.querySelector("#upload-box"),
    uploadStatus: document.querySelector("#upload-status"),
    uploadFileName: document.querySelector("#upload-file-name"),
    uploadError: document.querySelector("#upload-error"),
    documentsContainer: document.querySelector("#documents-container"),
    documentCount: document.querySelector(".document-count"),
    chatContent: document.querySelector("#chat-content"),
    welcomeTemplate: document.querySelector("#welcome-template"),
    clearChatButton: document.querySelector("#clear-chat-button"),
    statusText: document.querySelector("#status-text"),
    statusDot: document.querySelector(".status-dot"),
    themeToggleButton: document.querySelector("#theme-toggle-button"),
    themeIcon: document.querySelector("#theme-icon"),
    themeLabel: document.querySelector("#theme-label"),
};

const state = {
    documents: [],
    activeDocumentId: null,
    pendingDocumentIds: new Set(),
    isUploading: false,
};

function getDocumentById(documentId) {
    return state.documents.find((document) => document.id === documentId) || null;
}

function getActiveDocument() {
    return getDocumentById(state.activeDocumentId);
}

function isDocumentPending(documentId) {
    return state.pendingDocumentIds.has(documentId);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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

async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "The request could not be completed.");
    }

    return data;
}

function uploadPdf(file) {
    const formData = new FormData();
    formData.append("pdf", file);

    return requestJson("/api/pdfs/upload", {
        method: "POST",
        body: formData,
    });
}

function askPdfQuestion(documentId, question) {
    return requestJson("/api/pdfs/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, question }),
    });
}

function clearPdfConversation(documentId) {
    return requestJson("/api/pdfs/clear-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
    });
}

function deletePdf(documentId) {
    return requestJson(`/api/pdfs/${encodeURIComponent(documentId)}`, {
        method: "DELETE",
    });
}

function createFrontendDocument(documentData) {
    return {
        id: documentData.id,
        name: documentData.name,
        size: documentData.size,
        pages: documentData.pages,
        summary: documentData.summary,
        messages: [],
        draft: "",
    };
}

function setApplicationStatus(status) {
    const statuses = {
        ready: { label: "Ready", className: "" },
        uploading: { label: "Analyzing PDF...", className: "processing" },
        thinking: { label: "Thinking...", className: "processing" },
        error: { label: "Error", className: "error" },
    };
    const nextStatus = statuses[status] || statuses.ready;

    elements.statusText.textContent = nextStatus.label;
    elements.statusDot.classList.remove("processing", "error");

    if (nextStatus.className) {
        elements.statusDot.classList.add(nextStatus.className);
    }
}

function syncApplicationStatus() {
    if (state.isUploading) {
        setApplicationStatus("uploading");
        return;
    }

    const activeDocument = getActiveDocument();
    setApplicationStatus(
        activeDocument && isDocumentPending(activeDocument.id)
            ? "thinking"
            : "ready"
    );
}

function showUploadError(message) {
    elements.uploadError.textContent = message;
    elements.uploadError.hidden = false;
}

function clearUploadError() {
    elements.uploadError.textContent = "";
    elements.uploadError.hidden = true;
}

function setUploadBusy(isBusy, fileName = "") {
    elements.uploadFileName.textContent = fileName || "Preparing document";
    elements.uploadStatus.hidden = !isBusy;
    elements.uploadBox.classList.toggle("is-disabled", isBusy);
    elements.uploadBox.setAttribute("aria-disabled", String(isBusy));
}

function updateCharacterCount() {
    elements.characterCount.textContent =
        `${elements.messageInput.value.length} / ${MAX_MESSAGE_LENGTH}`;
}

function resizeMessageInput() {
    elements.messageInput.style.height = "auto";
    elements.messageInput.style.height =
        `${Math.min(elements.messageInput.scrollHeight, MESSAGE_INPUT_MAX_HEIGHT)}px`;
}

function updateComposer() {
    const activeDocument = getActiveDocument();
    const isPending = activeDocument
        ? isDocumentPending(activeDocument.id)
        : false;
    const isEnabled = Boolean(activeDocument) && !isPending;
    const hasMessage = elements.messageInput.value.trim().length > 0;

    elements.messageInput.disabled = !isEnabled;
    elements.sendButton.disabled = !(isEnabled && hasMessage);
    elements.clearChatButton.disabled = !activeDocument || isPending;
    updateCharacterCount();
    resizeMessageInput();
}

function loadActiveDocumentDraft() {
    const activeDocument = getActiveDocument();
    elements.messageInput.value = activeDocument?.draft || "";
    elements.messageInput.placeholder = activeDocument
        ? isDocumentPending(activeDocument.id)
            ? "AI is analyzing your question..."
            : "Ask anything about this PDF..."
        : "Upload a PDF to start asking questions...";
    updateComposer();
}

function focusMessageInput() {
    const activeDocument = getActiveDocument();

    if (!activeDocument || isDocumentPending(activeDocument.id)) {
        return;
    }

    updateComposer();
    elements.messageInput.focus();
    const cursorPosition = elements.messageInput.value.length;
    elements.messageInput.setSelectionRange(cursorPosition, cursorPosition);
    elements.messageInput.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderWelcomeCard() {
    elements.chatContent.classList.remove("has-messages");
    elements.chatContent.replaceChildren(
        elements.welcomeTemplate.content.cloneNode(true)
    );
}

function renderDocuments() {
    const documentTotal = state.documents.length;
    elements.documentCount.textContent = documentTotal;
    elements.documentCount.setAttribute(
        "aria-label",
        `${documentTotal} document${documentTotal === 1 ? "" : "s"}`
    );

    if (documentTotal === 0) {
        elements.documentsContainer.innerHTML = `
            <div class="empty-documents">
                <div class="empty-documents-icon" aria-hidden="true">📄</div>
                <p>No documents uploaded</p>
                <span>Your PDFs will appear here.</span>
            </div>
        `;
        return;
    }

    const documentItems = state.documents
        .map((document) => {
            const isActive = document.id === state.activeDocumentId;
            const isPending = isDocumentPending(document.id);
            const safeName = escapeHtml(document.name);
            const pageLabel = document.pages === 1 ? "page" : "pages";

            return `
                <article class="document-item ${isActive ? "active" : ""}">
                    <button
                        class="document-select-button"
                        type="button"
                        data-document-id="${escapeHtml(document.id)}"
                        aria-pressed="${isActive}"
                        aria-label="Open ${safeName}"
                    >
                        <span class="document-icon" aria-hidden="true">📄</span>
                        <span class="document-info">
                            <span class="document-name" title="${safeName}">
                                ${safeName}
                            </span>
                            <span class="document-meta">
                                ${formatFileSize(document.size)} ·
                                ${document.pages} ${pageLabel} ·
                                ${isPending ? "Thinking..." : "Ready"}
                            </span>
                        </span>
                    </button>
                    <button
                        class="remove-document"
                        type="button"
                        data-document-id="${escapeHtml(document.id)}"
                        aria-label="Remove ${safeName}"
                        ${isPending ? "disabled" : ""}
                    >
                        ×
                    </button>
                </article>
            `;
        })
        .join("");

    elements.documentsContainer.innerHTML = `
        <div class="document-list">${documentItems}</div>
    `;
}

function createMessageElement(message) {
    const isAi = message.role === "ai";
    const safeDocumentName = escapeHtml(message.documentName || "document");
    const messageElement = document.createElement("article");

    messageElement.className = `chat-message ${isAi ? "ai" : "user"}`;
    messageElement.dataset.message = message.content;
    messageElement.innerHTML = `
        <div class="message-avatar" aria-hidden="true">
            ${isAi ? "AI" : "You"}
        </div>
        <div class="message-bubble">
            <span class="message-label">${isAi ? "AI Assistant" : "You"}</span>
            <div class="message-text">${escapeHtml(message.content)}</div>
            ${
                isAi
                    ? `
                        <div class="message-actions">
                            <button class="copy-answer-button" type="button">
                                📋 Copy
                            </button>
                            ${
                                message.isSummary
                                    ? `
                                        <button
                                            class="download-summary-button"
                                            type="button"
                                            data-document-name="${safeDocumentName}"
                                        >
                                            ↓ Download summary
                                        </button>
                                    `
                                    : ""
                            }
                        </div>
                    `
                    : ""
            }
        </div>
    `;
    return messageElement;
}

function createLoadingMessageElement() {
    const loadingMessage = document.createElement("article");
    loadingMessage.className = "chat-message ai";
    loadingMessage.id = "ai-loading-message";
    loadingMessage.innerHTML = `
        <div class="message-avatar" aria-hidden="true">AI</div>
        <div class="message-bubble loading-bubble">
            <span class="message-label">AI Assistant</span>
            <div class="thinking-row">
                <div class="typing-indicator" aria-label="AI is thinking">
                    <span></span><span></span><span></span>
                </div>
                <span class="thinking-text">Analyzing document...</span>
            </div>
        </div>
    `;
    return loadingMessage;
}

function renderActiveConversation({ scrollToEnd = false } = {}) {
    const activeDocument = getActiveDocument();

    if (!activeDocument) {
        renderWelcomeCard();
        return;
    }

    const isPending = isDocumentPending(activeDocument.id);

    if (activeDocument.messages.length === 0 && !isPending) {
        renderWelcomeCard();
        return;
    }

    const chatMessages = document.createElement("div");
    chatMessages.className = "chat-messages";
    chatMessages.id = "chat-messages";

    activeDocument.messages.forEach((message) => {
        chatMessages.appendChild(createMessageElement(message));
    });

    if (isPending) {
        chatMessages.appendChild(createLoadingMessageElement());
    }

    elements.chatContent.classList.add("has-messages");
    elements.chatContent.replaceChildren(chatMessages);

    if (scrollToEnd && chatMessages.lastElementChild) {
        chatMessages.lastElementChild.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
    }
}

function addDocumentMessage(documentId, message) {
    const document = getDocumentById(documentId);

    if (!document) {
        return;
    }

    document.messages.push(message);

    if (documentId === state.activeDocumentId) {
        renderActiveConversation({ scrollToEnd: true });
    }
}

function syncActiveDocumentUi({ focusComposer = false } = {}) {
    renderDocuments();
    renderActiveConversation();
    loadActiveDocumentDraft();
    syncApplicationStatus();

    if (focusComposer) {
        focusMessageInput();
    }
}

function selectDocument(documentId) {
    if (documentId === state.activeDocumentId || !getDocumentById(documentId)) {
        return;
    }

    state.activeDocumentId = documentId;
    clearUploadError();
    syncActiveDocumentUi({ focusComposer: true });
}

function isPdf(file) {
    return (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
    );
}

function validatePdf(file) {
    if (!isPdf(file)) {
        return "Please upload a PDF file.";
    }

    if (file.size > MAX_PDF_SIZE) {
        return "The PDF must be smaller than 15 MB.";
    }

    const isDuplicate = state.documents.some(
        (document) => document.name === file.name && document.size === file.size
    );
    return isDuplicate ? "This PDF has already been added." : "";
}

async function processSelectedFiles(fileList) {
    const files = Array.from(fileList || []);

    if (files.length === 0 || state.isUploading) {
        return;
    }

    state.isUploading = true;
    clearUploadError();
    setUploadBusy(true, files[0].name);
    syncApplicationStatus();

    const uploadErrors = [];
    let successfulUploadCount = 0;

    for (const file of files) {
        const validationError = validatePdf(file);

        if (validationError) {
            uploadErrors.push(`${file.name}: ${validationError}`);
            continue;
        }

        setUploadBusy(true, file.name);

        try {
            const data = await uploadPdf(file);
            const uploadedDocument = createFrontendDocument(data.document);
            state.documents.push(uploadedDocument);
            state.activeDocumentId = uploadedDocument.id;
            successfulUploadCount += 1;
            syncActiveDocumentUi();
        } catch (error) {
            uploadErrors.push(`${file.name}: ${error.message}`);
        }
    }

    state.isUploading = false;
    setUploadBusy(false);
    elements.pdfInput.value = "";

    if (uploadErrors.length > 0) {
        showUploadError(uploadErrors.join(" "));
        setApplicationStatus("error");
    } else {
        syncApplicationStatus();
    }

    if (successfulUploadCount > 0) {
        focusMessageInput();
    }
}

async function removeDocument(documentId) {
    const documentIndex = state.documents.findIndex(
        (document) => document.id === documentId
    );

    if (documentIndex === -1 || isDocumentPending(documentId)) {
        return;
    }

    const document = state.documents[documentIndex];

    if (!window.confirm(`Remove "${document.name}"?`)) {
        return;
    }

    try {
        await deletePdf(documentId);
        const removedActiveDocument = documentId === state.activeDocumentId;
        state.documents.splice(documentIndex, 1);
        state.pendingDocumentIds.delete(documentId);

        if (removedActiveDocument) {
            const replacementDocument =
                state.documents[documentIndex] ||
                state.documents[documentIndex - 1] ||
                null;
            state.activeDocumentId = replacementDocument?.id || null;
        }

        syncActiveDocumentUi({ focusComposer: Boolean(getActiveDocument()) });
    } catch (error) {
        window.alert(error.message);
        setApplicationStatus("error");
    }
}

function submitSuggestedQuestion(question) {
    const activeDocument = getActiveDocument();

    if (!activeDocument) {
        return;
    }

    activeDocument.draft = question;
    elements.messageInput.value = question;
    updateComposer();
    elements.messageForm.requestSubmit();
}

function handleSuggestionAction(action) {
    const activeDocument = getActiveDocument();

    if (!activeDocument) {
        showUploadError("Please upload a PDF first.");
        return;
    }

    clearUploadError();

    if (action === "summarize") {
        addDocumentMessage(activeDocument.id, {
            role: "ai",
            content: `Summary of ${activeDocument.name}:\n\n${activeDocument.summary}`,
            isSummary: true,
            documentName: activeDocument.name,
        });
        return;
    }

    if (action === "question") {
        activeDocument.draft = "";
        elements.messageInput.value = "";
        elements.messageInput.placeholder =
            "Ask a specific question about this PDF...";
        focusMessageInput();
        return;
    }

    if (SUGGESTION_PROMPTS[action]) {
        submitSuggestedQuestion(SUGGESTION_PROMPTS[action]);
    }
}

async function handleMessageSubmit(event) {
    event.preventDefault();
    const activeDocument = getActiveDocument();
    const question = elements.messageInput.value.trim();

    if (
        !activeDocument ||
        !question ||
        isDocumentPending(activeDocument.id)
    ) {
        return;
    }

    const documentId = activeDocument.id;
    activeDocument.draft = "";
    elements.messageInput.value = "";
    activeDocument.messages.push({ role: "user", content: question });
    state.pendingDocumentIds.add(documentId);
    renderDocuments();
    renderActiveConversation({ scrollToEnd: true });
    loadActiveDocumentDraft();
    syncApplicationStatus();

    let requestFailed = false;

    try {
        const data = await askPdfQuestion(documentId, question);
        addDocumentMessage(documentId, { role: "ai", content: data.answer });
    } catch (error) {
        requestFailed = true;
        addDocumentMessage(documentId, {
            role: "ai",
            content: `Sorry, I couldn't answer that question.\n\n${error.message}`,
        });
    } finally {
        state.pendingDocumentIds.delete(documentId);

        if (getDocumentById(documentId)) {
            renderDocuments();
        }

        if (documentId === state.activeDocumentId) {
            renderActiveConversation({ scrollToEnd: true });
            loadActiveDocumentDraft();
            setApplicationStatus(requestFailed ? "error" : "ready");
            focusMessageInput();
        }
    }
}

async function handleClearChat() {
    const activeDocument = getActiveDocument();

    if (
        !activeDocument ||
        isDocumentPending(activeDocument.id) ||
        !window.confirm(`Clear the conversation for "${activeDocument.name}"?`)
    ) {
        return;
    }

    elements.clearChatButton.disabled = true;

    try {
        await clearPdfConversation(activeDocument.id);
        activeDocument.messages = [];
        activeDocument.draft = "";
        renderActiveConversation();
        loadActiveDocumentDraft();
        syncApplicationStatus();
    } catch (error) {
        window.alert(error.message);
        setApplicationStatus("error");
    } finally {
        updateComposer();
    }
}

async function copyAnswer(button, message) {
    const defaultLabel = "📋 Copy";

    try {
        await navigator.clipboard.writeText(message);
        button.textContent = "✓ Copied";
    } catch (error) {
        button.textContent = "Copy failed";
    }

    window.setTimeout(() => {
        button.textContent = defaultLabel;
    }, 1500);
}

function downloadSummary(button, message) {
    const originalName = button.dataset.documentName || "document.pdf";
    const cleanName = originalName.replace(/\.pdf$/i, "");
    const summaryFile = new Blob([message], {
        type: "text/plain;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(summaryFile);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = `${cleanName}-summary.txt`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);

    button.textContent = "✓ Downloaded";
    window.setTimeout(() => {
        button.textContent = "↓ Download summary";
    }, 1500);
}

function handleChatContentClick(event) {
    const suggestionCard = event.target.closest(".suggestion-card");

    if (suggestionCard) {
        handleSuggestionAction(suggestionCard.dataset.action);
        return;
    }

    const messageElement = event.target.closest(".chat-message");

    if (!messageElement) {
        return;
    }

    const message = messageElement.dataset.message || "";
    const copyButton = event.target.closest(".copy-answer-button");

    if (copyButton) {
        copyAnswer(copyButton, message);
        return;
    }

    const downloadButton = event.target.closest(".download-summary-button");

    if (downloadButton) {
        downloadSummary(downloadButton, message);
    }
}

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-theme", isDark);
    elements.themeIcon.textContent = isDark ? "☀" : "◐";
    elements.themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
    elements.themeToggleButton.setAttribute("aria-pressed", String(isDark));
    localStorage.setItem("pdf-assistant-theme", theme);
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem("pdf-assistant-theme");

    if (savedTheme === "dark" || savedTheme === "light") {
        applyTheme(savedTheme);
        return;
    }

    const prefersDarkTheme = window.matchMedia(
        "(prefers-color-scheme: dark)"
    ).matches;
    applyTheme(prefersDarkTheme ? "dark" : "light");
}

elements.messageInput.addEventListener("input", () => {
    const activeDocument = getActiveDocument();

    if (activeDocument) {
        activeDocument.draft = elements.messageInput.value;
    }

    updateComposer();
});
elements.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        if (!elements.sendButton.disabled) {
            elements.messageForm.requestSubmit();
        }
    }
});
elements.messageForm.addEventListener("submit", handleMessageSubmit);
elements.uploadBox.addEventListener("click", (event) => {
    event.preventDefault();
    elements.pdfInput.multiple = true;
    elements.pdfInput.click();
});
elements.pdfInput.addEventListener("change", () => {
    processSelectedFiles(elements.pdfInput.files);
});
elements.uploadBox.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.uploadBox.classList.add("dragging");
});
elements.uploadBox.addEventListener("dragleave", () => {
    elements.uploadBox.classList.remove("dragging");
});
elements.uploadBox.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.uploadBox.classList.remove("dragging");
    processSelectedFiles(event.dataTransfer.files);
});
elements.documentsContainer.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".remove-document");

    if (removeButton) {
        removeDocument(removeButton.dataset.documentId);
        return;
    }

    const selectButton = event.target.closest(".document-select-button");

    if (selectButton) {
        selectDocument(selectButton.dataset.documentId);
    }
});
elements.chatContent.addEventListener("click", handleChatContentClick);
elements.clearChatButton.addEventListener("click", handleClearChat);
elements.themeToggleButton.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-theme")
        ? "light"
        : "dark";
    applyTheme(nextTheme);
});

syncActiveDocumentUi();
loadSavedTheme();
