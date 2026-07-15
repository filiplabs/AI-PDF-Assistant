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
const chatContent = document.querySelector("#chat-content");
const clearChatButton = document.querySelector("#clear-chat-button");
const statusText = document.querySelector("#status-text");
const statusDot = document.querySelector(".status-dot");
const themeToggleButton = document.querySelector("#theme-toggle-button");
const themeIcon = document.querySelector("#theme-icon");
const themeLabel = document.querySelector("#theme-label");

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
                        <article class="document-item ${
                            index === 0 ? "active" : ""
                        }">
                            <div class="document-icon">📄</div>

                            <div class="document-info">
                                <span
                                    class="document-name"
                                    title="${escapeHtml(document.name)}"
                                >
                                    ${escapeHtml(document.name)}
                                </span>

                                <span class="document-meta">
                                    ${formatFileSize(document.size)} · ${
                                        document.pages
                                    } page${document.pages === 1 ? "" : "s"} · Ready
                                </span>
                            </div>

                            <button
                                class="remove-document"
                                type="button"
                                data-document-id="${document.id}"
                                aria-label="Remove ${escapeHtml(document.name)}"
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

async function removeDocument(documentId) {
    const documentIndex = documents.findIndex(
        (document) => document.id === documentId
    );

    if (documentIndex === -1) {
        return;
    }

    const document = documents[documentIndex];

    const shouldRemove = window.confirm(
        `Remove "${document.name}"?`
    );

    if (!shouldRemove) {
        return;
    }

    try {
        const response = await fetch(
            `/api/pdfs/${encodeURIComponent(documentId)}`,
            {
                method: "DELETE",
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to remove the PDF."
            );
        }

        documents.splice(documentIndex, 1);
        renderDocuments();

        if (documents.length === 0) {
            chatContent.classList.remove("has-messages");

            chatContent.innerHTML = `
                <div class="welcome-card">
                    <div class="welcome-icon">✦</div>

                    <h2>Ask anything about your PDFs</h2>

                    <p>
                        Upload a document and get summaries, explanations,
                        important details and instant answers.
                    </p>

                    <div class="suggestion-grid">
                        <button class="suggestion-card" type="button">
                            <span class="suggestion-icon">✎</span>
                            <span>
                                <strong>Summarize</strong>
                                Give me a concise summary
                            </span>
                        </button>

                        <button class="suggestion-card" type="button">
                            <span class="suggestion-icon">?</span>
                            <span>
                                <strong>Ask a question</strong>
                                Find specific information
                            </span>
                        </button>

                        <button class="suggestion-card" type="button">
                            <span class="suggestion-icon">⌕</span>
                            <span>
                                <strong>Search details</strong>
                                Find terms, dates or clauses
                            </span>
                        </button>

                        <button class="suggestion-card" type="button">
                            <span class="suggestion-icon">≡</span>
                            <span>
                                <strong>Explain</strong>
                                Simplify complex sections
                            </span>
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        window.alert(error.message);
    }
}

function isPdf(file) {
    return (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
    );
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function ensureChatMessagesContainer() {
    let chatMessages = document.querySelector("#chat-messages");

    if (chatMessages) {
        return chatMessages;
    }

    const welcomeCard = document.querySelector(".welcome-card");

    if (welcomeCard) {
        welcomeCard.remove();
    }

    chatContent.classList.add("has-messages");

    chatContent.innerHTML = `
        <div class="chat-messages" id="chat-messages"></div>
    `;

    return document.querySelector("#chat-messages");
}

function addChatMessage(role, message, options = {}) {
    const chatMessages = ensureChatMessagesContainer();
    const isAi = role === "ai";
    const isSummary = options.isSummary === true;
    const documentName = options.documentName || "document";

    const article = document.createElement("article");
    article.className = `chat-message ${isAi ? "ai" : "user"}`;

    article.innerHTML = `
        <div class="message-avatar">
            ${isAi ? "AI" : "You"}
        </div>

        <div class="message-bubble">
            <span class="message-label">
                ${isAi ? "AI Assistant" : "You"}
            </span>

            <div class="message-text">${escapeHtml(message)}</div>

            ${
                isAi
                    ? `
                        <div class="message-actions">
                            <button
                                class="copy-answer-button"
                                type="button"
                            >
                                📋 Copy
                            </button>

                            ${
                                isSummary
                                    ? `
                                        <button
                                            class="download-summary-button"
                                            type="button"
                                            data-document-name="${escapeHtml(documentName)}"
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

    article.dataset.message = message;

    chatMessages.appendChild(article);

    article.scrollIntoView({
        behavior: "smooth",
        block: "end",
    });
}
function setApplicationStatus(status) {
    statusText.textContent = status;

    statusDot.classList.remove(
        "processing",
        "error"
    );

    if (status === "Thinking..." || status === "Analyzing PDF...") {
        statusDot.classList.add("processing");
    }

    if (status === "Error") {
        statusDot.classList.add("error");
    }
}

function setChatLoading(isLoading) {
    messageInput.disabled = isLoading;

    if (isLoading) {
        sendButton.disabled = true;
        messageInput.placeholder = "AI is analyzing your question...";
        setApplicationStatus("Thinking...");
        return;
    }

    messageInput.disabled = documents.length === 0;

    messageInput.placeholder =
        documents.length > 0
            ? "Ask anything about your PDFs..."
            : "Upload a PDF to start asking questions...";

    setApplicationStatus("Ready");
    updateSendButton();
}

function addLoadingMessage() {
    removeLoadingMessage();

    const chatMessages = ensureChatMessagesContainer();

    const article = document.createElement("article");
    article.className = "chat-message ai";
    article.id = "ai-loading-message";

    article.innerHTML = `
        <div class="message-avatar">AI</div>

        <div class="message-bubble loading-bubble">
            <span class="message-label">AI Assistant</span>

            <div class="thinking-row">
                <div class="typing-indicator" aria-label="AI is thinking">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>

                <span class="thinking-text">Analyzing document...</span>
            </div>
        </div>
    `;

    chatMessages.appendChild(article);

    article.scrollIntoView({
        behavior: "smooth",
        block: "end",
    });
}

function removeLoadingMessage() {
    document.querySelector("#ai-loading-message")?.remove();
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
    setApplicationStatus("Analyzing PDF...");

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
            pages: data.document.pages,
            characters: data.document.characters,
            summary: data.document.summary,
        });

        renderDocuments();

        addChatMessage(
            "ai",
            `I've analyzed ${data.document.name}.

        Summary:

        ${data.document.summary}`,
            {
                isSummary: true,
                documentName: data.document.name,
            }
);
    } catch (error) {
        showUploadError(error.message);
        setApplicationStatus("Error");
    } finally {
        uploadStatus.hidden = true;
        uploadBox.style.pointerEvents = "";
        uploadBox.style.opacity = "";
        pdfInput.value = "";

        setApplicationStatus("Ready");
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

messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const question = messageInput.value.trim();
    const activeDocument = documents[0];

    if (!question || !activeDocument) {
        return;
    }

    addChatMessage("user", question);

    messageInput.value = "";
    updateCharacterCount();
    resizeMessageInput();

    setChatLoading(true);
    addLoadingMessage();

    try {
        const response = await fetch("/api/pdfs/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                documentId: activeDocument.id,
                question,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to answer the question."
            );
        }

        removeLoadingMessage();
        addChatMessage("ai", data.answer);
    } catch (error) {
        removeLoadingMessage();

        addChatMessage(
            "ai",
            `Sorry, I couldn't answer that question.

${error.message}`
        );

        setApplicationStatus("Error");
    } finally {
        setChatLoading(false);
        messageInput.focus();
    }
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
chatContent.addEventListener("click", async (event) => {
    const messageArticle = event.target.closest(".chat-message");

    if (!messageArticle) {
        return;
    }

    const message = messageArticle.dataset.message || "";

    const copyButton = event.target.closest(".copy-answer-button");

    if (copyButton) {
        try {
            await navigator.clipboard.writeText(message);

            copyButton.textContent = "✓ Copied";

            window.setTimeout(() => {
                copyButton.textContent = "📋 Copy";
            }, 1500);
        } catch (error) {
            copyButton.textContent = "Copy failed";

            window.setTimeout(() => {
                copyButton.textContent = "📋 Copy";
            }, 1500);
        }

        return;
    }

    const downloadButton = event.target.closest(
        ".download-summary-button"
    );

    if (!downloadButton) {
        return;
    }

    const originalDocumentName =
        downloadButton.dataset.documentName || "document.pdf";

    const cleanDocumentName = originalDocumentName.replace(
        /\.pdf$/i,
        ""
    );

    const summaryFile = new Blob([message], {
        type: "text/plain;charset=utf-8",
    });

    const downloadUrl = URL.createObjectURL(summaryFile);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = `${cleanDocumentName}-summary.txt`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    URL.revokeObjectURL(downloadUrl);

    downloadButton.textContent = "✓ Downloaded";

    window.setTimeout(() => {
        downloadButton.textContent = "↓ Download summary";
    }, 1500);
});
clearChatButton.addEventListener("click", async () => {
    const activeDocument = documents[0];

    if (!activeDocument) {
        return;
    }

    const shouldClear = window.confirm(
        "Are you sure you want to clear the conversation?"
    );

    if (!shouldClear) {
        return;
    }

    clearChatButton.disabled = true;

    try {
        const response = await fetch("/api/pdfs/clear-chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                documentId: activeDocument.id,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to clear the conversation."
            );
        }

        chatContent.classList.remove("has-messages");

        chatContent.innerHTML = `
            <div class="welcome-card">
                <div class="welcome-icon">✦</div>

                <h2>Ask anything about your PDFs</h2>

                <p>
                    Upload a document and get summaries, explanations,
                    important details and instant answers.
                </p>

                <div class="suggestion-grid">
                    <button class="suggestion-card" type="button">
                        <span class="suggestion-icon">✎</span>
                        <span>
                            <strong>Summarize</strong>
                            Give me a concise summary
                        </span>
                    </button>

                    <button class="suggestion-card" type="button">
                        <span class="suggestion-icon">?</span>
                        <span>
                            <strong>Ask a question</strong>
                            Find specific information
                        </span>
                    </button>

                    <button class="suggestion-card" type="button">
                        <span class="suggestion-icon">⌕</span>
                        <span>
                            <strong>Search details</strong>
                            Find terms, dates or clauses
                        </span>
                    </button>

                    <button class="suggestion-card" type="button">
                        <span class="suggestion-icon">≡</span>
                        <span>
                            <strong>Explain</strong>
                            Simplify complex sections
                        </span>
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        window.alert(error.message);
    } finally {
        clearChatButton.disabled = false;
    }
});

themeToggleButton.addEventListener("click", () => {
    const isCurrentlyDark =
        document.body.classList.contains("dark-theme");

    applyTheme(isCurrentlyDark ? "light" : "dark");
});

function applyTheme(theme) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark-theme", isDark);

    themeIcon.textContent = isDark ? "☀" : "◐";
    themeLabel.textContent = isDark ? "Light mode" : "Dark mode";

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

updateCharacterCount();
renderDocuments();
updateSendButton();
loadSavedTheme();