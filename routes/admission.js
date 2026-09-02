// ============================================================
// FUSION EDUCATION BD — ADMISSION ROUTES
// POST /api/admission/submit
// ============================================================
const express  = require('express');
const router   = express.Router();

const { admissionLimiter }                        = require('../middleware/rateLimiter');
const { handleUpload }                            = require('../middleware/upload');
const { admissionValidationRules, handleValidationErrors } = require('../middleware/validate');
const { submitAdmission }                         = require('../controllers/admissionController');

/**
 * POST /api/admission/submit
 *
 * Middleware chain:
 *  1. admissionLimiter     — 5 req / 15 min per IP
 *  2. handleUpload         — multer: parses multipart, enforces 5 MB / MIME types
 *  3. admissionValidation  — express-validator rules on body fields
 *  4. handleValidationErrors — returns 422 if any rule fails
 *  5. submitAdmission      — uploads to Cloudinary, generates app number, saves record
 */
router.post(
    '/submit',
    admissionLimiter,
    handleUpload,
    admissionValidationRules,
    handleValidationErrors,
    submitAdmission
);

// GET /api/admission / GET /api/admission/list / GET /api/admissions
const fs = require('fs');
const path = require('path');
const ADMISSIONS_FILE = path.join(__dirname, '../data/admissions.json');
const STUDENTS_FILE = path.join(__dirname, '../data/students.json');

const getAdmissionsList = (req, res) => {
    try {
        let admissions = [];
        let students = [];

        if (fs.existsSync(ADMISSIONS_FILE)) {
            try {
                admissions = JSON.parse(fs.readFileSync(ADMISSIONS_FILE, 'utf8'));
                if (!Array.isArray(admissions)) admissions = [];
            } catch (_) {}
        }

        if (fs.existsSync(STUDENTS_FILE)) {
            try {
                students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8'));
                if (!Array.isArray(students)) students = [];
            } catch (_) {}
        }

        // Normalize admissions list
        const normalizedAdmissions = admissions.map(a => ({
            ...a,
            id: a.id || a.applicationNumber || a.applicationId,
            applicationNumber: a.applicationNumber || a.applicationId || a.id,
            fullName: a.fullName || a.name || a.studentName || 'Student Name',
            email: a.email || '',
            phone: a.phone || '',
            course: a.course || a.courseName || 'Japanese Language Course',
            courseLevel: a.courseLevel || (a.course && a.course.includes('N4') ? 'N4' : (a.course && a.course.includes('N3') ? 'N3' : 'N5')),
            branch: a.branch || 'dinajpur',
            status: a.status || 'pending',
            photoUrl: a.photoUrl || a.photo || a.avatar || '../assets/images/student-placeholder.jpg',
            submittedAt: a.submittedAt || a.enrollmentDate || a.createdAt || new Date().toISOString()
        }));

        // Merge any admitted students from students.json that aren't already in admissions.json
        const existingIds = new Set(normalizedAdmissions.map(a => String(a.applicationNumber || a.id).toLowerCase()));

        students.forEach(s => {
            const safeAppNo = s.applicationNumber || s.identifier || s.id || `STU-${Date.now()}`;
            if (!existingIds.has(String(safeAppNo).toLowerCase()) && !existingIds.has(String(s.id).toLowerCase())) {
                existingIds.add(String(safeAppNo).toLowerCase());
                normalizedAdmissions.push({
                    id: s.id || safeAppNo,
                    applicationId: safeAppNo,
                    applicationNumber: safeAppNo,
                    fullName: s.fullName || s.name || s.studentName || 'Student Name',
                    email: s.email || '',
                    phone: s.phone || '',
                    dateOfBirth: s.dateOfBirth || '',
                    gender: s.gender || 'male',
                    address: s.address || '',
                    city: s.city || (s.branch ? `${s.branch} City` : 'Dinajpur'),
                    district: s.district || s.branch || 'Dinajpur',
                    highestEducation: s.highestEducation || 'HSC',
                    course: s.course || s.courseName || 'JLPT N5',
                    courseLevel: s.courseLevel || 'N5',
                    branch: (s.branch || 'dinajpur').toLowerCase(),
                    batch: s.batch || 'Batch 01',
                    status: s.status || 'admitted',
                    photoUrl: s.photoUrl || s.photo || s.avatar || '../assets/images/student-placeholder.jpg',
                    submittedAt: s.enrollmentDate || s.submittedAt || new Date().toISOString(),
                    documents: s.documents || [],
                    payments: s.payments || [],
                    notes: s.notes || ''
                });
            }
        });

        return res.json({ success: true, admissions: normalizedAdmissions });
    } catch (err) {
        console.error('Error fetching admissions list:', err);
        return res.json({ success: true, admissions: [] });
    }
};

router.get('/', getAdmissionsList);
router.get('/list', getAdmissionsList);

// PUT /api/admission/:id
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const updateData = req.body || {};
    try {
        let admissions = [];
        if (fs.existsSync(ADMISSIONS_FILE)) {
            admissions = JSON.parse(fs.readFileSync(ADMISSIONS_FILE, 'utf8'));
        }
        const index = admissions.findIndex(a => 
            String(a.id) === String(id) || 
            String(a.applicationNumber) === String(id) || 
            String(a.applicationId) === String(id)
        );
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Admission not found' });
        }
        admissions[index] = {
            ...admissions[index],
            ...updateData,
            updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(ADMISSIONS_FILE, JSON.stringify(admissions, null, 2), 'utf8');
        return res.json({ success: true, message: 'Admission updated successfully', admission: admissions[index] });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to update admission.' });
    }
});

// DELETE /api/admission/:id
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    try {
        let admissions = [];
        if (fs.existsSync(ADMISSIONS_FILE)) {
            admissions = JSON.parse(fs.readFileSync(ADMISSIONS_FILE, 'utf8'));
        }
        const filtered = admissions.filter(a => 
            String(a.id) !== String(id) && 
            String(a.applicationNumber) !== String(id) && 
            String(a.applicationId) !== String(id)
        );
        fs.writeFileSync(ADMISSIONS_FILE, JSON.stringify(filtered, null, 2), 'utf8');
        return res.json({ success: true, message: 'Admission application deleted successfully' });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to delete admission.' });
    }
});

module.exports = router;

