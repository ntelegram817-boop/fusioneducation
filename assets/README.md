# Frontend Assets Module (`/assets`)

This directory contains styling stylesheets, client-side JavaScript controllers, and static graphic assets.

---

## 🎨 Cascading Style Sheets (`/assets/css`)

| File | Purpose | Key Features |
|---|---|---|
| [`style.css`](file:///w:/Antigravity/website-2.o.2/assets/css/style.css) | Global Design System & Public Pages | CSS variables, glowing RGB borders, glassmorphism cards, responsive navigation, animations |
| [`admission.css`](file:///w:/Antigravity/website-2.o.2/assets/css/admission.css) | Multi-step Admission Form | Step wizard indicators, file upload previews, drag-and-drop zones, fee summaries |
| [`dashboard.css`](file:///w:/Antigravity/website-2.o.2/assets/css/dashboard.css) | Student & Staff Dashboards | Milestone progress steps, academic timetable widgets, status badges, profile layouts |
| [`admin.css`](file:///w:/Antigravity/website-2.o.2/assets/css/admin.css) | Admin Control Panel | Sidebar navigation, data tables, modal popups, quick stat summary cards |

---

## 💻 JavaScript Modules (`/assets/js`)

| File | Target Layer | Description |
|---|---|---|
| [`main.js`](file:///w:/Antigravity/website-2.o.2/assets/js/main.js) | Public Website | Mobile menu toggler, counter animations, FAQ accordion, scroll-to-top, smooth scrolling |
| [`admission.js`](file:///w:/Antigravity/website-2.o.2/assets/js/admission.js) | Admission Form | 3-step navigation, form validation, multiple document uploads, and submission to `/api/admission/submit` |
| [`discountCalculator.js`](file:///w:/Antigravity/website-2.o.2/assets/js/discountCalculator.js) | Course & Admission | Real-time calculation of course fees, promotional discounts, and net payable amounts |
| [`student-dashboard-data.js`](file:///w:/Antigravity/website-2.o.2/assets/js/student-dashboard-data.js) | Student Portal | Loads student profile from `/api/student/profile`, renders visa timeline, and handles profile edits |
| [`staff-dashboard.js`](file:///w:/Antigravity/website-2.o.2/assets/js/staff-dashboard.js) | Staff Portal | Loads branch-specific students from `/api/staff/students`, updates student notes and admission states |
| [`admin.js`](file:///w:/Antigravity/website-2.o.2/assets/js/admin.js) | Admin Panel | Admin CRUD operations, modal handlers, dynamic data table renders, and filtering |
| [`dao.js`](file:///w:/Antigravity/website-2.o.2/assets/js/dao.js) | Data Layer | Data Access Object abstraction connecting frontend components with REST endpoints / local fallback |
| [`gallery.js`](file:///w:/Antigravity/website-2.o.2/assets/js/gallery.js) | Media Gallery | Category filter tabs and modal lightbox viewer for institute events |
| [`create_user.js`](file:///w:/Antigravity/website-2.o.2/assets/js/create_user.js) | Admin Tool | Helper script to generate initial administrative credentials and accounts |

---

## 🖼️ Media Assets (`/assets/images`)

- [`logo.jpg`](file:///w:/Antigravity/website-2.o.2/assets/images/logo.jpg): Official Fusion Education BD brand emblem.
- [`student-placeholder.jpg`](file:///w:/Antigravity/website-2.o.2/assets/images/student-placeholder.jpg): Placeholder avatar for applicant profiles and dashboards.
