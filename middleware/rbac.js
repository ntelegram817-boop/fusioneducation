// ============================================================
// FUSION EDUCATION BD — RBAC & FEE ENGINE MIDDLEWARE
// ============================================================
const fs   = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

const readJson = (filename, defaultVal = []) => {
  try {
    const file = path.join(dataDir, filename);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`[RBAC] Error reading ${filename}:`, e.message);
  }
  return defaultVal;
};

const writeJson = (filename, data) => {
  try {
    const file = path.join(dataDir, filename);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    // Also sync to dist/data if exists
    const distFile = path.join(__dirname, '..', 'dist', 'data', filename);
    if (fs.existsSync(path.dirname(distFile))) {
      fs.writeFileSync(distFile, JSON.stringify(data, null, 2), 'utf8');
    }
    return true;
  } catch (e) {
    console.error(`[RBAC] Error writing ${filename}:`, e.message);
    return false;
  }
};

/**
 * Identify the current authenticated user from request cookies or session headers
 */
function getAuthenticatedUser(req) {
  // 1. Admin Session Check
  const adminCookie = req.cookies?.fusion_admin_session;
  const authHeader = req.headers['authorization'] || '';
  const adminEmail = req.headers['x-admin-email'] || req.cookies?.fusion_admin_email;

  if (adminCookie === 'true' || authHeader.includes('Bearer admin') || adminEmail === 'admin@fusioneducation.com') {
    return {
      id: 'usr_main_admin',
      name: 'Main Administrator',
      email: 'admin@fusioneducation.com',
      role: 'admin',
      branch: 'all',
      permissions: ['*'],
      status: 'active'
    };
  }

  // 2. Staff / Instructor Session Check
  const staffEmail = req.headers['x-staff-email'] || req.cookies?.fusion_staff_email;
  const staffBranch = req.headers['x-staff-branch'] || req.cookies?.fusion_staff_branch;

  if (staffEmail) {
    const users = readJson('users.json', []);
    const found = users.find(u => u.email && u.email.toLowerCase() === staffEmail.toLowerCase());
    if (found && found.status !== 'inactive') {
      return {
        ...found,
        branch: found.branch || staffBranch || 'Dinajpur'
      };
    }
    // Fallback if user in staff.json
    const staffList = readJson('staff.json', []);
    const staffFound = staffList.find(s => s.email && s.email.toLowerCase() === staffEmail.toLowerCase());
    if (staffFound) {
      return {
        id: staffFound.id || ('usr_' + Date.now()),
        name: staffFound.name,
        email: staffFound.email,
        role: staffFound.role === 'instructor' ? 'instructor' : 'staff',
        branch: staffFound.branch || staffBranch || 'Dinajpur',
        permissions: staffFound.permissions || [
          'view_students', 'edit_students', 'manage_admissions', 'manage_readmissions',
          'counseling', 'view_fees', 'manage_fees', 'view_reports'
        ],
        status: 'active'
      };
    }
  }

  // 3. Student Session Check
  const studentId = req.headers['x-student-id'] || req.cookies?.fusion_student_id;
  if (studentId) {
    const students = readJson('students.json', []);
    const cleanId = String(studentId).toLowerCase();
    const st = students.find(s => 
      (s.identifier && s.identifier.toLowerCase() === cleanId) ||
      (s.email && s.email.toLowerCase() === cleanId)
    );
    if (st) {
      return {
        id: st.identifier,
        name: st.fullName,
        email: st.email,
        role: 'student',
        branch: st.branch,
        permissions: ['student_self'],
        status: 'active'
      };
    }
  }

  return null;
}

/**
 * Check if user possesses given permission
 */
function hasPermission(user, permissionKey) {
  if (!user) return false;
  if (user.role === 'admin' || (user.permissions && user.permissions.includes('*'))) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permissionKey);
}

/**
 * Check if user is authorized to access data belonging to targetBranch
 */
