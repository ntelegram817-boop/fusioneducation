/**
 * Staff Dashboard Management Script — Fusion Education BD
 * Executive Portal Architecture
 * Handles:
 *  - Staff authentication, branch switching & RBAC permission enforcement
 *  - Admissions review & management (Pending vs Admitted vs Graduated)
 *  - Real-time Tuition Fee Engine & Recurring Billing Sync
 *  - Full student profile editing (Visa, Course, Batch, Routine, Notes, Contacts)
 *  - Document management (Upload, preview, attach, delete)
 *  - 1-click Quick Admission & 1-click WhatsApp Due Notice
 *  - Course completion & Graduation approval
 *  - Walk-in / Paper Migration student enrollment
 *  - Student Record Deletion (with permission check)
 *  - Client-side Filtering, Sorting, Pagination & CSV Export
 *  - Print sheet & Branch Summary report generation
 */

// ── GLOBAL APPLICATION STATE ───────────────────────────────────
let studentList = [];
let currentFilterTab = 'all';
let currentBatchFilter = 'all';
let currentBranch = 'all';
let currentSort = 'date-desc';
let currentPage = 1;
let pageSize = 25;
let currentStaff = {
  name: 'Staff Member',
  email: '',
  branch: 'Dinajpur',
  role: 'staff',
  position: 'Branch Counselor',
  permissions: []
};
let viewingStudent = null;
let activeFeeStudentId = null;

// Staged documents for walk-in enrollment
let stagedNewStudentDocs = [];
let stagedNewStudentPhoto = null;

// Designation Mapping for Staff and Instructors
const userDesignations = {
  'instructor@fusion.com': 'Head Japanese Instructor',
  'dhaka.instructor@fusion.com': 'Senior Japanese Instructor',
  'bogura@fusion.com': 'Branch Manager',
  'dinajpur@fusion.com': 'Academic Coordinator',
  'staff@fusioneducation.com': 'Senior Counselor',
  'dhaka.staff@fusion.com': 'Branch Counselor',
  'rangpur.staff@fusion.com': 'Branch Counselor'
};

// ── UTILITY HELPERS ───────────────────────────────────────────
function getApiUrl(path) {
  if (window.location.port === '3000') return path;
  return 'http://localhost:3000' + path;
}

function getStaffAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (currentStaff && currentStaff.email) {
    headers['x-staff-email'] = currentStaff.email;
  }
  if (currentStaff && currentStaff.branch) {
    headers['x-staff-branch'] = currentStaff.branch;
  }
  return headers;
}

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#38bdf8');
  const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');

  toast.style.cssText = `
    background: #0f172a;
    border: 1px solid ${bgColor};
    border-left: 4px solid ${bgColor};
    color: #fff;
    padding: 0.85rem 1.25rem;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    animation: slideIn 0.3s ease;
    max-width: 420px;
  `;

  toast.innerHTML = `<i class="fas ${icon}" style="color:${bgColor}; font-size: 1.1rem;"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

// Mobile sidebar drawer toggle
window.toggleStaffSidebar = function(isOpen) {
  const sidebar = document.getElementById('portalSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;

  if (isOpen) {
    sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.add('show');
  } else {
    sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('show');
  }
};

// RBAC Permission Check Helper
window.hasStaffPermission = function(permKey) {
  if (!currentStaff) return false;
  if (currentStaff.role === 'admin') return true;
  const perms = currentStaff.permissions || [];
  if (!Array.isArray(perms)) return false;
  if (perms.includes('*') || perms.includes('all')) return true;
  return perms.includes(permKey);
};

function applyStaffPermissions() {
  const addStudentBtn = document.getElementById('addStudentBtn');
  if (addStudentBtn) {
    addStudentBtn.style.display = window.hasStaffPermission('manage_admissions') ? 'inline-flex' : 'none';
  }

  const printBranchBtn = document.getElementById('printBranchButton');
  if (printBranchBtn) {
    printBranchBtn.style.display = (window.hasStaffPermission('view_reports') || window.hasStaffPermission('export_reports')) ? 'inline-flex' : 'none';
  }

  const navItemBranchStaff = document.getElementById('navItemBranchStaff');
  if (navItemBranchStaff) {
    navItemBranchStaff.style.display = (window.hasStaffPermission('view_staff') || currentStaff.role === 'instructor' || currentStaff.role === 'admin') ? 'block' : 'none';
  }
}

function updateStaffProfileUI() {
  const staffNameEl = document.getElementById('staffName');
  const staffRoleEl = document.getElementById('staffRole');
  const staffAvatarEl = document.getElementById('staffAvatar');
  const activeBranchTextEl = document.getElementById('activeBranchText');
  const activeBranchHeaderName = document.getElementById('activeBranchHeaderName');
  const staffBranchSelector = document.getElementById('staffBranchSelector');
  const portalRoleBadge = document.getElementById('portalRoleBadge');

  if (staffNameEl) staffNameEl.textContent = currentStaff.name;
  if (staffRoleEl) staffRoleEl.textContent = currentStaff.position || 'Branch Counselor';
  if (staffAvatarEl) staffAvatarEl.textContent = (currentStaff.name || 'S').charAt(0).toUpperCase();

  const branchLabel = currentBranch === 'all' ? 'All Branches' : `${currentBranch} Campus`;
  if (activeBranchHeaderName) activeBranchHeaderName.textContent = branchLabel;
  if (activeBranchTextEl) activeBranchTextEl.textContent = currentBranch === 'all' ? 'All Branches' : currentBranch;

  if (staffBranchSelector) {
    staffBranchSelector.value = currentBranch;
  }

  if (portalRoleBadge) {
    if (currentStaff.role === 'instructor') {
      portalRoleBadge.innerHTML = `<i class="fas fa-chalkboard-teacher"></i> Instructor Portal`;
    } else if (currentStaff.role === 'admin') {
      portalRoleBadge.innerHTML = `<i class="fas fa-user-shield"></i> Admin Portal`;
    } else {
      portalRoleBadge.innerHTML = `<i class="fas fa-shield-alt"></i> Staff Portal`;
    }
  }
}

// ── 1. AUTHENTICATION & INITIALIZATION ─────────────────────────
async function initStaffSession() {
  const savedBranch = sessionStorage.getItem('fusion_staff_branch') || localStorage.getItem('fusion_staff_branch') || 'all';
  const savedName = sessionStorage.getItem('fusion_staff_name') || localStorage.getItem('fusion_staff_name');
  const savedEmail = sessionStorage.getItem('fusion_staff_email') || localStorage.getItem('fusion_staff_email') || '';
  const savedRole = sessionStorage.getItem('fusion_staff_role') || localStorage.getItem('fusion_staff_role') || 'staff';
  const savedPosition = sessionStorage.getItem('fusion_staff_position') || localStorage.getItem('fusion_staff_position');
  
  let savedPerms = [];
  try {
    savedPerms = JSON.parse(sessionStorage.getItem('fusion_staff_permissions') || localStorage.getItem('fusion_staff_permissions') || '[]');
  } catch (_) {}

  currentBranch = savedBranch;

  const position = savedPosition || userDesignations[savedEmail.toLowerCase()] || (savedRole === 'instructor' ? 'Japanese Instructor' : (savedRole === 'admin' ? 'Administrator' : 'Branch Counselor'));

  currentStaff = {
    name: savedName || (savedEmail ? savedEmail.split('@')[0].toUpperCase() : 'Staff Member'),
    email: savedEmail,
    branch: currentBranch,
    role: savedRole,
    position: position,
    permissions: savedPerms
  };

  updateStaffProfileUI();

  // Try to authenticate with backend /api/staff/me
  try {
    const res = await fetch(getApiUrl('/api/staff/me'), {
      headers: getStaffAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.authenticated && data.name) {
        const email = data.email || savedEmail || '';
        const truePosition = userDesignations[email.toLowerCase()] || (data.role === 'instructor' ? 'Japanese Instructor' : (data.role === 'admin' ? 'Administrator' : 'Branch Counselor'));
        
        currentStaff = {
          name: data.name || currentStaff.name,
          email: email,
          branch: data.branch || currentBranch,
          role: data.role || currentStaff.role,
          position: truePosition,
          permissions: Array.isArray(data.permissions) && data.permissions.length > 0 ? data.permissions : savedPerms
        };

        // If staff belongs to a specific branch and isn't admin/all, enforce that branch
        if (currentStaff.branch && currentStaff.branch.toLowerCase() !== 'all' && currentStaff.role !== 'admin' && !currentStaff.permissions.includes('*')) {
          currentBranch = currentStaff.branch;
        }

        sessionStorage.setItem('fusion_staff_branch', currentBranch);
        localStorage.setItem('fusion_staff_branch', currentBranch);
        sessionStorage.setItem('fusion_staff_name', currentStaff.name);
        localStorage.setItem('fusion_staff_name', currentStaff.name);
        sessionStorage.setItem('fusion_staff_role', currentStaff.role);
        localStorage.setItem('fusion_staff_role', currentStaff.role);
        sessionStorage.setItem('fusion_staff_position', currentStaff.position);
        localStorage.setItem('fusion_staff_position', currentStaff.position);
        sessionStorage.setItem('fusion_staff_permissions', JSON.stringify(currentStaff.permissions));
        localStorage.setItem('fusion_staff_permissions', JSON.stringify(currentStaff.permissions));

        updateStaffProfileUI();
      }
    }
  } catch (_) {}

  applyStaffPermissions();
  await loadStudents();
}

window.changeActiveBranch = function(branch) {
  currentBranch = branch;
  sessionStorage.setItem('fusion_staff_branch', branch);
  localStorage.setItem('fusion_staff_branch', branch);
  currentPage = 1;
  updateStaffProfileUI();
  loadStudents();
};

// ── 2. DATA LOADING & NORMALIZATION ───────────────────────────
async function loadStudents() {
  const studentTableBody = document.getElementById('studentTableBody');
  const emptyMessage = document.getElementById('emptyMessage');

  if (studentTableBody) {
    studentTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:3.5rem 1rem; color:#94a3b8;">
          <i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:0.85rem; color:#38bdf8;"></i>
          <div style="font-weight: 600; font-size: 0.95rem; color: #cbd5e1;">Syncing student records...</div>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 0.25rem;">Fetching live admissions &amp; ledger data</div>
        </td>
      </tr>
    `;
  }

  let fetchedList = [];

  // 1. Try Staff Students API
  try {
    const endpoint = getApiUrl(`/api/staff/students?branch=${encodeURIComponent(currentBranch)}`);
    const res = await fetch(endpoint, {
      headers: getStaffAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        fetchedList = data.students;
      }
    }
  } catch (e) {
    console.warn('[Staff] Backend API fetch failed:', e);
  }

  // 2. ONLY IF backend fetch returned 0 records, use DAO fallback
  if (fetchedList.length === 0 && window.DAO && window.DAO.Admissions) {
    try {
      const daoList = await window.DAO.Admissions.getAll();
      if (Array.isArray(daoList) && daoList.length > 0) {
        fetchedList = daoList;
      }
    } catch (_) {}
  }

  // 3. Static JSON fallback for local preview
  if (fetchedList.length === 0) {
    try {
      const directJson = await fetch('../data/admissions.json').then(r => r.ok ? r.json() : null).catch(() => null);
      if (Array.isArray(directJson) && directJson.length > 0) {
        fetchedList = directJson;
      }
    } catch (_) {}
  }

  // Deduplicate fetched list by unique student ID and phone
  const seenStudentKeys = new Set();
  const dedupedList = [];
  fetchedList.forEach(s => {
    const rawKey = String(s.applicationNumber || s.id || s.identifier || s.applicationId || '').trim().toLowerCase();
    const phoneKey = String(s.phone || '').replace(/\D/g, '');
    const uniqueKey = rawKey || (phoneKey ? `phone_${phoneKey}` : null);
    if (uniqueKey && !seenStudentKeys.has(uniqueKey)) {
      seenStudentKeys.add(uniqueKey);
      dedupedList.push(s);
    } else if (!uniqueKey) {
      dedupedList.push(s);
    }
  });

  // Normalize student records
  studentList = dedupedList.map((s, idx) => {
    const rawId = s.id || s.applicationNumber || s.applicationId || s.identifier || `FEBD-${Date.now()}-${idx}`;
    const rawAppNo = s.applicationNumber || s.applicationId || s.identifier || rawId;
    
    // Fee / Due Calculation Normalization
    let fees = s.fees;
    if (!fees) {
      const payments = Array.isArray(s.payments) ? s.payments : [];
      const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const admissionFee = Number(s.enrolledAdmissionFee ?? s.feeInfo?.admissionFee ?? 1000);
      const monthlyRate = Number(s.customMonthlyFee ?? s.enrolledMonthlyFee ?? s.feeInfo?.monthlyFee ?? 1000);
      const totalAccrued = admissionFee + monthlyRate;
      const due = Math.max(0, totalAccrued - totalPaid);
      fees = {
        totalAccruedFee: totalAccrued,
        totalPaid: totalPaid,
        balanceDue: due,
        status: due === 0 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Unpaid')
      };
    }

    return {
      id: rawId,
      applicationNumber: rawAppNo,
      applicationId: s.applicationId || rawAppNo,
      identifier: s.identifier || rawAppNo,
      fullName: s.fullName || s.name || 'Unnamed Student',
      email: s.email || '',
      phone: s.phone || '',
      dateOfBirth: s.dateOfBirth || '',
      gender: s.gender || 'Not specified',
      fatherName: s.fatherName || '',
      motherName: s.motherName || '',
      nidBirthCert: s.nidBirthCert || s.nid || '',
      bloodGroup: s.bloodGroup || '',
      occupation: s.occupation || 'Student',
      religion: s.religion || '',
      address: s.address || s.presentAddress || '',
      presentAddress: s.presentAddress || s.address || '',
      permanentAddress: s.permanentAddress || '',
      city: s.city || '',
      district: s.district || '',
      highestEducation: s.highestEducation || '',
      course: s.course || s.currentCourse || 'JLPT N5 - Beginner',
      courseLevel: s.courseLevel || 'N5',
      batch: s.batch || 'Batch 01',
      branch: s.branch || 'Dinajpur',
      visaType: s.visaType || 'student',
      emergencyName: s.emergencyName || '',
      emergencyPhone: s.emergencyPhone || '',
      emergencyRelation: s.emergencyRelation || 'Father',
      notes: s.notes || s.comment || '',
      status: (s.status || 'pending').toLowerCase(),
      photoUrl: s.photoUrl || s.documentPreview || s.photo || '../assets/images/student-placeholder.jpg',
      documentUrls: s.documentUrls || [],
      documents: s.documents || [],
      submittedAt: s.submittedAt || s.createdAt || s.enrollmentDate || new Date().toISOString(),
      admissionDate: s.admissionDate || s.submittedAt || '',
      classStartDate: s.classStartDate || '',
      classSchedule: s.classSchedule || '',
      courseEndDate: s.courseEndDate || '',
      courseStatus: s.courseStatus || (s.status === 'graduated' ? 'completed' : 'enrolled'),
      examInfo: s.examInfo || null,
      feeInfo: s.feeInfo || null,
      fees: fees,
      payments: Array.isArray(s.payments) ? s.payments : [],
      enrolledMonthlyFee: s.enrolledMonthlyFee ?? null,
      enrolledAdmissionFee: s.enrolledAdmissionFee ?? null,
      enrolledDurationMonths: s.enrolledDurationMonths ?? null,
      customMonthlyFee: s.customMonthlyFee ?? null,
      admittedAt: s.admittedAt || null
    };
  });

  // Populate dynamic batch filter dropdown
  const batchFilterSelect = document.getElementById('staffBatchFilter');
  if (batchFilterSelect) {
    const batches = Array.from(new Set(studentList.map(s => s.batch).filter(Boolean))).sort();
    const currentVal = currentBatchFilter || 'all';
    batchFilterSelect.innerHTML = `<option value="all">All Batches (${batches.length})</option>` +
      batches.map(b => `<option value="${b}">${b}</option>`).join('');
    batchFilterSelect.value = batches.includes(currentVal) ? currentVal : 'all';
  }

  updateMetrics();
  renderFilteredStudents();
}

