function uploadPdf(req, res) {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "No PDF file was uploaded.",
        });
    }

    return res.status(201).json({
        success: true,
        message: "PDF uploaded successfully.",
        document: {
            id: req.file.filename,
            name: req.file.originalname,
            storedName: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
        },
    });
}

module.exports = {
    uploadPdf,
};