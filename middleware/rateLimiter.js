// ============================================================
// FUSION EDUCATION BD — RATE LIMITER MIDDLEWARE
// ============================================================
const rateLimit = require('express-rate-limit');

const admissionLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15') * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5'),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many admission submissions from this IP. Please wait 15 minutes before trying again.'
    },
    handler: (req, res, next, options) => {
        res.status(429).json(options.message);
    }
});

module.exports = { admissionLimiter };
