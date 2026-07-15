# AI PDF Assistant

AI PDF Assistant is a Node.js and Express application for uploading PDF
documents, generating concise OpenAI-powered summaries, and asking questions
that are answered from the selected document.

The browser client uses semantic HTML, structured CSS, and vanilla JavaScript.
The backend extracts PDF text, keeps document state and conversation context in
memory, and exposes a small JSON API consumed by the frontend.

## Screenshots

The application includes responsive light and dark themes. Project screenshots
can be added under `assets/` as the interface evolves.

| Desktop | Dark mode |
| --- | --- |
| Upload, select, summarize, and chat with multiple PDFs. | Theme preference persists between browser sessions. |

## Features

- Upload one or more PDF documents through the picker or drag and drop.
- Validate file type, extension, duplicate uploads, and the 15 MB size limit.
- Extract text and page counts from readable PDFs.
- Generate an individual AI summary for each document.
- Keep independent chat history for every uploaded document.
- Ask free-form questions or use the Summary, Search, and Explain actions.
- Copy answers and download summaries as text files.
- Clear or delete only the selected document.
- Persist light or dark theme preference in the browser.
- Remove failed uploads when extraction, validation, or AI processing fails.

## Architecture

```text
Browser
  -> Express application
      -> upload middleware (Multer validation and storage)
      -> PDF controller (HTTP validation and response mapping)
          -> PDF service (text extraction)
          -> AI service (OpenAI Responses API)
          -> document store (in-memory documents and bounded history)
          -> file service (safe upload paths and deletion)
```

`server.js` loads environment variables and starts the HTTP listener. `app.js`
constructs the Express application, which keeps startup concerns separate from
middleware and route registration.

## Folder Structure

```text
AI-PDF-Assistant/
├── app.js
├── server.js
├── config/
│   └── uploadConfig.js
├── controllers/
│   └── pdfController.js
├── middleware/
│   ├── errorHandler.js
│   └── upload.js
├── routes/
│   └── pdfRoutes.js
├── services/
│   ├── aiService.js
│   ├── documentStore.js
│   ├── fileService.js
│   └── pdfService.js
├── utils/
│   └── httpResponse.js
├── public/
│   ├── css/style.css
│   ├── js/script.js
│   └── index.html
├── tests/
├── uploads/
└── .env.example
```

## Installation

Requirements:

- Node.js 20 or newer
- An OpenAI API key

```bash
git clone <repository-url>
cd AI-PDF-Assistant
npm install
```

Copy `.env.example` to `.env`, then replace the placeholder API key.

```bash
cp .env.example .env
```

Start the application:

```bash
npm start
```

For development with automatic server restarts:

```bash
npm run dev
```

Open `http://localhost:3000`.

Run the built-in tests:

```bash
npm test
```

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Yes | None | API key used by the OpenAI Node.js SDK. |
| `PORT` | No | `3000` | HTTP port used by the Express server. |

Never commit `.env` or real credentials. The repository tracks only
`.env.example` with placeholder values.

## API Documentation

All responses are JSON. Error responses use the existing shape:

```json
{
  "success": false,
  "message": "Description of the error."
}
```

### Health Check

`GET /api/health`

Returns server availability.

### Upload and Analyze a PDF

`POST /api/pdfs/upload`

- Content type: `multipart/form-data`
- File field: `pdf`
- Maximum size: 15 MB
- Accepted type: PDF with a `.pdf` extension

Successful uploads return HTTP `201` with document metadata and the generated
summary.

### Ask a Document Question

`POST /api/pdfs/ask`

```json
{
  "documentId": "stored-document-id.pdf",
  "question": "What are the important deadlines?"
}
```

The answer is grounded in the matching document and its recent conversation
context.

### Clear Document Conversation

`POST /api/pdfs/clear-chat`

```json
{
  "documentId": "stored-document-id.pdf"
}
```

Clears only the selected document's conversation history.

### Delete a Document

`DELETE /api/pdfs/:documentId`

Deletes the stored PDF and its in-memory document record.

## Limitations

- Documents and conversation history are stored in memory and are lost when the
  server restarts.
- Uploaded files are local to one server instance and are not shared across a
  cluster or serverless deployment.
- Only text-based PDFs are supported. Scanned documents require OCR.
- Document text sent to OpenAI is limited by the current application context
  strategy.
- Generic processing failures retain the existing HTTP `400` contract for
  backward compatibility.
- Authentication, authorization, rate limiting, and persistent storage are not
  included yet.

## Future Improvements

- Add OCR for scanned PDFs.
- Store document metadata and conversation history in a database.
- Move uploaded files to managed object storage.
- Add authentication and per-user document isolation.
- Add request rate limiting and structured application logging.
- Add streaming responses and cancellation support.
- Add broader HTTP integration and browser end-to-end test coverage.
