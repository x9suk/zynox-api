function notFound(req, res) {
  res.status(404).json({
    error: true,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

module.exports = notFound;
