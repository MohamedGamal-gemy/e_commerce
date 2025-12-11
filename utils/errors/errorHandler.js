const { AppError } = require('./AppError');
const logger = require('../../config/logger');

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error for debugging
    logger.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Development error response
    if (process.env.NODE_ENV === 'development') {
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }

    // Production error response
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message
        });
    }

    // Unknown errors
    return res.status(500).json({
        success: false,
        status: 'error',
        message: 'Something went wrong!'
    });
};

module.exports = errorHandler;