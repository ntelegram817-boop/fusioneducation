# Routes Module (`/routes`)

This directory contains modular Express.js route declarations for the API.

---

## 📁 Routes Overview

### [`admission.js`](file:///w:/Antigravity/website-2.o.2/routes/admission.js)

Mount path: `/api/admission` (also aliased for `/api/admissions`)

| Method | Route | Middleware Chain | Description |
|---|---|---|---|
| `POST` | `/submit` | `admissionLimiter` ➔ `handleUpload` ➔ `admissionValidationRules` ➔ `handleValidationErrors` | Validates inputs, saves uploaded files, generates application ID, and saves record |
| `GET` | `/` or `/list` | None | Returns all admission applications |
| `PUT` | `/:id` | None | Updates status, counselor notes, or fee info for a given admission ID / application number |
| `DELETE`| `/:id` | None | Deletes an admission application record |
