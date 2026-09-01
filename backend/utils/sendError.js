const sendError = (res, err) => {
    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 ? "Server Error" : err.message;

    return res.status(statusCode).json({ success: false, message });
};


module.exports = sendError;