class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function notFoundHandler(req, res, next) {
  next(new HttpError(404, "Not found"));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof HttpError) {
    const body = { message: err.message };
    if (err.code) body.code = err.code;
    return res.status(err.status).json(body);
  }

  // Request-body problems raised by the JSON / form parsers.
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }
  if (err.type === "entity.parse.failed" || err.type === "encoding.unsupported") {
    return res.status(400).json({ message: "Invalid request body" });
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join("; ");
    return res.status(400).json({ message: message || "Validation failed" });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid id" });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({ message: `${field} already exists` });
  }

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File is too large" });
    }
    return res.status(400).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}

module.exports = { HttpError, asyncHandler, notFoundHandler, errorHandler };
