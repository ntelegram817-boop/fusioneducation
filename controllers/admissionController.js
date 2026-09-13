// ============================================================
// FUSION EDUCATION BD — ADMISSION CONTROLLER
// Handles multi-file uploads (photo + up to 4+ documents), application tracking, and persistence
// ============================================================
const { saveUploadedFile } = require('../middleware/upload');
const path = require('path');
const fs   = require('fs').promises;

const COUNTER_FILE = path.join(__dirname, '../data/admissionCounter.json');
const ADMISSIONS_FILE = path.join(__dirname, '../data/admissions.json');

// ── Ensure data directory & files exist ─────────────────────
async function ensureDataFiles() {
    const dataDir = path.join(__dirname, '../data');
    try { await fs.mkdir(dataDir, { recursive: true }); } catch (_) {}

    try { await fs.access(COUNTER_FILE); }
    catch (_) { await fs.writeFile(COUNTER_FILE, JSON.stringify({ year: new Date().getFullYear(), seq: 0 }, null, 2)); }

    try { await fs.access(ADMISSIONS_FILE); }
    catch (_) { await fs.writeFile(ADMISSIONS_FILE, JSON.stringify([], null, 2)); }
}

// ── Generate unique application number FEBD-YYYY-NNN ─────────
async function generateAppNumber() {
    const currentYear = new Date().getFullYear();
    let counter;

    try {
        const raw = await fs.readFile(COUNTER_FILE, 'utf8');
        counter = JSON.parse(raw);
    } catch (_) {
        counter = { year: currentYear, seq: 0 };
    }

    if (counter.year !== currentYear) {
        counter.year = currentYear;
        counter.seq  = 0;
    }

    counter.seq += 1;
    await fs.writeFile(COUNTER_FILE, JSON.stringify(counter, null, 2));

    const padded = String(counter.seq).padStart(3, '0');
    return `FEBD-${currentYear}-${padded}`;
}

// ── POST /api/admission/submit ────────────────────────────────
async function submitAdmission(req, res) {
    try {
        await ensureDataFiles();

        // ── Upload photo ─────────────────────────────────────
        let photoUrl = null;
        if (req.files?.photo?.[0]) {
            photoUrl = await saveUploadedFile(req.files.photo[0], 'photos');
        }

        // ── Upload multiple documents (up to 4+) ──────────────
        const rawDocs = [
            ...(req.files?.educationDoc || []),
            ...(req.files?.educationDocs || []),
            ...(req.files?.documents || [])
        ];

        const documents = [];
        const documentUrls = [];

        for (const docFile of rawDocs) {
            const url = await saveUploadedFile(docFile, 'documents');
            if (url) {
                documentUrls.push(url);
                documents.push({
                    name: docFile.originalname || 'Document',
                    url: url,
                    size: docFile.size,
                    type: docFile.mimetype
                });
            }
        }

        // ── Generate unique application number ───────────────
        const applicationNumber = await generateAppNumber();

        // ── Build admission record ───────────────────────────
        const admission = {
            id: applicationNumber,
            applicationId: applicationNumber,
            applicationNumber,
            submittedAt: new Date().toISOString(),

            // Personal & Family
            fullName:          req.body.fullName,
            fatherName:        req.body.fatherName || '',
            motherName:        req.body.motherName || '',
            email:             req.body.email,
            phone:             req.body.phone,
            dateOfBirth:       req.body.dateOfBirth,
            gender:            req.body.gender,
            nidBirthCert:      req.body.nidBirthCert || '',
            bloodGroup:        req.body.bloodGroup || '',
            occupation:        req.body.occupation || '',
            religion:          req.body.religion || '',

            // Addresses
            address:           req.body.address,
            city:              req.body.city,
            district:          req.body.district,
            permanentAddress:  req.body.permanentAddress || '',
            permanentCity:     req.body.permanentCity || '',
            permanentDistrict: req.body.permanentDistrict || '',

            // Course & preferences
            highestEducation:   req.body.highestEducation,
            course:             req.body.course,
            courseLevel:        req.body.courseLevel || '',
            branch:             req.body.branch,
            japaneseExperience: req.body.japaneseExperience,
            visaType:           req.body.visaType,

            // Emergency contact
            emergencyName:  req.body.emergencyName,
            emergencyPhone: req.body.emergencyPhone,

            // Optional
            comment: req.body.comment || '',
            feeInfo: (() => { try { return JSON.parse(req.body.feeInfo || 'null'); } catch(_) { return null; } })(),

            // Uploads
            photoUrl,
            documentUrl: documentUrls[0] || null, // backwards compatibility
            documentUrls,
            documents,

            // Metadata
            status: 'pending',
            ipAddress: req.ip
        };

        // ── Persist to local JSON ────────────────────────────
        let admissions = [];
        try {
            const raw = await fs.readFile(ADMISSIONS_FILE, 'utf8');
            admissions = JSON.parse(raw);
        } catch (_) { admissions = []; }

        admissions.unshift(admission);
        await fs.writeFile(ADMISSIONS_FILE, JSON.stringify(admissions, null, 2));

        return res.status(201).json({
            success:           true,
            applicationNumber,
            applicantName:     admission.fullName,
            photoUrl,
            documentUrls,
            message:           'Admission application submitted successfully!'
        });

    } catch (err) {
        console.error('[Admission] Controller error:', err);
        return res.status(500).json({
            success: false,
            error: 'Server error while processing your application. Please try again.'
        });
    }
}

module.exports = { submitAdmission };
