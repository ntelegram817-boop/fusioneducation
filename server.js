// ============================================================
// FUSION EDUCATION BD — EXPRESS SERVER
// ============================================================
require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const path         = require('path');
const fs           = require('fs');
const bcrypt       = require('bcrypt');

const IS_DEV = (process.env.NODE_ENV || 'development') === 'development';

const admissionRoutes = require('./routes/admission');
const authRoutes      = require('./routes/auth');
const {
    readJson,
    writeJson,
    getAuthenticatedUser,
    hasPermission,
    hasBranchAccess,
    calculateActiveMonths,
    calculateStudentFees,
    recordAuditLog
} = require('./middleware/rbac');
const { handleUpload, saveUploadedFile } = require('./middleware/upload');

const app  = express();
const PORT = process.env.PORT || 3000;
const compression = require('compression');

// ── Compression Middleware ───────────────────────────────────
app.use(compression());

// ── Security headers & CORS ──────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false // allow inline scripts on existing pages
}));
app.use(cors({
    origin: true,
    credentials: true
}));

// ── Body parsers ─────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ── Block sensitive directories from public access ───────────
app.use('/data', (req, res) => {
    return res.status(403).json({ success: false, error: 'Access denied.' });
});
app.use('/.env', (req, res) => {
    return res.status(403).json({ success: false, error: 'Access denied.' });
});

// Cache static assets for 1 day only in production, no cache in development
app.use(express.static(__dirname, { maxAge: IS_DEV ? 0 : '1d' }));

// ── Trust proxy (for correct IP in rate limiter) ─────────────
app.set('trust proxy', 1);

// ── API Routes ───────────────────────────────────────────────
app.use('/api/admission', admissionRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/auth', authRoutes);

// ── API Endpoints & CRUD Data Layer ──────────────────────────
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// ── Synchronous file write lock to prevent race conditions ──
const _fileLocks = new Set();
function acquireLockSync(filename) {
    // Spin-wait (sync) — safe for single-process Node with sync writes
    while (_fileLocks.has(filename)) { /* busy wait */ }
    _fileLocks.add(filename);
}
function releaseLock(filename) {
    _fileLocks.delete(filename);
}

const fbDb = require('./utils/firebaseDb');

// Drop-in replacement for readData using Firebase
const readData = async (filename, defaultValue = []) => {
    try {
        const collectionName = filename.replace('.json', '');
        let data = await fbDb.readData(collectionName);
        
        // Handle special cases where the JSON is expected to be an Object (like settings.json)
        if (!Array.isArray(defaultValue) && Array.isArray(data) && data.length > 0) {
            return data[0]; // Take the first document as the config object
        } else if (!Array.isArray(defaultValue) && (data.length === 0 || !data)) {
            return defaultValue;
        }
        
        return data;
    } catch (e) {
        console.error(`Error reading ${filename} from Firebase:`, e.message);
        return defaultValue;
    }
};

// Drop-in replacement for writeData using Firebase
const writeData = async (filename, data) => {
    try {
        const collectionName = filename.replace('.json', '');
        return await fbDb.writeData(collectionName, data);
    } catch (e) {
        console.error(`Error writing ${filename} to Firebase:`, e.message);
        return false;
    }
};
//  ── Auth guard middleware for destructive endpoints ──────────
function requireAuth(requiredRole = 'staff') {
    return async (req, res, next) => {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
        }
        if (requiredRole === 'admin' && user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Admin access required.' });
        }
        req.authUser = user;
        next();
    };
}

// ── Bcrypt helper ────────────────────────────────────────────
async function hashPassword(plaintext) {
    return bcrypt.hash(plaintext, 10);
}
async function verifyPassword(plaintext, stored) {
    // If stored password is a bcrypt hash, compare properly
    if (stored && stored.startsWith('$2')) {
        return bcrypt.compare(plaintext, stored);
    }
    // Fallback: plaintext comparison for legacy passwords
    return plaintext === stored;
}

// ── COURSE LIFECYCLE & DATA MODEL HELPERS ────────────────────
function calculateCourseDurationMonths(courseLevelOrTitle) {
  const str = String(courseLevelOrTitle || '').toUpperCase();
  if (str.includes('N3')) return 5;
  if (str.includes('N4')) return 4;
  return 3; // N5 default: 3 months
}

function calculateCourseEndDate(startDateStr, durationMonths = 3) {
  if (!startDateStr) return '';
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + Number(durationMonths || 3));
  return d.toISOString().split('T')[0];
}

