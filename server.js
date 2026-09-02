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

const admissionRoutes = require('./routes/admission');
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

const app  = express();
const PORT = process.env.PORT || 3000;

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

// ── Trust proxy (for correct IP in rate limiter) ─────────────
app.set('trust proxy', 1);

// ── API Routes ───────────────────────────────────────────────
app.use('/api/admission', admissionRoutes);

// ── API Endpoints & CRUD Data Layer ──────────────────────────
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Helper to read data from local JSON
const readData = (filename, defaultValue = []) => {
    try {
        const file = path.join(dataDir, filename);
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        console.error(`Error reading ${filename}:`, e.message);
    }
    return defaultValue;
};

// Helper to write data to local JSON
const writeData = (filename, data) => {
    try {
        const file = path.join(dataDir, filename);
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(`Error writing ${filename}:`, e.message);
        return false;
    }
};

// ── COURSES CRUD ─────────────────────────────────────────────
app.get('/api/courses', (req, res) => {
    res.json({ success: true, courses: readData('courses.json') });
});

const handleSaveCourse = (req, res) => {
    const courseData = req.body;
    if (!courseData || !courseData.title) {
        return res.status(400).json({ success: false, error: 'Course title is required.' });
    }
    const courses = readData('courses.json');
    const newCourse = {
        id: courseData.id || ('course_' + Date.now()),
        title: courseData.title || '',
        level: courseData.level || '',
        duration: courseData.duration || '',
        students: courseData.students || '',
        fee: courseData.fee || '',
        description: courseData.description || '',
        link: courseData.link || '',
        discountType: courseData.discountType || 'none',
        discountValue: courseData.discountValue ? parseFloat(courseData.discountValue) : 0,
        createdAt: new Date().toISOString()
    };
    courses.unshift(newCourse);
    writeData('courses.json', courses);
    res.json({ success: true, message: 'Course created successfully', course: newCourse, id: newCourse.id });
};

app.post('/api/courses', handleSaveCourse);
app.post('/api/courses/add', handleSaveCourse);

app.put('/api/courses/:id', (req, res) => {
    const { id } = req.params;
    const courses = readData('courses.json');
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
    writeData('courses.json', courses);
    res.json({ success: true, message: 'Course updated successfully', course: courses[index] });
});

app.delete('/api/courses/:id', (req, res) => {
    const { id } = req.params;
    let courses = readData('courses.json');
    const filtered = courses.filter(c => String(c.id) !== String(id));
    writeData('courses.json', filtered);
    res.json({ success: true, message: 'Course deleted successfully' });
});

// ── POSTS CRUD ───────────────────────────────────────────────
app.get('/api/posts', (req, res) => {
    res.json({ success: true, posts: readData('posts.json') });
});

const handleSavePost = (req, res) => {
    const posts = readData('posts.json');
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
    writeData('posts.json', posts);
    res.json({ success: true, message: 'Post created successfully', post: newPost, id: newPost.id });
};

app.post('/api/posts', handleSavePost);
app.post('/api/posts/add', handleSavePost);

app.put('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    const posts = readData('posts.json');
    const index = posts.findIndex(p => String(p.id) === String(id));
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Post not found' });
    }
    posts[index] = { ...posts[index], ...req.body, id, updatedAt: new Date().toISOString() };
    writeData('posts.json', posts);
    res.json({ success: true, message: 'Post updated successfully', post: posts[index] });
});

app.delete('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    const posts = readData('posts.json');
    writeData('posts.json', posts.filter(p => String(p.id) !== String(id)));
    res.json({ success: true, message: 'Post deleted successfully' });
});

// ── FAQS CRUD ────────────────────────────────────────────────
app.get('/api/faqs', (req, res) => {
    res.json({ success: true, faqs: readData('faqs.json') });
});

app.post('/api/faqs', (req, res) => {
    const faqs = readData('faqs.json');
    const newFaq = {
        id: req.body.id || ('faq_' + Date.now()),
        question: req.body.question || '',
        answer: req.body.answer || '',
        category: req.body.category || 'General',
        createdAt: new Date().toISOString()
    };
    faqs.push(newFaq);
    writeData('faqs.json', faqs);
    res.json({ success: true, message: 'FAQ created successfully', faq: newFaq, id: newFaq.id });
});

