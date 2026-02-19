const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/database");
const errorHandler = require("./middleware/errorHandler");
const path = require('path');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res, filePath) => {
        // Allow cross-origin access
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        // Allow embedding in iframes if needed
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
}));

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
// });

// app.use("/api", limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importing routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const courseRoutes = require("./routes/courseRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const sectionDetailsRoutes = require("./routes/sectionDetailsRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const lessonDetailsRoutes = require("./routes/lessonDetailsRoutes");
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/courses/:courseId/sections", sectionRoutes);
app.use("/api/sections", sectionDetailsRoutes);
app.use("/api/sections/:sectionId/lessons", lessonRoutes);
app.use("/api/lessons", lessonDetailsRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});