function buildStudentFromAdmission(adm) {
  const appNum = adm.applicationNumber || adm.id || `FEBD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const courseLevel = adm.courseLevel || (adm.course && adm.course.includes('N4') ? 'N4' : (adm.course && adm.course.includes('N3') ? 'N3' : 'N5'));
  
  let durationMonths = calculateCourseDurationMonths(courseLevel);
  if (adm.feeInfo?.durationMonths) durationMonths = Number(adm.feeInfo.durationMonths);

  const startDate = adm.classStartDate || '';
  let endDate = adm.courseEndDate || '';
  if (startDate && !endDate) {
    endDate = calculateCourseEndDate(startDate, durationMonths);
  }

  let courseStatus = adm.courseStatus || 'enrolled';
  if (startDate && endDate && courseStatus !== 'completed') {
    const today = new Date().toISOString().split('T')[0];
    if (today > endDate) courseStatus = 'awaiting_completion';
    else if (today >= startDate) courseStatus = 'ongoing';
    else courseStatus = 'upcoming';
  }

  return {
    id: appNum,
    identifier: appNum,
    applicationNumber: appNum,
    applicationId: appNum,
    email: adm.email || '',
    // Password not stored in student profile object for security
    fullName: adm.fullName || 'Student Name',
    fatherName: adm.fatherName || '',
    motherName: adm.motherName || '',
    phone: adm.phone || '',
    bloodGroup: adm.bloodGroup || '',
    nidBirthCert: adm.nidBirthCert || adm.nid || '',
    occupation: adm.occupation || '',
    religion: adm.religion || '',
    dateOfBirth: adm.dateOfBirth || '',
    address: adm.address || adm.presentAddress || '',
    city: adm.city || '',
    district: adm.district || '',
    permanentAddress: adm.permanentAddress || adm.address || '',
    permanentCity: adm.permanentCity || adm.city || '',
    permanentDistrict: adm.permanentDistrict || adm.district || '',
    branch: adm.branch || 'Dinajpur',
    photo: adm.photoUrl || adm.photo || '../assets/images/student-placeholder.jpg',
    photoUrl: adm.photoUrl || adm.photo || '../assets/images/student-placeholder.jpg',
    status: adm.status || 'admitted',
    currentCourse: adm.course || 'JLPT N5 - Beginner',
    course: adm.course || 'JLPT N5 - Beginner',
    courseLevel: courseLevel,
    batch: adm.batch || 'Batch 01 (Upcoming Intake)',
    instructor: adm.instructor || 'Assigned upon class start',
    progressPercent: adm.progressPercent || 0,
    classStartDate: startDate,
    classSchedule: adm.classSchedule || '',
    courseEndDate: endDate,
    courseStatus: courseStatus,
    durationMonths: durationMonths,
    enrolledDurationMonths: durationMonths,
    feeInfo: adm.feeInfo || null,
    payments: Array.isArray(adm.payments) ? adm.payments : [],
    customMonthlyFee: adm.customMonthlyFee !== undefined ? adm.customMonthlyFee : null,
    specialDiscount: adm.specialDiscount || 0,
    examInfo: adm.examInfo || {
      examType: 'JLPT',
      examCenter: 'Dhaka, Bangladesh',
      examDate: '',
      registrationNumber: '',
      score: '',
      resultStatus: 'not_applied',
      certificateUrl: '',
      notes: ''
    },
    nextClass: adm.nextClass || {
      topic: 'Orientation & Class Routine Briefing',
      time: adm.classSchedule || (startDate ? `Starts on ${startDate}` : 'Schedule will be announced soon'),
      room: 'Main Campus & Online'
    },
    attendance: adm.attendance || {
      attended: 0,
      total: 0,
      rate: '100%'
    },
    visaApplication: adm.visaApplication || {
      status: 'Japanese Language Course Phase (Dhaka Exam Planned)',
      step: 1,
      steps: [
        { title: 'Japanese Language Course & Exam (Dhaka)', done: false, date: 'Ongoing' },
        { title: 'Certificate Submission & Assessment', done: false, date: 'Pending' },
        { title: 'Japanese Institute Selection & COE Application', done: false, date: 'Pending' },
        { title: 'COE Issuance & Tuition Transfer', done: false, date: 'Pending' },
        { title: 'Embassy of Japan Visa Stamping', done: false, date: 'Pending' }
      ]
    },
    assignments: adm.assignments || [],
    messages: adm.messages || [
      {
        from: 'Fusion Education Desk',
        text: 'Welcome to Fusion Education BD! Your enrollment has been confirmed.',
        date: new Date().toISOString().split('T')[0]
      }
    ]
  };
}

// ── COURSES CRUD ─────────────────────────────────────────────
app.get('/api/courses', async (req, res) => {
    res.json({ success: true, courses: await readData('courses.json') });
});

const handleSaveCourse = async (req, res) => {
    const courseData = req.body;
    if (!courseData || !courseData.title) {
        return res.status(400).json({ success: false, error: 'Course title is required.' });
    }
    const courses = await readData('courses.json');
    const newCourse = {
        ...courseData,
        id: courseData.id || ('course_' + Date.now()),
        discountType: courseData.discountType || 'none',
        discountValue: courseData.discountValue ? parseFloat(courseData.discountValue) : 0,
        createdAt: new Date().toISOString()
    };
    courses.unshift(newCourse);
    await writeData('courses.json', courses);
    res.json({ success: true, message: 'Course created successfully', course: newCourse, id: newCourse.id });
};

app.post('/api/courses', requireAuth(), handleSaveCourse);
app.post('/api/courses/add', requireAuth(), handleSaveCourse);

app.put('/api/courses/:id', requireAuth(), async (req, res) => {
    const { id } = req.params;
    const courses = await readData('courses.json');
    const index = courses.findIndex(c => String(c.id) === String(id));
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Course not found' });
    }
    courses[index] = {
        ...courses[index],
        ...req.body,
        id,
        updatedAt: new Date().toISOString()
    };
    await writeData('courses.json', courses);
    res.json({ success: true, message: 'Course updated successfully', course: courses[index] });
});

app.delete('/api/courses/:id', requireAuth(), async (req, res) => {
    const { id } = req.params;
    let courses = await readData('courses.json');
    const filtered = courses.filter(c => String(c.id) !== String(id));
    await writeData('courses.json', filtered);
    res.json({ success: true, message: 'Course deleted successfully' });
});

// ── POSTS CRUD ───────────────────────────────────────────────
app.get('/api/posts', async (req, res) => {
    res.json({ success: true, posts: await readData('posts.json') });
});

const handleSavePost = async (req, res) => {
    const posts = await readData('posts.json');
    const newPost = {
        id: req.body.id || ('post_' + Date.now()),
        title: req.body.title || '',
        text: req.body.text || '',
        image: req.body.image || '',
        photoLink: req.body.photoLink || '',
        buttonText: req.body.buttonText || '',
        buttonUrl: req.body.buttonUrl || '',
        layout: req.body.layout || 'horizontal',
        photoSize: req.body.photoSize || 'medium',
        createdAt: new Date().toISOString()
    };
    posts.unshift(newPost);
    await writeData('posts.json', posts);
    res.json({ success: true, message: 'Post created successfully', post: newPost, id: newPost.id });
};

app.post('/api/posts', requireAuth(), handleSavePost);
app.post('/api/posts/add', requireAuth(), handleSavePost);

app.put('/api/posts/:id', requireAuth(), async (req, res) => {
    const { id } = req.params;
    const posts = await readData('posts.json');
    const index = posts.findIndex(p => String(p.id) === String(id));
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Post not found' });
    }
    posts[index] = { ...posts[index], ...req.body, id, updatedAt: new Date().toISOString() };
    await writeData('posts.json', posts);
    res.json({ success: true, message: 'Post updated successfully', post: posts[index] });
});

app.delete('/api/posts/:id', requireAuth(), async (req, res) => {
    const { id } = req.params;
    const posts = await readData('posts.json');
    await writeData('posts.json', posts.filter(p => String(p.id) !== String(id)));
    res.json({ success: true, message: 'Post deleted successfully' });
});

// ── FAQS CRUD ────────────────────────────────────────────────
app.get('/api/faqs', async (req, res) => {
    res.json({ success: true, faqs: await readData('faqs.json') });
});

app.post('/api/faqs', requireAuth(), async (req, res) => {
    const faqs = await readData('faqs.json');
    const newFaq = {
        id: req.body.id || ('faq_' + Date.now()),
        question: req.body.question || '',
        answer: req.body.answer || '',
        category: req.body.category || 'General',
        createdAt: new Date().toISOString()
    };
    faqs.push(newFaq);
    await writeData('faqs.json', faqs);
    res.json({ success: true, message: 'FAQ created successfully', faq: newFaq, id: newFaq.id });
});

app.put('/api/faqs/:id', requireAuth(), async (req, res) => {
    const { id } = req.params;
    const faqs = await readData('faqs.json');
    const index = faqs.findIndex(f => String(f.id) === String(id));
    if (index === -1) return res.status(404).json({ success: false, error: 'FAQ not found' });
    faqs[index] = { ...faqs[index], ...req.body, id };
    await writeData('faqs.json', faqs);
    res.json({ success: true, message: 'FAQ updated successfully', faq: faqs[index] });
});

app.delete('/api/faqs/:id', requireAuth(), async (req, res) => {
    const { id } = req.params;
    const faqs = await readData('faqs.json');
    await writeData('faqs.json', faqs.filter(f => String(f.id) !== String(id)));
    res.json({ success: true, message: 'FAQ deleted successfully' });
});

// ── TESTIMONIALS CRUD ────────────────────────────────────────
app.get('/api/testimonials', async (req, res) => {
    res.json({ success: true, testimonials: await readData('testimonials.json') });
});

app.post('/api/testimonials', requireAuth(), async (req, res) => {
    const testimonials = await readData('testimonials.json');
    const newTestimonial = {
        id: req.body.id || ('test_' + Date.now()),
        name: req.body.name || '',
        course: req.body.course || '',
        rating: req.body.rating || 5,
        quote: req.body.quote || '',
        image: req.body.image || '',
        createdAt: new Date().toISOString()
    };
    testimonials.unshift(newTestimonial);
    await writeData('testimonials.json', testimonials);
    res.json({ success: true, message: 'Testimonial added successfully', testimonial: newTestimonial, id: newTestimonial.id });
});

app.put('/api/testimonials/:id', requireAuth(), async (req, res) => {
    const { id } = req.params;
    const testimonials = await readData('testimonials.json');
    const index = testimonials.findIndex(t => String(t.id) === String(id));
    if (index === -1) return res.status(404).json({ success: false, error: 'Testimonial not found' });
    testimonials[index] = { ...testimonials[index], ...req.body, id };
    await writeData('testimonials.json', testimonials);
    res.json({ success: true, message: 'Testimonial updated successfully', testimonial: testimonials[index] });
});

app.delete('/api/testimonials/:id', requireAuth(), async (req, res) => {
    const { id } = req.params;
    const testimonials = await readData('testimonials.json');
    await writeData('testimonials.json', testimonials.filter(t => String(t.id) !== String(id)));
    res.json({ success: true, message: 'Testimonial deleted successfully' });
});

// ── GALLERY CRUD ─────────────────────────────────────────────
app.get('/api/gallery', async (req, res) => {
    res.json({ success: true, gallery: await readData('gallery.json') });
});

app.post('/api/gallery', requireAuth(), async (req, res) => {
    const gallery = await readData('gallery.json');
    const newItem = {
        id: req.body.id || ('gal_' + Date.now()),
        title: req.body.title || '',
        category: req.body.category || 'General',
        image: req.body.image || '',
        createdAt: new Date().toISOString()
    };
    gallery.unshift(newItem);
    await writeData('gallery.json', gallery);
    res.json({ success: true, message: 'Gallery item added successfully', item: newItem, id: newItem.id });
});

app.delete('/api/gallery/:id', requireAuth(), async (req, res) => {
    const { id } = req.params;
    const gallery = await readData('gallery.json');
    await writeData('gallery.json', gallery.filter(g => String(g.id) !== String(id)));
    res.json({ success: true, message: 'Gallery item deleted successfully' });
});

// ── SETTINGS CRUD ────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
    res.json({ success: true, settings: await readData('settings.json', {}) });
});

app.post('/api/settings', requireAuth('admin'), async (req, res) => {
    const current = await readData('settings.json', {});
    const updated = { ...current, ...req.body };
    await writeData('settings.json', updated);
    res.json({ success: true, message: 'Settings saved successfully', settings: updated });
});

// ── CONTACT MESSAGES CRUD ────────────────────────────────────
app.get('/api/contactMessages', async (req, res) => {
    res.json({ success: true, contactMessages: await readData('contactMessages.json') });
});

app.post('/api/contactMessages', async (req, res) => {
    const messages = await readData('contactMessages.json');
    const newMsg = {
        id: 'msg_' + Date.now(),
        name: req.body.name || '',
        email: req.body.email || '',
        phone: req.body.phone || '',
        subject: req.body.subject || '',
        message: req.body.message || '',
        createdAt: new Date().toISOString()
    };
    messages.unshift(newMsg);
    await writeData('contactMessages.json', messages);
    res.json({ success: true, message: 'Message sent successfully', messageId: newMsg.id });
});

app.delete('/api/contactMessages/:id', requireAuth(), async (req, res) => {
    const { id } = req.params;
    const messages = await readData('contactMessages.json');
    await writeData('contactMessages.json', messages.filter(m => String(m.id) !== String(id)));
    res.json({ success: true, message: 'Message deleted successfully' });
});

// ── ADMISSIONS CRUD ──────────────────────────────────────────
// NOTE: GET/PUT/DELETE for /api/admission(s) are handled by the admission router (routes/admission.js)
// mounted at lines 60-61. No duplicate routes needed here.

// ── Static file serving (uploads only — main static already mounted above) ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ── STUDENT AUTH & PROFILE ENDPOINTS ──────────────────────────────
app.post('/api/student/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ success: false, error: 'Registration number / Email and password are required.' });
  }

  const cleanId = String(identifier).trim().toLowerCase();
  let students = await readData('students.json', []);
  
  // 1. Check in students.json
  let student = students.find(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId) ||
    (s.phone && s.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
  );

  // 2. If not found in students.json, search admissions.json
  if (!student) {
    const admissions = await readData('admissions.json', []);
    const adm = admissions.find(a => 
      (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
      (a.applicationId && a.applicationId.toLowerCase() === cleanId) ||
      (a.id && String(a.id).toLowerCase() === cleanId) ||
      (a.email && a.email.toLowerCase() === cleanId) ||
      (a.phone && a.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
    );

    if (adm) {
      student = buildStudentFromAdmission(adm);
      // Persist to students.json
      students.unshift(student);
      await writeData('students.json', students);
    }
  }

  // 3. Fallback for testing demo accounts (dev mode only)
  if (!student && IS_DEV) {
    if (cleanId === 'demo' || cleanId === 'student' || cleanId === 'fe-2024-001') {
      student = students[0];
    }
  }

  if (!student) {
    return res.status(404).json({ 
      success: false, 
      error: 'Student account not found. Please check your Registration ID / Email or register first.' 
    });
  }

  // Verify password
  let passwordValid = false;
  if (student.password) {
    passwordValid = await verifyPassword(password, student.password);
  }
  // In development mode only, allow demo passwords for testing
  if (!passwordValid && IS_DEV) {
    const demoPasswords = ['password123', '123456', 'student123'];
    passwordValid = demoPasswords.includes(password);
  }

  if (!passwordValid) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid password. Please check your password.' 
    });
  }

  // Set session cookie
  res.cookie('fusion_student_id', student.identifier, { 
    httpOnly: true, 
    sameSite: 'none', secure: true,
    maxAge: 86400000 
  });

  return res.json({ 
    success: true, 
    student: {
      identifier: student.identifier,
      email: student.email,
      fullName: student.fullName,
      photo: student.photo,
      status: student.status,
      currentCourse: student.currentCourse,
      branch: student.branch
    }, 
    redirect: '/pages/student-dashboard.html' 
  });
});

app.get('/api/student/profile', async (req, res) => {
  const identifier = req.query.identifier || req.cookies.fusion_student_id;
  const students = await readData('students.json', []);
  
  if (!identifier) {
    return res.status(400).json({ success: false, error: 'Missing student identifier. Please log in.' });
  }

  const cleanId = String(identifier).trim().toLowerCase();
  let student = students.find(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId) ||
    (s.phone && s.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
  );

  // If not found in students.json, check admissions.json
  if (!student) {
    const admissions = await readData('admissions.json', []);
    const adm = admissions.find(a => 
      (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
      (a.applicationId && a.applicationId.toLowerCase() === cleanId) ||
      (a.id && String(a.id).toLowerCase() === cleanId) ||
      (a.email && a.email.toLowerCase() === cleanId) ||
      (a.phone && a.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
    );

    if (adm) {
      student = buildStudentFromAdmission(adm);
      students.unshift(student);
      await writeData('students.json', students);
    }
  }

  if (!student) {
    return res.status(404).json({ success: false, error: 'Student profile not found.' });
  }

  return res.json({ success: true, student });
});

app.put('/api/student/profile', async (req, res) => {
  const identifier = req.body.identifier || req.cookies.fusion_student_id;
  if (!identifier) {
    return res.status(400).json({ success: false, error: 'Missing student identifier.' });
  }

  const students = await readData('students.json', []);
  const cleanId = String(identifier).trim().toLowerCase();
  const index = students.findIndex(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId) ||
    (s.phone && s.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
  );

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Student not found.' });
  }

  const allowed = ['phone', 'address', 'bloodGroup', 'fullName', 'photo'];
  allowed.forEach(field => {
    if (req.body[field] !== undefined) {
      students[index][field] = req.body[field];
    }
  });

  await writeData('students.json', students);
  return res.json({ success: true, message: 'Profile updated successfully', student: students[index] });
});

app.post('/api/student/submit-exam-result', async (req, res) => {
  const { identifier, studentId, id, examType, examDate, registrationNumber, rollNumber, score, resultStatus, certificateUrl, notes } = req.body;
  const targetId = identifier || studentId || id || req.cookies?.fusion_student_id;

  if (!targetId) {
    return res.status(400).json({ success: false, error: 'Student identifier is required.' });
  }

  if (!examType || !resultStatus) {
    return res.status(400).json({ success: false, error: 'Exam type (JLPT/NAT-TEST) and result status (passed/failed) are required.' });
  }

  const students = await readData('students.json', []);
  const admissions = await readData('admissions.json', []);
  const cleanId = String(targetId).trim().toLowerCase();

  let sIdx = students.findIndex(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId) ||
    (s.id && String(s.id).toLowerCase() === cleanId) ||
    (s.applicationNumber && s.applicationNumber.toLowerCase() === cleanId)
  );

  let aIdx = admissions.findIndex(a => 
    (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
    (a.applicationId && a.applicationId.toLowerCase() === cleanId) ||
    (a.id && String(a.id).toLowerCase() === cleanId) ||
    (a.email && a.email.toLowerCase() === cleanId)
  );

  if (sIdx === -1 && aIdx === -1) {
    return res.status(404).json({ success: false, error: 'Student record not found.' });
  }

  if (sIdx === -1 && aIdx !== -1) {
    const stRecord = buildStudentFromAdmission(admissions[aIdx]);
    students.unshift(stRecord);
    sIdx = 0;
  }

  const nowIso = new Date().toISOString();
  const examRecord = {
    examType: examType || 'JLPT',
    examCenter: 'Dhaka, Bangladesh',
    examDate: examDate || nowIso.split('T')[0],
    registrationNumber: registrationNumber || rollNumber || '',
    score: score || 'Passed',
    resultStatus: resultStatus || 'passed',
    certificateUrl: certificateUrl || '',
    notes: notes || '',
    submittedAt: nowIso
  };

  students[sIdx].examInfo = examRecord;

  // If passed, activate and update the Japan Visa & COE Roadmap!
  if (resultStatus === 'passed') {
    students[sIdx].courseStatus = 'graduated';
    students[sIdx].status = 'graduated';
    
    students[sIdx].visaApplication = {
      status: 'Japanese Institute Selection & COE Application in Progress',
      university: students[sIdx].visaApplication?.university || 'Tokyo International Language Academy',
      intake: students[sIdx].visaApplication?.intake || 'October 2026 Intake',
      step: 3,
      steps: [
        { title: 'JLPT / NAT-TEST Official Exam (Dhaka)', done: true, date: examDate || nowIso.split('T')[0] },
        { title: 'Official Certificate Verified & Assessed', done: true, date: nowIso.split('T')[0] },
        { title: 'Japanese Institute Selection & COE Application', done: false, date: 'In Progress' },
        { title: 'COE Issuance & Tuition Transfer to Japan', done: false, date: 'Pending' },
        { title: 'Embassy of Japan Visa Stamping & Departure', done: false, date: 'Pending' }
      ]
    };
  }

  students[sIdx].updatedAt = nowIso;
  await writeData('students.json', students);

  if (aIdx !== -1) {
    admissions[aIdx].examInfo = examRecord;
    if (resultStatus === 'passed') {
      admissions[aIdx].status = 'graduated';
      admissions[aIdx].courseStatus = 'graduated';
    }
    admissions[aIdx].updatedAt = nowIso;
    await writeData('admissions.json', admissions);
  }

  res.json({
    success: true,
    message: resultStatus === 'passed' 
      ? 'অভিনন্দন! আপনার অফিসিয়াল পরীক্ষার ফলাফল ও সার্টিফিকেট সফলভাবে জমা হয়েছে। জাপান ভিসা ও COE প্রসেসিং শুরু করা হয়েছে।'
      : 'পরীক্ষার তথ্য সফলভাবে সংরক্ষিত হয়েছে।',
    examInfo: examRecord,
    student: students[sIdx]
  });
});

app.post('/api/student/logout', async (req, res) => {
  res.clearCookie('fusion_student_id');
  res.json({ success: true, message: 'Logged out successfully' });
});

// ── STAFF / INSTRUCTOR LOGIN ─────────────────────────────────
app.post('/api/staff/login', async (req, res) => {
  const { email, password, branch, loginType } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  
  // 1. Check Super Admin from settings.json
  const settings = await readData('settings.json', {});
  if (settings.adminUser && cleanEmail === settings.adminUser.email.toLowerCase()) {
    if (password === settings.adminUser.password) {
      res.cookie('fusion_admin_session', 'true', { httpOnly: false, sameSite: 'none', secure: true, maxAge: 86400000 });
      res.cookie('fusion_admin_email', settings.adminUser.email, { httpOnly: false, sameSite: 'none', secure: true, maxAge: 86400000 });
      res.cookie('fusion_staff_role', 'admin', { httpOnly: false, sameSite: 'none', secure: true, maxAge: 86400000 });
      await recordAuditLog('user_login', 'Logged in via Admin portal (Super Admin)', 'user', 'usr_main_admin', 'Main Administrator', { email });
      return res.json({ success: true, redirect: loginType === 'staff' ? 'dashboard.html' : 'admin/dashboard.html' });
    } else {
      return res.status(401).json({ success: false, error: 'Invalid password. Please check your credentials.' });
    }
  }

  // 2. Check Staff / Instructors
  const users = await readData('users.json', []);
  let activeUser = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);

  // Fallback to staff.json if not in users.json
  if (!activeUser) {
    const staffList = await readData('staff.json', []);
    activeUser = staffList.find(s => s.email && s.email.toLowerCase() === cleanEmail);
  }

  // User must exist in the system
  if (!activeUser) {
    return res.status(401).json({ success: false, error: 'Account not found. Please contact your administrator.' });
  }

  // Verify password
  let passwordValid = false;
  if (activeUser.password) {
    passwordValid = await verifyPassword(password, activeUser.password);
  }
  // In development mode only, allow demo passwords for testing
  if (!passwordValid && IS_DEV) {
    const demoPasswords = ['staff123', 'password123', 'admin123', '123456'];
    passwordValid = demoPasswords.includes(password);
  }

  if (!passwordValid) {
    return res.status(401).json({ success: false, error: 'Invalid password. Please check your credentials.' });
  }

  const userRecord = activeUser;
  
  // Validate Branch Access
  if (userRecord.branch && userRecord.branch !== 'All Branches' && branch && userRecord.branch !== branch) {
    return res.status(403).json({ success: false, error: `Access denied. You are assigned to the ${userRecord.branch} branch.` });
  }

  const userBranch = branch || userRecord.branch || 'Dinajpur';

  // Staff cookies need httpOnly:false so client JS (dashboard) can read them for UI
  res.cookie('fusion_staff_email', userRecord.email, { httpOnly: false, sameSite: 'none', secure: true, maxAge: 86400000 });
  res.cookie('fusion_staff_branch', userBranch, { httpOnly: false, sameSite: 'none', secure: true, maxAge: 86400000 });
  res.cookie('fusion_staff_role', userRecord.role || 'staff', { httpOnly: false, sameSite: 'none', secure: true, maxAge: 86400000 });

  await recordAuditLog('user_login', `Logged in via Staff/Instructor portal (${userRecord.role})`, 'user', userRecord.id, userRecord.name, {
    name: userRecord.name,
    email: userRecord.email,
    role: userRecord.role,
    branch: userBranch
  });

  return res.json({ 
    success: true, 
    staff: { 
      id: userRecord.id,
      name: userRecord.name, 
      email: userRecord.email, 
      branch: userBranch, 
      role: userRecord.role || 'staff',
      permissions: userRecord.permissions || []
    },
    redirect: 'dashboard.html' 
  });
});

app.get('/api/staff/me', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (user) {
    return res.json({
      success: true,
      authenticated: true,
      id: user.id,
      name: user.name,
      email: user.email,
      branch: user.branch,
      role: user.role,
      permissions: user.permissions || []
    });
  }

  const email = req.cookies.fusion_staff_email;
  const branch = req.cookies.fusion_staff_branch;
  if (!email) {
    return res.json({
      success: true,
      authenticated: false
    });
  }

  const users = await readData('users.json', []);
  const staff = users.find(s => s.email && s.email.toLowerCase() === email.toLowerCase());
  if (!staff) {
    return res.json({
      success: true,
      authenticated: false
    });
  }

  return res.json({
    success: true,
    authenticated: true,
    id: staff.id || 'usr_staff',
    name: staff.name,
    email: staff.email,
    branch: branch || staff.branch || 'Dinajpur',
    role: staff.role || 'staff',
    permissions: staff.permissions || []
  });
});

app.get('/api/staff/students', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  let branch = req.query.branch || (user ? user.branch : req.cookies.fusion_staff_branch) || 'all';

  // Branch Isolation: If non-admin user is restricted to a specific branch and doesn't have view_all_branches permission, enforce user's branch
  if (user && user.role !== 'admin' && user.branch && user.branch.toLowerCase() !== 'all' && !await hasPermission(user, 'view_all_branches') && !await hasPermission(user, '*')) {
    branch = user.branch;
  }

  const admissions = await readData('admissions.json', []);
  const students = await readData('students.json', []);

  // Build a lookup map of students.json keyed by identifier, applicationNumber, and id
  const studentMap = new Map();
  await Promise.all(students.map(async s => {
    if (s.identifier) studentMap.set(String(s.identifier).toLowerCase().trim(), s);
    if (s.applicationNumber) studentMap.set(String(s.applicationNumber).toLowerCase().trim(), s);
    if (s.id) studentMap.set(String(s.id).toLowerCase().trim(), s);
  }));

  const todayStr = new Date().toISOString().split('T')[0];

  let list = await Promise.all(admissions.map(async a => {
    const key = String(a.applicationNumber || a.id || '').toLowerCase().trim();
    const st = studentMap.get(key) || {};

    const rawCourse = st.currentCourse || a.course || 'JLPT N5 - Beginner';
    const courseLevel = st.courseLevel || a.courseLevel || (rawCourse.includes('N4') ? 'N4' : (rawCourse.includes('N3') ? 'N3' : 'N5'));

    const classStartDate = st.classStartDate || a.classStartDate || '';
    let courseEndDate = st.courseEndDate || a.courseEndDate || '';
    if (classStartDate && !courseEndDate) {
      courseEndDate = calculateCourseEndDate(classStartDate, calculateCourseDurationMonths(courseLevel));
    }

    let courseStatus = st.courseStatus || a.courseStatus || (st.status === 'graduated' || a.status === 'graduated' ? 'completed' : 'enrolled');
    if (classStartDate && courseEndDate && courseStatus !== 'completed') {
      if (todayStr > courseEndDate) {
        courseStatus = 'awaiting_completion';
      } else if (todayStr >= classStartDate) {
        courseStatus = 'ongoing';
      } else {
        courseStatus = 'upcoming';
      }
    }

    let validSubmittedAt = st.enrollmentDate || a.submittedAt || a.createdAt;
    if (validSubmittedAt) {
      const d = new Date(validSubmittedAt);
      if (isNaN(d.getTime()) || d.getFullYear() > 2100 || d.getFullYear() < 2000) {
        validSubmittedAt = new Date().toISOString();
      }
    } else {
      validSubmittedAt = new Date().toISOString();
    }

    const merged = {
      id: a.id || a.applicationNumber || st.identifier,
      applicationNumber: a.applicationNumber || a.id || st.identifier,
      fullName: st.fullName || a.fullName || 'Student',
      email: st.email || a.email || '',
      phone: st.phone || a.phone || '',
      dateOfBirth: st.dateOfBirth || a.dateOfBirth || '',
      gender: st.gender || a.gender || '',
      address: st.address || a.address || '',
      city: st.city || a.city || '',
      district: st.district || a.district || '',
      highestEducation: st.highestEducation || a.highestEducation || '',
      course: rawCourse,
      courseId: st.courseId || a.courseId || '',
      courseLevel: courseLevel,
      batch: st.batch || a.batch || 'Batch 01',
      branch: st.branch || a.branch || 'Dinajpur',
      japaneseExperience: a.japaneseExperience || 'None',
      visaType: a.visaType || 'student',
      emergencyName: a.emergencyName || '',
      emergencyPhone: a.emergencyPhone || '',
      comment: a.comment || st.notes || '',
      notes: st.notes || a.notes || a.comment || '',
      status: st.status || a.status || 'pending',
      classStartDate,
      classSchedule: st.classSchedule || a.classSchedule || '',
      courseEndDate,
      courseStatus,
      examInfo: st.examInfo || a.examInfo || null,
      feeInfo: st.feeInfo || a.feeInfo || null,
      customMonthlyFee: st.customMonthlyFee !== undefined ? st.customMonthlyFee : a.customMonthlyFee,
      payments: (st.payments && st.payments.length ? st.payments : a.payments) || [],
      photoUrl: st.photo || a.photoUrl || '',
      documentPreview: st.photo || a.photoUrl || '../assets/images/student-placeholder.jpg',
      documentUrls: a.documentUrls || [],
      documents: a.documents || [],
      submittedAt: validSubmittedAt
    };

    merged.fees = await calculateStudentFees(merged);
      return merged;
    }));

  // Merge students.json records that weren't in admissions, preventing duplicates by ID and phone
  if (students.length > 0) {
    const existingIds = new Set(list.map(s => String(s.applicationNumber || s.id).toLowerCase().trim()));
    const existingPhones = new Set(list.map(s => String(s.phone || '').replace(/\D/g, '')).filter(Boolean));
    await Promise.all(students.map(async s => {
      const sId = String(s.identifier || s.id || s.applicationNumber || '').toLowerCase().trim();
      const sPhone = String(s.phone || '').replace(/\D/g, '');
      if (sId && !existingIds.has(sId) && (!sPhone || !existingPhones.has(sPhone))) {
        existingIds.add(sId);
        if (sPhone) existingPhones.add(sPhone);

        const rawCourse = s.currentCourse || s.course || 'JLPT N5';
        const courseLevel = s.courseLevel || (rawCourse.includes('N4') ? 'N4' : (rawCourse.includes('N3') ? 'N3' : 'N5'));
        const classStartDate = s.classStartDate || '';
        let courseEndDate = s.courseEndDate || '';
        if (classStartDate && !courseEndDate) {
          courseEndDate = calculateCourseEndDate(classStartDate, calculateCourseDurationMonths(courseLevel));
        }

        let courseStatus = s.courseStatus || (s.status === 'graduated' ? 'completed' : 'enrolled');
        if (classStartDate && courseEndDate && courseStatus !== 'completed') {
          if (todayStr > courseEndDate) {
            courseStatus = 'awaiting_completion';
          } else if (todayStr >= classStartDate) {
            courseStatus = 'ongoing';
          } else {
            courseStatus = 'upcoming';
          }
        }

        let sSubmittedAt = s.enrollmentDate || s.submittedAt;
        if (sSubmittedAt) {
          const d = new Date(sSubmittedAt);
          if (isNaN(d.getTime()) || d.getFullYear() > 2100 || d.getFullYear() < 2000) {
            sSubmittedAt = new Date().toISOString();
          }
        } else {
          sSubmittedAt = new Date().toISOString();
        }

        const fees = await calculateStudentFees(s);
        list.push({
          id: s.identifier || s.id,
          applicationNumber: s.identifier || s.id,
          fullName: s.fullName,
          email: s.email,
          phone: s.phone,
          course: rawCourse,
          courseId: s.courseId || '',
          courseLevel: courseLevel,
          batch: s.batch || 'Batch 01',
          branch: s.branch || 'Dinajpur',
          status: s.status || 'admitted',
          classStartDate,
          classSchedule: s.classSchedule || '',
          courseEndDate,
          courseStatus,
          examInfo: s.examInfo || null,
          customMonthlyFee: s.customMonthlyFee !== undefined ? s.customMonthlyFee : null,
          payments: s.payments || [],
          fees: fees,
          notes: 'Enrolled Student',
          photoUrl: s.photo || '',
          documentPreview: s.photo || '../assets/images/student-placeholder.jpg',
          submittedAt: sSubmittedAt
        });
      }
    }));
  }

  // Filter by branch if not 'all'
  if (branch && branch.toLowerCase() !== 'all') {
    list = list.filter(s => s.branch && s.branch.toLowerCase() === branch.toLowerCase());
  }

  return res.json({ success: true, branch, students: list });
});

// ── WALK-IN STUDENT REGISTRATION (MANUAL ADD / PAPER CONVERSION) ──
app.post('/api/staff/students', handleUpload, async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (user && user.role !== 'admin' && !await hasPermission(user, 'manage_admissions')) {
    return res.status(403).json({ success: false, error: 'Permission denied: manage_admissions required' });
  }

  const {
    fullName, phone, email, course, branch, status, batch, city, notes, admissionDate,
    fatherName, motherName, dateOfBirth, gender, bloodGroup, religion, nidBirthCert,
    occupation, highestEducation, presentAddress, permanentAddress, district,
    emergencyName, emergencyRelation, emergencyPhone, courseLevel
  } = req.body;

  if (!fullName) {
    return res.status(400).json({ success: false, error: 'Student full name is required.' });
  }

  const students = await readData('students.json', []);
  const admissions = await readData('admissions.json', []);

  // Determine admission date: custom past date from paper record or auto-current
  let dateIso = new Date().toISOString();
  if (admissionDate && !isNaN(new Date(admissionDate).getTime())) {
    dateIso = new Date(admissionDate).toISOString();
  }

  const newAppNum = req.body.applicationNumber || req.body.id || `FEBD-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
  const targetBranch = branch || (user ? user.branch : 'Dinajpur');

  // Handle Photo upload if provided
  let photoUrl = '../assets/images/student-placeholder.jpg';
  if (req.files && req.files.photo && req.files.photo[0]) {
    try {
      const savedPhoto = await saveUploadedFile(req.files.photo[0], 'photos');
      if (savedPhoto) photoUrl = savedPhoto;
    } catch (err) {
      console.error('Photo save error:', err);
    }
  } else if (req.body.photoUrl && req.body.photoUrl.trim()) {
    photoUrl = req.body.photoUrl.trim();
  }

  // Handle Document uploads (Certificates, NID, Passport, Paper Admission Form scans)
  const documents = [];
  const documentUrls = [];

  // 1. Files uploaded via multipart
  const rawDocs = [
    ...(req.files?.documents || []),
    ...(req.files?.educationDoc || []),
    ...(req.files?.educationDocs || [])
  ];

  let docNames = req.body.documentNames || req.body.documentTitles;
  if (typeof docNames === 'string') {
    try { docNames = JSON.parse(docNames); } catch (_) { docNames = [docNames]; }
  }
  if (!Array.isArray(docNames)) docNames = [];

  for (let i = 0; i < rawDocs.length; i++) {
    const docFile = rawDocs[i];
    try {
      const url = await saveUploadedFile(docFile, 'documents');
      if (url) {
        documentUrls.push(url);
        const customName = docNames[i] || docFile.originalname || `Document ${i + 1}`;
        documents.push({
          id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: customName,
          originalName: docFile.originalname,
          url: url,
          size: docFile.size,
          type: docFile.mimetype,
          uploadedAt: new Date().toISOString()
        });
      }
    } catch (docErr) {
      console.error('Doc save error:', docErr);
    }
  }

  // 2. Any existing documents passed in payload
  if (req.body.existingDocuments) {
    let parsedExisting = [];
    try {
      parsedExisting = typeof req.body.existingDocuments === 'string'
        ? JSON.parse(req.body.existingDocuments)
        : req.body.existingDocuments;
    } catch (_) {}
    if (Array.isArray(parsedExisting)) {
      parsedExisting.forEach(d => {
        if (d && d.url) {
          documents.push(d);
          documentUrls.push(d.url);
        }
      });
    }
  }

  const chosenLevel = courseLevel || (course && course.includes('N4') ? 'N4' : (course && course.includes('N3') ? 'N3' : 'N5'));
  const durationMonths = calculateCourseDurationMonths(chosenLevel);

  const newStudent = {
    identifier: newAppNum,
    id: newAppNum,
    applicationNumber: newAppNum,
    applicationId: newAppNum,
    fullName: fullName.trim(),
    fatherName: (fatherName || '').trim(),
    motherName: (motherName || '').trim(),
    dateOfBirth: dateOfBirth || '',
    gender: gender || '',
    bloodGroup: bloodGroup || '',
    religion: religion || '',
    nidBirthCert: (nidBirthCert || req.body.nid || '').trim(),
    occupation: occupation || 'Student',
    highestEducation: (highestEducation || '').trim(),
    email: (email || '').trim().toLowerCase(),
    phone: (phone || '').trim(),
    currentCourse: course || 'JLPT N5',
    course: course || 'JLPT N5',
    courseLevel: chosenLevel,
    branch: targetBranch,
    status: status === 'admitted' ? 'admitted' : (status || 'pending'),
    batch: (batch || 'Batch 01').trim(),
    city: (city || district || '').trim(),
    address: (presentAddress || city || '').trim(),
    presentAddress: (presentAddress || '').trim(),
    permanentAddress: (permanentAddress || '').trim(),
    district: (district || city || '').trim(),
    emergencyName: (emergencyName || '').trim(),
    emergencyRelation: emergencyRelation || 'Father',
    emergencyPhone: (emergencyPhone || '').trim(),
    notes: notes || '',
    comment: notes || '',
    photo: photoUrl,
    photoUrl: photoUrl,
    documents: documents,
    documentUrls: documentUrls,
    documentUrl: documentUrls[0] || null,
    submittedAt: dateIso,
    enrollmentDate: dateIso,
    admissionDate: admissionDate || dateIso.split('T')[0],
    createdAt: dateIso,
    courseStatus: status === 'admitted' ? 'enrolled' : 'pending',
    classStartDate: dateIso.split('T')[0],
    courseEndDate: calculateCourseEndDate(dateIso.split('T')[0], durationMonths),
    payments: []
  };

  students.unshift(newStudent);
  await writeData('students.json', students);

  // Sync to admissions.json
  const admRecord = {
    ...newStudent,
    submittedAt: dateIso
  };
  admissions.unshift(admRecord);
  await writeData('admissions.json', admissions);

  await recordAuditLog('student_registered', `Registered walk-in student ${newStudent.fullName} (${newAppNum}) for ${newStudent.branch}`, 'student', newAppNum, newStudent.fullName, user || { name: 'Staff Member', role: 'staff', branch: targetBranch });

  res.json({
    success: true,
    message: 'Student registered successfully',
    student: newStudent
  });
});