app.put('/api/faqs/:id', (req, res) => {
    const { id } = req.params;
    const faqs = readData('faqs.json');
    const index = faqs.findIndex(f => String(f.id) === String(id));
    if (index === -1) return res.status(404).json({ success: false, error: 'FAQ not found' });
    faqs[index] = { ...faqs[index], ...req.body, id };
    writeData('faqs.json', faqs);
    res.json({ success: true, message: 'FAQ updated successfully', faq: faqs[index] });
});

app.delete('/api/faqs/:id', (req, res) => {
    const { id } = req.params;
    const faqs = readData('faqs.json');
    writeData('faqs.json', faqs.filter(f => String(f.id) !== String(id)));
    res.json({ success: true, message: 'FAQ deleted successfully' });
});

// ── TESTIMONIALS CRUD ────────────────────────────────────────
app.get('/api/testimonials', (req, res) => {
    res.json({ success: true, testimonials: readData('testimonials.json') });
});

app.post('/api/testimonials', (req, res) => {
    const testimonials = readData('testimonials.json');
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
    writeData('testimonials.json', testimonials);
    res.json({ success: true, message: 'Testimonial added successfully', testimonial: newTestimonial, id: newTestimonial.id });
});

app.put('/api/testimonials/:id', (req, res) => {
    const { id } = req.params;
    const testimonials = readData('testimonials.json');
    const index = testimonials.findIndex(t => String(t.id) === String(id));
    if (index === -1) return res.status(404).json({ success: false, error: 'Testimonial not found' });
    testimonials[index] = { ...testimonials[index], ...req.body, id };
    writeData('testimonials.json', testimonials);
    res.json({ success: true, message: 'Testimonial updated successfully', testimonial: testimonials[index] });
});

app.delete('/api/testimonials/:id', (req, res) => {
    const { id } = req.params;
    const testimonials = readData('testimonials.json');
    writeData('testimonials.json', testimonials.filter(t => String(t.id) !== String(id)));
    res.json({ success: true, message: 'Testimonial deleted successfully' });
});

// ── GALLERY CRUD ─────────────────────────────────────────────
app.get('/api/gallery', (req, res) => {
    res.json({ success: true, gallery: readData('gallery.json') });
});

app.post('/api/gallery', (req, res) => {
    const gallery = readData('gallery.json');
    const newItem = {
        id: req.body.id || ('gal_' + Date.now()),
        title: req.body.title || '',
        category: req.body.category || 'General',
        image: req.body.image || '',
        createdAt: new Date().toISOString()
    };
    gallery.unshift(newItem);
    writeData('gallery.json', gallery);
    res.json({ success: true, message: 'Gallery item added successfully', item: newItem, id: newItem.id });
});

app.delete('/api/gallery/:id', (req, res) => {
    const { id } = req.params;
    const gallery = readData('gallery.json');
    writeData('gallery.json', gallery.filter(g => String(g.id) !== String(id)));
    res.json({ success: true, message: 'Gallery item deleted successfully' });
});

// ── SETTINGS CRUD ────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
    res.json({ success: true, settings: readData('settings.json', {}) });
});

app.post('/api/settings', (req, res) => {
    const current = readData('settings.json', {});
    const updated = { ...current, ...req.body };
    writeData('settings.json', updated);
    res.json({ success: true, message: 'Settings saved successfully', settings: updated });
});

// ── CONTACT MESSAGES CRUD ────────────────────────────────────
app.get('/api/contactMessages', (req, res) => {
    res.json({ success: true, contactMessages: readData('contactMessages.json') });
});

app.post('/api/contactMessages', (req, res) => {
    const messages = readData('contactMessages.json');
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
    writeData('contactMessages.json', messages);
    res.json({ success: true, message: 'Message sent successfully', messageId: newMsg.id });
});

app.delete('/api/contactMessages/:id', (req, res) => {
    const { id } = req.params;
    const messages = readData('contactMessages.json');
    writeData('contactMessages.json', messages.filter(m => String(m.id) !== String(id)));
    res.json({ success: true, message: 'Message deleted successfully' });
});