function hasBranchAccess(user, targetBranch) {
  if (!user) return false;
  if (user.role === 'admin' || user.branch === 'all') return true;
  if (!targetBranch || targetBranch.toLowerCase() === 'all') return true;
  return String(user.branch).toLowerCase() === String(targetBranch).toLowerCase();
}

/**
 * Calculate active elapsed months between enrollment date and current date
 */
function calculateActiveMonths(enrollmentDate, targetDate = new Date()) {
  if (!enrollmentDate) return 1;
  const start = new Date(enrollmentDate);
  const now = new Date(targetDate);
  if (isNaN(start.getTime())) return 1;

  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() >= start.getDate()) {
    months += 1;
  }
  return Math.max(1, months);
}

/**
 * Real-time Student Fee Calculator supporting recurring monthly billing & custom rates
 */
function calculateStudentFees(student, course = null, targetDate = new Date()) {
  const courses = readJson('courses.json', []);
  const associatedCourse = course || courses.find(c => c.id === student.courseId || c.title === student.currentCourse) || courses[0];

  const initialDurationMonths = associatedCourse?.initialDurationMonths || 3;
  const standardMonthlyFee = associatedCourse?.monthlyFee !== undefined ? Number(associatedCourse.monthlyFee) : 1000;
  const admissionFee = associatedCourse?.admissionFee !== undefined ? Number(associatedCourse.admissionFee) : 1000;

  // Student specific custom rate or course standard
  const effectiveMonthlyRate = (student.customMonthlyFee !== null && student.customMonthlyFee !== undefined && !isNaN(Number(student.customMonthlyFee)))
    ? Number(student.customMonthlyFee)
    : standardMonthlyFee;

  const specialDiscount = Number(student.specialDiscount || 0);
  const activeMonths = calculateActiveMonths(student.enrollmentDate, targetDate);

  // Total Accrued Fee = Admission Fee + (Active Months * Effective Monthly Rate) - Special Discount
  const totalTuitionAccrued = activeMonths * effectiveMonthlyRate;
  const totalAccruedFee = Math.max(0, admissionFee + totalTuitionAccrued - specialDiscount);

  // Sum all payments
  const payments = Array.isArray(student.payments) ? student.payments : [];
  const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const balanceDue = Math.max(0, totalAccruedFee - totalPaid);

  let status = 'Unpaid';
  if (balanceDue === 0 && totalPaid > 0) {
    status = 'Paid';
  } else if (totalPaid > 0 && balanceDue > 0) {
    status = 'Partially Paid';
  }

  return {
    courseId: associatedCourse?.id || 'course-n5',
    courseTitle: associatedCourse?.title || student.currentCourse,
    initialDurationMonths,
    activeMonths,
    standardMonthlyFee,
    effectiveMonthlyRate,
    isCustomRate: effectiveMonthlyRate !== standardMonthlyFee,
    admissionFee,
    specialDiscount,
    totalTuitionAccrued,
    totalAccruedFee,
    totalPaid,
    balanceDue,
    status,
    payments
  };
}

/**
 * Record an audit log entry
 */
function recordAuditLog(action, details, targetType, targetId, targetName, performedBy) {
  try {
    const logs = readJson('auditLogs.json', []);
    const newEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      action,
      details,
      targetType: targetType || 'general',
      targetId: targetId || 'n/a',
      targetName: targetName || 'n/a',
      performedBy: performedBy || {
        name: 'System',
        email: 'system@fusion.com',
        role: 'system',
        branch: 'all'
      },
      timestamp: new Date().toISOString()
    };
    logs.unshift(newEntry);
    // Keep last 1000 logs
    if (logs.length > 1000) logs.length = 1000;
    writeJson('auditLogs.json', logs);
    return newEntry;
  } catch (err) {
    console.error('[AuditLog] Error recording log:', err.message);
    return null;
  }
}

module.exports = {
  readJson,
  writeJson,
  getAuthenticatedUser,
  hasPermission,
  hasBranchAccess,
  calculateActiveMonths,
  calculateStudentFees,
  recordAuditLog
};
