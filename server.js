const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const pdfRoutes = require("./routes/pdfRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "AI PDF Assistant server is running.",
    });
});

app.use("/api/pdfs", pdfRoutes);

app.use((error, req, res, next) => {
    if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
            success: false,
            message: "The PDF must be smaller than 15 MB.",
        });
    }

    return res.status(400).json({
        success: false,
        message: error.message || "Something went wrong.",
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});