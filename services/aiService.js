const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function summarizeDocument(text) {
    if (!text || !text.trim()) {
        throw new Error("The PDF does not contain readable text.");
    }

    const documentText = text.slice(0, 30000);

    const response = await openai.responses.create({
        model: "gpt-5-mini",
        instructions: `
You are an AI assistant that summarizes PDF documents.

Create a clear and useful summary based only on the supplied document.
Do not invent information.
Use concise paragraphs and bullet points when appropriate.
Mention important people, dates, obligations, amounts and deadlines.
        `.trim(),
        input: documentText,
    });

    return response.output_text;
}

async function answerDocumentQuestion(text, question, history = []) {
    if (!text || !text.trim()) {
        throw new Error("The document does not contain readable text.");
    }

    if (!question || !question.trim()) {
        throw new Error("Please enter a question.");
    }

    const documentText = text.slice(0, 30000);

    const conversation = history
        .slice(-6)
        .map((item) => `${item.role}: ${item.content}`)
        .join("\n");

    const response = await openai.responses.create({
        model: "gpt-5-mini",
        instructions: `
You answer questions using only the supplied PDF document.

Rules:
- Do not invent information.
- If the answer is not in the document, clearly say that.
- Keep answers clear and concise.
- Answer in the same language as the user's question.
- Use conversation history only for context.
        `.trim(),
        input: `
DOCUMENT:
${documentText}

CONVERSATION HISTORY:
${conversation || "No previous conversation."}

USER QUESTION:
${question}
        `.trim(),
    });

    return response.output_text;
}

module.exports = {
    summarizeDocument,
    answerDocumentQuestion,
};