// ── ADMISSIONS CRUD ──────────────────────────────────────────
app.get(['/api/admissions', '/api/admission'], (req, res) => {
    res.json({ success: true, admissions: readData('admissions.json') });
});

app.put(['/api/admissions/:id', '/api/admission/:id', '/api/staff/students/:id'], (req, res) => {
    const { id } = req.params;
    const updateData = req.body || {};
    const admissions = readData('admissions.json', []);
    
    const index = admissions.findIndex(a => 
        String(a.id) === String(id) || 
        String(a.applicationNumber) === String(id) || 
        String(a.applicationId) === String(id)
    );

    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Admission / Student record not found' });
    }

    admissions[index] = {
        ...admissions[index],
        ...updateData,
        updatedAt: new Date().toISOString()
    };

    writeData('admissions.json', admissions);
    res.json({ success: true, message: 'Student record updated successfully', admission: admissions[index] });
});

app.delete(['/api/admissions/:id', '/api/admission/:id'], (req, res) => {
    const { id } = req.params;
    const admissions = readData('admissions.json');
    writeData('admissions.json', admissions.filter(a => 
        String(a.id) !== String(id) && 
        String(a.applicationNumber) !== String(id) && 
        String(a.applicationId) !== String(id)
    ));
    res.json({ success: true, message: 'Admission application deleted successfully' });
});

// ── Static file serving ──────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '.')));

// Serve index.html for root

// Helper to construct a student model from admission application
const buildStudentFromAdmission = (adm) => {
  const isAdmitted = (adm.status || '').toLowerCase() === 'admitted';
  const cleanAppNum = adm.applicationNumber || adm.applicationId || ('FEBD-' + (adm.id || Date.now()));
  return {
    identifier: cleanAppNum,
    email: adm.email || `${cleanAppNum.toLowerCase()}@student.fusioneducation.com`,
    password: 'password123',
    fullName: adm.fullName || 'Student Applicant',
    phone: adm.phone || '',
    bloodGroup: adm.bloodGroup || 'N/A',
    dateOfBirth: adm.dateOfBirth || '',
    address: adm.address || '',
    branch: adm.branch || 'Dinajpur',
    photo: adm.photoUrl || '../assets/images/student-placeholder.jpg',
    status: isAdmitted ? 'Active Student' : (adm.status || 'Application Under Review'),
    currentCourse: adm.course || 'Japanese Language Course',
    courseLevel: adm.courseLevel || 'N5 / Pre-intermediate',
    batch: adm.batch || 'Batch 01 (Upcoming Intake)',
    instructor: isAdmitted ? 'Tanaka Sensei' : 'Assigned upon class start',
    progressPercent: isAdmitted ? 30 : 10,
    nextClass: {
      topic: isAdmitted ? 'Orientation & Basic Japanese Kana' : 'Application Review & Routine Briefing',
      time: isAdmitted ? 'Sunday & Tuesday 10:00 AM' : 'Schedule will be announced soon',
      room: isAdmitted ? 'Room 102 & Online Zoom' : 'Main Campus & Online'
    },
    attendance: { attended: isAdmitted ? 2 : 0, total: isAdmitted ? 2 : 0, rate: '100%' },
    fees: adm.feeInfo ? {
      total: `${(adm.feeInfo.baseFee || 15000).toLocaleString()} BDT`,
      paid: `${(adm.feeInfo.finalFee || 5000).toLocaleString()} BDT`,
      due: `${Math.max(0, (adm.feeInfo.baseFee || 15000) - (adm.feeInfo.finalFee || 5000)).toLocaleString()} BDT`,
      status: (adm.feeInfo.finalFee >= (adm.feeInfo.baseFee || 15000)) ? 'Paid' : 'Partially Paid'
    } : { total: '15,000 BDT', paid: '5,000 BDT (Deposit)', due: '10,000 BDT', status: 'Partially Paid' },
    visaApplication: {
      status: isAdmitted ? 'Document Verification' : 'Application Submitted',
      step: isAdmitted ? 2 : 1,
      steps: [
        { title: 'Application Submitted', done: true, date: adm.submittedAt ? adm.submittedAt.slice(0, 10) : 'Recent' },
        { title: 'Document Verification', done: isAdmitted, date: isAdmitted ? 'Verified' : 'In Review' },
        { title: 'COE Application', done: false, date: 'Pending' },
        { title: 'COE Issuance', done: false, date: 'Pending' },
        { title: 'Embassy Visa Stamp', done: false, date: 'Pending' }
      ]
    },
    assignments: [
      { id: 'asg_1', title: 'Kana Practice & Basic Phrases', dueDate: 'Next Week', status: 'Pending', maxScore: 25 }
    ],
    messages: [
      { from: 'Fusion Education Desk', text: 'Welcome! Your student account is active. Check notices for intake updates.', time: 'Recent' }
    ]
  };
};

