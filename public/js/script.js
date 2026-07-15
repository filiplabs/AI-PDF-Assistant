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
    isChatLoading: false,
};

function getActiveDocument() {
    return state.documents[0] || null;
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
    const currentLength = elements.messageInput.value.length;
    elements.characterCount.textContent =
        `${currentLength} / ${MAX_MESSAGE_LENGTH}`;
}

function resizeMessageInput() {
    elements.messageInput.style.height = "auto";
    elements.messageInput.style.height =
        `${Math.min(elements.messageInput.scrollHeight, MESSAGE_INPUT_MAX_HEIGHT)}px`;
}

function updateComposer() {
    const hasDocument = Boolean(getActiveDocument());
    const hasMessage = elements.messageInput.value.trim().length > 0;
    const isEnabled = hasDocument && !state.isChatLoading;

    elements.messageInput.disabled = !isEnabled;
    elements.sendButton.disabled = !(isEnabled && hasMessage);
    elements.clearChatButton.disabled = !hasDocument || state.isChatLoading;
    updateCharacterCount();
    resizeMessageInput();
}

function resetComposer() {
    elements.messageInput.value = "";
    elements.messageInput.placeholder = getActiveDocument()
        ? "Ask anything about your PDFs..."
        : "Upload a PDF to start asking questions...";
    updateComposer();
}

