const globalErrorHandler = (err, req, res, next) => {
  // Fallback to 500 if no statusCode exists
  const statusCode = err.statusCode || 500;
  const status = statusCode.toString().startsWith('4') ? 'fail' : 'error';

  // Decide message based on operational flag (from AppError)
  const message = err.isOperational
    ? err.message
    : 'Something went terribly wrong! Please try again later.';

  res.status(statusCode).json({
    status,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      error: err,
      stack: err.stack,
    }),
  });
};

export default globalErrorHandler;
