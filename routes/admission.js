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

// GET /api/admission / GET /api/admission/list
const fs = require('fs');
const path = require('path');
const ADMISSIONS_FILE = path.join(__dirname, '../data/admissions.json');

const getAdmissionsList = (req, res) => {
    try {
        if (fs.existsSync(ADMISSIONS_FILE)) {
            const data = JSON.parse(fs.readFileSync(ADMISSIONS_FILE, 'utf8'));
            return res.json({ success: true, admissions: data });
        }
    } catch (_) {}
    return res.json({ success: true, admissions: [] });
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

