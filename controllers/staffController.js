const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcrypt');

const STUDENT_SOURCE = path.join(__dirname, '../data/students.json');

// Replace this with real user storage in production (database, identity provider, etc.).
const staffUsers = [
  {
    email: 'staff@fusioneducation.com',
    passwordHash: '$2b$12$HCtmn.qxaRDB0iUVEsXKwuWJ6qXYy.51nomspJH0H7/cGLxJrQagO', // ChangeMe123!
    name: 'Fusion Education Staff'
  }
];

async function loadStudentData() {
  const raw = await fs.readFile(STUDENT_SOURCE, 'utf8');
  return JSON.parse(raw);
}

function ensureStaffAuthenticated(req, res, next) {
  if (req.session && req.session.isStaffAuthenticated) {
    return next();
  }

  res.status(401).json({ success: false, error: 'Authentication required' });
}

async function loginStaff(req, res) {
  const { email, password, branch } = req.body;

  if (!email || !password || !branch) {
    return res.status(400).json({ success: false, error: 'Email, password, and branch are required' });
  }

  const normalizedBranch = String(branch).trim();
  const user = staffUsers.find((account) => account.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  req.session.isStaffAuthenticated = true;
  req.session.staffEmail = user.email;
  req.session.staffBranch = normalizedBranch;
  req.session.staffName = user.name;

  res.json({ success: true, branch: normalizedBranch, redirect: '/pages/staff-dashboard.html' });
}

function logoutStaff(req, res) {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ success: false, error: 'Unable to logout at this time' });
    }

    res.clearCookie('fusion_staff_session');
    res.json({ success: true });
  });
}

function getStaffProfile(req, res) {
  res.json({
    email: req.session.staffEmail,
    name: req.session.staffName,
    branch: req.session.staffBranch
  });
}

async function getBranchStudents(req, res) {
  const branch = req.session.staffBranch;
  const students = await loadStudentData();
  const filtered = students.filter((student) => student.branch.toLowerCase() === branch.toLowerCase());

  res.json({ success: true, students: filtered, branch });
}

module.exports = {
  loginStaff,
  logoutStaff,
  getBranchStudents,
  getStaffProfile,
  ensureStaffAuthenticated
};