// Helper: Find student by ID, Application Number, or Identifier
function findStudentById(id) {
  if (!id) return null;
  const clean = String(id).trim().toLowerCase();
  return studentList.find(s => 
    (s.id && String(s.id).trim().toLowerCase() === clean) ||
    (s.applicationNumber && String(s.applicationNumber).trim().toLowerCase() === clean) ||
    (s.applicationId && String(s.applicationId).trim().toLowerCase() === clean) ||
    (s.identifier && String(s.identifier).trim().toLowerCase() === clean) ||
    (s.phone && s.phone.replace(/\D/g, '') === clean.replace(/\D/g, ''))
  ) || null;
}

// ── 3. METRICS & KPI CALCULATIONS ─────────────────────────────
function updateMetrics() {
  let total = 0;
  let pending = 0;
  let admitted = 0;
  let duesCount = 0;
  let totalDueAmount = 0;
  let graduated = 0;

  studentList.forEach(s => {
    if (currentBranch !== 'all' && s.branch && s.branch.toLowerCase() !== currentBranch.toLowerCase()) {
      return;
    }
    total++;
    const st = (s.status || 'pending').toLowerCase();
    const cSt = (s.courseStatus || '').toLowerCase();
    const isGrad = st === 'graduated' || cSt === 'completed';

    if (isGrad) {
      graduated++;
      admitted++;
    } else if (st === 'admitted' || st === 'approved' || st === 'active') {
      admitted++;
    } else {
      pending++;
    }

    // Due check
    const due = s.fees?.balanceDue !== undefined 
      ? Number(s.fees.balanceDue) 
      : (s.fees?.due ? parseInt(String(s.fees.due).replace(/\D/g, ''), 10) : 0);
    if (due > 0) {
      duesCount++;
      totalDueAmount += due;
    }
  });

  const totalCountEl = document.getElementById('totalCount');
  const pendingCountEl = document.getElementById('pendingCount');
  const admittedCountEl = document.getElementById('admittedCount');
  const totalDueText = document.getElementById('totalDueText');
  const graduatedCountEl = document.getElementById('graduatedCount');

  if (totalCountEl) totalCountEl.textContent = total;
  if (pendingCountEl) pendingCountEl.textContent = pending;
  if (admittedCountEl) admittedCountEl.textContent = admitted;
  if (graduatedCountEl) graduatedCountEl.textContent = graduated;
  if (totalDueText) totalDueText.textContent = `৳${totalDueAmount.toLocaleString()}`;

  // Update tabs badges
  const bAll = document.getElementById('badgeAll');
  const bPending = document.getElementById('badgePending');
  const bAdmitted = document.getElementById('badgeAdmitted');
  const bDues = document.getElementById('badgeDues');
  const bGraduated = document.getElementById('badgeGraduated');

  if (bAll) bAll.textContent = total;
  if (bPending) bPending.textContent = pending;
  if (bAdmitted) bAdmitted.textContent = admitted;
  if (bDues) bDues.textContent = duesCount;
  if (bGraduated) bGraduated.textContent = graduated;
}

// ── 4. FILTERING, SEARCH, SORTING & PAGINATION ────────────────
window.setStaffFilterTab = function(tab) {
  currentFilterTab = tab;
  currentPage = 1;

  document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.staff-kpi-card').forEach(c => c.classList.remove('active-filter'));

  const navId = tab === 'all' ? 'navTabAll' : (tab === 'pending' ? 'navTabPending' : (tab === 'admitted' ? 'navTabAdmitted' : (tab === 'dues' ? 'navTabDues' : 'navTabGraduated')));
  document.getElementById(navId)?.classList.add('active');

  const kpiId = tab === 'all' ? 'kpiCardAll' : (tab === 'pending' ? 'kpiCardPending' : (tab === 'admitted' ? 'kpiCardAdmitted' : (tab === 'dues' ? 'kpiCardDues' : 'kpiCardGraduated')));
  document.getElementById(kpiId)?.classList.add('active-filter');

  renderFilteredStudents();
};

window.handleStaffBatchFilter = function(batch) {
  currentBatchFilter = batch;
  currentPage = 1;
  renderFilteredStudents();
};

window.handleStaffSearch = function() {
  currentPage = 1;
  renderFilteredStudents();
};

window.handleStaffSort = function(sortVal) {
  currentSort = sortVal;
  currentPage = 1;
  renderFilteredStudents();
};

window.handlePageSizeChange = function(sizeVal) {
  pageSize = sizeVal === 'all' ? 99999 : parseInt(sizeVal, 10);
  currentPage = 1;
  renderFilteredStudents();
};

function getFilteredAndSortedStudents() {
  const searchTerm = (document.getElementById('staffSearchInput')?.value || '').trim().toLowerCase();

  let filtered = studentList.filter(s => {
    // Branch Filter
    if (currentBranch !== 'all' && s.branch && s.branch.toLowerCase() !== currentBranch.toLowerCase()) {
      return false;
    }

    // Batch Filter
    if (currentBatchFilter && currentBatchFilter !== 'all') {
      if (s.batch !== currentBatchFilter) return false;
    }

    const st = (s.status || 'pending').toLowerCase();
    const cSt = (s.courseStatus || '').toLowerCase();
    const isGraduated = st === 'graduated' || cSt === 'completed';
    const isAdmitted = st === 'admitted' || st === 'approved' || st === 'active' || isGraduated;
    const isPending = !isAdmitted;

    const due = s.fees?.balanceDue !== undefined 
      ? Number(s.fees.balanceDue) 
      : (s.fees?.due ? parseInt(String(s.fees.due).replace(/\D/g, ''), 10) : 0);
    const hasDue = due > 0;

    if (currentFilterTab === 'pending' && !isPending) return false;
    if (currentFilterTab === 'admitted' && !isAdmitted) return false;
    if (currentFilterTab === 'dues' && !hasDue) return false;
    if (currentFilterTab === 'graduated' && !isGraduated) return false;

    if (searchTerm) {
      const matchStr = `${s.fullName} ${s.applicationNumber} ${s.id} ${s.phone} ${s.email} ${s.course} ${s.batch} ${s.city} ${s.visaType}`.toLowerCase();
      if (!matchStr.includes(searchTerm)) return false;
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (currentSort === 'name-asc') {
      return (a.fullName || '').localeCompare(b.fullName || '');
    }
    if (currentSort === 'due-desc') {
      const dueA = a.fees?.balanceDue || 0;
      const dueB = b.fees?.balanceDue || 0;
      return dueB - dueA;
    }
    if (currentSort === 'date-asc') {
      return new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0);
    }
    // Default: date-desc
    return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
  });

  return filtered;
}

