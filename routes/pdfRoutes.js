const express = require("express");

const upload = require("../middleware/upload");
const {
    uploadPdf,
    askPdf,
} = require("../controllers/pdfController");

const router = express.Router();

router.post("/upload", upload.single("pdf"), uploadPdf);
router.post("/ask", askPdf);

module.exports = router;