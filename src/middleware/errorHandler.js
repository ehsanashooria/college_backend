const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error to console for development
    if (process.env.NODE_ENV === 'development') {
        console.error('Error Stack:', err.stack);
        console.error('Error Details:', err);
    }

    // Mongoose bad ObjectId (invalid ID format)
    if (err.name === 'CastError') {
        const message = `Resource not found with id: ${err.value}`;
        error = { message, statusCode: 404 };
    }

    // Mongoose duplicate key error (E11000)
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        const message = `This ${field} is already registered. Please use a different ${field}.`;
        error = { message, statusCode: 400 };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors)
            .map(val => val.message)
            .join(', ');
        error = { message, statusCode: 400 };
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token. Please log in again.';
        error = { message, statusCode: 401 };
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Your token has expired. Please log in again.';
        error = { message, statusCode: 401 };
    }

    // Multer file upload errors (if you add file upload later)
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            error = { message: 'File size is too large', statusCode: 400 };
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            error = { message: 'Too many files uploaded', statusCode: 400 };
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            error = { message: 'Unexpected file field', statusCode: 400 };
        }
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;