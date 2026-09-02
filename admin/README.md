# Admin Management Module (`/admin`)

This directory contains modular control panel views for the **Fusion Education BD** administrative portal.

---

## 📁 Admin Submodules

| File | Module | Description | Backend API |
|---|---|---|---|
| [`dashboard.html`](file:///w:/Antigravity/website-2.o.2/admin/dashboard.html) | Main Dashboard | Analytics cards, recent submissions, charts, and quick metric summaries | `/api/admissions`, `/api/courses`, `/api/contactMessages` |
| [`admissions.html`](file:///w:/Antigravity/website-2.o.2/admin/admissions.html) | Admissions Manager | Review all incoming applications, inspect uploaded documents/photos, change status, and export CSV/JSON | `/api/admissions`, `/api/admissions/:id` |
| [`courses.html`](file:///w:/Antigravity/website-2.o.2/admin/courses.html) | Course Manager | Add, update, or remove courses, level badges, pricing, discounts, and enrollment schedules | `/api/courses`, `/api/courses/:id` |
| [`faqs.html`](file:///w:/Antigravity/website-2.o.2/admin/faqs.html) | FAQ Manager | Manage questions and answers categorized by General, Admission, and Visa | `/api/faqs`, `/api/faqs/:id` |
| [`messages.html`](file:///w:/Antigravity/website-2.o.2/admin/messages.html) | Inquiries Inbox | Read, search, and delete inquiries submitted from the public contact form | `/api/contactMessages`, `/api/contactMessages/:id` |
| [`posts.html`](file:///w:/Antigravity/website-2.o.2/admin/posts.html) | News & Notices | Publish, edit, and categorize institute notices, blog posts, and intake announcements | `/api/posts`, `/api/posts/:id` |
| [`testimonials.html`](file:///w:/Antigravity/website-2.o.2/admin/testimonials.html) | Testimonials Manager | Manage student review cards, star ratings, and student photos | `/api/testimonials`, `/api/testimonials/:id` |
| [`users.html`](file:///w:/Antigravity/website-2.o.2/admin/users.html) | User Access Control | Admin & staff account management, role assignment, and credentials | Local storage / `/data/staff.json` |

---

## 🔒 Security & Client-Side Scripts
- All admin views utilize `assets/css/admin.css` for clean, responsive sidebar layouts and dark/light UI modes.
- Managed by `assets/js/admin.js` and `assets/js/dao.js` for API integration and fallback synchronization.