// ── ATTACH ADDITIONAL DOCUMENTS TO EXISTING STUDENT ───────────────
app.post('/api/staff/students/:id/documents', handleUpload, async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (user && user.role !== 'admin' && !await hasPermission(user, 'manage_admissions') && !await hasPermission(user, 'edit_students')) {
    return res.status(403).json({ success: false, error: 'Permission denied: manage_admissions or edit_students required' });
  }

  const { id } = req.params;
  const cleanId = String(id).trim().toLowerCase();

  const rawDocs = [
    ...(req.files?.documents || []),
    ...(req.files?.educationDoc || []),
    ...(req.files?.educationDocs || [])
  ];

  if (rawDocs.length === 0) {
    return res.status(400).json({ success: false, error: 'No document files provided to upload.' });
  }

  const students = await readData('students.json', []);
  const admissions = await readData('admissions.json', []);

  let sIdx = students.findIndex(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.id && String(s.id).toLowerCase() === cleanId) ||
    (s.applicationNumber && s.applicationNumber.toLowerCase() === cleanId) ||
    (s.applicationId && s.applicationId.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId)
  );

  let aIdx = admissions.findIndex(a => 
    (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
    (a.applicationId && a.applicationId.toLowerCase() === cleanId) ||
    (a.id && String(a.id).toLowerCase() === cleanId) ||
    (a.email && a.email.toLowerCase() === cleanId)
  );

  if (sIdx === -1 && aIdx === -1) {
    return res.status(404).json({ success: false, error: 'Student record not found.' });
  }

  // If in admissions but not students, build student
  if (sIdx === -1 && aIdx !== -1) {
    const built = buildStudentFromAdmission(admissions[aIdx]);
    students.unshift(built);
    sIdx = 0;
  }

  const targetStudent = students[sIdx];
  if (!Array.isArray(targetStudent.documents)) targetStudent.documents = [];
  if (!Array.isArray(targetStudent.documentUrls)) targetStudent.documentUrls = [];

  let customTitles = req.body.documentNames || req.body.documentTitle || req.body.documentName;
  if (typeof customTitles === 'string') {
    try { customTitles = JSON.parse(customTitles); } catch (_) { customTitles = [customTitles]; }
  }
  if (!Array.isArray(customTitles)) customTitles = [];

  const addedDocs = [];

  for (let i = 0; i < rawDocs.length; i++) {
    const docFile = rawDocs[i];
    try {
      const url = await saveUploadedFile(docFile, 'documents');
      if (url) {
        const docObj = {
          id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: customTitles[i] || req.body.documentName || docFile.originalname || `Document ${targetStudent.documents.length + 1}`,
          originalName: docFile.originalname,
          url: url,
          size: docFile.size,
          type: docFile.mimetype,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user ? `${user.name} (${user.role})` : 'Staff'
        };
        targetStudent.documents.push(docObj);
        targetStudent.documentUrls.push(url);
        if (!targetStudent.documentUrl) targetStudent.documentUrl = url;
        addedDocs.push(docObj);
      }
    } catch (uploadErr) {
      console.error('Document save error:', uploadErr);
    }
  }

  targetStudent.updatedAt = new Date().toISOString();
  await writeData('students.json', students);

  if (aIdx !== -1) {
    admissions[aIdx].documents = targetStudent.documents;
    admissions[aIdx].documentUrls = targetStudent.documentUrls;
    admissions[aIdx].documentUrl = targetStudent.documentUrl;
    admissions[aIdx].updatedAt = targetStudent.updatedAt;
    await writeData('admissions.json', admissions);
  }

  await recordAuditLog('document_uploaded', `Attached ${addedDocs.length} document(s) to ${targetStudent.fullName} (${cleanId})`, 'student', cleanId, targetStudent.fullName, user);

  res.json({
    success: true,
    message: `${addedDocs.length} document(s) attached successfully.`,
    documents: targetStudent.documents,
    addedDocuments: addedDocs,
    student: targetStudent
  });
});

