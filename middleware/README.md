# Middleware Module (`/middleware`)

This directory contains Express.js middleware functions for request security, rate limiting, file upload handling, and input validation.

---

## 📁 Middleware Components

### 1. [`rateLimiter.js`](file:///w:/Antigravity/website-2.o.2/middleware/rateLimiter.js)
- **`admissionLimiter`**: Restricts form submissions to a maximum of **5 requests per 15-minute window** per IP address.
- Returns `HTTP 429 Too Many Requests` when limits are exceeded, preventing spam submissions and denial of service attacks.

### 2. [`upload.js`](file:///w:/Antigravity/website-2.o.2/middleware/upload.js)
- **`handleUpload`**: Multer multi-part form parser configured for:
  - `photo`: Single passport-size picture (max 5 MB; JPEG, PNG, WEBP).
  - `educationDoc` / `educationDocs` / `documents`: Multiple document uploads (max 5 files, 5 MB each; JPEG, PNG, WEBP, PDF).
- **`saveUploadedFile(file, folder)`**: Helper function that streams uploads to Cloudinary (if configured in `.env`) or falls back safely to local storage under `/uploads/photos` and `/uploads/documents`.

### 3. [`validate.js`](file:///w:/Antigravity/website-2.o.2/middleware/validate.js)
- **`admissionValidationRules`**: Express-validator checks covering:
  - `fullName`: Required string (minimum 3 characters).
  - `email`: Standard email format validation.
  - `phone`: Bangladeshi 11-digit mobile number format check (`01XXXXXXXXX` or `+8801XXXXXXXXX`).
  - `course`, `branch`, `gender`, `dateOfBirth`: Required fields.
- **`handleValidationErrors`**: Intercepts validation errors and returns structured `HTTP 422 Unprocessable Entity` response with specific error messages.
