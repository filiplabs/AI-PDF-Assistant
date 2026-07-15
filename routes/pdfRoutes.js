const express = require("express");

const upload = require("../middleware/upload");
const {
    uploadPdf,
    askPdf,
    clearPdfChat,
    removePdf,
} = require("../controllers/pdfController");

const router = express.Router();

router.post("/upload", upload.single("pdf"), uploadPdf);
router.post("/ask", askPdf);
router.post("/clear-chat", clearPdfChat);
router.delete("/:documentId", removePdf);

module.exports = router;