// ── STUDENT AUTH & PROFILE ENDPOINTS ──────────────────────────────
app.post('/api/student/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ success: false, error: 'Registration number / Email and password are required.' });
  }

  const cleanId = String(identifier).trim().toLowerCase();
  let students = readData('students.json', []);
  
  // 1. Check in students.json
  let student = students.find(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId) ||
    (s.phone && s.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
  );

  // 2. If not found in students.json, search admissions.json
  if (!student) {
    const admissions = readData('admissions.json', []);
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
      writeData('students.json', students);
    }
  }

  // 3. Fallback for testing demo accounts
  if (!student) {
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

  // Verify password (accept student.password, or default demo passwords 'password123', '123456', 'student123')
  const validPasswords = ['password123', '123456', 'student123'];
  if (student.password) validPasswords.unshift(student.password);

  if (!validPasswords.includes(password)) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid password. Please check your password (Demo password: password123).' 
    });
  }

  // Set session cookie
  res.cookie('fusion_student_id', student.identifier, { 
    httpOnly: false, 
    sameSite: 'lax',
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

app.get('/api/student/profile', (req, res) => {
  const identifier = req.query.identifier || req.cookies.fusion_student_id;
  const students = readData('students.json', []);
  
  if (!identifier) {
    if (students.length > 0) return res.json({ success: true, student: students[0] });
    return res.status(400).json({ success: false, error: 'Missing student identifier.' });
  }

  const cleanId = String(identifier).trim().toLowerCase();
  let student = students.find(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId) ||
    (s.phone && s.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
  );

  // If not found in students.json, check admissions.json
  if (!student) {
    const admissions = readData('admissions.json', []);
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
      writeData('students.json', students);
    }
  }

  if (!student) {
    if (students.length > 0) return res.json({ success: true, student: students[0] });
    return res.status(404).json({ success: false, error: 'Student profile not found.' });
  }

  return res.json({ success: true, student });
});

app.put('/api/student/profile', (req, res) => {
  const identifier = req.body.identifier || req.cookies.fusion_student_id;
  if (!identifier) {
    return res.status(400).json({ success: false, error: 'Missing student identifier.' });
  }

  const students = readData('students.json', []);
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

  writeData('students.json', students);
  return res.json({ success: true, message: 'Profile updated successfully', student: students[index] });
});

app.post('/api/student/logout', (req, res) => {
  res.clearCookie('fusion_student_id');
  res.json({ success: true, message: 'Logged out successfully' });
});

// ── STAFF & INSTRUCTOR AUTH & DASHBOARD ENDPOINTS ──────────────────
app.post('/api/staff/login', (req, res) => {
  const { email, password, branch } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const users = readData('users.json', []);
  let activeUser = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);

  // Fallback to staff.json if not in users.json
  if (!activeUser) {
    const staffList = readData('staff.json', []);
    activeUser = staffList.find(s => s.email && s.email.toLowerCase() === cleanEmail);
  }

  const validPasswords = ['staff123', 'password123', 'admin123', '123456'];
  if (activeUser && activeUser.password) validPasswords.unshift(activeUser.password);

  if (activeUser && !validPasswords.includes(password)) {
    return res.status(401).json({ success: false, error: 'Invalid password. Please check your credentials.' });
  }

  if (!activeUser && !validPasswords.includes(password)) {
    return res.status(401).json({ success: false, error: 'Invalid credentials. (Demo: instructor@fusion.com / password123)' });
  }

  const userRecord = activeUser || {
    id: 'usr_' + Date.now(),
    email: cleanEmail,
    name: cleanEmail.split('@')[0].toUpperCase(),
    branch: branch || 'Dinajpur',
    role: 'staff',
    status: 'active',
    permissions: ['view_students', 'edit_students', 'manage_admissions', 'counseling', 'view_fees', 'manage_fees']
  };

  const userBranch = branch || userRecord.branch || 'Dinajpur';

  res.cookie('fusion_staff_email', userRecord.email, { httpOnly: false, sameSite: 'lax', maxAge: 86400000 });
  res.cookie('fusion_staff_branch', userBranch, { httpOnly: false, sameSite: 'lax', maxAge: 86400000 });
  res.cookie('fusion_staff_role', userRecord.role || 'staff', { httpOnly: false, sameSite: 'lax', maxAge: 86400000 });

  recordAuditLog('user_login', `Logged in via Staff/Instructor portal (${userRecord.role})`, 'user', userRecord.id, userRecord.name, {
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
    redirect: '/pages/staff-dashboard.html' 
  });
});

