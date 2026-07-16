# AI PDF Assistant

AI PDF Assistant is a full-stack web application for uploading PDF documents,
extracting their text, generating on-demand AI summaries, and asking
document-grounded questions. It supports multiple PDFs with independent chat
histories in a responsive vanilla JavaScript interface.

[Live Demo](https://ai-pdf-assistant-qipo.onrender.com/) ·
[GitHub Repository](https://github.com/filiplabs/AI-PDF-Assistant)

> The Render free tier may take a short time to wake after a period of
> inactivity.

## Features

- Upload a single PDF or select multiple PDFs at once.
- Add documents through the native file picker or drag and drop.
- Validate PDF type, extension, duplicate files, and the 15 MB size limit.
- Extract readable PDF text and page metadata with `pdf-parse`.
- Ask AI questions grounded in the active document.
- Maintain a separate conversation for every uploaded PDF.
- Generate summaries only when requested.
- Cache generated summaries and reuse them without another OpenAI request.
- Find important names, dates, amounts, deadlines, and terms with Search
  Details.
- Explain important or complex document sections in simple language.
- Clear the conversation for one document without affecting the others.
- Delete individual PDFs and their associated in-memory state.
- Copy AI responses to the clipboard.
- Download summaries as text files.
- Persist the light or dark theme preference in the browser.
- Use the application across desktop and mobile layouts.

## Screenshots

### Light mode

> Screenshot placeholder: add the light mode screenshot at
> `docs/screenshots/light-mode.png`.

### Dark mode

> Screenshot placeholder: add the dark mode screenshot at
> `docs/screenshots/dark-mode.png`.

## Tech Stack

| Area | Technology |
| --- | --- |
| Backend | Node.js, Express |
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| AI | OpenAI API |
| PDF processing | Multer, pdf-parse |
| Testing | Node.js built-in test runner |
| Deployment | Render |

## Architecture

The application uses a lightweight layered architecture:

- **Routes** define the public HTTP interface.
- **Controllers** validate requests and coordinate application operations.
- **Services** handle PDF extraction, OpenAI requests, summary caching,
  document state, and filesystem operations.
- **Middleware** validates uploads and normalizes errors.
- **Frontend** manages document selection, per-document conversations, cached
  UI state, and rendering without a framework or build step.

### Request flow

```text
Browser
  |
  v
Express routes and middleware
  |
  +--> Upload middleware --> PDF extraction --> In-memory document store
  |
  +--> Summary service --> Cached summary or AI service --> OpenAI API
  |
  +--> AI service --> OpenAI API with document text and recent history
  |
  +--> File service --> Safe local PDF deletion
  |
  v
JSON response --> Vanilla JavaScript UI
```

Uploads finish after text extraction, so a document is immediately available
for questions. Summary generation runs separately when the user selects
**Summarize**. Concurrent requests for the same summary share one OpenAI
operation, and subsequent requests return the cached result.

## Project Structure

```text
AI-PDF-Assistant/
|-- app.js                     # Express application configuration
|-- server.js                  # Environment loading and HTTP startup
|-- config/
|   `-- uploadConfig.js        # Upload constants and stored filenames
|-- controllers/
|   `-- pdfController.js       # PDF endpoint handlers
|-- middleware/
|   |-- errorHandler.js        # Central API error responses
|   `-- upload.js              # Multer storage and validation
|-- routes/
|   `-- pdfRoutes.js           # PDF API routes
|-- services/
|   |-- aiService.js           # OpenAI summary and question requests
|   |-- documentStore.js       # Documents and bounded chat history
|   |-- fileService.js         # Safe upload cleanup and deletion
|   |-- pdfService.js          # PDF text extraction
|   `-- summaryService.js      # Lazy summary caching and deduplication
|-- utils/
|   `-- httpResponse.js        # Shared error-response helper
|-- public/
|   |-- css/style.css
|   |-- js/script.js
|   `-- index.html
|-- tests/                     # Node.js unit tests
|-- uploads/                   # Runtime PDF storage
|-- .env.example
`-- package.json
```

## Local Installation

### Prerequisites

- Node.js and npm
- An OpenAI API key

### Setup

```bash
git clone https://github.com/filiplabs/AI-PDF-Assistant.git
cd AI-PDF-Assistant
npm install
cp .env.example .env
```

Update `.env` with your own OpenAI API key, then start the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

## Environment Variables

Use placeholder values when creating local configuration. Never commit real
credentials.

```dotenv
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Yes | None | Authenticates requests to the OpenAI API. |
| `PORT` | No | `3000` | Port used by the Express server. |

## npm Commands

| Command | Description |
| --- | --- |
| `npm start` | Start the application with Node.js. |
| `npm run dev` | Start the application with Nodemon and automatic restarts. |
| `npm test` | Run the test suite with the Node.js built-in test runner. |

## API Reference

Base path: `/api`

Error responses use this shape:

```json
{
  "success": false,
  "message": "Description of the error."
}
```

### Health check

```http
GET /api/health
```

Returns the current server status.

### Upload a PDF

```http
POST /api/pdfs/upload
Content-Type: multipart/form-data
```

Send one PDF in the `pdf` form field. The frontend supports multiple selection
by submitting each selected file through this endpoint. A successful request
returns HTTP `201` with extracted document metadata. The `summary` field is
`null` until summary generation is requested.

### Generate or retrieve a summary

```http
POST /api/pdfs/summary
Content-Type: application/json
```

```json
{
  "documentId": "stored-document-id.pdf"
}
```

Generates the document summary on the first request and returns the cached
summary on later requests.

### Ask a document question

```http
POST /api/pdfs/ask
Content-Type: application/json
```

```json
{
  "documentId": "stored-document-id.pdf",
  "question": "What are the important deadlines?"
}
```

Returns an answer grounded in the selected document and its recent
conversation history.

### Clear a document conversation

```http
POST /api/pdfs/clear-chat
Content-Type: application/json
```

```json
{
  "documentId": "stored-document-id.pdf"
}
```

Clears only the selected document's conversation history. Its cached summary
remains available.

### Delete a PDF

```http
DELETE /api/pdfs/:documentId
```

Deletes the selected PDF from local storage and removes its in-memory document
state.

## Testing

Run the complete unit test suite:

```bash
npm test
```

The tests cover document storage and bounded history, safe filesystem handling,
summary caching, concurrent summary-request deduplication, and retry behavior
after summary failures.

For manual verification, test multiple uploads, document switching, questions
before summary generation, cached summary reuse, per-document chat clearing,
deletion, downloads, and theme persistence.

## Deployment on Render

1. Fork or clone the
   [GitHub repository](https://github.com/filiplabs/AI-PDF-Assistant).
2. In Render, create a new **Web Service** from the repository.
3. Use `npm install` as the build command.
4. Use `npm start` as the start command.
5. Add `OPENAI_API_KEY` as a secret environment variable.
6. Deploy the service and verify `/api/health` after startup.

Render supplies `PORT` automatically. Do not hard-code a production port or
commit secrets. The current local upload directory and in-memory document store
are ephemeral on Render and should not be treated as persistent storage.

## Known Limitations

- Uploaded files and document state are not persistent across server restarts
  or redeployments.
- Scanned and image-only PDFs require OCR, which is not currently implemented.
- Authentication and user isolation are not implemented.
- Persistent database and object storage are not implemented.
- PDF text supplied to the AI is limited by the application's current context
  strategy.

## Roadmap

- Add OCR support for scanned documents.
- Persist document metadata and conversations in a database.
- Store PDFs in durable object storage.
- Add authentication and per-user document isolation.
- Add rate limiting, structured logging, and request tracing.
- Expand API integration and browser end-to-end coverage.
- Add streaming responses and request cancellation.

## Author

Created by **FilipLabs**.

- GitHub: [github.com/filiplabs](https://github.com/filiplabs)
- Project: [AI PDF Assistant](https://github.com/filiplabs/AI-PDF-Assistant)
