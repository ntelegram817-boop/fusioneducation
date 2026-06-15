const path = require('path');
const fs = require('fs').promises;

const STUDENT_SOURCE = path.join(__dirname, '../data/students.json');

async function loadStudents() {
  const raw = await fs.readFile(STUDENT_SOURCE, 'utf8');
  return JSON.parse(raw);
}

function ensureStudentAuthenticated(req, res, next) {
  if (req.session && req.session.isStudentAuthenticated) return next();
  res.status(401).json({ success: false, error: 'Authentication required' });
}

async function loginStudent(req, res) {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ success: false, error: 'Identifier and password required' });

  const students = await loadStudents();
  const idLower = String(identifier).toLowerCase().trim();
  const student = students.find(s => (s.email && s.email.toLowerCase() === idLower) || (s.passportOrNid && s.passportOrNid.toLowerCase() === idLower));

  if (!student) return res.status(401).json({ success: false, error: 'Invalid credentials' });

  // NOTE: This demo does not store passwords. Accept any password length >= 6 for matched student.
  if (String(password).length < 6) return res.status(401).json({ success: false, error: 'Invalid credentials' });

  req.session.isStudentAuthenticated = true;
  req.session.studentId = student.id;
  req.session.studentName = student.fullName;

  res.json({ success: true, redirect: '/pages/student-dashboard.html' });
}

function logoutStudent(req, res) {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, error: 'Unable to logout' });
    res.clearCookie('fusion_staff_session');
    res.json({ success: true });
  });
}

function getStudentProfile(req, res) {
  res.json({ id: req.session.studentId, name: req.session.studentName });
}

module.exports = { loginStudent, logoutStudent, ensureStudentAuthenticated, getStudentProfile };