app.get('/api/staff/me', (req, res) => {
  const user = getAuthenticatedUser(req);
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
  const branch = req.cookies.fusion_staff_branch || 'Dinajpur';
  const users = readData('users.json', []);
  const staff = users.find(s => s.email && s.email.toLowerCase() === (email || '').toLowerCase()) || {
    name: 'Mahmudul Hasan',
    email: 'staff@fusioneducation.com',
    branch: 'Dinajpur',
    role: 'staff',
    permissions: ['view_students', 'edit_students', 'manage_admissions', 'counseling', 'view_fees', 'manage_fees', 'view_reports']
  };

  return res.json({
    success: true,
    authenticated: Boolean(email),
    id: staff.id || 'usr_default',
    name: staff.name,
    email: staff.email,
    branch: branch || staff.branch || 'Dinajpur',
    role: staff.role || 'staff',
    permissions: staff.permissions || []
  });
});

app.get('/api/staff/students', (req, res) => {
  const user = getAuthenticatedUser(req);
  let branch = req.query.branch || (user ? user.branch : req.cookies.fusion_staff_branch) || 'all';

  // Branch Isolation: If non-admin user is restricted to a branch, force that branch
  if (user && user.role !== 'admin' && user.branch && user.branch.toLowerCase() !== 'all') {
    branch = user.branch;
  }

  const admissions = readData('admissions.json', []);
  const students = readData('students.json', []);

  let list = admissions.map(a => ({
    id: a.id || a.applicationNumber,
    applicationNumber: a.applicationNumber || a.id,
    fullName: a.fullName,
    email: a.email,
    phone: a.phone,
    dateOfBirth: a.dateOfBirth,
    gender: a.gender,
    address: a.address,
    city: a.city,
    district: a.district,
    highestEducation: a.highestEducation,
    course: a.course,
    courseId: a.courseId || '',
    courseLevel: a.courseLevel || '',
    batch: a.batch || 'Upcoming Intake',
    branch: a.branch || 'Dinajpur',
    japaneseExperience: a.japaneseExperience,
    visaType: a.visaType,
    emergencyName: a.emergencyName,
    emergencyPhone: a.emergencyPhone,
    comment: a.comment || '',
    notes: a.notes || a.comment || '',
    status: a.status || 'pending',
    feeInfo: a.feeInfo || null,
    customMonthlyFee: a.customMonthlyFee !== undefined ? a.customMonthlyFee : null,
    payments: a.payments || [],
    photoUrl: a.photoUrl || '',
    documentPreview: a.photoUrl || '../assets/images/student-placeholder.jpg',
    documentUrls: a.documentUrls || [],
    documents: a.documents || [],
    submittedAt: a.submittedAt || a.createdAt || new Date().toISOString()
  }));

  // Merge students.json records
  if (students.length > 0) {
    const existingIds = new Set(list.map(s => String(s.applicationNumber || s.id)));
    students.forEach(s => {
      if (!existingIds.has(String(s.identifier))) {
        list.push({
          id: s.identifier,
          applicationNumber: s.identifier,
          fullName: s.fullName,
          email: s.email,
          phone: s.phone,
          course: s.currentCourse,
          courseId: s.courseId || '',
          courseLevel: s.courseLevel || 'N5',
          batch: s.batch || 'Batch 01',
          branch: s.branch || 'Dinajpur',
          status: s.status || 'admitted',
          customMonthlyFee: s.customMonthlyFee !== undefined ? s.customMonthlyFee : null,
          payments: s.payments || [],
          notes: 'Enrolled Student',
          photoUrl: s.photo || '',
          documentPreview: s.photo || '../assets/images/student-placeholder.jpg',
          submittedAt: s.enrollmentDate || new Date().toISOString()
        });
      }
    });
  }

  // Filter by branch if not 'all'
  if (branch && branch.toLowerCase() !== 'all') {
    list = list.filter(s => s.branch && s.branch.toLowerCase() === branch.toLowerCase());
  }

  return res.json({ success: true, branch, students: list });
});

