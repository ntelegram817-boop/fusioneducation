// ============================================================
// FUSION EDUCATION BD — RBAC & FEE ENGINE MIDDLEWARE
// ============================================================
const fs = require('fs');
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
  if (!targetBranch) return true; // If target branch isn't specified, they can only fetch their own implicitly
  if (targetBranch.toLowerCase() === 'all') return false; // Staff cannot request 'all' branches
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
  const associatedCourse = course || courses.find(c =>
    (student.courseId && c.id === student.courseId) ||
    (c.title && student.currentCourse && c.title.toLowerCase() === student.currentCourse.toLowerCase()) ||
    (c.title && student.course && c.title.toLowerCase() === student.course.toLowerCase()) ||
    (c.level && student.courseLevel && c.level.toLowerCase() === student.courseLevel.toLowerCase())
  ) || courses[0];

  const parseFee = val => typeof val === 'number' ? val : (parseInt(String(val || 0).replace(/[^\d]/g, ''), 10) || 0);

  const billingPlan = student.billingPlan || student.feeInfo?.billingPlan || associatedCourse?.billingType || 'course_fee';
  const initialDurationMonths = student.enrolledDurationMonths || student.durationMonths || student.feeInfo?.durationMonths || student.feeInfo?.initialDurationMonths || associatedCourse?.durationMonths || associatedCourse?.initialDurationMonths || 3;
  const activeMonths = calculateActiveMonths(student.enrollmentDate || student.submittedAt, targetDate);
  const specialDiscount = Number(student.specialDiscount || 0);
  const payments = Array.isArray(student.payments) ? student.payments : [];
  const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  if (billingPlan === 'course_fee') {
    // ── Full Course Package Billing Plan ──
    const courseRegularFee = Number(associatedCourse?.regularFee) || parseFee(associatedCourse?.fee) || 15000;
    const lockedCourseFee = (student.feeInfo?.finalFee !== undefined && !isNaN(Number(student.feeInfo.finalFee)))
      ? Number(student.feeInfo.finalFee)
      : (student.enrolledCourseFee !== undefined ? Number(student.enrolledCourseFee) : courseRegularFee);

    const totalAccruedFee = Math.max(0, lockedCourseFee - specialDiscount);
    const balanceDue = Math.max(0, totalAccruedFee - totalPaid);

    let status = 'Unpaid';
    if (balanceDue === 0 && totalPaid > 0) {
      status = 'Paid';
    } else if (totalPaid > 0 && balanceDue > 0) {
      status = 'Partially Paid';
    }

    return {
      courseId: associatedCourse?.id || 'course-n5',
      courseTitle: associatedCourse?.title || student.currentCourse || student.course,
      billingPlan: 'course_fee',
      initialDurationMonths,
      activeMonths,
      totalCourseFee: lockedCourseFee,
      standardCourseFee: courseRegularFee,
      effectiveMonthlyRate: 0,
      admissionFee: 0,
      specialDiscount,
      totalTuitionAccrued: totalAccruedFee,
      totalAccruedFee,
      totalPaid,
      balanceDue,
      status,
      payments
    };
  }

  // ── Monthly Recurring Billing Plan (Event-Driven) ──
  const courseMonthlyFee = associatedCourse?.monthlyEvent?.monthlyFee !== undefined 
    ? Number(associatedCourse.monthlyEvent.monthlyFee) 
    : (associatedCourse?.monthlyFee !== undefined ? Number(associatedCourse.monthlyFee) : 1500);
  const courseAdmissionFee = associatedCourse?.monthlyEvent?.admissionFee !== undefined 
    ? Number(associatedCourse.monthlyEvent.admissionFee) 
    : (associatedCourse?.admissionFee !== undefined ? Number(associatedCourse.admissionFee) : 1000);

  let lockedAdmissionFee = courseAdmissionFee;
  if (student.enrolledAdmissionFee !== undefined && student.enrolledAdmissionFee !== null && !isNaN(Number(student.enrolledAdmissionFee))) {
    lockedAdmissionFee = Number(student.enrolledAdmissionFee);
  } else if (student.feeInfo?.admissionFee !== undefined && !isNaN(Number(student.feeInfo.admissionFee))) {
    lockedAdmissionFee = Number(student.feeInfo.admissionFee);
  }

  let lockedMonthlyFee = courseMonthlyFee;
  if (student.enrolledMonthlyFee !== undefined && student.enrolledMonthlyFee !== null && !isNaN(Number(student.enrolledMonthlyFee))) {
    lockedMonthlyFee = Number(student.enrolledMonthlyFee);
  } else if (student.feeInfo?.monthlyFee !== undefined && !isNaN(Number(student.feeInfo.monthlyFee))) {
    lockedMonthlyFee = Number(student.feeInfo.monthlyFee);
  }

  const effectiveMonthlyRate = (student.customMonthlyFee !== null && student.customMonthlyFee !== undefined && !isNaN(Number(student.customMonthlyFee)))
    ? Number(student.customMonthlyFee)
    : lockedMonthlyFee;

  const totalTuitionAccrued = activeMonths * effectiveMonthlyRate;
  const totalAccruedFee = Math.max(0, lockedAdmissionFee + totalTuitionAccrued - specialDiscount);
  const balanceDue = Math.max(0, totalAccruedFee - totalPaid);

  let status = 'Unpaid';
  if (balanceDue === 0 && totalPaid > 0) {
    status = 'Paid';
  } else if (totalPaid > 0 && balanceDue > 0) {
    status = 'Partially Paid';
  }

  return {
    courseId: associatedCourse?.id || 'course-n5',
    courseTitle: associatedCourse?.title || student.currentCourse || student.course,
    billingPlan: 'monthly_pay',
    initialDurationMonths,
    activeMonths,
    standardMonthlyFee: lockedMonthlyFee,
    effectiveMonthlyRate,
    isCustomRate: (student.customMonthlyFee !== null && student.customMonthlyFee !== undefined) || (effectiveMonthlyRate !== courseMonthlyFee),
    admissionFee: lockedAdmissionFee,
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
    // Strip password from performedBy if it exists
    let cleanPerformedBy = performedBy;
    if (performedBy && performedBy.password) {
      const { password, ...rest } = performedBy;
      cleanPerformedBy = rest;
    }

    const newEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      action,
      details,
      targetType: targetType || 'general',
      targetId: targetId || 'n/a',
      targetName: targetName || 'n/a',
      performedBy: cleanPerformedBy || {
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