// ── REMOVE ATTACHED DOCUMENT FROM STUDENT ─────────────────────────
app.delete('/api/staff/students/:id/documents/:docIndex', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (user && user.role !== 'admin' && !await hasPermission(user, 'manage_admissions') && !await hasPermission(user, 'edit_students')) {
    return res.status(403).json({ success: false, error: 'Permission denied: manage_admissions required' });
  }

  const { id, docIndex } = req.params;
  const cleanId = String(id).trim().toLowerCase();
  const idx = parseInt(docIndex, 10);

  const students = await readData('students.json', []);
  const admissions = await readData('admissions.json', []);

  let sIdx = students.findIndex(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.id && String(s.id).toLowerCase() === cleanId) ||
    (s.applicationNumber && s.applicationNumber.toLowerCase() === cleanId)
  );

  let aIdx = admissions.findIndex(a => 
    (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
    (a.id && String(a.id).toLowerCase() === cleanId)
  );

  if (sIdx === -1 && aIdx === -1) {
    return res.status(404).json({ success: false, error: 'Student record not found.' });
  }

  if (sIdx !== -1) {
    const student = students[sIdx];
    if (Array.isArray(student.documents) && idx >= 0 && idx < student.documents.length) {
      student.documents.splice(idx, 1);
    }
    if (Array.isArray(student.documentUrls) && idx >= 0 && idx < student.documentUrls.length) {
      student.documentUrls.splice(idx, 1);
    }
    student.documentUrl = (student.documentUrls && student.documentUrls[0]) || null;
    student.updatedAt = new Date().toISOString();
    await writeData('students.json', students);
  }

  if (aIdx !== -1) {
    const adm = admissions[aIdx];
    if (Array.isArray(adm.documents) && idx >= 0 && idx < adm.documents.length) {
      adm.documents.splice(idx, 1);
    }
    if (Array.isArray(adm.documentUrls) && idx >= 0 && idx < adm.documentUrls.length) {
      adm.documentUrls.splice(idx, 1);
    }
    adm.documentUrl = (adm.documentUrls && adm.documentUrls[0]) || null;
    adm.updatedAt = new Date().toISOString();
    await writeData('admissions.json', admissions);
  }

  await recordAuditLog('document_deleted', `Removed document #${idx + 1} from student (${cleanId})`, 'student', cleanId, cleanId, user);

  const updatedDocs = sIdx !== -1 ? students[sIdx].documents : (aIdx !== -1 ? admissions[aIdx].documents : []);
  res.json({
    success: true,
    message: 'Document removed successfully.',
    documents: updatedDocs
  });
});