app.post('/api/staff/logout', (req, res) => {
  res.clearCookie('fusion_staff_email');
  res.clearCookie('fusion_staff_branch');
  res.clearCookie('fusion_staff_role');
  res.json({ success: true, message: 'Logged out successfully' });
});

// ── BRANCHES MANAGEMENT CRUD ──────────────────────────────────────
app.get('/api/branches', (req, res) => {
  res.json({ success: true, branches: readData('branches.json', []) });
});

app.post('/api/branches', (req, res) => {
  const branches = readData('branches.json', []);
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
  writeData('branches.json', branches);
  recordAuditLog('branch_created', `Branch created: ${newBranch.name}`, 'branch', newBranch.id, newBranch.name, getAuthenticatedUser(req));
  res.json({ success: true, message: 'Branch created', branch: newBranch });
});

app.put('/api/branches/:id', (req, res) => {
  const { id } = req.params;
  const branches = readData('branches.json', []);
  const idx = branches.findIndex(b => b.id === id || b.name.toLowerCase() === id.toLowerCase());
  if (idx === -1) return res.status(404).json({ success: false, error: 'Branch not found' });
  branches[idx] = { ...branches[idx], ...req.body, id: branches[idx].id };
  writeData('branches.json', branches);
  recordAuditLog('branch_updated', `Branch updated: ${branches[idx].name}`, 'branch', id, branches[idx].name, getAuthenticatedUser(req));
  res.json({ success: true, message: 'Branch updated', branch: branches[idx] });
});

app.delete('/api/branches/:id', (req, res) => {
  const { id } = req.params;
  let branches = readData('branches.json', []);
  branches = branches.filter(b => b.id !== id && b.name.toLowerCase() !== id.toLowerCase());
  writeData('branches.json', branches);
  recordAuditLog('branch_deleted', `Branch deleted: ${id}`, 'branch', id, id, getAuthenticatedUser(req));
  res.json({ success: true, message: 'Branch deleted' });
});

// ── PERMISSIONS CATALOG ───────────────────────────────────────────
app.get('/api/permissions', (req, res) => {
  res.json({ success: true, ...readData('permissions.json', {}) });
});

// ── ADMIN USER & PERMISSION MANAGEMENT CRUD ───────────────────────
app.get('/api/admin/users', (req, res) => {
  const users = readData('users.json', []);
  res.json({ success: true, users });
});

app.post('/api/admin/users', (req, res) => {
  const { name, email, password, role, branch, permissions, status } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, Email, and Password are required.' });
  }

  const users = readData('users.json', []);
  const existing = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ success: false, error: 'A user with this email address already exists.' });
  }

  const newUser = {
    id: req.body.id || ('usr_' + (role === 'instructor' ? 'inst_' : 'staff_') + Date.now()),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    role: role || 'staff',
    branch: branch || 'Dinajpur',
    permissions: Array.isArray(permissions) ? permissions : [
      'view_students', 'edit_students', 'manage_admissions', 'counseling', 'view_fees', 'manage_fees'
    ],
    status: status || 'active',
    createdAt: new Date().toISOString()
  };

  users.unshift(newUser);
  writeData('users.json', users);

  // Sync staff.json
  const staffList = readData('staff.json', []);
  staffList.unshift({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    password: newUser.password,
    role: newUser.role,
    branch: newUser.branch,
    status: newUser.status
  });
  writeData('staff.json', staffList);

  recordAuditLog('user_created', `Created ${newUser.role} account: ${newUser.name} (${newUser.branch})`, 'user', newUser.id, newUser.name, getAuthenticatedUser(req));
  res.json({ success: true, message: 'User account created successfully', user: newUser });
});

