const path = require("path");
const fs = require("fs");

// @desc    Upload single file
// @route   POST /api/upload/single
// @access  Private
exports.uploadSingle = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "فایلی وجود ندارد",
      });
    }

    // Construct file URL
    const fileUrl = `${process.env.BACKEND_URL}/${req.file.path.replace(/\\/g, "/")}`;

    res.status(200).json({
      success: true,
      message: "فایل با موفقیت آپلود شد",
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: fileUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};