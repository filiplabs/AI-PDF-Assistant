const path = require("path");
const cors = require("cors");
const express = require("express");

const errorHandler = require("./middleware/errorHandler");
const pdfRoutes = require("./routes/pdfRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_request, response) => {
    response.json({
        success: true,
        message: "AI PDF Assistant server is running.",
    });
});

app.use("/api/pdfs", pdfRoutes);
app.use(errorHandler);

module.exports = app;
