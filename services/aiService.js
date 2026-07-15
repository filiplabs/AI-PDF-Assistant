const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function summarizeDocument(text) {
    if (!text || !text.trim()) {
        throw new Error("The PDF does not contain readable text.");
    }

    const maximumCharacters = 30000;
    const documentText = text.slice(0, maximumCharacters);

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

module.exports = {
    summarizeDocument,
};