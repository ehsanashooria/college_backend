const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory if it doesn't exist
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create subdirectories
const dirs = ["courses", "lessons", "avatars", "attachments"];
dirs.forEach((dir) => {
  const dirPath = path.join(uploadDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine upload directory based on file type or query parameter
    let uploadPath = uploadDir;

    if (req.query.type) {
      uploadPath = path.join(uploadDir, req.query.type);
    } else if (file.fieldname === "avatar") {
      uploadPath = path.join(uploadDir, "avatars");
    } else if (file.fieldname === "thumbnail") {
      uploadPath = path.join(uploadDir, "courses");
    } else if (file.fieldname === "video") {
      uploadPath = path.join(uploadDir, "lessons");
    } else if (file.fieldname === "attachment") {
      uploadPath = path.join(uploadDir, "attachments");
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, "_");

    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  },
});

// File filter - determine which files to accept
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|avi|mov|wmv|flv|mkv/;
  const allowedDocTypes = /pdf|doc|docx|txt|zip|rar/;

  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  const mimetype = file.mimetype;

  // Check file type
  if (
    allowedImageTypes.test(ext) ||
    allowedVideoTypes.test(ext) ||
    allowedDocTypes.test(ext) ||
    mimetype.startsWith("image/") ||
    mimetype.startsWith("video/") ||
    mimetype.startsWith("application/")
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "نوع فایل نامعتبر است",
      ),
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: fileFilter,
});

module.exports = upload;