app.put('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  const users = readData('users.json', []);
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

  writeData('users.json', users);

  // Sync staff.json
  const staffList = readData('staff.json', []);
  const sIdx = staffList.findIndex(s => s.id === id || s.email.toLowerCase() === old.email.toLowerCase());
  if (sIdx !== -1) {
    staffList[sIdx] = { ...staffList[sIdx], ...users[idx] };
    writeData('staff.json', staffList);
  }

  recordAuditLog('user_updated', `Updated user ${users[idx].name} permissions & details`, 'user', users[idx].id, users[idx].name, getAuthenticatedUser(req));
  res.json({ success: true, message: 'User updated successfully', user: users[idx] });
});

app.delete('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  let users = readData('users.json', []);
  const user = users.find(u => u.id === id || u.email.toLowerCase() === id.toLowerCase());
  users = users.filter(u => u.id !== id && u.email.toLowerCase() !== id.toLowerCase());
  writeData('users.json', users);

  let staffList = readData('staff.json', []);
  staffList = staffList.filter(s => s.id !== id && s.email.toLowerCase() !== (user ? user.email.toLowerCase() : ''));
  writeData('staff.json', staffList);

  recordAuditLog('user_deleted', `Deleted user ${user ? user.name : id}`, 'user', id, user ? user.name : id, getAuthenticatedUser(req));
  res.json({ success: true, message: 'User deleted successfully' });
});

// ── INSTRUCTOR STAFF CONTROL (BRANCH SCOPED) ──────────────────────
app.get('/api/instructor/staff', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (user.role !== 'admin' && !hasPermission(user, 'view_staff')) {
    return res.status(403).json({ success: false, error: 'Permission denied: view_staff required' });
  }

  const users = readData('users.json', []);
  // Return staff in user's branch
  const branchStaff = users.filter(u => 
    u.role === 'staff' && (user.role === 'admin' || String(u.branch).toLowerCase() === String(user.branch).toLowerCase())
  );
  res.json({ success: true, staff: branchStaff, branch: user.branch });
});

app.put('/api/instructor/staff/:id', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (user.role !== 'admin' && !hasPermission(user, 'manage_staff_permissions') && !hasPermission(user, 'edit_staff')) {
    return res.status(403).json({ success: false, error: 'Permission denied to manage branch staff' });
  }

  const { id } = req.params;
  const users = readData('users.json', []);
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
  writeData('users.json', users);

  recordAuditLog('branch_staff_updated', `Instructor ${user.name} modified staff ${users[idx].name}`, 'user', users[idx].id, users[idx].name, user);
  res.json({ success: true, message: 'Branch staff updated', staff: users[idx] });
});

// ── STUDENT BILLING & RECURRING FEE CALCULATION ───────────────────
app.get('/api/students/:id/billing', (req, res) => {
  const { id } = req.params;
  const students = readData('students.json', []);
  const admissions = readData('admissions.json', []);
  const cleanId = String(id).trim().toLowerCase();

  let student = students.find(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId) ||
    (s.id && String(s.id).toLowerCase() === cleanId)
  );

  if (!student) {
    const adm = admissions.find(a => 
      (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
      (a.id && String(a.id).toLowerCase() === cleanId)
    );
    if (adm) {
      student = buildStudentFromAdmission(adm);
    }
  }

  if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

  const billing = calculateStudentFees(student);
  res.json({ success: true, student: { id: student.identifier || student.id, fullName: student.fullName, branch: student.branch }, billing });
});

