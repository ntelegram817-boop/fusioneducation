// ============================================================
// FUSION EDUCATION BD — ADMISSION CONTROLLER
// Handles multi-file uploads (photo + up to 4+ documents), application tracking, and persistence
// ============================================================
const { saveUploadedFile } = require('../middleware/upload');
const fbDb = require('../utils/firebaseDb');

// ── Generate unique application number FEBD-YYYY-NNN ─────────
async function generateAppNumber() {
    const currentYear = new Date().getFullYear();
    let counter = { year: currentYear, seq: 0 };

    try {
        const doc = await fbDb.db.collection('admissionCounter').doc('default').get();
        if (doc.exists) {
            counter = doc.data();
        }
    } catch (_) {}

    if (counter.year !== currentYear) {
        counter.year = currentYear;
        counter.seq  = 0;
    }

    counter.seq += 1;
    await fbDb.writeSingleDocument('admissionCounter', 'default', counter);

    const padded = String(counter.seq).padStart(3, '0');
    return `FEBD-${currentYear}-${padded}`;
}

// ── POST /api/admission/submit ────────────────────────────────
async function submitAdmission(req, res) {
    try {

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
            feeInfo: await (async () => { 
                try { 
                    let feeInfo = JSON.parse(req.body.feeInfo || 'null');
                    if (feeInfo) {
                        const courses = await fbDb.readData('courses') || [];
                        const courseData = courses.find(c => c.title === req.body.course || c.level === (req.body.courseLevel || ''));
                        
                        if (courseData) {
                            if (feeInfo.billingPlan === 'monthly_pay') {
                                const courseAdmFee = courseData.monthlyEvent?.admissionFee ?? courseData.admissionFee ?? 0;
                                const courseMFee = courseData.monthlyEvent?.monthlyFee ?? courseData.monthlyFee ?? 1000;
                                const expectedFinal = courseAdmFee + courseMFee;
                                
                                if (Number(feeInfo.finalFee) < expectedFinal) {
                                    console.warn(`[Security Warning] Tampered fee detected. Adjusted to expected: ${expectedFinal}`);
                                    feeInfo.finalFee = expectedFinal;
                                    feeInfo.admissionFee = courseAdmFee;
                                    feeInfo.monthlyFee = courseMFee;
                                    feeInfo.tampered = true;
                                }
                            } else {
                                let expectedRegular = Number(courseData.regularFee) || parseInt(String(courseData.fee || 0).replace(/[^\d]/g, ''), 10) || 15000;
                                let expectedFinal = expectedRegular;
                                
                                if (courseData.discountType === 'percentage') {
                                    expectedFinal = expectedRegular - Math.floor(expectedRegular * (Number(courseData.discountValue) / 100));
                                } else if (courseData.discountType === 'fixed') {
                                    expectedFinal = expectedRegular - Number(courseData.discountValue);
                                }
                                
                                if (Number(feeInfo.finalFee) < expectedFinal) {
                                    console.warn(`[Security Warning] Tampered course fee detected. Adjusted to expected: ${expectedFinal}`);
                                    feeInfo.finalFee = expectedFinal;
                                    feeInfo.tampered = true;
                                }
                            }
                        }
                    }
                    return feeInfo; 
                } catch(_) { return null; } 
            })(),

            // Uploads
            photoUrl,
            documentUrl: documentUrls[0] || null, // backwards compatibility
            documentUrls,
            documents,

            // Metadata
            status: 'pending',
            ipAddress: req.ip
        };

        // ── Persist to Firebase ────────────────────────────
        let admissions = await fbDb.readData('admissions');
        if (!admissions) admissions = [];

        admissions.unshift(admission);
        await fbDb.writeData('admissions', admissions);

        // CREATE FIREBASE AUTH ACCOUNT FOR THE STUDENT
        try {
            const defaultPassword = req.body.phone || 'FEBD2026';
            await fbDb.getAuth().createUser({
                uid: applicationNumber,
                email: req.body.email,
                emailVerified: false,
                password: defaultPassword,
                displayName: req.body.fullName,
                disabled: false,
            });
            console.log('Firebase Auth created for:', req.body.email);
        } catch (authErr) {
            console.error('Error creating Firebase Auth user:', authErr.message);
            // It might already exist, or invalid email. Proceed anyway.
        }

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
