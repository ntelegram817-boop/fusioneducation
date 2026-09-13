// ============================================================
// FUSION EDUCATION BD — INPUT VALIDATION RULES (express-validator)
// ============================================================
const { body, validationResult } = require('express-validator');

// BD phone number: +880, 880, or 0 prefix + 1[3-9] + 8 digits
const BD_PHONE_REGEX = /^(\+880|880|0)?1[3-9]\d{8}$/;

const admissionValidationRules = [
    // ── Personal & Family Info ───────────────────────────────
    body('fullName')
        .trim()
        .escape()
        .notEmpty().withMessage('Full name is required.')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),

    body('fatherName')
        .trim()
        .escape()
        .notEmpty().withMessage("Father's name is required.")
        .isLength({ min: 2, max: 100 }).withMessage("Father's name must be between 2 and 100 characters."),

    body('motherName')
        .trim()
        .escape()
        .notEmpty().withMessage("Mother's name is required.")
        .isLength({ min: 2, max: 100 }).withMessage("Mother's name must be between 2 and 100 characters."),

    body('email')
        .trim()
        .normalizeEmail()
        .isEmail().withMessage('Please provide a valid email address.'),

    body('phone')
        .trim()
        .matches(BD_PHONE_REGEX).withMessage('Please provide a valid Bangladeshi phone number (e.g. 01XXXXXXXXX).'),

    body('dateOfBirth')
        .notEmpty().withMessage('Date of birth is required.')
        .isISO8601().withMessage('Invalid date format.')
        .custom((value) => {
            const dob = new Date(value);
            const now = new Date();
            const ageMs  = now - dob;
            const agYrs  = ageMs / (1000 * 60 * 60 * 24 * 365.25);
            if (agYrs < 12) throw new Error('Applicant must be at least 12 years old.');
            if (agYrs > 65) throw new Error('Applicant age seems invalid. Please check the date.');
            return true;
        }),

    body('gender')
        .trim()
        .isIn(['male', 'female', 'other']).withMessage('Please select a valid gender.'),

    body('nidBirthCert')
        .optional({ checkFalsy: true })
        .trim()
        .escape()
        .isLength({ max: 50 }).withMessage('National ID / Birth Certificate number is too long.'),

    body('bloodGroup')
        .optional({ checkFalsy: true })
        .trim()
        .isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', '']).withMessage('Please select a valid blood group.'),

    body('occupation')
        .trim()
        .escape()
        .notEmpty().withMessage('Occupation is required.')
        .isLength({ max: 100 }),

    body('religion')
        .trim()
        .escape()
        .notEmpty().withMessage('Religion is required.')
        .isLength({ max: 50 }),

    // ── Address Information ───────────────────────────────────
    body('address')
        .trim()
        .escape()
        .notEmpty().withMessage('Residential address is required.')
        .isLength({ max: 300 }).withMessage('Address is too long.'),

    body('city')
        .trim()
        .escape()
        .notEmpty().withMessage('Residential city / upazila is required.')
        .isLength({ max: 100 }),

    body('district')
        .trim()
        .escape()
        .notEmpty().withMessage('Residential district is required.')
        .isLength({ max: 100 }),

    body('permanentAddress')
        .trim()
        .escape()
        .notEmpty().withMessage('Permanent address is required.')
        .isLength({ max: 300 }).withMessage('Permanent address is too long.'),

    body('permanentCity')
        .trim()
        .escape()
        .notEmpty().withMessage('Permanent city / upazila is required.')
        .isLength({ max: 100 }),

    body('permanentDistrict')
        .trim()
        .escape()
        .notEmpty().withMessage('Permanent district is required.')
        .isLength({ max: 100 }),

    // ── Educational & Course Info ─────────────────────────────
    body('highestEducation')
        .trim()
        .isIn(['ssc', 'hsc', 'bachelor', 'master', 'other'])
        .withMessage('Please select a valid education level.'),

    body('course')
        .trim()
        .escape()
        .notEmpty().withMessage('Please select a course.'),

    body('courseLevel')
        .optional({ checkFalsy: true })
        .trim()
        .escape(),

    body('branch')
        .trim()
        .notEmpty().withMessage('Please select a valid branch.'),

    body('japaneseExperience')
        .trim()
        .isIn(['none', 'self-study', 'formal', 'certified'])
        .withMessage('Please select your Japanese experience level.'),

    body('visaType')
        .trim()
        .isIn(['student', 'ssw', 'titp', 'undecided'])
        .withMessage('Please select a valid visa type.'),

    // ── Emergency Contact ─────────────────────────────────────
    body('emergencyName')
        .trim()
        .escape()
        .notEmpty().withMessage('Emergency contact name is required.')
        .isLength({ min: 2, max: 100 }),

    body('emergencyPhone')
        .trim()
        .matches(BD_PHONE_REGEX).withMessage('Please provide a valid emergency contact phone number.'),

    // ── Optional fields ───────────────────────────────────────
    body('comment')
        .optional({ checkFalsy: true })
        .trim()
        .escape()
        .isLength({ max: 1000 }).withMessage('Comment is too long (max 1000 characters).')
];

/**
 * Middleware: runs after validation rules — returns 422 if any field fails.
 */
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            error: 'Validation failed. Please check your inputs.',
            fields: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
    }
    next();
}

module.exports = { admissionValidationRules, handleValidationErrors };