app.post('/api/students/:id/payments', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (user && user.role !== 'admin' && !hasPermission(user, 'manage_fees')) {
    return res.status(403).json({ success: false, error: 'Permission denied: manage_fees required' });
  }

  const { id } = req.params;
  const { amount, note, date, method } = req.body;
  const paymentAmount = Number(amount);

  if (!paymentAmount || paymentAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid payment amount is required.' });
  }

  const students = readData('students.json', []);
  const cleanId = String(id).trim().toLowerCase();
  const sIdx = students.findIndex(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.email && s.email.toLowerCase() === cleanId) ||
    (s.id && String(s.id).toLowerCase() === cleanId)
  );

  if (sIdx === -1) return res.status(404).json({ success: false, error: 'Student not found' });

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
  const billing = calculateStudentFees(students[sIdx]);
  students[sIdx].fees = {
    total: `${billing.totalAccruedFee.toLocaleString()} BDT`,
    paid: `${billing.totalPaid.toLocaleString()} BDT`,
    due: `${billing.balanceDue.toLocaleString()} BDT`,
    status: billing.status
  };

  writeData('students.json', students);

  // Also sync admissions.json if exists
  const admissions = readData('admissions.json', []);
  const aIdx = admissions.findIndex(a => 
    (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
    (a.id && String(a.id).toLowerCase() === cleanId)
  );
  if (aIdx !== -1) {
    admissions[aIdx].payments = students[sIdx].payments;
    admissions[aIdx].feeInfo = students[sIdx].fees;
    writeData('admissions.json', admissions);
  }

  recordAuditLog('payment_recorded', `Payment ৳${paymentAmount.toLocaleString()} recorded for ${students[sIdx].fullName} (${students[sIdx].identifier})`, 'student', students[sIdx].identifier, students[sIdx].fullName, user);

  res.json({ 
    success: true, 
    message: `Payment of ৳${paymentAmount.toLocaleString()} recorded successfully`, 
    payment: newPayment, 
    billing,
    student: students[sIdx] 
  });
});

app.put('/api/students/:id/custom-fee', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (user && user.role !== 'admin' && !hasPermission(user, 'custom_student_fee') && !hasPermission(user, 'manage_fees')) {
    return res.status(403).json({ success: false, error: 'Permission denied: custom_student_fee required' });
  }

  const { id } = req.params;
  const { customMonthlyFee, specialDiscount, reason } = req.body;

  const students = readData('students.json', []);
  const cleanId = String(id).trim().toLowerCase();
  const sIdx = students.findIndex(s => 
    (s.identifier && s.identifier.toLowerCase() === cleanId) ||
    (s.id && String(s.id).toLowerCase() === cleanId)
  );

  if (sIdx === -1) return res.status(404).json({ success: false, error: 'Student not found' });

  // Branch check
  if (user && !hasBranchAccess(user, students[sIdx].branch)) {
    return res.status(403).json({ success: false, error: 'Cannot modify student fees outside your branch.' });
  }

  const oldRate = students[sIdx].customMonthlyFee;
  students[sIdx].customMonthlyFee = (customMonthlyFee !== undefined && customMonthlyFee !== '' && customMonthlyFee !== null) ? Number(customMonthlyFee) : null;
  if (specialDiscount !== undefined) students[sIdx].specialDiscount = Number(specialDiscount);

  // Recalculate fees
  const billing = calculateStudentFees(students[sIdx]);
  students[sIdx].fees = {
    total: `${billing.totalAccruedFee.toLocaleString()} BDT`,
    paid: `${billing.totalPaid.toLocaleString()} BDT`,
    due: `${billing.balanceDue.toLocaleString()} BDT`,
    status: billing.status
  };

  writeData('students.json', students);

  recordAuditLog('fee_customized', `Monthly fee customized for ${students[sIdx].fullName} (${students[sIdx].identifier}). Old: ${oldRate || 'standard'}, New: ${students[sIdx].customMonthlyFee || 'standard'}. Note: ${reason || 'N/A'}`, 'student', students[sIdx].identifier, students[sIdx].fullName, user);

  res.json({ 
    success: true, 
    message: 'Custom fee rate updated successfully', 
    billing,
    student: students[sIdx] 
  });
});

// ── AUDIT LOGS QUERY ──────────────────────────────────────────────
app.get('/api/admin/audit-logs', (req, res) => {
  const logs = readData('auditLogs.json', []);
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
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error.' });
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