// ── UPDATE STUDENT PROFILE OR STATUS ──────────────────────────────
app.put('/api/staff/students/:id', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  const { id } = req.params;
  const cleanId = String(id).trim().toLowerCase();

  const students = await readData('students.json', []);
  const admissions = await readData('admissions.json', []);

  let sIdx = students.findIndex(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.id && String(s.id).toLowerCase() === cleanId) ||
    (s.applicationNumber && s.applicationNumber.toLowerCase() === cleanId) ||
    (s.applicationId && s.applicationId.toLowerCase() === cleanId)
  );

  let aIdx = admissions.findIndex(a => 
    (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
    (a.applicationId && a.applicationId.toLowerCase() === cleanId) ||
    (a.id && String(a.id).toLowerCase() === cleanId) ||
    (a.email && a.email.toLowerCase() === cleanId)
  );

  if (sIdx === -1 && aIdx === -1) {
    return res.status(404).json({ success: false, error: 'Student record not found.' });
  }

  // If status is being modified to admitted, verify permission
  const isAdmitting = req.body.status && (req.body.status === 'admitted' || req.body.status === 'approved');
  if (isAdmitting) {
    if (user && user.role !== 'admin' && !await hasPermission(user, 'manage_admissions')) {
      return res.status(403).json({ success: false, error: 'Permission denied: manage_admissions required to admit student' });
    }
  }

  // Auto-calculate courseEndDate if classStartDate provided
  if (req.body.classStartDate) {
    const existingRec = sIdx !== -1 ? students[sIdx] : admissions[aIdx];
    const courseLevel = req.body.courseLevel || existingRec.courseLevel || 'N5';
    const durationMonths = calculateCourseDurationMonths(courseLevel);
    if (!req.body.courseEndDate) {
      req.body.courseEndDate = calculateCourseEndDate(req.body.classStartDate, durationMonths);
    }
  }

  // If being admitted and not yet in students.json, create record in students.json
  if (sIdx === -1 && aIdx !== -1 && isAdmitting) {
    const studentRecord = buildStudentFromAdmission({ ...admissions[aIdx], ...req.body, status: 'admitted' });
    students.unshift(studentRecord);
    sIdx = 0;
  }

  // Update in students.json
  if (sIdx !== -1) {
    students[sIdx] = {
      ...students[sIdx],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    if (req.body.classSchedule && students[sIdx].nextClass) {
      students[sIdx].nextClass.time = req.body.classSchedule;
    }
    await writeData('students.json', students);
  }

  // Update in admissions.json
  if (aIdx !== -1) {
    admissions[aIdx] = {
      ...admissions[aIdx],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    await writeData('admissions.json', admissions);
  }

  const updatedRec = sIdx !== -1 ? students[sIdx] : admissions[aIdx];
  await recordAuditLog('student_updated', `Updated student profile ${updatedRec.fullName || cleanId}`, 'student', cleanId, updatedRec.fullName || cleanId, user);

  res.json({
    success: true,
    message: 'Student record updated successfully',
    student: updatedRec
  });
});

// ── APPROVE COURSE COMPLETION / GRADUATION ────────────────────────
app.post('/api/staff/students/:id/approve-completion', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (user && user.role !== 'admin' && !await hasPermission(user, 'manage_admissions') && !await hasPermission(user, 'edit_students')) {
    return res.status(403).json({ success: false, error: 'Permission denied: manage_admissions or edit_students required' });
  }

  const { id } = req.params;
  const cleanId = String(id).trim().toLowerCase();

  const students = await readData('students.json', []);
  const admissions = await readData('admissions.json', []);

  let sIdx = students.findIndex(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.id && String(s.id).toLowerCase() === cleanId) ||
    (s.applicationNumber && s.applicationNumber.toLowerCase() === cleanId) ||
    (s.applicationId && s.applicationId.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId)
  );

  let aIdx = admissions.findIndex(a => 
    (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
    (a.applicationId && a.applicationId.toLowerCase() === cleanId) ||
    (a.id && String(a.id).toLowerCase() === cleanId) ||
    (a.email && a.email.toLowerCase() === cleanId)
  );

  if (sIdx === -1 && aIdx === -1) {
    return res.status(404).json({ success: false, error: 'Student record not found.' });
  }

  // If not yet in students.json, construct it
  if (sIdx === -1 && aIdx !== -1) {
    const stRecord = buildStudentFromAdmission(admissions[aIdx]);
    students.unshift(stRecord);
    sIdx = 0;
  }

  const nowIso = new Date().toISOString();
  const completionData = {
    courseStatus: 'completed',
    status: 'graduated',
    completedAt: nowIso,
    completionApprovedBy: user ? `${user.name} (${user.role})` : 'Staff Admin',
    updatedAt: nowIso
  };

  const existingSteps = students[sIdx].visaApplication?.steps || [];
  const updatedSteps = existingSteps.length > 0
    ? existingSteps.map((st, i) => i === 0 ? { ...st, done: true, date: nowIso.split('T')[0] } : st)
    : [
        { title: 'Japanese Language Course & Exam (Dhaka)', done: true, date: nowIso.split('T')[0] },
        { title: 'Certificate Submission & Assessment', done: false, date: 'Pending' },
        { title: 'Japanese Institute Selection & COE Application', done: false, date: 'Pending' },
        { title: 'COE Issuance & Tuition Transfer', done: false, date: 'Pending' },
        { title: 'Embassy of Japan Visa Stamping', done: false, date: 'Pending' }
      ];

  students[sIdx] = {
    ...students[sIdx],
    ...completionData,
    visaApplication: {
      ...(students[sIdx].visaApplication || {}),
      status: 'Japanese Language Course Completed - Ready for JLPT/NAT in Dhaka',
      step: 2,
      steps: updatedSteps
    }
  };
  await writeData('students.json', students);

  if (aIdx !== -1) {
    admissions[aIdx] = {
      ...admissions[aIdx],
      ...completionData
    };
    await writeData('admissions.json', admissions);
  }

  await recordAuditLog('student_graduated', `Approved course completion & graduation for ${students[sIdx].fullName} (${students[sIdx].identifier})`, 'student', students[sIdx].identifier, students[sIdx].fullName, user);

  res.json({
    success: true,
    message: `Course completion approved for ${students[sIdx].fullName}.`,
    student: students[sIdx]
  });
});

