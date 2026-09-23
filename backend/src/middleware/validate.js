const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
      location: err.location,
    }));

    // Log validation failures for debugging
    const requestId = req.requestId || 'unknown';
    console.warn(`[${requestId}] Validation failed:`, JSON.stringify(formattedErrors));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      requestId,
    });
  }

  next();
};

// Sanitize middleware to prevent NoSQL injection
const sanitize = (req, res, next) => {
  const sanitizeObj = obj => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObj);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip MongoDB operators
        if (key.startsWith('$')) continue;
        sanitized[key] = sanitizeObj(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) req.body = sanitizeObj(req.body);
  if (req.query) req.query = sanitizeObj(req.query);
  if (req.params) req.params = sanitizeObj(req.params);

  next();
};

module.exports = { validate, sanitize };