function renderFilteredStudents() {
  const studentTableBody = document.getElementById('studentTableBody');
  const emptyMessage = document.getElementById('emptyMessage');
  const tableCountInfo = document.getElementById('tableCountInfo');
  const paginationBar = document.getElementById('paginationBar');
  const paginationSummary = document.getElementById('paginationSummary');
  const paginationButtons = document.getElementById('paginationButtons');

  const allFiltered = getFilteredAndSortedStudents();
  const totalItems = allFiltered.length;

  if (totalItems === 0) {
    if (studentTableBody) studentTableBody.innerHTML = '';
    if (emptyMessage) emptyMessage.style.display = 'block';
    if (tableCountInfo) tableCountInfo.textContent = 'Showing 0 student records';
    if (paginationBar) paginationBar.style.display = 'none';
    return;
  }

  if (emptyMessage) emptyMessage.style.display = 'none';
  if (paginationBar) paginationBar.style.display = 'flex';

  // Pagination calculation
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pagedList = allFiltered.slice(startIndex, endIndex);

  if (tableCountInfo) {
    tableCountInfo.textContent = `Showing ${startIndex + 1}–${endIndex} of ${totalItems} student records`;
  }
  if (paginationSummary) {
    paginationSummary.textContent = `Page ${currentPage} of ${totalPages} (${totalItems} total)`;
  }

  // Render pagination buttons
  if (paginationButtons) {
    let btnsHtml = `
      <button type="button" class="staff-page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''} title="Previous Page">
        <i class="fas fa-chevron-left"></i>
      </button>
    `;

    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2)) {
        btnsHtml += `
          <button type="button" class="staff-page-btn ${p === currentPage ? 'active' : ''}" onclick="goToPage(${p})">
            ${p}
          </button>
        `;
      } else if (p === currentPage - 3 || p === currentPage + 3) {
        btnsHtml += `<span style="padding: 0 0.25rem; color:#64748b;">...</span>`;
      }
    }

    btnsHtml += `
      <button type="button" class="staff-page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''} title="Next Page">
        <i class="fas fa-chevron-right"></i>
      </button>
    `;

    paginationButtons.innerHTML = btnsHtml;
  }

  // Permissions check
  const canAdmit = window.hasStaffPermission('manage_admissions');
  const canFee = window.hasStaffPermission('view_fees') || window.hasStaffPermission('manage_fees');
  const canEdit = window.hasStaffPermission('edit_students');
  const canDelete = window.hasStaffPermission('manage_admissions') || currentStaff.role === 'admin';
  const canPrint = window.hasStaffPermission('view_reports') || window.hasStaffPermission('export_reports');

  if (studentTableBody) {
    studentTableBody.innerHTML = pagedList.map((s, index) => {
      const globalIndex = startIndex + index + 1;
      const st = (s.status || 'pending').toLowerCase();
      const cSt = (s.courseStatus || '').toLowerCase();
      const isGraduated = st === 'graduated' || cSt === 'completed';
      const isAdmitted = st === 'admitted' || st === 'approved' || st === 'active' || isGraduated;
      const isRejected = st === 'rejected';

      let statusBadgeClass = 'pending';
      let statusLabel = '🟡 Pending';
      if (isGraduated) {
        statusBadgeClass = 'graduated';
        statusLabel = '🎓 Graduated';
      } else if (cSt === 'awaiting_completion') {
        statusBadgeClass = 'pending';
        statusLabel = '🟡 Awaiting Review';
      } else if (isAdmitted) {
        statusBadgeClass = 'admitted';
        statusLabel = '🟢 Admitted';
      } else if (isRejected) {
        statusBadgeClass = 'rejected';
        statusLabel = '🔴 Rejected';
      }

      const rawDate = s.admissionDate || s.submittedAt || s.enrollmentDate;
      let dateFormatted = 'Recent';
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
          dateFormatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } else {
          dateFormatted = 'Recent';
        }
      }
      const safeId = s.id || s.applicationNumber;
      const sName = s.fullName || 'Unnamed Student';

      // Due and Fee calculations
      const due = s.fees?.balanceDue !== undefined 
        ? Number(s.fees.balanceDue) 
        : (s.fees?.due ? parseInt(String(s.fees.due).replace(/\D/g, ''), 10) : 0);
      const totalPaid = s.fees?.totalPaid !== undefined
        ? Number(s.fees.totalPaid)
        : (s.fees?.paid ? parseInt(String(s.fees.paid).replace(/\D/g, ''), 10) : (Array.isArray(s.payments) ? s.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) : 0));
      const hasDue = due > 0;

      return `
        <tr>
          <td style="font-weight:700; color:#64748b; text-align:center;">${globalIndex}</td>
          <td>
            <div class="staff-student-cell">
              <img src="${s.photoUrl}" alt="Photo" class="staff-student-avatar" onerror="this.src='../assets/images/student-placeholder.jpg'">
              <div>
                <div class="staff-student-name">${sName}</div>
                <div style="display:flex; align-items:center; gap:0.35rem; margin-top:2px;">
                  <span class="staff-student-meta">${s.applicationNumber}</span>
                  ${s.visaType ? `<span style="background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.25); padding:0.02rem 0.35rem; border-radius:4px; font-size:0.67rem; text-transform:capitalize; font-weight:600;">${s.visaType.replace('_', ' ')}</span>` : ''}
                </div>
                <div class="staff-student-phone">
                  <i class="fas fa-phone" style="font-size:0.68rem; color:#38bdf8;"></i> ${s.phone || 'No phone'}
                </div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight:600; color:#fff; font-size:0.86rem; line-height:1.2;">${s.course}</div>
            <div style="display:flex; gap:0.35rem; align-items:center; margin-top:3px; flex-wrap:wrap;">
              <span style="font-size:0.7rem; color:#38bdf8; background:rgba(56,189,248,0.1); padding:0.08rem 0.35rem; border-radius:4px; font-weight:600;">${s.courseLevel || 'Level N5'}</span>
              <span style="font-size:0.7rem; color:#cbd5e1; background:rgba(255,255,255,0.06); padding:0.08rem 0.35rem; border-radius:4px; font-weight:600;">${s.batch || 'Batch 01'}</span>
              ${s.classStartDate ? `<span style="font-size:0.7rem; color:#c084fc; background:rgba(168,85,247,0.1); padding:0.08rem 0.35rem; border-radius:4px;" title="Start Date"><i class="far fa-calendar-alt"></i> ${s.classStartDate}</span>` : ''}
            </div>
          </td>
          <td>
            ${hasDue ? `
              <span class="staff-badge" style="background:rgba(239,68,68,0.15); color:#fca5a5; border:1px solid rgba(239,68,68,0.35); font-weight:700; padding:0.15rem 0.45rem; font-size:0.72rem;">
                🔴 Due: ৳${due.toLocaleString()}
              </span>
              <div style="font-size:0.7rem; color:#94a3b8; margin-top:2px;">Paid: ৳${totalPaid.toLocaleString()}</div>
            ` : `
              <span class="staff-badge" style="background:rgba(16,185,129,0.15); color:#6ee7b7; border:1px solid rgba(16,185,129,0.35); font-weight:700; padding:0.15rem 0.45rem; font-size:0.72rem;">
                🟢 Paid
              </span>
              <div style="font-size:0.7rem; color:#94a3b8; margin-top:2px;">Total: ৳${totalPaid.toLocaleString()}</div>
            `}
          </td>
          <td>
            <span class="staff-badge ${statusBadgeClass}">${statusLabel}</span>
          </td>
          <td style="font-size:0.8rem; color:#94a3b8; white-space:nowrap;">
            ${dateFormatted}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <div class="staff-action-group">
              ${!isAdmitted && canAdmit ? `
                <button type="button" class="tbl-btn admit" onclick="quickAdmitStudent('${safeId}')" title="Quick Approve &amp; Admit Student">
                  <i class="fas fa-check"></i> Admit
                </button>
              ` : ''}

              ${hasDue && s.phone ? `
                <button type="button" class="tbl-btn whatsapp" onclick="sendWhatsAppDueReminder('${safeId}')" title="Send WhatsApp Due Notice">
                  <i class="fab fa-whatsapp"></i>
                </button>
              ` : ''}

              ${canEdit && (cSt === 'awaiting_completion' || (isAdmitted && !isGraduated)) ? `
                <button type="button" class="tbl-btn graduate" style="background:rgba(99,102,241,0.16); border-color:rgba(99,102,241,0.4); color:#c7d2fe;" onclick="approveStudentCompletion('${safeId}')" title="Approve Course Completion &amp; Graduation">
                  <i class="fas fa-graduation-cap"></i>
                </button>
              ` : ''}

              ${canFee ? `
                <button type="button" class="tbl-btn fees" onclick="openFeeModal('${safeId}')" title="Manage Tuition &amp; Payments">
                  <i class="fas fa-money-bill-wave"></i> Fees
                </button>
              ` : ''}

              ${canEdit ? `
                <button type="button" class="tbl-btn edit" onclick="openEditModal('${safeId}')" title="Edit Student Profile">
                  <i class="fas fa-edit"></i>
                </button>
              ` : ''}

              <button type="button" class="tbl-btn primary" onclick="showViewModal('${safeId}')" title="View Full Profile">
                <i class="fas fa-eye"></i> View
              </button>

              ${canDelete ? `
                <button type="button" class="tbl-btn delete" onclick="deleteStudentRecord('${safeId}')" title="Delete Student Record">
                  <i class="fas fa-trash-alt"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

window.goToPage = function(p) {
  currentPage = p;
  renderFilteredStudents();
};

