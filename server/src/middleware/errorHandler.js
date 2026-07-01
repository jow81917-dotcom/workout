const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced resource not found.' });
  }
  if (err.code === '23502') {
    return res.status(400).json({ error: 'Required field is missing.' });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
};

module.exports = { errorHandler };
