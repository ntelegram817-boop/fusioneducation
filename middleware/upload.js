// ============================================================
// FUSION EDUCATION BD — UPLOAD MIDDLEWARE (Local & Cloudinary Resilient)
// ============================================================
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');

// ── Ensure local uploads directories exist ───────────────────
const uploadsBaseDir = path.join(__dirname, '../uploads');
const photosDir = path.join(uploadsBaseDir, 'photos');
const docsDir = path.join(uploadsBaseDir, 'documents');

[uploadsBaseDir, photosDir, docsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ── Configure Cloudinary ──────────────────────────────────────
const hasCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET &&
    !process.env.CLOUDINARY_CLOUD_NAME.includes('your_cloud_name')
);

if (hasCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file

// ── Allowed MIME types ────────────────────────────────────────
const ALLOWED_PHOTO_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'
];
const ALLOWED_DOC_TYPES = [
    'application/pdf', 
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// ── Multer: memory storage ────────────────────────────────────
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'photo') {
        if (!ALLOWED_PHOTO_TYPES.includes(file.mimetype.toLowerCase())) {
            return cb(new Error('Photo must be JPG, PNG, or WebP format.'));
        }
    } else {
        // Any document field (educationDoc, educationDocs, documents, etc.)
        if (!ALLOWED_DOC_TYPES.includes(file.mimetype.toLowerCase())) {
            return cb(new Error(`Document "${file.originalname}" must be a PDF, Image, or Word file.`));
        }
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_BYTES }
}).fields([
    { name: 'photo',         maxCount: 1 },
    { name: 'educationDoc',  maxCount: 10 },
    { name: 'educationDocs', maxCount: 10 },
    { name: 'documents',     maxCount: 10 }
]);

// ── Wrap multer to return clean JSON on errors ────────────────
function handleUpload(req, res, next) {
    upload(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File size exceeds 10 MB limit. Please select a smaller file.'
            });
        }
        if (err) {
            return res.status(400).json({ success: false, error: err.message });
        }
        next();
    });
}

// ── Save file locally (Fallback / Offline / Fast Storage) ─────
function saveFileLocally(buffer, originalFilename, subfolder = 'documents') {
    const targetDir = subfolder === 'photos' ? photosDir : docsDir;
    const cleanExt = path.extname(originalFilename) || (subfolder === 'photos' ? '.jpg' : '.pdf');
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${cleanExt}`;
    const filePath = path.join(targetDir, safeName);

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${subfolder}/${safeName}`;
}

// ── Save file: tries Cloudinary first, falls back to local ─────
async function saveUploadedFile(file, subfolder = 'documents') {
    if (!file || !file.buffer) return null;

    if (hasCloudinary) {
        try {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: `fusion-education-bd/admissions/${subfolder}`,
                        resource_type: 'auto'
                    },
                    (error, res) => {
                        if (error) return reject(error);
                        resolve(res);
                    }
                );
                const readable = new Readable();
                readable.push(file.buffer);
                readable.push(null);
                readable.pipe(uploadStream);
            });
            if (result && result.secure_url) {
                return result.secure_url;
            }
        } catch (cloudErr) {
            console.warn(`[Upload] Cloudinary upload notice (${cloudErr.message}), saving locally.`);
        }
    }

    // Local file fallback
    return saveFileLocally(file.buffer, file.originalname, subfolder);
}

module.exports = { handleUpload, saveUploadedFile, hasCloudinary };