// ── 5. 1-CLICK WHATSAPP DUE NOTICE ────────────────────────────
window.sendWhatsAppDueReminder = function(studentId) {
  const student = findStudentById(studentId);
  if (!student) return showToast('Student not found.', 'error');
  if (!student.phone) return showToast('Student has no phone number recorded.', 'error');

  const cleanPhone = student.phone.replace(/\D/g, '');
  let waPhone = cleanPhone;
  if (waPhone.startsWith('01')) {
    waPhone = '880' + waPhone.substring(1);
  } else if (!waPhone.startsWith('880') && waPhone.length === 10) {
    waPhone = '880' + waPhone;
  }

  const due = student.fees?.balanceDue !== undefined 
    ? Number(student.fees.balanceDue) 
    : (student.fees?.due ? parseInt(String(student.fees.due).replace(/\D/g, ''), 10) : 0);
  const paid = student.fees?.totalPaid !== undefined
    ? Number(student.fees.totalPaid)
    : (student.fees?.paid ? parseInt(String(student.fees.paid).replace(/\D/g, ''), 10) : 0);

  const course = student.course || student.currentCourse || 'Japanese Language Course';
  const branchName = student.branch || currentStaff?.branch || 'Fusion Education BD';
  const message = `আসসালামু আলাইকুম ${student.fullName}, Fusion Education BD (${branchName})-এর পক্ষ থেকে জানানো যাচ্ছে যে, আপনার ${course} কোর্সের বকেয়া ফি ৳${due.toLocaleString()} টাকা (পরিশোধিত: ৳${paid.toLocaleString()} টাকা)। অনুগ্রহ করে দ্রুত বকেয়া পরিশোধ করে আপনার ক্লাস ও স্টুডেন্ট আইডি নিশ্চিত করুন। ধন্যবাদ!`;

  const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

// ── 6. APPROVE COURSE COMPLETION & GRADUATION ─────────────────
window.approveStudentCompletion = async function(studentId) {
  const student = findStudentById(studentId);
  if (!student) return showToast('Student not found.', 'error');

  const due = student.fees?.balanceDue !== undefined 
    ? Number(student.fees.balanceDue) 
    : (student.fees?.due ? parseInt(String(student.fees.due).replace(/\D/g, ''), 10) : 0);

  let confirmMsg = `আপনি কি নিশ্চিত যে ${student.fullName}-এর কোর্স সফলভাবে সমাপ্তি (Graduation) অনুমোদন করতে চান?`;
  if (due > 0) {
    confirmMsg = `সতর্কতা: এই শিক্ষার্থীর এখনও ৳${due.toLocaleString()} টাকা বকেয়া রয়েছে। আপনি কি নিশ্চিত যে কোর্স সমাপ্তি অনুমোদন করবেন?`;
  }

  if (!confirm(confirmMsg)) return;

  try {
    const endpoint = getApiUrl(`/api/staff/students/${encodeURIComponent(studentId)}/approve-completion`);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getStaffAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include'
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Course completion approved successfully!', 'success');
      await loadStudents();
    } else {
      showToast(data.error || 'Failed to approve course completion.', 'error');
    }
  } catch (err) {
    console.error('Error approving completion:', err);
    showToast('Failed to approve completion due to server connection error.', 'error');
  }
};

// ── 7. DELETE STUDENT RECORD ──────────────────────────────────
window.deleteStudentRecord = async function(studentId) {
  const student = findStudentById(studentId);
  if (!student) return showToast('Student not found.', 'error');

  if (!confirm(`Are you sure you want to PERMANENTLY delete the student record for "${student.fullName}" (${student.applicationNumber})? This action cannot be undone.`)) {
    return;
  }

  try {
    const endpoint = getApiUrl(`/api/staff/students/${encodeURIComponent(studentId)}`);
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: getStaffAuthHeaders(),
      credentials: 'include'
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message || 'Student deleted successfully.', 'success');
      await loadStudents();
    } else {
      showToast(data.error || 'Failed to delete student.', 'error');
    }
  } catch (err) {
    console.error('Delete failed:', err);
    showToast('Server error while deleting student.', 'error');
  }
};

// ── 8. VIEW PROFILE MODAL ──────────────────────────────────────
window.showViewModal = function(id) {
  const student = findStudentById(id);
  if (!student) return;

  viewingStudent = student;
  const modal = document.getElementById('viewModal');
  const body = document.getElementById('viewModalBody');
  const title = document.getElementById('viewModalTitle');
  const badge = document.getElementById('viewStatusBadge');
  const sName = student.fullName || 'Student Profile';

  if (title) title.textContent = sName;
  
  const rawStatus = (student.status || 'pending').toLowerCase();
  const isAdmitted = ['admitted', 'approved', 'active', 'active student', 'enrolled'].includes(rawStatus);
  const isRejected = ['rejected', 'cancelled'].includes(rawStatus);
  const isGraduated = rawStatus === 'graduated' || student.courseStatus === 'completed';

  if (badge) {
    if (isGraduated) {
      badge.className = 'staff-badge graduated';
      badge.textContent = '🎓 Graduated';
    } else if (isAdmitted) {
      badge.className = 'staff-badge admitted';
      badge.textContent = '🟢 Admitted Student';
    } else if (isRejected) {
      badge.className = 'staff-badge rejected';
      badge.textContent = '🔴 Rejected';
    } else {
      badge.className = 'staff-badge pending';
      badge.textContent = '🟡 Admission Pending';
    }
  }

  const docs = student.documents || (student.documentUrls ? student.documentUrls.map((u, i) => ({ name: `Document ${i+1}`, url: u })) : []);
  const studentCleanId = student.identifier || student.applicationNumber || student.id || '';

  const docsHtml = docs.length > 0
    ? `<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:0.75rem;">` + docs.map((d, i) => `
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(37,99,235,0.08); border:1px solid rgba(56,189,248,0.25); padding:0.6rem 0.85rem; border-radius:10px;">
          <a href="${d.url}" target="_blank" style="color:#93c5fd; text-decoration:none; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.45rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;" title="${d.name || 'Document'}">
            <i class="fas ${d.url.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-image'}" style="color:#38bdf8; font-size:1.1rem;"></i>
            <span style="overflow:hidden; text-overflow:ellipsis;">${d.name || `Document ${i+1}`}</span>
            <i class="fas fa-external-link-alt" style="font-size:0.7rem; opacity:0.7; flex-shrink:0;"></i>
          </a>
          <button type="button" onclick="deleteStudentDocument('${studentCleanId}', ${i})" style="background:none; border:none; color:#f87171; cursor:pointer; padding:0 0.35rem; margin-left:0.5rem;" title="Remove Document">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `).join('') + `</div>`
    : '<div style="color:#94a3b8; font-size:0.85rem; padding:0.75rem 0;"><i class="fas fa-info-circle"></i> No certificates or documents attached yet.</div>';

  const emergencyInfo = student.emergencyName 
    ? `${student.emergencyName} (${student.emergencyRelation || 'Guardian'}${student.emergencyPhone ? ' • ' + student.emergencyPhone : ''})`
    : 'N/A';

  if (body) {
    body.innerHTML = `
      <div style="display:flex; gap:1.5rem; align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap; background:rgba(255,255,255,0.02); padding:1.25rem; border-radius:14px; border:1px solid var(--staff-card-border);">
        <img src="${student.photoUrl}" alt="Photo" style="width:96px; height:96px; border-radius:16px; object-fit:cover; border:2px solid #38bdf8; background:#1e293b; box-shadow:0 6px 18px rgba(0,0,0,0.5);" onerror="this.src='../assets/images/student-placeholder.jpg'">
        <div style="flex:1; min-width:240px;">
          <h3 style="margin:0 0 0.25rem; font-size:1.35rem; color:#fff;">${sName}</h3>
          <p style="margin:0 0 0.5rem; color:#38bdf8; font-weight:700; font-size:0.95rem; font-family:monospace;">ID: ${student.applicationNumber || student.id}</p>
          <div style="display:flex; gap:0.6rem; flex-wrap:wrap; font-size:0.84rem; color:#94a3b8;">
            <span>Branch: <strong style="color:#fff;">${student.branch || 'Dinajpur'}</strong></span> •
            <span>Batch: <strong style="color:#fff;">${student.batch || 'Batch 01'}</strong></span> •
            <span>Visa: <strong style="color:#38bdf8; text-transform:capitalize;">${(student.visaType || 'student').replace('_', ' ')}</strong></span> •
            <span>Admitted: <strong style="color:#fff;">${student.admissionDate || 'Recent'}</strong></span>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1rem; background:rgba(255,255,255,0.02); padding:1.25rem; border-radius:14px; border:1px solid var(--staff-card-border); margin-bottom:1.25rem;">
        <div><span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">EMAIL ADDRESS</span><strong style="color:#fff;">${student.email || 'N/A'}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">PHONE NUMBER</span><strong style="color:#fff;">${student.phone || 'N/A'}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">DATE OF BIRTH &amp; GENDER</span><strong style="color:#fff;">${student.dateOfBirth || 'N/A'} (${student.gender || 'N/A'})</strong></div>
        <div><span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">BLOOD GROUP</span><strong style="color:#38bdf8;">${student.bloodGroup || 'Not Specified'}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">FATHER'S NAME</span><strong style="color:#fff;">${student.fatherName || 'N/A'}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">MOTHER'S NAME</span><strong style="color:#fff;">${student.motherName || 'N/A'}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">NID / BIRTH REG</span><strong style="color:#fff;">${student.nidBirthCert || 'N/A'}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">OCCUPATION / EDUCATION</span><strong style="color:#fff;">${student.occupation || 'Student'} • ${student.highestEducation || 'HSC'}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">PRESENT ADDRESS</span><strong style="color:#fff;">${student.presentAddress || student.city || 'N/A'}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">PERMANENT ADDRESS</span><strong style="color:#fff;">${student.permanentAddress || 'N/A'}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">ENROLLED COURSE</span><strong style="color:#fff;">${student.course} (${student.courseLevel || 'N5'})</strong></div>
        <div><span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">EMERGENCY GUARDIAN</span><strong style="color:#fff;">${emergencyInfo}</strong></div>
      </div>

      <!-- Class Routine & Schedule -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; background:rgba(168,85,247,0.06); border:1px solid rgba(168,85,247,0.22); padding:1.25rem; border-radius:14px; margin-bottom:1.25rem;">
        <div><span style="color:#c084fc; font-size:0.74rem; display:block; text-transform:uppercase;">CLASS START DATE</span><strong style="color:#fff;">${student.classStartDate || 'Upcoming'}</strong></div>
        <div><span style="color:#c084fc; font-size:0.74rem; display:block; text-transform:uppercase;">ESTIMATED COURSE END</span><strong style="color:#fff;">${student.courseEndDate || 'Upon Completion'}</strong></div>
        <div><span style="color:#c084fc; font-size:0.74rem; display:block; text-transform:uppercase;">WEEKLY ROUTINE</span><strong style="color:#fff;">${student.classSchedule || 'Announced upon class start'}</strong></div>
        <div><span style="color:#c084fc; font-size:0.74rem; display:block; text-transform:uppercase;">COURSE STATUS</span><strong style="color:#38bdf8; text-transform:capitalize;">${student.courseStatus || 'Enrolled'}</strong></div>
      </div>

      <!-- Documents Gallery & Quick Attach -->
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--staff-card-border); border-radius:14px; padding:1.25rem; margin-bottom:1.25rem;">
        <h4 style="margin:0 0 0.75rem; color:#cbd5e1; font-size:0.95rem; display:flex; align-items:center; gap:0.45rem;">
          <i class="fas fa-paperclip" style="color:#38bdf8;"></i> Attached Certificates &amp; Documents (${docs.length})
        </h4>
        <div>${docsHtml}</div>

        <!-- Quick Attach Form -->
        <div style="margin-top:1rem; background:rgba(10,15,29,0.85); border:1px solid rgba(56,189,248,0.25); border-radius:10px; padding:0.9rem;">
          <div style="font-weight:700; color:#38bdf8; font-size:0.84rem; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;">
            <i class="fas fa-cloud-upload-alt"></i> Attach Additional Document to Profile
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
            <select id="quickDocCategory" class="staff-select-input" style="font-size:0.8rem; padding:0.45rem 0.65rem;">
              <option value="Academic Certificate">Academic Certificate (SSC/HSC)</option>
              <option value="NID / Birth Certificate">NID / Birth Certificate Scan</option>
              <option value="Passport Copy">Passport Copy</option>
              <option value="Paper Admission Form">Scanned Admission Form</option>
              <option value="Offline Money Receipt">Offline Money Receipt</option>
              <option value="JLPT Certificate">Official JLPT/NAT Certificate</option>
              <option value="Other Document">Other Document</option>
            </select>
            <input type="file" id="quickDocFileInput" accept=".pdf,image/*,.doc,.docx" style="font-size:0.8rem; color:#94a3b8; max-width:220px;">
            <button type="button" class="staff-action-btn primary" id="quickUploadDocBtn" onclick="uploadStudentDocument('${studentCleanId}')" style="padding:0.45rem 0.85rem; font-size:0.82rem;">
              <i class="fas fa-upload"></i> Upload &amp; Attach
            </button>
          </div>
        </div>
      </div>

      <!-- Counselor Remarks -->
      <div style="background:rgba(255,255,255,0.02); padding:1.15rem; border-radius:12px; border:1px solid var(--staff-card-border);">
        <span style="color:#94a3b8; font-size:0.74rem; display:block; text-transform:uppercase;">STAFF &amp; COUNSELOR REMARKS</span>
        <p style="margin:0.35rem 0 0; color:#e2e8f0; font-size:0.9rem; line-height:1.5;">${student.notes || 'No counseling remarks recorded yet.'}</p>
      </div>
    `;
  }

  modal?.classList.add('open');
};

