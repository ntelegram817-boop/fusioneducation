# Fusion Education BD - Master Project Structure & Documentation (`MAIN-README.md`)

A modern, full-featured web application and management platform for **Fusion Education BD** — a Japanese language institute and visa consultation agency. Built with a responsive frontend, modular Express.js backend, multi-branch staff portal, student portal, and comprehensive admin dashboard.

---

## 📁 Complete Project Structure

```
website-2.o.2/
├── MAIN-README.md                 # Master all-structure documentation file
├── README.md                      # Root documentation summary & quick links
├── index.html                     # Main landing & home page
├── server.js                      # Express.js backend server & API routes
├── package.json                   # Node.js project metadata & dependencies
├── package-lock.json              # Exact dependency tree lockfile
├── nodemon.json                   # Nodemon configuration for development
├── start-server.bat               # Windows batch script for one-click startup
├── wrangler.toml                  # Cloudflare Pages / Workers deployment config
├── _redirects                     # SPA and routing redirects
├── .env.example                   # Template for environment variables
├── .env                           # Local environment configuration (Cloudinary, Port, etc.)
│
├── pages/                         # Public & portal HTML pages
│   ├── about.html                 # About Us (mission, vision, team)
│   ├── admission.html             # Multi-step online admission application form
│   ├── contact.html               # Contact & branch location details
│   ├── courses.html               # Japanese language courses (JLPT N5-N3, Kaiwa)
│   ├── visa-support.html          # Student, SSW & TITP visa guidance
│   ├── success-stories.html       # Student success stories & testimonials
│   ├── student-login.html         # Student portal authentication
│   ├── student-dashboard.html     # Enrolled student portal & tracking dashboard
│   ├── staff-login.html           # Multi-branch staff login
│   ├── staff-dashboard.html       # Branch counselor / staff management dashboard
│   ├── admin-login.html           # Admin access login page
│   ├── admin.html                 # Super admin master control page
│   └── README.md                  # Pages directory documentation
│
├── admin/                         # Modular Super Admin Dashboard Pages
│   ├── dashboard.html             # System analytics & overview summary
│   ├── admissions.html            # Online admissions management & status approval
│   ├── courses.html               # Course catalog CRUD management
│   ├── faqs.html                  # Frequently Asked Questions CRUD
│   ├── messages.html              # Contact inquiries & message inbox
│   ├── posts.html                 # News, notices & event posts management
│   ├── testimonials.html          # Student reviews & testimonial management
│   ├── users.html                 # Admin & staff user access management
│   └── README.md                  # Admin submodule documentation
│
├── assets/                        # Frontend styling, scripts & media
│   ├── css/
│   │   ├── style.css              # Main public design system (glow, glassmorphism, responsive)
│   │   ├── admission.css          # Multi-step admission form wizard styling
│   │   ├── dashboard.css          # Student portal dashboard & tracking layout
│   │   └── admin.css              # Admin & staff management panel theme
│   ├── js/
│   │   ├── main.js                # Core interactions, navbar, scroll effects & modal logic
│   │   ├── admission.js           # Multi-step admission form logic, uploads & API submission
│   │   ├── discountCalculator.js  # Dynamic fee & discount computation
│   │   ├── student-dashboard-data.js # Student profile & application tracker logic
│   │   ├── staff-dashboard.js     # Staff portal logic, branch filter, status & note updates
│   │   ├── admin.js               # Admin dashboard CRUD, data synchronization & modals
│   │   ├── dao.js                 # Data Access Object abstraction for frontend & localStorage
│   │   ├── gallery.js             # Media gallery interactive viewer & filter
│   │   └── create_user.js         # User creation utility script
│   ├── images/
│   │   ├── logo.jpg               # Official brand logo
│   │   └── student-placeholder.jpg # Default student avatar placeholder
│   └── README.md                  # Assets directory documentation
│
├── controllers/                   # Backend request controllers
│   ├── admissionController.js     # Handles admission submission, file uploads & app numbering
│   └── README.md                  # Controllers documentation
│
├── routes/                        # Express API route modules
│   ├── admission.js               # Admission API routes (`/api/admission/*`)
│   └── README.md                  # Routes documentation
│
├── middleware/                    # Express middlewares
│   ├── rateLimiter.js             # IP-based rate limiting (5 req / 15 min for submissions)
│   ├── upload.js                  # Multer configuration & Cloudinary / local file storage
│   ├── validate.js                # Express-validator schema for form payloads
│   └── README.md                  # Middleware documentation
│
├── utils/                         # Helper functions & server utilities
│   ├── emailSender.js             # Email dispatch helper (Nodemailer / SMTP integration)
│   ├── passwordGenerator.js       # Secure password and token generator
│   └── README.md                  # Utilities documentation
│
├── data/                          # Server-side JSON persistence layer
│   ├── admissions.json            # Student admission applications data store
│   ├── admissionCounter.json      # Auto-incrementing annual application sequence counter
│   ├── students.json              # Enrolled student profiles & login accounts
│   ├── staff.json                 # Staff members & branch counselor accounts
│   ├── courses.json               # Course listings, fees & schedules
│   ├── posts.json                 # News, announcements & blog posts
│   ├── faqs.json                  # FAQ items grouped by categories
│   ├── gallery.json               # Institute photo gallery records
│   ├── testimonials.json          # Student reviews & ratings
│   ├── settings.json              # Website configuration & contact settings
│   ├── contactMessages.json       # Submitted contact form messages
│   └── README.md                  # Data schema & persistence documentation
│
├── uploads/                       # Local uploaded asset storage (fallback)
│   ├── photos/                    # Uploaded student passport photos
│   └── documents/                 # Uploaded academic certificates & NID files
│
└── dist/                          # Production static build / distribution mirror
    ├── admin/                     # Static distribution admin pages
    ├── assets/                    # Static distribution CSS, JS, and images
    ├── data/                      # Static distribution data files
    │   └── README.md
    ├── pages/                     # Static distribution HTML pages
    ├── index.html                 # Static distribution entry point
    └── _redirects                 # Static redirect rules
```

---

## 👥 User Portals & Roles

### 1. 🌐 Public Website
- **Landing Page (`index.html`)**: Hero section, animated counters, featured courses, 4-step visa process, testimonials, FAQ, and quick contact.
- **Course Catalog (`pages/courses.html`)**: Details on JLPT N5, N4, N3, and Nat-Test courses with interactive discount calculator.
- **Online Admission Form (`pages/admission.html`)**: 3-step wizard with multi-file upload (photo + educational certificates), dynamic branch selection, and instant confirmation ID generation (`FEBD-YYYY-NNN`).
- **Visa Consultation (`pages/visa-support.html`)**: Guidance for Student Visa, Specified Skilled Worker (SSW), and TITP.
- **Success Stories (`pages/success-stories.html`)**: Visa success cases and student feedback.
- **Contact Us (`pages/contact.html`)**: Multi-branch addresses (Dinajpur, Dhaka, Rangpur) with interactive message submission.

### 2. 🎓 Student Portal (`pages/student-login.html`, `pages/student-dashboard.html`)
- **Authentication**: Login via Registration Number (`FEBD-YYYY-NNN`) / Email and Password.
- **Real-Time Visa Step Tracker**: 5-step interactive progress (Application Submitted ➔ Document Verification ➔ COE Application ➔ COE Issuance ➔ Embassy Visa Stamp).
- **Academic Profile**: Enrolled course details, batch, assigned instructor, routine, and class schedule.
- **Financial Status**: Fee breakdown (Total fee, paid amount, due balance, and payment status).
- **Profile Management**: Update phone number, emergency contacts, blood group, address, and profile photo.

### 3. 🏢 Staff Dashboard (`pages/staff-login.html`, `pages/staff-dashboard.html`)
- **Branch-Specific Access**: Multi-branch support (Dinajpur, Dhaka, Rangpur, or All Branches).
- **Student Applications Review**: Filter, search, and inspect complete student applications along with uploaded documents and photos.
- **Application Status Management**: Update status directly to `Pending`, `Under Review`, `Admitted`, or `Rejected`.
- **Counselor Notes & Fees**: Add counseling notes and update batch assignments and fee payment details.

### 4. 👑 Super Admin Dashboard (`admin/*.html`, `pages/admin-login.html`)
- **Analytics Overview (`admin/dashboard.html`)**: Total applicants, active courses, pending inquiries, and monthly trends.
- **Admissions Management (`admin/admissions.html`)**: Complete control of admission records, export data, and document verifications.
- **Course Manager (`admin/courses.html`)**: Add, edit, delete courses, discount rules, and schedules.
- **FAQ Manager (`admin/faqs.html`)**: Category-wise FAQ CRUD operations.
- **Post & Notice Manager (`admin/posts.html`)**: Publish announcements, event notices, and news articles.
- **Testimonial Manager (`admin/testimonials.html`)**: Manage student reviews and ratings.
- **Inquiries Inbox (`admin/messages.html`)**: View and manage customer messages from the contact form.
- **User Management (`admin/users.html`)**: Staff and admin account creation and permission management.

---

## ⚡ Backend Architecture & REST APIs

The backend is built with **Node.js** and **Express.js**, offering high security, validation, file upload handling, and JSON flat-file database persistence.

### Core Endpoints

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Admission** | `POST` | `/api/admission/submit` | Submit admission with photo & multi-document upload |
| **Admission** | `GET` | `/api/admissions` | Fetch all admission records |
| **Admission** | `PUT` | `/api/admissions/:id` | Update admission status, notes, or fee info |
| **Admission** | `DELETE` | `/api/admissions/:id` | Delete admission application |
| **Student** | `POST` | `/api/student/login` | Student login authentication |
| **Student** | `GET` | `/api/student/profile` | Retrieve student profile & visa tracking data |
| **Student** | `PUT` | `/api/student/profile` | Update student profile fields |
| **Student** | `POST` | `/api/student/logout` | Clear student session |
| **Staff** | `POST` | `/api/staff/login` | Staff authentication with branch context |
| **Staff** | `GET` | `/api/staff/me` | Get current logged-in staff session |
| **Staff** | `GET` | `/api/staff/students` | Get branch-filtered student admissions |
| **Staff** | `POST` | `/api/staff/logout` | Clear staff session |
| **Courses** | `GET`, `POST`, `PUT`, `DELETE` | `/api/courses` (and `/:id`) | Full CRUD for course offerings |
| **Posts** | `GET`, `POST`, `PUT`, `DELETE` | `/api/posts` (and `/:id`) | Full CRUD for news & notices |
| **FAQs** | `GET`, `POST`, `PUT`, `DELETE` | `/api/faqs` (and `/:id`) | Full CRUD for FAQ entries |
| **Testimonials**| `GET`, `POST`, `PUT`, `DELETE` | `/api/testimonials` (and `/:id`)| Full CRUD for student reviews |
| **Gallery** | `GET`, `POST`, `DELETE` | `/api/gallery` (and `/:id`) | Manage gallery images and categories |
| **Messages** | `GET`, `POST`, `DELETE` | `/api/contactMessages` (and `/:id`)| Contact form message management |
| **Settings** | `GET`, `POST` | `/api/settings` | Site-wide configuration and branch info |

---

## 🛡️ Security & Middleware Pipeline

1. **Helmet**: Protects HTTP headers and prevents clickjacking and XSS attacks.
2. **CORS & Credentials**: Configured for secure cross-origin requests and cookie-based sessions.
3. **Rate Limiting (`middleware/rateLimiter.js`)**: Limits admission submissions to 5 requests per 15-minute window per IP to prevent spam and DoS.
4. **Multer & Storage (`middleware/upload.js`)**:
   - File size limits (5 MB max per file).
   - Allowed MIME types: JPEG, PNG, WEBP, PDF.
   - Cloudinary integration with local fallback in `uploads/`.
5. **Validation (`middleware/validate.js`)**: Express-validator rules sanitizing inputs, verifying Bangladeshi phone numbers, and email syntax.

---

## 🎨 Design System & CSS Architecture

- **Color Palette**:
  - Primary: `#E60012` (Japan Red)
  - Dark Background: `#0B1020` / Deep Slate `#111827`
  - Light Background: `#F8FAFC`
  - Accent: `#2563EB` (Royal Blue)
- **Typography**: Inter (Body), Poppins & Sora (Headings) via Google Fonts.
- **Visual Effects**: RGB glowing borders, glassmorphism cards (`.glass`, `.glass-dark`), responsive CSS grid system, smooth micro-animations.

---

## 🚀 Getting Started & Local Development

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or higher)
- npm (Node Package Manager)

### 2. Installation
Clone the repository and install dependencies:
```bash
# Install required packages
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and set your credentials:
```env
PORT=3000
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Running the Application
```bash
# Start with live reloading (Nodemon)
npm run dev

# Or start in production mode
npm start

# Or double-click the Windows batch file:
start-server.bat
```

Open your browser at: `http://localhost:3000`

---

## 🔄 Submodule Documentation Links

- [Pages Documentation](file:///w:/Antigravity/website-2.o.2/pages/README.md)
- [Admin Submodule Documentation](file:///w:/Antigravity/website-2.o.2/admin/README.md)
- [Assets (CSS/JS/Media) Documentation](file:///w:/Antigravity/website-2.o.2/assets/README.md)
- [Data Storage & Persistence Documentation](file:///w:/Antigravity/website-2.o.2/data/README.md)
- [Controllers Documentation](file:///w:/Antigravity/website-2.o.2/controllers/README.md)
- [Routes Documentation](file:///w:/Antigravity/website-2.o.2/routes/README.md)
- [Middleware Documentation](file:///w:/Antigravity/website-2.o.2/middleware/README.md)
- [Utilities Documentation](file:///w:/Antigravity/website-2.o.2/utils/README.md)

---

## 📞 Support & Contacts

**Fusion Education BD**
- **Email**: contact@fusioneducationbd.com
- **Phone / WhatsApp**: +880 1302 090286
- **Head Office**: Dinajpur, Bangladesh
- **Branch Offices**: Dhaka & Rangpur

---
*Last Updated: 2026-09-01 | Maintained for Fusion Education BD*
