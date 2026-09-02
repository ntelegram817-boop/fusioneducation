# Controllers Module (`/controllers`)

This directory houses the request handling business logic for the **Fusion Education BD** backend.

---

## 📁 Controllers Overview

### [`admissionController.js`](file:///w:/Antigravity/website-2.o.2/controllers/admissionController.js)

Responsible for processing admission submissions, managing file uploads (photo + multiple educational documents), generating sequential application IDs, and persisting data to `/data/admissions.json`.

#### Core Methods:
- **`ensureDataFiles()`**: Checks and ensures `/data/admissions.json` and `/data/admissionCounter.json` exist.
- **`generateAppNumber()`**: Reads the annual counter and creates a standardized identifier formatted as `FEBD-YYYY-NNN` (e.g. `FEBD-2026-001`).
- **`submitAdmission(req, res)`**:
  - Handles photo and educational document uploads via `middleware/upload.js`.
  - Parses applicant details, course selection, branch, emergency contact, and fee calculations.
  - Appends the new admission record to `/data/admissions.json`.
  - Returns a HTTP 201 response containing the assigned `applicationNumber` and upload URLs.
