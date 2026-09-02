# Data Storage & Persistence (`/data`)

This directory serves as the local JSON database engine for **Fusion Education BD**. All server-side state, student applications, course catalogs, and administrative content are persisted here as formatted JSON files.

---

## 📁 Data Files Overview

| File | Description | Auto-Initialized | Primary Handlers |
|---|---|---|---|
| `admissions.json` | Student admission applications and review states | Yes (if missing) | `controllers/admissionController.js`, `server.js` |
| `admissionCounter.json` | Tracks sequence numbers for annual IDs (`FEBD-YYYY-NNN`) | Yes (if missing) | `controllers/admissionController.js` |
| `students.json` | Registered student profiles, auth credentials & progress tracking | Yes | `server.js` (`/api/student/*`) |
| `staff.json` | Branch staff accounts and counselor credentials | Yes | `server.js` (`/api/staff/*`) |
| `courses.json` | Course catalog, fee structures, discounts, and duration | Yes | `server.js` (`/api/courses`) |
| `posts.json` | News notices, articles, and upcoming batch announcements | Yes | `server.js` (`/api/posts`) |
| `faqs.json` | Frequently Asked Questions grouped by category | Yes | `server.js` (`/api/faqs`) |
| `gallery.json` | Photos and media items for the institute gallery | Yes | `server.js` (`/api/gallery`) |
| `testimonials.json` | Student feedback, course ratings, and student quotes | Yes | `server.js` (`/api/testimonials`) |
| `settings.json` | Global website configurations, contact info, and notices | Yes | `server.js` (`/api/settings`) |
| `contactMessages.json` | User inquiries submitted through the contact page | Yes | `server.js` (`/api/contactMessages`) |

---

## 📝 Key Data Schemas

### 1. `admissions.json`
```json
[
  {
    "id": "FEBD-2026-001",
    "applicationId": "FEBD-2026-001",
    "applicationNumber": "FEBD-2026-001",
    "submittedAt": "2026-09-01T15:30:00.000Z",
    "fullName": "Student Full Name",
    "email": "student@example.com",
    "phone": "01700000000",
    "dateOfBirth": "2002-05-15",
    "gender": "male",
    "address": "House 12, Road 4, Sector 7",
    "city": "Dhaka",
    "district": "Dhaka",
    "highestEducation": "HSC / Equivalent",
    "course": "Japanese Language Course (JLPT N5)",
    "courseLevel": "N5",
    "branch": "Dinajpur",
    "japaneseExperience": "none",
    "visaType": "Student Visa",
    "emergencyName": "Guardian Name",
    "emergencyPhone": "01800000000",
    "comment": "Interested in October intake",
    "notes": "Verified initial academic certificates",
    "status": "pending",
    "feeInfo": {
      "baseFee": 15000,
      "discount": 1500,
      "finalFee": 13500
    },
    "photoUrl": "https://res.cloudinary.com/.../photo.jpg",
    "documentUrls": [
      "https://res.cloudinary.com/.../hsc_certificate.pdf"
    ],
    "documents": [
      {
        "name": "hsc_certificate.pdf",
        "url": "https://res.cloudinary.com/.../hsc_certificate.pdf",
        "size": 1048576,
        "type": "application/pdf"
      }
    ]
  }
]
```

### 2. `admissionCounter.json`
```json
{
  "year": 2026,
  "seq": 1
}
```

### 3. `students.json`
```json
[
  {
    "identifier": "FEBD-2026-001",
    "email": "student@example.com",
    "password": "password123",
    "fullName": "Student Name",
    "phone": "01700000000",
    "bloodGroup": "B+",
    "branch": "Dinajpur",
    "status": "Active Student",
    "currentCourse": "JLPT N5 Beginner",
    "batch": "Batch 01",
    "visaApplication": {
      "status": "Document Verification",
      "step": 2,
      "steps": [
        { "title": "Application Submitted", "done": true },
        { "title": "Document Verification", "done": true },
        { "title": "COE Application", "done": false },
        { "title": "COE Issuance", "done": false },
        { "title": "Embassy Visa Stamp", "done": false }
      ]
    }
  }
]
```

---

## ⚠️ Important Rules for Production

1. **Do NOT delete** `admissions.json` or `admissionCounter.json` in production to prevent data loss or duplicate application sequence IDs.
2. **Backups**: Regular backups of the `data/` folder should be performed before database updates or migrations.
3. **Atomic Writes**: `server.js` and controllers read and write to these JSON files synchronously or via async file system promises with proper serialization.
