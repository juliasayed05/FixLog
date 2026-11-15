export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'An unexpected error occurred.';
  let details = err.details;

  if (err.type === 'entity.parse.failed') { status = 400; message = 'Request body contains invalid JSON.'; }
  if (err.code === 'LIMIT_FILE_SIZE') { status = 413; message = 'Your profile photo is too large. Choose an image smaller than 2 MB.'; }
  if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') { status = 400; message = 'Upload one profile photo at a time.'; }
  if (err.message === 'Origin is not allowed by CORS.') { status = 403; message = 'This origin is not allowed to access FixLog.'; }
  if (err.code === 11000) {
    status = 409;
    message = 'An account with this email already exists.';
  }
  if (err.name === 'ValidationError') {
    status = 422;
    message = Object.values(err.errors).map((item) => item.message).join(' ');
  }
  if (err.name === 'CastError') {
    status = 400;
    message = 'The requested resource identifier is invalid.';
  }

  if (process.env.NODE_ENV !== 'production' && status >= 500) console.error(err);
  res.status(status).json({ success: false, message, ...(details ? { details } : {}), ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { stack: err.stack } : {}) });
}