app.post('/api/staff/logout', async (req, res) => {
  res.clearCookie('fusion_staff_email');
  res.clearCookie('fusion_staff_branch');
  res.clearCookie('fusion_staff_role');
  res.json({ success: true, message: 'Logged out successfully' });
});

// ── DELETE STUDENT RECORD (STAFF / INSTRUCTOR / ADMIN) ─────────────
app.delete('/api/staff/students/:id', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (user && user.role !== 'admin' && !await hasPermission(user, 'manage_admissions') && !await hasPermission(user, 'edit_students')) {
    return res.status(403).json({ success: false, error: 'Permission denied: manage_admissions or edit_students required' });
  }

  const { id } = req.params;
  const cleanId = String(id).trim().toLowerCase();

  const students = await readData('students.json', []);
  const admissions = await readData('admissions.json', []);

  const sIdx = students.findIndex(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.id && String(s.id).toLowerCase() === cleanId) ||
    (s.applicationNumber && s.applicationNumber.toLowerCase() === cleanId) ||
    (s.applicationId && s.applicationId.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId)
  );

  const aIdx = admissions.findIndex(a => 
    (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
    (a.applicationId && a.applicationId.toLowerCase() === cleanId) ||
    (a.id && String(a.id).toLowerCase() === cleanId) ||
    (a.email && a.email.toLowerCase() === cleanId)
  );

  if (sIdx === -1 && aIdx === -1) {
    return res.status(404).json({ success: false, error: 'Student record not found.' });
  }

  let deletedName = cleanId;

  if (sIdx !== -1) {
    deletedName = students[sIdx].fullName || deletedName;
    students.splice(sIdx, 1);
    await writeData('students.json', students);
  }

  if (aIdx !== -1) {
    deletedName = admissions[aIdx].fullName || deletedName;
    admissions.splice(aIdx, 1);
    await writeData('admissions.json', admissions);
  }

  await recordAuditLog('student_deleted', `Deleted student record for ${deletedName} (${cleanId})`, 'student', cleanId, deletedName, user);

  return res.json({
    success: true,
    message: `Student record for ${deletedName} has been deleted successfully.`
  });
});