function focusMessageInput() {
    updateComposer();
    elements.messageInput.focus();
    const cursorPosition = elements.messageInput.value.length;
    elements.messageInput.setSelectionRange(cursorPosition, cursorPosition);
    elements.messageInput.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setChatLoading(isLoading) {
    state.isChatLoading = isLoading;
    elements.messageInput.placeholder = isLoading
        ? "AI is analyzing your question..."
        : getActiveDocument()
            ? "Ask anything about your PDFs..."
            : "Upload a PDF to start asking questions...";
    updateComposer();
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
        resetComposer();
        return;
    }

    const documentItems = state.documents
        .map((document, index) => {
            const safeName = escapeHtml(document.name);
            const pageLabel = document.pages === 1 ? "page" : "pages";

            return `
                <article class="document-item ${index === 0 ? "active" : ""}">
                    <div class="document-icon" aria-hidden="true">📄</div>
                    <div class="document-info">
                        <span class="document-name" title="${safeName}">
                            ${safeName}
                        </span>
                        <span class="document-meta">
                            ${formatFileSize(document.size)} ·
                            ${document.pages} ${pageLabel} · Ready
                        </span>
                    </div>
                    <button
                        class="remove-document"
                        type="button"
                        data-document-id="${escapeHtml(document.id)}"
                        aria-label="Remove ${safeName}"
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

    if (!state.isChatLoading) {
        elements.messageInput.placeholder = "Ask anything about your PDFs...";
    }

    updateComposer();
}

function ensureChatMessagesContainer() {
    const existingContainer = document.querySelector("#chat-messages");

    if (existingContainer) {
        return existingContainer;
    }

    const chatMessages = document.createElement("div");
    chatMessages.className = "chat-messages";
    chatMessages.id = "chat-messages";
    elements.chatContent.classList.add("has-messages");
    elements.chatContent.replaceChildren(chatMessages);
    return chatMessages;
}

function scrollMessageIntoView(messageElement) {
    messageElement.scrollIntoView({ behavior: "smooth", block: "end" });
}

function addChatMessage(role, message, options = {}) {
    const chatMessages = ensureChatMessagesContainer();
    const isAi = role === "ai";
    const isSummary = options.isSummary === true;
    const safeDocumentName = escapeHtml(options.documentName || "document");
    const messageElement = document.createElement("article");

    messageElement.className = `chat-message ${isAi ? "ai" : "user"}`;
    messageElement.dataset.message = message;
    messageElement.innerHTML = `
        <div class="message-avatar" aria-hidden="true">
            ${isAi ? "AI" : "You"}
        </div>
        <div class="message-bubble">
            <span class="message-label">${isAi ? "AI Assistant" : "You"}</span>
            <div class="message-text">${escapeHtml(message)}</div>
            ${
                isAi
                    ? `
                        <div class="message-actions">
                            <button class="copy-answer-button" type="button">
                                📋 Copy
                            </button>
                            ${
                                isSummary
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

    chatMessages.appendChild(messageElement);
    scrollMessageIntoView(messageElement);
}

function addLoadingMessage() {
    removeLoadingMessage();
    const chatMessages = ensureChatMessagesContainer();
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

    chatMessages.appendChild(loadingMessage);
    scrollMessageIntoView(loadingMessage);
}

function removeLoadingMessage() {
    document.querySelector("#ai-loading-message")?.remove();
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

async function processSelectedFile(file) {
    clearUploadError();
    const validationError = validatePdf(file);

    if (validationError) {
        showUploadError(validationError);
        elements.pdfInput.value = "";
        return;
    }

    setUploadBusy(true, file.name);
    setApplicationStatus("uploading");

    try {
        const data = await uploadPdf(file);
        state.documents.push({
            id: data.document.id,
            name: data.document.name,
            size: data.document.size,
            pages: data.document.pages,
            summary: data.document.summary,
        });
        renderDocuments();
        setApplicationStatus("ready");
        focusMessageInput();
    } catch (error) {
        showUploadError(error.message);
        setApplicationStatus("error");
    } finally {
        setUploadBusy(false);
        elements.pdfInput.value = "";
    }
}

async function removeDocument(documentId) {
    const documentIndex = state.documents.findIndex(
        (document) => document.id === documentId
    );

    if (documentIndex === -1) {
        return;
    }

    const document = state.documents[documentIndex];

    if (!window.confirm(`Remove "${document.name}"?`)) {
        return;
    }

    try {
        await deletePdf(documentId);
        state.documents.splice(documentIndex, 1);
        renderDocuments();

        if (state.documents.length === 0) {
            renderWelcomeCard();
        }

        setApplicationStatus("ready");
    } catch (error) {
        window.alert(error.message);
        setApplicationStatus("error");
    }
}

function submitSuggestedQuestion(question) {
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
        addChatMessage(
            "ai",
            `Summary of ${activeDocument.name}:\n\n${activeDocument.summary}`,
            { isSummary: true, documentName: activeDocument.name }
        );
        return;
    }

    if (action === "question") {
        elements.messageInput.value = "";
        elements.messageInput.placeholder =
            "Ask a specific question about the PDF...";
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

    if (!activeDocument || !question || state.isChatLoading) {
        return;
    }

    addChatMessage("user", question);
    elements.messageInput.value = "";
    setChatLoading(true);
    setApplicationStatus("thinking");
    addLoadingMessage();

    try {
        const data = await askPdfQuestion(activeDocument.id, question);
        removeLoadingMessage();
        addChatMessage("ai", data.answer);
        setApplicationStatus("ready");
    } catch (error) {
        removeLoadingMessage();
        addChatMessage(
            "ai",
            `Sorry, I couldn't answer that question.\n\n${error.message}`
        );
        setApplicationStatus("error");
    } finally {
        setChatLoading(false);
        focusMessageInput();
    }
}

async function handleClearChat() {
    const activeDocument = getActiveDocument();

    if (
        !activeDocument ||
        !window.confirm("Are you sure you want to clear the conversation?")
    ) {
        return;
    }

    elements.clearChatButton.disabled = true;

    try {
        await clearPdfConversation(activeDocument.id);
        renderWelcomeCard();
        resetComposer();
        setApplicationStatus("ready");
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

elements.messageInput.addEventListener("input", updateComposer);
elements.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        if (!elements.sendButton.disabled) {
            elements.messageForm.requestSubmit();
        }
    }
});
elements.messageForm.addEventListener("submit", handleMessageSubmit);
elements.pdfInput.addEventListener("change", () => {
    const selectedFile = elements.pdfInput.files[0];

    if (selectedFile) {
        processSelectedFile(selectedFile);
    }
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
    const droppedFile = event.dataTransfer.files[0];

    if (droppedFile) {
        processSelectedFile(droppedFile);
    }
});
elements.documentsContainer.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".remove-document");

    if (removeButton) {
        removeDocument(removeButton.dataset.documentId);
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

renderWelcomeCard();
renderDocuments();
loadSavedTheme();