window.closeViewModal = function() {
  document.getElementById('viewModal')?.classList.remove('open');
  viewingStudent = null;
};

window.openEditFromView = function() {
  if (viewingStudent) {
    const id = viewingStudent.id || viewingStudent.applicationNumber;
    closeViewModal();
    openEditModal(id);
  }
};

// ── 9. DOCUMENT UPLOAD & REMOVAL ──────────────────────────────
window.uploadStudentDocument = async function(studentId) {
  const fileInput = document.getElementById('quickDocFileInput');
  const catSelect = document.getElementById('quickDocCategory');
  const uploadBtn = document.getElementById('quickUploadDocBtn');

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showToast('Please choose a document file to attach first.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const title = (catSelect?.value || 'Document') + ' - ' + file.name;

  const formData = new FormData();
  formData.append('documents', file);
  formData.append('documentName', title);

  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
  }

  try {
    const endpoint = getApiUrl(`/api/staff/students/${encodeURIComponent(studentId)}/documents`);
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: getStaffAuthHeaders(),
      credentials: 'include',
      body: formData
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${resp.status}`);
    }

    const data = await resp.json();
    if (!data.success) throw new Error(data.error || 'Upload failed');

    // Update local student reference
    const cleanId = String(studentId).trim().toLowerCase();
    const st = studentList.find(s => 
      (s.id && String(s.id).toLowerCase() === cleanId) ||
      (s.identifier && s.identifier.toLowerCase() === cleanId) ||
      (s.applicationNumber && s.applicationNumber.toLowerCase() === cleanId)
    );
    if (st) {
      st.documents = data.documents;
      st.documentUrls = data.documents.map(d => d.url);
      st.documentUrl = st.documentUrls[0] || null;
      if (viewingStudent) viewingStudent = st;
      showViewModal(studentId);
    }

    showToast('Document uploaded and attached successfully!', 'success');
  } catch (err) {
    console.error('Doc upload failed:', err);
    showToast('Failed to upload document: ' + (err.message || 'Unknown error'), 'error');
  } finally {
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload &amp; Attach';
    }
  }
};

window.deleteStudentDocument = async function(studentId, docIndex) {
  if (!confirm('Are you sure you want to remove this attached document?')) return;

  try {
    const endpoint = getApiUrl(`/api/staff/students/${encodeURIComponent(studentId)}/documents/${docIndex}`);
    const resp = await fetch(endpoint, {
      method: 'DELETE',
      headers: getStaffAuthHeaders(),
      credentials: 'include'
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${resp.status}`);
    }

    const data = await resp.json();
    if (!data.success) throw new Error(data.error || 'Delete failed');

    const cleanId = String(studentId).trim().toLowerCase();
    const st = studentList.find(s => 
      (s.id && String(s.id).toLowerCase() === cleanId) ||
      (s.identifier && s.identifier.toLowerCase() === cleanId) ||
      (s.applicationNumber && s.applicationNumber.toLowerCase() === cleanId)
    );
    if (st) {
      st.documents = data.documents;
      st.documentUrls = (data.documents || []).map(d => d.url);
      st.documentUrl = st.documentUrls[0] || null;
      if (viewingStudent) viewingStudent = st;
      showViewModal(studentId);
    }

    showToast('Document removed successfully.', 'success');
  } catch (err) {
    console.error('Doc delete failed:', err);
    showToast('Failed to remove document: ' + (err.message || 'Unknown error'), 'error');
  }
};

// ── 10. EDIT STUDENT MODAL & SAVE ─────────────────────────────
window.handleEditCourseChange = function() {
  const courseEl = document.getElementById('editCourse');
  const levelEl = document.getElementById('editCourseLevel');
  if (!courseEl || !levelEl) return;
  const val = courseEl.value;
  if (val.includes('N5')) levelEl.value = 'N5';
  else if (val.includes('N4')) levelEl.value = 'N4';
  else if (val.includes('N3')) levelEl.value = 'N3';
  else if (val.includes('N2')) levelEl.value = 'N2';
  else if (val.includes('Kaiwa')) levelEl.value = 'Speaking';
  else if (val.includes('Skill')) levelEl.value = 'Skill-Test';
  else if (val.includes('Interview')) levelEl.value = 'Interview';
  window.autoCalculateEndDate();
};

window.autoCalculateEndDate = function() {
  const startVal = document.getElementById('editClassStartDate')?.value;
  const endEl = document.getElementById('editCourseEndDate');
  const levelVal = document.getElementById('editCourseLevel')?.value || 'N5';
  if (!startVal || !endEl) return;

  let months = 3;
  if (levelVal === 'N4') months = 4;
  else if (levelVal === 'N3') months = 5;

  const d = new Date(startVal);
  if (!isNaN(d.getTime())) {
    d.setMonth(d.getMonth() + months);
    endEl.value = d.toISOString().split('T')[0];
  }
};