// ── BRANCHES MANAGEMENT CRUD ──────────────────────────────────────
app.get('/api/branches', async (req, res) => {
  res.json({ success: true, branches: await readData('branches.json', []) });
});

app.post('/api/branches', requireAuth('admin'), async (req, res) => {
  const branches = await readData('branches.json', []);
  const newBranch = {
    id: req.body.id || ('branch_' + Date.now()),
    name: req.body.name || 'New Branch',
    displayName: req.body.displayName || req.body.name,
    city: req.body.city || '',
    address: req.body.address || '',
    phone: req.body.phone || '',
    email: req.body.email || '',
    status: req.body.status || 'active'
  };
  branches.push(newBranch);
  await writeData('branches.json', branches);
  await recordAuditLog('branch_created', `Branch created: ${newBranch.name}`, 'branch', newBranch.id, newBranch.name, await getAuthenticatedUser(req));
  res.json({ success: true, message: 'Branch created', branch: newBranch });
});

app.put('/api/branches/:id', requireAuth('admin'), async (req, res) => {
  const { id } = req.params;
  const branches = await readData('branches.json', []);
  const idx = branches.findIndex(b => b.id === id || b.name.toLowerCase() === id.toLowerCase());
  if (idx === -1) return res.status(404).json({ success: false, error: 'Branch not found' });
  branches[idx] = { ...branches[idx], ...req.body, id: branches[idx].id };
  await writeData('branches.json', branches);
  await recordAuditLog('branch_updated', `Branch updated: ${branches[idx].name}`, 'branch', id, branches[idx].name, await getAuthenticatedUser(req));
  res.json({ success: true, message: 'Branch updated', branch: branches[idx] });
});

app.delete('/api/branches/:id', requireAuth('admin'), async (req, res) => {
  const { id } = req.params;

  let branches = await readData('branches.json', []);
  const branchToDelete = branches.find(b => b.id === id || b.name.toLowerCase() === id.toLowerCase());
  branches = branches.filter(b => b.id !== id && b.name.toLowerCase() !== id.toLowerCase());
  await writeData('branches.json', branches);
  await recordAuditLog('branch_deleted', `Branch deleted: ${branchToDelete ? (branchToDelete.displayName || branchToDelete.name) : id}`, 'branch', id, branchToDelete ? branchToDelete.name : id, await getAuthenticatedUser(req));
  res.json({ success: true, message: 'Branch deleted successfully' });
});

// ── PERMISSIONS CATALOG ───────────────────────────────────────────
app.get('/api/permissions', async (req, res) => {
  res.json({ success: true, ...await readData('permissions.json', {}) });
});

// ── ADMIN USER & PERMISSION MANAGEMENT CRUD ───────────────────────
app.get('/api/admin/users', requireAuth('admin'), async (req, res) => {
  const users = await readData('users.json', []);
  res.json({ success: true, users });
});


app.post('/api/admin/users', requireAuth('admin'), async (req, res) => {
  const { name, email, password, role, branch, permissions, status } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Name and Email are required.' });
  }

  const users = await readData('users.json', []);
  const existing = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ success: false, error: 'A user with this email address already exists.' });
  }

  const rawPassword = (password && String(password).trim()) ? String(password).trim() : 'password123';
  const userPassword = await hashPassword(rawPassword);

  const newUser = {
    id: req.body.id || ('usr_' + (role === 'instructor' ? 'inst_' : 'staff_') + Date.now()),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: userPassword,
    role: role || 'staff',
    branch: branch || 'Dinajpur',
    permissions: Array.isArray(permissions) ? permissions : [
      'view_students', 'edit_students', 'manage_admissions', 'counseling', 'view_fees', 'manage_fees'
    ],
    status: status || 'active',
    createdAt: new Date().toISOString()
  };

  users.unshift(newUser);
  await writeData('users.json', users);

  // Sync staff.json
  const staffList = await readData('staff.json', []);
  const sIdx = staffList.findIndex(s => s.id === newUser.id || s.email.toLowerCase() === newUser.email.toLowerCase());
  const staffEntry = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    password: newUser.password,
    role: newUser.role,
    branch: newUser.branch,
    status: newUser.status
  };
  if (sIdx !== -1) {
    staffList[sIdx] = staffEntry;
  } else {
    staffList.unshift(staffEntry);
  }
  await writeData('staff.json', staffList);

  await recordAuditLog('user_created', `Created ${newUser.role} account: ${newUser.name} (${newUser.branch})`, 'user', newUser.id, newUser.name, await getAuthenticatedUser(req));
  res.json({ success: true, message: 'User account created successfully', user: newUser });
});

app.put('/api/admin/users/:id', requireAuth('admin'), async (req, res) => {
  const { id } = req.params;
  const users = await readData('users.json', []);
  const idx = users.findIndex(u => u.id === id || u.email.toLowerCase() === id.toLowerCase());
  if (idx === -1) return res.status(404).json({ success: false, error: 'User not found' });

  const old = { ...users[idx] };
  users[idx] = {
    ...users[idx],
    ...req.body,
    id: users[idx].id,
    updatedAt: new Date().toISOString()
  };

  if (!req.body.password) {
    users[idx].password = old.password;
  }

  await writeData('users.json', users);

  // Sync staff.json
  const staffList = await readData('staff.json', []);
  const sIdx = staffList.findIndex(s => s.id === id || s.email.toLowerCase() === old.email.toLowerCase());
  if (sIdx !== -1) {
    staffList[sIdx] = { ...staffList[sIdx], ...users[idx] };
    await writeData('staff.json', staffList);
  }

  await recordAuditLog('user_updated', `Updated user ${users[idx].name} permissions & details`, 'user', users[idx].id, users[idx].name, await getAuthenticatedUser(req));
  res.json({ success: true, message: 'User updated successfully', user: users[idx] });
});

app.delete('/api/admin/users/:id', requireAuth('admin'), async (req, res) => {
  const { id } = req.params;
  let users = await readData('users.json', []);
  const user = users.find(u => u.id === id || u.email.toLowerCase() === id.toLowerCase());
  users = users.filter(u => u.id !== id && u.email.toLowerCase() !== id.toLowerCase());
  await writeData('users.json', users);

  let staffList = await readData('staff.json', []);
  staffList = staffList.filter(s => s.id !== id && s.email.toLowerCase() !== (user ? user.email.toLowerCase() : ''));
  await writeData('staff.json', staffList);

  await recordAuditLog('user_deleted', `Deleted user ${user ? user.name : id}`, 'user', id, user ? user.name : id, await getAuthenticatedUser(req));
  res.json({ success: true, message: 'User deleted successfully' });
});

// ── TELEGRAM BACKUP & KEEPALIVE ─────────────────────────────────
app.get('/api/ping', (req, res) => {
  res.status(200).send('pong');
});

app.post('/api/admin/backup', async (req, res) => {
  // Can be called by a cron job or Admin
  // If called by cron, we might use a secret token
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET || 'fusion-backup-secret';
  
  // Verify it's either Admin or Cron
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  }

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(500).json({ success: false, error: 'Telegram credentials not configured.' });
  }

  try {
    const archiver = require('archiver');
    const FormData = require('form-data');
    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');

    const backupPath = path.join(__dirname, 'data_backup.zip');
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(path.join(__dirname, 'data'), false);
    await archive.finalize();

    // Wait for output stream to close
    await new Promise((resolve) => output.on('close', resolve));

    const form = new FormData();
    form.append('chat_id', TELEGRAM_CHAT_ID);
    form.append('document', fs.createReadStream(backupPath), `Fusion_Backup_${new Date().toISOString().split('T')[0]}.zip`);
    form.append('caption', `Daily Backup - ${new Date().toLocaleString()}`);

    const telegramRes = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    // Cleanup
    fs.unlinkSync(backupPath);

    res.json({ success: true, message: 'Backup sent to Telegram successfully.' });
  } catch (error) {
    console.error('Backup error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create and send backup.' });
  }
});

// ── INSTRUCTOR STAFF CONTROL (BRANCH SCOPED) ──────────────────────
app.get('/api/instructor/staff', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (user.role !== 'admin' && !await hasPermission(user, 'view_staff')) {
    return res.status(403).json({ success: false, error: 'Permission denied: view_staff required' });
  }

  const users = await readData('users.json', []);
  // Return staff in user's branch
  const branchStaff = users.filter(u => 
    u.role === 'staff' && (user.role === 'admin' || String(u.branch).toLowerCase() === String(user.branch).toLowerCase())
  );
  res.json({ success: true, staff: branchStaff, branch: user.branch });
});

app.put('/api/instructor/staff/:id', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (user.role !== 'admin' && !await hasPermission(user, 'manage_staff_permissions') && !await hasPermission(user, 'edit_staff')) {
    return res.status(403).json({ success: false, error: 'Permission denied to manage branch staff' });
  }

  const { id } = req.params;
  const users = await readData('users.json', []);
  const idx = users.findIndex(u => u.id === id || u.email.toLowerCase() === id.toLowerCase());
  if (idx === -1) return res.status(404).json({ success: false, error: 'Staff member not found' });

  // Branch check
  if (user.role !== 'admin' && String(users[idx].branch).toLowerCase() !== String(user.branch).toLowerCase()) {
    return res.status(403).json({ success: false, error: 'Cannot modify staff outside your branch' });
  }

  // Instructor cannot elevate staff to admin or instructor
  if (req.body.role && req.body.role !== 'staff' && user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Cannot change staff role beyond staff level' });
  }

  users[idx] = { ...users[idx], ...req.body, id: users[idx].id, role: 'staff' };
  await writeData('users.json', users);

  await recordAuditLog('branch_staff_updated', `Instructor ${user.name} modified staff ${users[idx].name}`, 'user', users[idx].id, users[idx].name, user);
  res.json({ success: true, message: 'Branch staff updated', staff: users[idx] });
});

