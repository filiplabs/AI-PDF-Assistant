const express = require("express");

const upload = require("../middleware/upload");
const { uploadPdf } = require("../controllers/pdfController");

const router = express.Router();

router.post("/upload", upload.single("pdf"), uploadPdf);

module.exports = router;