window.openEditModal = function(id) {
  if (!window.hasStaffPermission('edit_students')) {
    showToast('Permission denied: You do not have permission to edit student profiles.', 'error');
    return;
  }

  const student = findStudentById(id);
  if (!student) {
    showToast('Student record not found.', 'error');
    return;
  }

  const setVal = (elId, val) => {
    const el = document.getElementById(elId);
    if (el) el.value = (val !== undefined && val !== null) ? val : '';
  };

  setVal('editId', student.id || student.applicationNumber || '');
  setVal('editFullName', student.fullName || '');
  setVal('editBatch', student.batch || '');
  setVal('editEmail', student.email || '');
  setVal('editPhone', student.phone || '');
  setVal('editFatherName', student.fatherName || '');
  setVal('editMotherName', student.motherName || '');
  setVal('editNid', student.nidBirthCert || '');
  setVal('editBloodGroup', student.bloodGroup || '');
  setVal('editOccupation', student.occupation || 'Student');
  setVal('editPresentAddress', student.presentAddress || student.address || '');
  setVal('editPermanentAddress', student.permanentAddress || '');
  setVal('editCity', student.city || '');
  setVal('editDistrict', student.district || '');
  setVal('editGender', student.gender || '');
  setVal('editReligion', student.religion || '');
  setVal('editHighestEducation', student.highestEducation || '');
  setVal('editEmergencyName', student.emergencyName || '');
  setVal('editEmergencyRelation', student.emergencyRelation || 'Father');
  setVal('editEmergencyPhone', student.emergencyPhone || '');
  setVal('editNotes', student.notes || '');

  // Class Routine, Dates & Lifecycle
  setVal('editClassStartDate', student.classStartDate || '');
  setVal('editCourseEndDate', student.courseEndDate || '');
  setVal('editClassSchedule', student.classSchedule || '');
  setVal('editCourseStatus', student.courseStatus || (student.status === 'graduated' ? 'completed' : 'enrolled'));

  // Status
  const rawStatus = (student.status || 'pending').toLowerCase();
  let normalizedStatus = 'pending';
  if (['admitted', 'approved', 'active', 'active student', 'enrolled'].includes(rawStatus)) {
    normalizedStatus = 'admitted';
  } else if (rawStatus === 'graduated') {
    normalizedStatus = 'graduated';
  } else if (['rejected', 'cancelled'].includes(rawStatus)) {
    normalizedStatus = 'rejected';
  }
  setVal('editStatus', normalizedStatus);

  // Visa Type
  setVal('editVisaType', student.visaType || 'student');

  // Course Matching
  const courseEl = document.getElementById('editCourse');
  if (courseEl) {
    const sCourse = (student.course || student.currentCourse || '').toLowerCase();
    let matched = false;
    for (let opt of courseEl.options) {
      if (opt.value.toLowerCase() === sCourse) {
        courseEl.value = opt.value;
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (sCourse.includes('n2')) courseEl.value = 'JLPT N2 - Pre-Advanced';
      else if (sCourse.includes('n3')) courseEl.value = 'JLPT N3 - Advanced';
      else if (sCourse.includes('n4')) courseEl.value = 'JLPT N4 - Intermediate';
      else if (sCourse.includes('n5')) courseEl.value = 'JLPT N5 - Beginner';
      else if (sCourse.includes('kaiwa')) courseEl.value = 'Conversation Kaiwa';
      else if (sCourse.includes('ssw') || sCourse.includes('skill')) courseEl.value = 'SSW Skill Test Preparation';
      else if (sCourse.includes('interview')) courseEl.value = 'Interview Preparation';
      else if (sCourse.includes('nat')) courseEl.value = 'NAT-TEST Preparation';
    }
  }

  // Course Level
  const courseLevelEl = document.getElementById('editCourseLevel');
  if (courseLevelEl) {
    courseLevelEl.value = student.courseLevel || 'N5';
  }

  // Branch
  const branchEl = document.getElementById('editBranch');
  if (branchEl && student.branch) {
    for (let opt of branchEl.options) {
      if (opt.value.toLowerCase() === student.branch.toLowerCase()) {
        branchEl.value = opt.value;
        break;
      }
    }
  }

  // Date of birth
  const dobEl = document.getElementById('editDob');
  if (dobEl) {
    let dob = student.dateOfBirth || '';
    if (dob.includes('T')) dob = dob.split('T')[0];
    dobEl.value = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : '';
  }

  const subtitle = document.getElementById('editModalSubtitle');
  if (subtitle) {
    subtitle.textContent = `Managing ${student.fullName || 'Student'} (${student.applicationNumber || student.id})`;
  }

  document.getElementById('editModal')?.classList.add('open');
};

window.closeEditModal = function() {
  document.getElementById('editModal')?.classList.remove('open');
};

window.saveStudentEdit = async function(event) {
  event.preventDefault();
  const id = document.getElementById('editId').value;
  if (!id) return;

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const origHtml = submitBtn ? submitBtn.innerHTML : 'Save Changes';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  }

  const updatedFields = {
    fullName: document.getElementById('editFullName')?.value.trim() || '',
    status: document.getElementById('editStatus')?.value || 'pending',
    batch: document.getElementById('editBatch')?.value.trim() || '',
    visaType: document.getElementById('editVisaType')?.value || 'student',
    email: document.getElementById('editEmail')?.value.trim() || '',
    phone: document.getElementById('editPhone')?.value.trim() || '',
    course: document.getElementById('editCourse')?.value || '',
    currentCourse: document.getElementById('editCourse')?.value || '',
    courseLevel: document.getElementById('editCourseLevel')?.value || 'N5',
    branch: document.getElementById('editBranch')?.value || 'Dinajpur',
    dateOfBirth: document.getElementById('editDob')?.value || '',
    fatherName: document.getElementById('editFatherName')?.value.trim() || '',
    motherName: document.getElementById('editMotherName')?.value.trim() || '',
    nidBirthCert: document.getElementById('editNid')?.value.trim() || '',
    nid: document.getElementById('editNid')?.value.trim() || '',
    bloodGroup: document.getElementById('editBloodGroup')?.value || '',
    gender: document.getElementById('editGender')?.value || '',
    religion: document.getElementById('editReligion')?.value || '',
    highestEducation: document.getElementById('editHighestEducation')?.value || '',
    occupation: document.getElementById('editOccupation')?.value.trim() || 'Student',
    presentAddress: document.getElementById('editPresentAddress')?.value.trim() || '',
    permanentAddress: document.getElementById('editPermanentAddress')?.value.trim() || '',
    address: document.getElementById('editPresentAddress')?.value.trim() || '',
    city: document.getElementById('editCity')?.value.trim() || '',
    district: document.getElementById('editDistrict')?.value.trim() || '',
    classStartDate: document.getElementById('editClassStartDate')?.value || '',
    courseEndDate: document.getElementById('editCourseEndDate')?.value || '',
    classSchedule: document.getElementById('editClassSchedule')?.value.trim() || '',
    courseStatus: document.getElementById('editCourseStatus')?.value || 'enrolled',
    emergencyName: document.getElementById('editEmergencyName')?.value.trim() || '',
    emergencyRelation: document.getElementById('editEmergencyRelation')?.value || 'Father',
    emergencyPhone: document.getElementById('editEmergencyPhone')?.value.trim() || '',
    notes: document.getElementById('editNotes')?.value.trim() || '',
    updatedAt: new Date().toISOString()
  };

  if (updatedFields.courseStatus === 'completed') {
    updatedFields.status = 'graduated';
  }

  try {
    const endpoint = getApiUrl(`/api/staff/students/${encodeURIComponent(id)}`);
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: getStaffAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updatedFields),
      credentials: 'include'
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${res.status}`);
    }

    closeEditModal();
    showToast(`Updated profile for ${updatedFields.fullName} successfully!`, 'success');
    await loadStudents(); // Immediately sync and re-calculate fees

  } catch (err) {
    console.error('Save failed:', err);
    showToast(err.message || 'Failed to save changes.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
};

// ── 11. QUICK 1-CLICK ADMIT ────────────────────────────────────
window.quickAdmitStudent = async function(id) {
  const student = findStudentById(id);
  if (!student) return;

  if (!confirm(`Are you sure you want to approve and admit ${student.fullName}?`)) return;

  const updateData = {
    status: 'admitted',
    courseStatus: 'enrolled',
    admittedAt: new Date().toISOString()
  };

  try {
    const res = await fetch(getApiUrl(`/api/staff/students/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: getStaffAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updateData),
      credentials: 'include'
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${res.status}`);
    }

    showToast(`🎉 ${student.fullName} has been marked as ADMITTED!`, 'success');
    await loadStudents();

  } catch (e) {
    console.error('Quick admit failed:', e);
    showToast(e.message || 'Failed to update student status.', 'error');
  }
};

// ── 12. NEW STUDENT WALK-IN ENROLLMENT ────────────────────────
window.handleNewCourseChange = function() {
  const courseEl = document.getElementById('newCourse');
  const levelEl = document.getElementById('newCourseLevel');
  if (!courseEl || !levelEl) return;
  const val = courseEl.value;
  if (val.includes('N5')) levelEl.value = 'N5';
  else if (val.includes('N4')) levelEl.value = 'N4';
  else if (val.includes('N3')) levelEl.value = 'N3';
  else if (val.includes('N2')) levelEl.value = 'N2';
  else if (val.includes('Kaiwa')) levelEl.value = 'Speaking';
  else if (val.includes('Skill')) levelEl.value = 'Skill-Test';
  else if (val.includes('Interview')) levelEl.value = 'Interview';
  else if (val.includes('NAT')) levelEl.value = 'NAT-TEST';
};

window.previewNewStudentPhoto = function(event) {
  const file = event.target.files?.[0];
  const preview = document.getElementById('newPhotoPreview');
  if (!file || !preview) return;
  stagedNewStudentPhoto = file;
  const reader = new FileReader();
  reader.onload = e => { preview.src = e.target.result; };
  reader.readAsDataURL(file);
};

window.handleNewStudentDocsSelected = function(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;
  const category = document.getElementById('newDocCategorySelect')?.value || 'Document';

  files.forEach(f => {
    stagedNewStudentDocs.push({
      file: f,
      name: `${category} - ${f.name}`,
      size: (f.size / 1024).toFixed(1) + ' KB'
    });
  });

  renderStagedDocsList();
  event.target.value = '';
};

function renderStagedDocsList() {
  const wrap = document.getElementById('newDocsQueueWrap');
  const badge = document.getElementById('newDocCountBadge');
  const container = document.getElementById('newDocListContainer');
  if (!wrap || !container) return;

  if (stagedNewStudentDocs.length === 0) {
    wrap.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  wrap.style.display = 'block';
  if (badge) badge.textContent = stagedNewStudentDocs.length;

  container.innerHTML = stagedNewStudentDocs.map((doc, idx) => `
    <div style="display:inline-flex; align-items:center; gap:0.4rem; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.3); border-radius:8px; padding:0.35rem 0.65rem; font-size:0.8rem; color:#e2e8f0;">
      <i class="fas fa-file" style="color:#38bdf8;"></i>
      <span style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${doc.name}">${doc.name}</span>
      <span style="color:#94a3b8; font-size:0.72rem;">(${doc.size})</span>
      <button type="button" onclick="removeStagedDoc(${idx})" style="background:none; border:none; color:#f87171; cursor:pointer; padding:0 0.2rem;" title="Remove">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

window.removeStagedDoc = function(index) {
  if (index >= 0 && index < stagedNewStudentDocs.length) {
    stagedNewStudentDocs.splice(index, 1);
    renderStagedDocsList();
  }
};

window.openNewStudentModal = function() {
  document.getElementById('newStudentForm')?.reset();
  stagedNewStudentDocs = [];
  stagedNewStudentPhoto = null;
  const preview = document.getElementById('newPhotoPreview');
  if (preview) preview.src = '../assets/images/student-placeholder.jpg';
  renderStagedDocsList();

  const branchEl = document.getElementById('newBranch');
  if (branchEl && currentBranch !== 'all') {
    branchEl.value = currentBranch;
  }
  document.getElementById('newStudentModal')?.classList.add('open');
};

window.closeNewStudentModal = function() {
  document.getElementById('newStudentModal')?.classList.remove('open');
};

window.saveNewStudent = async function(event) {
  event.preventDefault();

  const customDateInput = document.getElementById('newAdmissionDate')?.value;
  let dateIso = new Date().toISOString();
  if (customDateInput && !isNaN(new Date(customDateInput).getTime())) {
    dateIso = new Date(customDateInput).toISOString();
  }

  const newAppNum = `FEBD-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
  const fullName = document.getElementById('newFullName').value.trim();
  const phone = document.getElementById('newPhone').value.trim();
  const email = document.getElementById('newEmail').value.trim();
  const course = document.getElementById('newCourse').value;
  const courseLevel = document.getElementById('newCourseLevel')?.value || 'N5';
  const branch = document.getElementById('newBranch').value;
  const status = document.getElementById('newStatus').value;
  const batch = document.getElementById('newBatch').value.trim() || 'Batch 01';
  const visaType = document.getElementById('newVisaType')?.value || 'student';
  const city = document.getElementById('newCity').value.trim();
  const district = document.getElementById('newDistrict')?.value.trim() || '';
  const notes = document.getElementById('newNotes').value.trim();

  // Personal fields
  const fatherName = document.getElementById('newFatherName')?.value.trim() || '';
  const motherName = document.getElementById('newMotherName')?.value.trim() || '';
  const dateOfBirth = document.getElementById('newDob')?.value || '';
  const gender = document.getElementById('newGender')?.value || '';
  const bloodGroup = document.getElementById('newBloodGroup')?.value || '';
  const religion = document.getElementById('newReligion')?.value || '';
  const nidBirthCert = document.getElementById('newNid')?.value.trim() || '';
  const occupation = document.getElementById('newOccupation')?.value || 'Student';
  const highestEducation = document.getElementById('newHighestEducation')?.value || '';
  const presentAddress = document.getElementById('newPresentAddress')?.value.trim() || '';
  const permanentAddress = document.getElementById('newPermanentAddress')?.value.trim() || '';
  const emergencyName = document.getElementById('newEmergencyName')?.value.trim() || '';
  const emergencyRelation = document.getElementById('newEmergencyRelation')?.value || 'Father';
  const emergencyPhone = document.getElementById('newEmergencyPhone')?.value.trim() || '';

  const saveBtn = document.getElementById('saveNewStudentBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Enrollment...';
  }

  const formData = new FormData();
  formData.append('id', newAppNum);
  formData.append('identifier', newAppNum);
  formData.append('applicationNumber', newAppNum);
  formData.append('fullName', fullName);
  formData.append('phone', phone);
  formData.append('email', email);
  formData.append('course', course);
  formData.append('courseLevel', courseLevel);
  formData.append('branch', branch);
  formData.append('status', status);
  formData.append('batch', batch);
  formData.append('visaType', visaType);
  formData.append('city', city);
  formData.append('district', district);
  formData.append('address', presentAddress || city);
  formData.append('presentAddress', presentAddress);
  formData.append('permanentAddress', permanentAddress);
  formData.append('fatherName', fatherName);
  formData.append('motherName', motherName);
  formData.append('dateOfBirth', dateOfBirth);
  formData.append('gender', gender);
  formData.append('bloodGroup', bloodGroup);
  formData.append('religion', religion);
  formData.append('nidBirthCert', nidBirthCert);
  formData.append('occupation', occupation);
  formData.append('highestEducation', highestEducation);
  formData.append('emergencyName', emergencyName);
  formData.append('emergencyRelation', emergencyRelation);
  formData.append('emergencyPhone', emergencyPhone);
  formData.append('admissionDate', customDateInput || dateIso.split('T')[0]);
  formData.append('notes', notes);
  formData.append('comment', notes);

  if (stagedNewStudentPhoto) {
    formData.append('photo', stagedNewStudentPhoto);
  }

  const docTitles = [];
  stagedNewStudentDocs.forEach(d => {
    formData.append('documents', d.file);
    docTitles.push(d.name);
  });
  if (docTitles.length > 0) {
    formData.append('documentNames', JSON.stringify(docTitles));
  }

  try {
    const resp = await fetch(getApiUrl('/api/staff/students'), {
      method: 'POST',
      headers: getStaffAuthHeaders(),
      credentials: 'include',
      body: formData
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Server returned ${resp.status}`);
    }

    closeNewStudentModal();
    showToast(`New student "${fullName}" (${newAppNum}) registered successfully!`, 'success');
    await loadStudents(); // Immediately loads fresh data and calculates fees

  } catch (err) {
    console.error('Enrollment creation error:', err);
    showToast('Failed to create enrollment: ' + (err.message || 'Unknown error'), 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Create Enrollment';
    }
  }
};

