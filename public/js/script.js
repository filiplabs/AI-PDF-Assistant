const messageInput = document.querySelector("#message-input");
const characterCount = document.querySelector("#character-count");
const messageForm = document.querySelector(".message-form");
const pdfInput = document.querySelector("#pdf-input");

function updateCharacterCount() {
    const currentLength = messageInput.value.length;
    characterCount.textContent = `${currentLength} / 2000`;
}

function resizeMessageInput() {
    messageInput.style.height = "auto";
    messageInput.style.height = `${Math.min(messageInput.scrollHeight, 150)}px`;
}

messageInput.addEventListener("input", () => {
    updateCharacterCount();
    resizeMessageInput();
});

messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
});

pdfInput.addEventListener("change", () => {
    const selectedFile = pdfInput.files[0];

    if (!selectedFile) {
        return;
    }

    if (selectedFile.type !== "application/pdf") {
        alert("Please upload a PDF file.");
        pdfInput.value = "";
        return;
    }

    console.log("Selected PDF:", selectedFile.name);
});