// ── STUDENT BILLING & RECURRING FEE CALCULATION ───────────────────
app.get('/api/students/:id/billing', async (req, res) => {
  const { id } = req.params;
  const students = await readData('students.json', []);
  const admissions = await readData('admissions.json', []);
  const cleanId = String(id).trim().toLowerCase();

  let student = students.find(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId) ||
    (s.id && String(s.id).toLowerCase() === cleanId) ||
    (s.applicationNumber && s.applicationNumber.toLowerCase() === cleanId) ||
    (s.applicationId && s.applicationId.toLowerCase() === cleanId) ||
    (s.phone && s.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
  );

  if (!student) {
    const adm = admissions.find(a => 
      (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
      (a.applicationId && a.applicationId.toLowerCase() === cleanId) ||
      (a.id && String(a.id).toLowerCase() === cleanId) ||
      (a.email && a.email.toLowerCase() === cleanId) ||
      (a.phone && a.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
    );
    if (adm) {
      student = buildStudentFromAdmission(adm);
    }
  }

  if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

  const billing = await calculateStudentFees(student);
  res.json({ success: true, student: { id: student.identifier || student.id, fullName: student.fullName, branch: student.branch }, billing });
});

app.post('/api/students/:id/payments', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (user && user.role !== 'admin' && !await hasPermission(user, 'manage_fees')) {
    return res.status(403).json({ success: false, error: 'Permission denied: manage_fees required' });
  }

  const { id } = req.params;
  const { amount, note, date, method } = req.body;
  const paymentAmount = Number(amount);

  if (!paymentAmount || paymentAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid payment amount is required.' });
  }

  const students = await readData('students.json', []);
  const admissions = await readData('admissions.json', []);
  const cleanId = String(id).trim().toLowerCase();

  let sIdx = students.findIndex(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId) ||
    (s.id && String(s.id).toLowerCase() === cleanId) ||
    (s.applicationNumber && s.applicationNumber.toLowerCase() === cleanId) ||
    (s.applicationId && s.applicationId.toLowerCase() === cleanId) ||
    (s.phone && s.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
  );

  let aIdx = admissions.findIndex(a => 
    (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
    (a.applicationId && a.applicationId.toLowerCase() === cleanId) ||
    (a.id && String(a.id).toLowerCase() === cleanId) ||
    (a.email && a.email.toLowerCase() === cleanId) ||
    (a.phone && a.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
  );

  if (sIdx === -1 && aIdx === -1) {
    return res.status(404).json({ success: false, error: 'Student not found' });
  }

  // If not found in students.json, construct from admissions.json and persist
  if (sIdx === -1 && aIdx !== -1) {
    const studentRecord = buildStudentFromAdmission(admissions[aIdx]);
    students.unshift(studentRecord);
    sIdx = 0;
  }

  // Branch check
  if (user && !hasBranchAccess(user, students[sIdx].branch)) {
    return res.status(403).json({ success: false, error: 'Cannot record payments for students in other branches.' });
  }

  const newPayment = {
    id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    amount: paymentAmount,
    date: date || new Date().toISOString(),
    recordedBy: user ? `${user.name} (${user.role})` : 'Staff Desk',
    note: note || 'Tuition / Installment Payment',
    method: method || 'Recorded'
  };

  if (!Array.isArray(students[sIdx].payments)) {
    students[sIdx].payments = [];
  }
  students[sIdx].payments.unshift(newPayment);

  // Recalculate fees
  const billing = await calculateStudentFees(students[sIdx]);
  students[sIdx].fees = {
    total: `${billing.totalAccruedFee.toLocaleString()} BDT`,
    paid: `${billing.totalPaid.toLocaleString()} BDT`,
    due: `${billing.balanceDue.toLocaleString()} BDT`,
    status: billing.status
  };

  await writeData('students.json', students);

  // Also sync admissions.json if exists
  if (aIdx !== -1) {
    admissions[aIdx].payments = students[sIdx].payments;
    admissions[aIdx].feeInfo = {
      ...(admissions[aIdx].feeInfo || {}),
      ...students[sIdx].fees,
      total: students[sIdx].fees.total,
      paid: students[sIdx].fees.paid,
      due: students[sIdx].fees.due,
      status: students[sIdx].fees.status
    };
    await writeData('admissions.json', admissions);
  }

  await recordAuditLog('payment_recorded', `Payment ৳${paymentAmount.toLocaleString()} recorded for ${students[sIdx].fullName} (${students[sIdx].identifier})`, 'student', students[sIdx].identifier, students[sIdx].fullName, user);

  res.json({ 
    success: true, 
    message: `Payment of ৳${paymentAmount.toLocaleString()} recorded successfully`, 
    payment: newPayment, 
    billing,
    student: students[sIdx] 
  });
});

app.put('/api/students/:id/custom-fee', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (user && user.role !== 'admin' && !await hasPermission(user, 'custom_student_fee') && !await hasPermission(user, 'manage_fees')) {
    return res.status(403).json({ success: false, error: 'Permission denied: custom_student_fee required' });
  }

  const { id } = req.params;
  const { customMonthlyFee, specialDiscount, reason } = req.body;

  const students = await readData('students.json', []);
  const admissions = await readData('admissions.json', []);
  const cleanId = String(id).trim().toLowerCase();

  let sIdx = students.findIndex(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.id && String(s.id).toLowerCase() === cleanId) ||
    (s.applicationNumber && s.applicationNumber.toLowerCase() === cleanId) ||
    (s.applicationId && s.applicationId.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId)
  );

  let aIdx = admissions.findIndex(a => 
    (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
    (a.applicationId && a.applicationId.toLowerCase() === cleanId) ||
    (a.id && String(a.id).toLowerCase() === cleanId) ||
    (a.email && a.email.toLowerCase() === cleanId)
  );

  if (sIdx === -1 && aIdx === -1) {
    return res.status(404).json({ success: false, error: 'Student not found' });
  }

  // If not found in students.json, construct from admissions.json and persist
  if (sIdx === -1 && aIdx !== -1) {
    const studentRecord = buildStudentFromAdmission(admissions[aIdx]);
    students.unshift(studentRecord);
    sIdx = 0;
  }

  // Branch check
  if (user && !hasBranchAccess(user, students[sIdx].branch)) {
    return res.status(403).json({ success: false, error: 'Cannot modify student fees outside your branch.' });
  }

  const oldRate = students[sIdx].customMonthlyFee;
  students[sIdx].customMonthlyFee = (customMonthlyFee !== undefined && customMonthlyFee !== '' && customMonthlyFee !== null) ? Number(customMonthlyFee) : null;
  if (specialDiscount !== undefined) students[sIdx].specialDiscount = Number(specialDiscount);

  // Recalculate fees
  const billing = await calculateStudentFees(students[sIdx]);
  students[sIdx].fees = {
    total: `${billing.totalAccruedFee.toLocaleString()} BDT`,
    paid: `${billing.totalPaid.toLocaleString()} BDT`,
    due: `${billing.balanceDue.toLocaleString()} BDT`,
    status: billing.status
  };

  await writeData('students.json', students);

  // Also sync admissions.json if exists
  if (aIdx !== -1) {
    admissions[aIdx].customMonthlyFee = students[sIdx].customMonthlyFee;
    admissions[aIdx].specialDiscount = students[sIdx].specialDiscount;
    admissions[aIdx].feeInfo = {
      ...(admissions[aIdx].feeInfo || {}),
      ...students[sIdx].fees,
      total: students[sIdx].fees.total,
      paid: students[sIdx].fees.paid,
      due: students[sIdx].fees.due,
      status: students[sIdx].fees.status
    };
    await writeData('admissions.json', admissions);
  }

  await recordAuditLog('fee_customized', `Monthly fee customized for ${students[sIdx].fullName} (${students[sIdx].identifier}). Old: ${oldRate || 'standard'}, New: ${students[sIdx].customMonthlyFee || 'standard'}. Note: ${reason || 'N/A'}`, 'student', students[sIdx].identifier, students[sIdx].fullName, user);

  res.json({ 
    success: true, 
    message: 'Custom fee rate updated successfully', 
    billing,
    student: students[sIdx] 
  });
});

// ── AUDIT LOGS QUERY ──────────────────────────────────────────────
app.get('/api/admin/audit-logs', async (req, res) => {
  const logs = await readData('auditLogs.json', []);
  const { action, branch, search, limit } = req.query;
  let filtered = [...logs];

  if (action) {
    filtered = filtered.filter(l => l.action === action);
  }
  if (branch && branch !== 'all') {
    filtered = filtered.filter(l => l.performedBy && String(l.performedBy.branch).toLowerCase() === branch.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(l => 
      (l.details && l.details.toLowerCase().includes(q)) ||
      (l.targetName && l.targetName.toLowerCase().includes(q)) ||
      (l.performedBy && l.performedBy.name && l.performedBy.name.toLowerCase().includes(q))
    );
  }

  const max = Number(limit) || 200;
  res.json({ success: true, count: filtered.length, logs: filtered.slice(0, max) });
});

// ── 404 fallback ─────────────────────────────────────────────
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'API endpoint not found.' });
    }
    res.status(404).json({ success: false, error: 'Page not found.', hint: 'Visit / for the homepage.' });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error.' });
});

app.get('/api/migrate-firebase-init', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const dataDir = path.join(__dirname, 'data');
    const files = await fs.readdir(dataDir);
    let migrated = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(dataDir, file), 'utf8');
        const data = JSON.parse(content);
        const collectionName = file.replace('.json', '');
        
        if (Array.isArray(data)) {
          await writeData(file, data);
        } else {
          // For objects like settings.json
          const docId = collectionName + '_doc';
          data.id = docId;
          await writeData(file, [data]); 
        }
        migrated.push(collectionName);
      }
    }
    res.send(`<h1>Migration Successful!</h1><p>Migrated: ${migrated.join(', ')}</p>`);
  } catch (err) {
    res.status(500).send(`<h1>Migration Failed!</h1><pre>${err.message}</pre>`);
  }
});

// ── Start server ─────────────────────────────────────────────
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n🚀 Fusion Education BD server running on http://localhost:${PORT}`);
        console.log(`📋 Admission API: POST http://localhost:${PORT}/api/admission/submit`);
        console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configured' : '⚠️  Not configured (set .env)'}\n`);
    });
}

module.exports = app;