// ── 13. FEE & PAYMENT MANAGEMENT MODAL ────────────────────────
window.openFeeModal = async function(studentId) {
  const student = findStudentById(studentId);
  const resolvedId = student ? (student.id || student.applicationNumber) : studentId;
  activeFeeStudentId = resolvedId;
  const modal = document.getElementById('feeModal');
  if (!modal) return;

  document.getElementById('feeStudentId').value = resolvedId;
  document.getElementById('payAmount').value = '';
  document.getElementById('payNote').value = '';
  document.getElementById('payDate').value = new Date().toISOString().split('T')[0];

  modal.classList.add('open');

  await refreshFeeData(resolvedId);
};

window.closeFeeModal = function() {
  const modal = document.getElementById('feeModal');
  if (modal) modal.classList.remove('open');
  activeFeeStudentId = null;
};

async function refreshFeeData(studentId) {
  try {
    const res = await fetch(getApiUrl(`/api/students/${encodeURIComponent(studentId)}/billing`), {
      headers: getStaffAuthHeaders(),
      credentials: 'include'
    });
    let billing = null;
    let student = null;

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        billing = data.billing;
        student = data.student;
      }
    }

    const st = findStudentById(studentId);
    if (!student && st) student = st;

    // Fallback fee calculation if server response is missing billing
    if (!billing && st) {
      const activeMonths = 1;
      const baseRate = Number(st.enrolledMonthlyFee ?? st.feeInfo?.monthlyFee ?? 1000);
      const rate = Number(st.customMonthlyFee ?? baseRate);
      const admissionFee = Number(st.enrolledAdmissionFee ?? st.feeInfo?.admissionFee ?? 1000);
      const accrued = admissionFee + (activeMonths * rate);
      const payments = Array.isArray(st.payments) ? st.payments : [];
      const paid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const due = Math.max(0, accrued - paid);
      billing = {
        initialDurationMonths: st.enrolledDurationMonths || 3,
        activeMonths,
        standardMonthlyFee: baseRate,
        effectiveMonthlyRate: rate,
        isCustomRate: Boolean(st.customMonthlyFee) || (rate !== baseRate),
        admissionFee,
        totalAccruedFee: accrued,
        totalPaid: paid,
        balanceDue: due,
        status: due === 0 ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Unpaid'),
        payments
      };
    }

    if (!billing) {
      showToast('Fee details not available.', 'error');
      return;
    }

    const displayName = student?.fullName || st?.fullName || studentId;

    document.getElementById('feeModalTitle').innerHTML = `<i class="fas fa-credit-card" style="color:#10b981; margin-right:0.4rem;"></i> Tuition &amp; Payments: ${displayName}`;
    document.getElementById('feeActiveMonths').textContent = `${billing.activeMonths} Month${billing.activeMonths > 1 ? 's' : ''}`;
    document.getElementById('feeInitialDuration').textContent = `Init: ${billing.initialDurationMonths || 3} Months`;
    document.getElementById('feeMonthlyRate').textContent = `৳ ${billing.effectiveMonthlyRate.toLocaleString()} / mo`;
    document.getElementById('feeRateType').textContent = billing.isCustomRate ? '🌟 Custom Student Rate' : 'Standard Course Rate';
    document.getElementById('feeTotalAccrued').textContent = `৳ ${billing.totalAccruedFee.toLocaleString()}`;
    document.getElementById('feeAdmissionPart').textContent = `Inc. Admission: ৳${(billing.admissionFee || 0).toLocaleString()}`;
    document.getElementById('feeTotalPaid').textContent = `৳ ${billing.totalPaid.toLocaleString()}`;
    document.getElementById('feePaymentCount').textContent = `${(billing.payments || []).length} receipt(s)`;
    document.getElementById('feeBalanceDue').textContent = `৳ ${billing.balanceDue.toLocaleString()}`;
    
    const statusPill = document.getElementById('feeStatusPill');
    statusPill.textContent = billing.status;
    statusPill.style.color = billing.status === 'Paid' ? '#34d399' : (billing.status === 'Partially Paid' ? '#fbbf24' : '#f87171');

    // Populate custom rate input
    const customRateInput = document.getElementById('customRateInput');
    if (customRateInput) customRateInput.value = billing.isCustomRate ? billing.effectiveMonthlyRate : '';

    // Permissions inside Fee Modal
    const canManageFees = window.hasStaffPermission('manage_fees');
    const canCustomFee = window.hasStaffPermission('custom_student_fee') || canManageFees;

    const recordForm = document.getElementById('recordPaymentForm');
    const recordLockedNotice = document.getElementById('recordPaymentLockedNotice');
    if (recordForm && recordLockedNotice) {
      recordForm.style.display = canManageFees ? 'block' : 'none';
      recordLockedNotice.style.display = canManageFees ? 'none' : 'block';
    }

    const customPricingPanel = document.getElementById('customPricingPanel');
    if (customPricingPanel) {
      customPricingPanel.style.display = canCustomFee ? 'block' : 'none';
    }

    // Render payment receipts ledger
    const historyBody = document.getElementById('feePaymentHistoryBody');
    if (historyBody) {
      const pList = billing.payments || [];
      if (pList.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="5" style="padding:1.5rem; text-align:center; color:#94a3b8;">No payment receipts recorded yet.</td></tr>`;
      } else {
        historyBody.innerHTML = pList.map(p => `
          <tr style="border-bottom: 1px solid var(--staff-card-border);">
            <td style="padding: 0.65rem 1rem; color: #cbd5e1;">${new Date(p.date || Date.now()).toLocaleDateString('en-GB')}</td>
            <td style="padding: 0.65rem 1rem; font-family: monospace; color: #38bdf8;">${p.id || 'REC-N/A'}</td>
            <td style="padding: 0.65rem 1rem; font-weight: 700; color: #34d399;">৳ ${(Number(p.amount) || 0).toLocaleString()}</td>
            <td style="padding: 0.65rem 1rem; color: #e2e8f0;">${p.note || 'Tuition payment'}</td>
            <td style="padding: 0.65rem 1rem; color: #94a3b8; font-size: 0.8rem;">${p.recordedBy || 'Staff'}</td>
          </tr>
        `).join('');
      }
    }

  } catch (err) {
    console.error('Error refreshing fee data:', err);
  }
}

window.handleRecordPayment = async function(e) {
  e.preventDefault();
  const studentId = activeFeeStudentId;
  if (!studentId) return;

  const btn = document.getElementById('btnRecordPay');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  const amount = parseFloat(document.getElementById('payAmount').value);
  const note = document.getElementById('payNote').value.trim();
  const date = document.getElementById('payDate').value;

  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid payment amount.', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> Submit Payment Receipt';
    return;
  }

  try {
    const res = await fetch(getApiUrl(`/api/students/${encodeURIComponent(studentId)}/payments`), {
      method: 'POST',
      headers: getStaffAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ amount, note, date, method: 'Recorded' })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Payment of ৳${amount.toLocaleString()} recorded successfully!`, 'success');
      document.getElementById('payAmount').value = '';
      document.getElementById('payNote').value = '';
      await refreshFeeData(studentId);
      await loadStudents(); // Re-sync table fee column immediately
    } else {
      throw new Error(data.error || 'Failed to record payment');
    }
  } catch (err) {
    console.warn('Backend payment failed, attempting local fallback:', err);
    showToast(err.message || 'Payment recording failed.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> Submit Payment Receipt';
  }
};

window.handleSaveCustomFee = async function(e) {
  e.preventDefault();
  const studentId = activeFeeStudentId;
  if (!studentId) return;

  const btn = document.getElementById('btnSaveCustomRate');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  const customMonthlyFee = document.getElementById('customRateInput').value;
  const specialDiscount = document.getElementById('specialDiscountInput').value;
  const reason = document.getElementById('customReasonInput').value;

  try {
    const res = await fetch(getApiUrl(`/api/students/${encodeURIComponent(studentId)}/custom-fee`), {
      method: 'PUT',
      headers: getStaffAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({
        customMonthlyFee: customMonthlyFee ? parseFloat(customMonthlyFee) : null,
        specialDiscount: specialDiscount ? parseFloat(specialDiscount) : 0,
        reason
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Custom student pricing updated successfully!', 'success');
      await refreshFeeData(studentId);
      await loadStudents();
    } else {
      showToast(data.error || 'Failed to update custom rate', 'error');
    }
  } catch (err) {
    showToast('Failed to update custom fee rate: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Apply Custom Pricing';
  }
};

// ── 14. INSTRUCTOR BRANCH STAFF CONTROL MODAL ─────────────────
window.openBranchStaffModal = async function() {
  const modal = document.getElementById('branchStaffModal');
  if (!modal) return;
  modal.classList.add('open');

  const tbody = document.getElementById('branchStaffTableBody');
  tbody.innerHTML = `<tr><td colspan="5" style="padding:1.5rem; text-align:center; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Loading branch staff...</td></tr>`;

  try {
    const res = await fetch(getApiUrl('/api/instructor/staff'), {
      headers: getStaffAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.staff)) {
        if (data.staff.length === 0) {
          tbody.innerHTML = `<tr><td colspan="5" style="padding:1.5rem; text-align:center; color:#94a3b8;">No staff accounts found for this branch.</td></tr>`;
          return;
        }
        tbody.innerHTML = data.staff.map(st => `
          <tr style="border-bottom: 1px solid var(--staff-card-border);">
            <td style="padding: 0.75rem 1rem; font-weight:700; color:#fff;">${st.name}</td>
            <td style="padding: 0.75rem 1rem; color:#94a3b8;">${st.email}</td>
            <td style="padding: 0.75rem 1rem; color:#38bdf8;">${st.branch}</td>
            <td style="padding: 0.75rem 1rem; color:#c084fc; text-transform:capitalize;">${st.role}</td>
            <td style="padding: 0.75rem 1rem; text-align:center;">
              <span class="staff-badge admitted" style="font-size:0.75rem;">Active</span>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:1.5rem; text-align:center; color:#f87171;">Failed to load branch staff.</td></tr>`;
  }
};

window.closeBranchStaffModal = function() {
  document.getElementById('branchStaffModal')?.classList.remove('open');
};

// ── 15. CSV EXPORT ────────────────────────────────────────────
window.exportStudentsToCSV = function() {
  const filtered = getFilteredAndSortedStudents();
  if (filtered.length === 0) {
    showToast('No students to export under current filters.', 'error');
    return;
  }

  const headers = [
    'SL', 'Application ID', 'Full Name', 'Phone', 'Email', 'Branch',
    'Course', 'Level', 'Batch', 'Visa Type', 'Admission Date', 'Status',
    'Accrued Fee', 'Total Paid', 'Balance Due'
  ];

  const rows = filtered.map((s, idx) => [
    idx + 1,
    `"${s.applicationNumber || s.id}"`,
    `"${(s.fullName || '').replace(/"/g, '""')}"`,
    `"${s.phone || ''}"`,
    `"${s.email || ''}"`,
    `"${s.branch || ''}"`,
    `"${(s.course || '').replace(/"/g, '""')}"`,
    `"${s.courseLevel || ''}"`,
    `"${s.batch || ''}"`,
    `"${s.visaType || ''}"`,
    `"${s.admissionDate || s.submittedAt || ''}"`,
    `"${s.status || ''}"`,
    s.fees?.totalAccruedFee || 0,
    s.fees?.totalPaid || 0,
    s.fees?.balanceDue || 0
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `FusionEducation_Students_${currentBranch}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Exported ${filtered.length} student records to CSV!`, 'success');
};

// ── 16. PRINTING TEMPLATES ────────────────────────────────────
window.printCurrentStudentProfile = function() {
  if (viewingStudent) {
    printStudentProfile(viewingStudent);
  }
};

window.printStudentById = function(id) {
  const student = findStudentById(id);
  if (student) printStudentProfile(student);
};

function printStudentProfile(student) {
  const printableSection = document.getElementById('printableSection');
  if (!printableSection) return;

  const dateStr = student.admissionDate || (student.submittedAt ? new Date(student.submittedAt).toLocaleDateString('en-GB') : 'Recent');

  const html = `
    <div style="padding: 2.5rem; font-family: 'Inter', sans-serif; color: #000; background: #fff; max-width: 800px; margin: 0 auto; line-height: 1.5;">
      
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 1.25rem; margin-bottom: 1.5rem;">
        <div>
          <h1 style="margin: 0; font-size: 1.6rem; color: #000; text-transform: uppercase;">FUSION EDUCATION BD</h1>
          <p style="margin: 0.2rem 0 0; font-size: 0.9rem; color: #444;">Official Admission &amp; Student Profile Document</p>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 700; font-size: 1.05rem; color: #000;">${student.applicationNumber}</div>
          <div style="font-size: 0.85rem; color: #555;">Branch: ${student.branch}</div>
        </div>
      </div>

      <!-- Photo & Core Profile -->
      <div style="display: flex; gap: 2rem; margin-bottom: 1.75rem; border: 1px solid #ccc; padding: 1.25rem; border-radius: 8px;">
        <img src="${student.photoUrl}" alt="Student Photo" style="width: 120px; height: 120px; border-radius: 8px; object-fit: cover; border: 1px solid #999;" onerror="this.src='../assets/images/student-placeholder.jpg'">
        <div style="flex: 1;">
          <h2 style="margin: 0 0 0.5rem; font-size: 1.4rem; color: #000;">${student.fullName}</h2>
          <table style="width: 100%; font-size: 0.9rem; border-collapse: collapse;">
            <tr><td style="padding: 3px 0; width: 140px; color: #555;">Status:</td><td><strong>${student.status.toUpperCase()}</strong></td></tr>
            <tr><td style="padding: 3px 0; color: #555;">Course Enrolled:</td><td><strong>${student.course} (${student.courseLevel || 'N5'})</strong></td></tr>
            <tr><td style="padding: 3px 0; color: #555;">Assigned Batch:</td><td><strong>${student.batch || 'Batch 01'}</strong></td></tr>
            <tr><td style="padding: 3px 0; color: #555;">Visa Target:</td><td><strong>${(student.visaType || 'Student').toUpperCase()} VISA</strong></td></tr>
            <tr><td style="padding: 3px 0; color: #555;">Admission Date:</td><td>${dateStr}</td></tr>
          </table>
        </div>
      </div>

      <!-- Detail Grid -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.9rem;">
        <tr style="background: #f4f4f4;">
          <th colspan="2" style="text-align: left; padding: 8px 10px; border: 1px solid #ddd;">Personal &amp; Contact Information</th>
        </tr>
        <tr>
          <td style="padding: 8px 10px; border: 1px solid #ddd; width: 35%;">Phone Number</td>
          <td style="padding: 8px 10px; border: 1px solid #ddd;"><strong>${student.phone || 'N/A'}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 10px; border: 1px solid #ddd;">Email Address</td>
          <td style="padding: 8px 10px; border: 1px solid #ddd;">${student.email || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 10px; border: 1px solid #ddd;">Date of Birth &amp; Gender</td>
          <td style="padding: 8px 10px; border: 1px solid #ddd;">${student.dateOfBirth || 'N/A'} (${student.gender || 'N/A'})</td>
        </tr>
        <tr>
          <td style="padding: 8px 10px; border: 1px solid #ddd;">Address &amp; Location</td>
          <td style="padding: 8px 10px; border: 1px solid #ddd;">${student.presentAddress || student.city || 'N/A'}${student.district ? ', ' + student.district : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 10px; border: 1px solid #ddd;">Emergency Contact</td>
          <td style="padding: 8px 10px; border: 1px solid #ddd;">${student.emergencyName || 'N/A'} (${student.emergencyPhone || 'N/A'})</td>
        </tr>
      </table>

      <!-- Counselor Remarks -->
      <div style="border: 1px solid #ddd; padding: 1rem; border-radius: 6px; margin-bottom: 3rem;">
        <strong style="font-size: 0.85rem; color: #555; text-transform: uppercase; display: block; margin-bottom: 0.25rem;">Counselor Notes:</strong>
        <p style="margin: 0; font-size: 0.9rem; color: #222;">${student.notes || 'No remarks recorded.'}</p>
      </div>

      <!-- Signatures -->
      <div style="display: flex; justify-content: space-between; margin-top: 4rem; padding-top: 1rem;">
        <div style="text-align: center; border-top: 1px solid #000; width: 200px; padding-top: 0.5rem; font-size: 0.85rem;">
          Student Signature
        </div>
        <div style="text-align: center; border-top: 1px solid #000; width: 200px; padding-top: 0.5rem; font-size: 0.85rem;">
          Authorized Branch Officer
        </div>
      </div>
    </div>
  `;

  printableSection.innerHTML = html;
  window.print();
  printableSection.innerHTML = '';
}

window.printBranchSummary = function() {
  const printableSection = document.getElementById('printableSection');
  if (!printableSection) return;

  const branchLabel = currentBranch === 'all' ? 'All Branches' : `${currentBranch} Campus`;
  const filtered = studentList.filter(s => currentBranch === 'all' || (s.branch && s.branch.toLowerCase() === currentBranch.toLowerCase()));

  const pending = filtered.filter(s => (s.status || 'pending').toLowerCase() === 'pending').length;
  const admitted = filtered.filter(s => (s.status || '').toLowerCase() === 'admitted').length;

  const html = `
    <div style="padding: 2.5rem; font-family: 'Inter', sans-serif; color: #000; background: #fff; max-width: 900px; margin: 0 auto; line-height: 1.5;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <div>
          <h1 style="margin: 0; font-size: 1.5rem; color: #000;">FUSION EDUCATION BD</h1>
          <p style="margin: 0.2rem 0 0; font-size: 0.9rem; color: #555;">Branch Admissions &amp; Enrollment Summary Report</p>
        </div>
        <div style="text-align: right; font-size: 0.9rem;">
          <strong>${branchLabel}</strong><br>
          <span style="color: #666;">Date: ${new Date().toLocaleDateString('en-GB')}</span>
        </div>
      </div>

      <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
        <div style="flex: 1; border: 1px solid #ccc; padding: 0.75rem 1rem; border-radius: 6px; text-align: center;">
          <div style="font-size: 0.8rem; color: #666;">TOTAL APPLICANTS</div>
          <div style="font-size: 1.4rem; font-weight: 700;">${filtered.length}</div>
        </div>
        <div style="flex: 1; border: 1px solid #ccc; padding: 0.75rem 1rem; border-radius: 6px; text-align: center;">
          <div style="font-size: 0.8rem; color: #666;">ADMISSION PENDING</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: #b45309;">${pending}</div>
        </div>
        <div style="flex: 1; border: 1px solid #ccc; padding: 0.75rem 1rem; border-radius: 6px; text-align: center;">
          <div style="font-size: 0.8rem; color: #666;">ADMITTED STUDENTS</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: #047857;">${admitted}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
        <thead>
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left;">SL</th>
            <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left;">App ID</th>
            <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left;">Student Name</th>
            <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left;">Course &amp; Batch</th>
            <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left;">Branch</th>
            <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left;">Phone</th>
            <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((s, i) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 6px 8px;">${i + 1}</td>
              <td style="border: 1px solid #ddd; padding: 6px 8px; font-weight: 600;">${s.applicationNumber}</td>
              <td style="border: 1px solid #ddd; padding: 6px 8px;">${s.fullName}</td>
              <td style="border: 1px solid #ddd; padding: 6px 8px;">${s.course} (${s.batch || 'Batch 01'})</td>
              <td style="border: 1px solid #ddd; padding: 6px 8px;">${s.branch}</td>
              <td style="border: 1px solid #ddd; padding: 6px 8px;">${s.phone || 'N/A'}</td>
              <td style="border: 1px solid #ddd; padding: 6px 8px; font-weight: 700; color: ${s.status === 'admitted' ? '#047857' : '#b45309'};">${s.status.toUpperCase()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  printableSection.innerHTML = html;
  window.print();
  printableSection.innerHTML = '';
};

// ── 17. LOGOUT ────────────────────────────────────────────────
window.logoutStaff = async function() {
  try {
    await fetch(getApiUrl('/api/staff/logout'), {
      method: 'POST',
      headers: getStaffAuthHeaders(),
      credentials: 'include'
    });
  } catch (_) {}

  sessionStorage.removeItem('fusion_staff_session');
  sessionStorage.removeItem('fusion_staff_email');
  sessionStorage.removeItem('fusion_staff_branch');
  sessionStorage.removeItem('fusion_staff_name');
  sessionStorage.removeItem('fusion_staff_role');
  sessionStorage.removeItem('fusion_staff_permissions');
  localStorage.removeItem('fusion_staff_session');
  localStorage.removeItem('fusion_staff_email');
  localStorage.removeItem('fusion_staff_branch');
  localStorage.removeItem('fusion_staff_name');
  localStorage.removeItem('fusion_staff_role');
  localStorage.removeItem('fusion_staff_permissions');

  window.location.href = 'staff-login.html';
};

// ── 18. KEYBOARD SHORTCUTS ────────────────────────────────────
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeViewModal();
    closeEditModal();
    closeNewStudentModal();
    closeFeeModal();
    closeBranchStaffModal();
    toggleStaffSidebar(false);
  }
});

// Run Init
initStaffSession();
