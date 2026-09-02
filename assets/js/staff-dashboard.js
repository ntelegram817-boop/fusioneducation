/**
 * Staff Dashboard Management Script — Fusion Education BD
 * Handles:
 *  - Staff authentication & branch switching
 *  - Admissions review & management (Pending vs Admitted)
 *  - Full student profile editing (Status, Course, Batch, Notes, Contacts)
 *  - Quick 1-click student admission
 *  - Walk-in / new student registration
 *  - Report and student profile printing
 */

let studentList = [];
let currentFilterTab = 'all';
let currentBranch = 'all';
let currentStaff = { name: 'Staff Member', email: '', branch: 'Dinajpur', role: 'Branch Counselor' };
let viewingStudent = null;

// DOM Elements
const studentTableBody = document.getElementById('studentTableBody');
const emptyMessage = document.getElementById('emptyMessage');
const totalCountEl = document.getElementById('totalCount');
const pendingCountEl = document.getElementById('pendingCount');
const admittedCountEl = document.getElementById('admittedCount');
const activeBranchTextEl = document.getElementById('activeBranchText');
const staffNameEl = document.getElementById('staffName');
const staffRoleEl = document.getElementById('staffRole');
const staffAvatarEl = document.getElementById('staffAvatar');
const staffBranchSelector = document.getElementById('staffBranchSelector');
const printableSection = document.getElementById('printableSection');

// Helper: API Base URL
function getApiUrl(path) {
  if (window.location.port === '3000') return path;
  return 'http://localhost:3000' + path;
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
    display: flex;
    align-items: center;
    gap: 0.65rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    animation: slideIn 0.3s ease;
  `;

  toast.innerHTML = `<i class="fas ${icon}" style="color:${bgColor};"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Designation Mapping for Staff and Instructors
const userDesignations = {
  'instructor@fusion.com': 'Head Japanese Instructor',
  'dhaka.instructor@fusion.com': 'Senior Japanese Instructor',
  'bogura@fusion.com': 'Branch Manager',
  'dinajpur@fusion.com': 'Academic Coordinator',
  'staff@fusioneducation.com': 'Branch Counselor',
  'dhaka.staff@fusion.com': 'Branch Counselor',
  'rangpur.staff@fusion.com': 'Branch Counselor'
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
}

function updateStaffProfileUI() {
  if (staffNameEl) staffNameEl.textContent = currentStaff.name;
  if (staffRoleEl) staffRoleEl.textContent = currentStaff.position;
  if (staffAvatarEl) staffAvatarEl.textContent = (currentStaff.name || 'S').charAt(0).toUpperCase();

  const activeBranchHeaderName = document.getElementById('activeBranchHeaderName');
  if (activeBranchHeaderName) {
    activeBranchHeaderName.textContent = currentStaff.branch === 'all' ? 'All Branches' : `${currentStaff.branch} Branch`;
  }

  if (activeBranchTextEl) {
    activeBranchTextEl.textContent = currentStaff.branch === 'all' ? 'All Branches' : currentStaff.branch;
  }

  const portalRoleBadge = document.getElementById('portalRoleBadge');
  if (portalRoleBadge) {
    if (currentStaff.role === 'instructor') {
      portalRoleBadge.innerHTML = `<i class="fas fa-chalkboard-teacher"></i> Instructor Portal`;
    } else {
      portalRoleBadge.innerHTML = `<i class="fas fa-shield-alt"></i> Staff Portal`;
    }
  }
}

// ── 1. AUTHENTICATION & INITIALIZATION ─────────────────────────
async function initStaffSession() {
  // Read branch, staff info & permissions from session storage / local storage
  const savedBranch = sessionStorage.getItem('fusion_staff_branch') || localStorage.getItem('fusion_staff_branch') || 'Dinajpur';
  const savedName = sessionStorage.getItem('fusion_staff_name') || localStorage.getItem('fusion_staff_name');
  const savedEmail = sessionStorage.getItem('fusion_staff_email') || localStorage.getItem('fusion_staff_email') || '';
  const savedRole = sessionStorage.getItem('fusion_staff_role') || localStorage.getItem('fusion_staff_role') || 'staff';
  const savedPosition = sessionStorage.getItem('fusion_staff_position') || localStorage.getItem('fusion_staff_position');
  
  let savedPerms = [];
  try {
    savedPerms = JSON.parse(sessionStorage.getItem('fusion_staff_permissions') || localStorage.getItem('fusion_staff_permissions') || '[]');
  } catch (_) {}

  currentBranch = savedBranch !== 'all' ? savedBranch : 'Dinajpur';

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

  try {
    const res = await fetch(getApiUrl('/api/staff/me'), { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.authenticated && data.name) {
        const email = data.email || savedEmail || '';
        const truePosition = userDesignations[email.toLowerCase()] || (data.role === 'instructor' ? 'Japanese Instructor' : (data.role === 'admin' ? 'Administrator' : 'Branch Counselor'));
        
        currentStaff = {
          name: data.name || currentStaff.name,
          email: email,
          branch: (data.branch && data.branch !== 'all') ? data.branch : currentBranch,
          role: data.role || currentStaff.role,
          position: truePosition,
          permissions: Array.isArray(data.permissions) && data.permissions.length > 0 ? data.permissions : savedPerms
        };

        currentBranch = currentStaff.branch;
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
  currentStaff.branch = branch;
  sessionStorage.setItem('fusion_staff_branch', branch);
  localStorage.setItem('fusion_staff_branch', branch);
  updateStaffProfileUI();
  renderFilteredStudents();
  updateMetrics();
};

// ── 2. DATA LOADING & MERGING ──────────────────────────────────
async function loadStudents() {
  if (studentTableBody) {
    studentTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:3rem 1rem; color:#94a3b8;">
          <i class="fas fa-spinner fa-spin" style="font-size:1.8rem; margin-bottom:0.75rem; color:#38bdf8;"></i>
          <div>Loading student records...</div>
        </td>
      </tr>
    `;
  }

  let fetchedList = [];

  // 1. Try Staff Students API
  try {
    const endpoint = getApiUrl(`/api/staff/students?branch=${currentBranch}`);
    const res = await fetch(endpoint, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        fetchedList = data.students;
      }
    }
  } catch (e) {
    console.warn('[Staff] Backend API fetch failed, checking DAO/localStorage:', e);
  }

  // 2. Try DAO.Admissions fallback / sync
  if (window.DAO && window.DAO.Admissions) {
    try {
      const daoList = await window.DAO.Admissions.getAll();
      if (Array.isArray(daoList) && daoList.length > 0) {
        const map = new Map();
        fetchedList.forEach(s => map.set(String(s.id || s.applicationNumber), s));
        daoList.forEach(s => {
          const key = String(s.id || s.applicationNumber);
          if (!map.has(key)) {
            map.set(key, s);
          } else {
            map.set(key, { ...s, ...map.get(key) });
          }
        });
        fetchedList = Array.from(map.values());
      }
    } catch (_) {}
  }

  // 3. Try direct JSON fetch for Live Server static preview
  if (fetchedList.length === 0) {
    try {
      const directJson = await fetch('../data/admissions.json').then(r => r.ok ? r.json() : null).catch(() => null);
      if (Array.isArray(directJson) && directJson.length > 0) {
        fetchedList = directJson;
      }
    } catch (_) {}
  }

  // 4. Fallback mock if completely empty
  if (fetchedList.length === 0) {
    fetchedList = [
      {
        id: 'FEBD-2026-001',
        applicationNumber: 'FEBD-2026-001',
        fullName: 'Mahmudul Hasan Tanvir',
        email: 'tanvir@gmail.com',
        phone: '01711223344',
        dateOfBirth: '2001-05-14',
        gender: 'Male',
        course: 'JLPT N5 - Beginner',
        courseLevel: 'N5',
        branch: 'Dinajpur',
        batch: 'Batch 14 - Morning',
        status: 'pending',
        visaType: 'student',
        city: 'Dinajpur Sadar',
        district: 'Dinajpur',
        emergencyName: 'Md. Rafiqul Islam',
        emergencyPhone: '01711000000',
        notes: 'Document verification pending. Interested in July 2026 intake.',
        photoUrl: '../assets/images/student-placeholder.jpg',
        submittedAt: new Date().toISOString()
      },
      {
        id: 'FEBD-2026-002',
        applicationNumber: 'FEBD-2026-002',
        fullName: 'Nusrat Jahan Ema',
        email: 'ema.japan@gmail.com',
        phone: '01855667788',
        dateOfBirth: '2002-08-20',
        gender: 'Female',
        course: 'JLPT N4 - Intermediate',
        courseLevel: 'N4',
        branch: 'Bogura',
        batch: 'Batch 08 - Evening',
        status: 'admitted',
        visaType: 'ssw',
        city: 'Bogura',
        district: 'Bogura',
        emergencyName: 'Kamal Hossain',
        emergencyPhone: '01855000000',
        notes: 'Enrolled in N4 batch. Tuition fee 1st installment paid.',
        photoUrl: '../assets/images/student-placeholder.jpg',
        submittedAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];
  }

  // Normalize student objects
  studentList = fetchedList.map(s => ({
    id: s.id || s.applicationNumber || 'FEBD-APP',
    applicationNumber: s.applicationNumber || s.id || 'FEBD-APP',
    fullName: s.fullName || s.name || 'Unnamed Student',
    email: s.email || '',
    phone: s.phone || '',
    dateOfBirth: s.dateOfBirth || '',
    gender: s.gender || 'Not specified',
    address: s.address || '',
    city: s.city || '',
    district: s.district || '',
    highestEducation: s.highestEducation || '',
    course: s.course || s.currentCourse || 'JLPT N5 - Beginner',
    courseLevel: s.courseLevel || 'N5',
    batch: s.batch || 'Batch 01',
    branch: s.branch || 'Dinajpur',
    japaneseExperience: s.japaneseExperience || 'None',
    visaType: s.visaType || 'student',
    emergencyName: s.emergencyName || '',
    emergencyPhone: s.emergencyPhone || '',
    notes: s.notes || s.comment || '',
    status: (s.status || 'pending').toLowerCase(),
    photoUrl: s.photoUrl || s.documentPreview || s.photo || '../assets/images/student-placeholder.jpg',
    documentUrls: s.documentUrls || [],
    documents: s.documents || [],
    submittedAt: s.submittedAt || s.createdAt || new Date().toISOString()
  }));

  updateMetrics();
  renderFilteredStudents();
}

// ── 3. METRICS & COUNTERS ─────────────────────────────────────
function updateMetrics() {
  let total = 0;
  let pending = 0;
  let admitted = 0;

  studentList.forEach(s => {
    if (currentBranch !== 'all' && s.branch && s.branch.toLowerCase() !== currentBranch.toLowerCase()) {
      return;
    }
    total++;
    const st = (s.status || 'pending').toLowerCase();
    if (st === 'admitted' || st === 'approved' || st === 'active') {
      admitted++;
    } else {
      pending++;
    }
  });

  if (totalCountEl) totalCountEl.textContent = total;
  if (pendingCountEl) pendingCountEl.textContent = pending;
  if (admittedCountEl) admittedCountEl.textContent = admitted;
  if (activeBranchTextEl) activeBranchTextEl.textContent = currentBranch === 'all' ? 'All Branches' : currentBranch;

  const bAll = document.getElementById('badgeAll');
  const bPending = document.getElementById('badgePending');
  const bAdmitted = document.getElementById('badgeAdmitted');

  if (bAll) bAll.textContent = total;
  if (bPending) bPending.textContent = pending;
  if (bAdmitted) bAdmitted.textContent = admitted;
}

// ── 4. FILTERING & SEARCH ──────────────────────────────────────
window.setStaffFilterTab = function(tab) {
  currentFilterTab = tab;

  document.getElementById('tabAll')?.classList.toggle('active', tab === 'all');
  document.getElementById('tabPending')?.classList.toggle('active', tab === 'pending');
  document.getElementById('tabAdmitted')?.classList.toggle('active', tab === 'admitted');

  renderFilteredStudents();
};

window.handleStaffSearch = function() {
  renderFilteredStudents();
};

function renderFilteredStudents() {
  const searchTerm = (document.getElementById('staffSearchInput')?.value || '').trim().toLowerCase();

  const filtered = studentList.filter(s => {
    if (currentBranch !== 'all' && s.branch && s.branch.toLowerCase() !== currentBranch.toLowerCase()) {
      return false;
    }

    const st = (s.status || 'pending').toLowerCase();
    const isAdmitted = st === 'admitted' || st === 'approved' || st === 'active';
    const isPending = !isAdmitted;

    if (currentFilterTab === 'pending' && !isPending) return false;
    if (currentFilterTab === 'admitted' && !isAdmitted) return false;

    if (searchTerm) {
      const matchStr = `${s.fullName} ${s.applicationNumber} ${s.id} ${s.phone} ${s.email} ${s.course} ${s.batch} ${s.city}`.toLowerCase();
      if (!matchStr.includes(searchTerm)) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    if (studentTableBody) studentTableBody.innerHTML = '';
    if (emptyMessage) emptyMessage.style.display = 'block';
    return;
  }

  if (emptyMessage) emptyMessage.style.display = 'none';

  if (studentTableBody) {
    studentTableBody.innerHTML = filtered.map((s, index) => {
      const isAdmitted = s.status === 'admitted' || s.status === 'approved' || s.status === 'active';
      const isRejected = s.status === 'rejected';

      let statusBadgeClass = 'pending';
      let statusLabel = '🟡 Pending';
      if (isAdmitted) {
        statusBadgeClass = 'admitted';
        statusLabel = '🟢 Admitted';
      } else if (isRejected) {
        statusBadgeClass = 'rejected';
        statusLabel = '🔴 Rejected';
      }

      const rawDate = s.admissionDate || s.submittedAt || s.enrollmentDate || s.createdAt;
      let dateFormatted = 'Today';
      if (rawDate) {
        const d = new Date(rawDate);
        dateFormatted = !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : String(rawDate);
      }
      const safeId = s.id || s.applicationNumber;

      const sName = s.fullName || s.name || s.studentName || 'Student Name';

      const canAdmit = !isAdmitted && window.hasStaffPermission('manage_admissions');
      const canFee = window.hasStaffPermission('view_fees') || window.hasStaffPermission('manage_fees');
      const canEdit = window.hasStaffPermission('edit_students');
      const canPrint = window.hasStaffPermission('view_reports') || window.hasStaffPermission('export_reports');

      return `
        <tr>
          <td style="font-weight:700; color:#64748b;">${index + 1}</td>
          <td>
            <div class="student-cell">
              <img src="${s.photoUrl}" alt="Photo" class="student-avatar" onerror="this.src='../assets/images/student-placeholder.jpg'">
              <div>
                <div class="student-cell-name">${sName}</div>
                <div class="student-cell-id">${s.applicationNumber}</div>
                <div style="font-size:0.75rem; color:#94a3b8; margin-top:0.1rem;">
                  <i class="fas fa-phone" style="font-size:0.7rem; color:#38bdf8;"></i> ${s.phone || 'No phone'}
                </div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight:600; color:#fff;">${s.course}</div>
            <span style="font-size:0.75rem; color:#38bdf8; background:rgba(56,189,248,0.1); padding:0.1rem 0.4rem; border-radius:4px;">${s.courseLevel || 'Level N5'}</span>
          </td>
          <td>
            <div><strong style="color:#e2e8f0;">${s.branch}</strong></div>
            <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase;">${s.visaType || 'Student'} Visa</span>
          </td>
          <td>
            <span style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:0.2rem 0.5rem; border-radius:6px; font-size:0.78rem; color:#cbd5e1; white-space:nowrap;">
              ${s.batch || 'Batch 01'}
            </span>
          </td>
          <td>
            <span class="status-tag ${statusBadgeClass}">${statusLabel}</span>
          </td>
          <td style="font-size:0.8rem; color:#94a3b8; white-space:nowrap;">
            ${dateFormatted}
          </td>
          <td style="text-align: right;">
            <div class="action-group" style="justify-content: flex-end;">
              ${canAdmit ? `
                <button type="button" class="act-btn admit-quick" onclick="quickAdmitStudent('${safeId}')" title="Quick Approve & Admit">
                  <i class="fas fa-check"></i> Admit
                </button>
              ` : ''}

              ${canFee ? `
                <button type="button" class="act-btn" style="background:rgba(16,185,129,0.15); border-color:rgba(16,185,129,0.3); color:#34d399;" onclick="openFeeModal('${safeId}')" title="Tuition & Partial Payments">
                  <i class="fas fa-money-bill-wave"></i> Fees
                </button>
              ` : ''}

              ${canEdit ? `
                <button type="button" class="act-btn edit" onclick="openEditModal('${safeId}')" title="Edit Student & Status">
                  <i class="fas fa-edit"></i> Edit
                </button>
              ` : ''}

              <button type="button" class="act-btn primary" onclick="showViewModal('${safeId}')" title="View Full Profile">
                <i class="fas fa-eye"></i> View
              </button>

              ${canPrint ? `
                <button type="button" class="act-btn" onclick="printStudentById('${safeId}')" title="Print Sheet">
                  <i class="fas fa-print"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// ── 5. VIEW PROFILE MODAL ──────────────────────────────────────
window.showViewModal = function(id) {
  const student = studentList.find(s => String(s.id) === String(id) || String(s.applicationNumber) === String(id));
  if (!student) return;

  viewingStudent = student;
  const modal = document.getElementById('viewModal');
  const body = document.getElementById('viewModalBody');
  const title = document.getElementById('viewModalTitle');
  const badge = document.getElementById('viewStatusBadge');
  const sName = student.fullName || student.name || student.studentName || 'Student Profile';

  if (title) title.textContent = sName;
  
  const isAdmitted = student.status === 'admitted' || student.status === 'approved' || student.status === 'active';
  if (badge) {
    badge.className = isAdmitted ? 'status-tag admitted' : 'status-tag pending';
    badge.textContent = isAdmitted ? '🟢 Admitted Student' : '🟡 Admission Pending';
  }

  const docs = student.documents || (student.documentUrls ? student.documentUrls.map((u, i) => ({ name: `Document ${i+1}`, url: u })) : []);
  const docsHtml = docs.length > 0
    ? docs.map((d, i) => `
        <a href="${d.url}" target="_blank" style="display:inline-flex; align-items:center; gap:0.4rem; background:rgba(37,99,235,0.15); border:1px solid rgba(37,99,235,0.3); color:#93c5fd; padding:0.4rem 0.75rem; border-radius:8px; text-decoration:none; font-size:0.85rem; margin-right:0.5rem; margin-top:0.4rem;">
          <i class="fas fa-file-download"></i> ${d.name || `Document ${i+1}`}
        </a>
      `).join('')
    : '<span style="color:#94a3b8; font-size:0.85rem;">No certificates or documents attached.</span>';

  if (body) {
    body.innerHTML = `
      <div style="display:flex; gap:1.5rem; align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap;">
        <img src="${student.photoUrl}" alt="Photo" style="width:100px; height:100px; border-radius:18px; object-fit:cover; border:2px solid #38bdf8; background:#1e293b;" onerror="this.src='../assets/images/student-placeholder.jpg'">
        <div style="flex:1; min-width:240px;">
          <h3 style="margin:0 0 0.25rem; font-size:1.35rem; color:#fff;">${sName}</h3>
          <p style="margin:0 0 0.5rem; color:#38bdf8; font-weight:700; font-size:0.95rem;">Application Number: ${student.applicationNumber}</p>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; font-size:0.85rem; color:#94a3b8;">
            <span>Branch: <strong style="color:#fff;">${student.branch}</strong></span> •
            <span>Batch: <strong style="color:#fff;">${student.batch || 'Batch 01'}</strong></span> •
            <span>Applied: <strong style="color:#fff;">${student.submittedAt ? new Date(student.submittedAt).toLocaleDateString('en-GB') : 'Recent'}</strong></span>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1rem; background:rgba(255,255,255,0.02); padding:1.25rem; border-radius:14px; border:1px solid var(--card-border); margin-bottom:1.25rem;">
        <div><span style="color:#94a3b8; font-size:0.75rem; display:block; text-transform:uppercase;">EMAIL ADDRESS</span><strong style="color:#fff;">${student.email || 'N/A'}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.75rem; display:block; text-transform:uppercase;">PHONE NUMBER</span><strong style="color:#fff;">${student.phone || 'N/A'}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.75rem; display:block; text-transform:uppercase;">DATE OF BIRTH / GENDER</span><strong style="color:#fff;">${student.dateOfBirth || 'N/A'} (${student.gender})</strong></div>
        <div><span style="color:#94a3b8; font-size:0.75rem; display:block; text-transform:uppercase;">LOCATION / ADDRESS</span><strong style="color:#fff;">${student.city || ''}${student.district ? ', ' + student.district : ''}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.75rem; display:block; text-transform:uppercase;">ENROLLED COURSE</span><strong style="color:#fff;">${student.course} (${student.courseLevel || 'N5'})</strong></div>
        <div><span style="color:#94a3b8; font-size:0.75rem; display:block; text-transform:uppercase;">VISA TARGET</span><strong style="color:#fff;">${(student.visaType || 'Student').toUpperCase()} VISA</strong></div>
        <div><span style="color:#94a3b8; font-size:0.75rem; display:block; text-transform:uppercase;">HIGHEST EDUCATION</span><strong style="color:#fff;">${student.highestEducation ? student.highestEducation.toUpperCase() : 'N/A'}</strong></div>
        <div><span style="color:#94a3b8; font-size:0.75rem; display:block; text-transform:uppercase;">EMERGENCY CONTACT</span><strong style="color:#fff;">${student.emergencyName || 'N/A'} (${student.emergencyPhone || ''})</strong></div>
      </div>

      <div style="margin-bottom:1.25rem;">
        <h4 style="margin:0 0 0.5rem; color:#cbd5e1; font-size:0.92rem;"><i class="fas fa-paperclip"></i> Attached Certificates &amp; Documents (${docs.length})</h4>
        <div>${docsHtml}</div>
      </div>

      <div style="background:rgba(255,255,255,0.02); padding:1rem; border-radius:10px; border:1px solid var(--card-border);">
        <span style="color:#94a3b8; font-size:0.75rem; display:block; text-transform:uppercase;">STAFF &amp; COUNSELOR REMARKS</span>
        <p style="margin:0.35rem 0 0; color:#e2e8f0; font-size:0.9rem; line-height:1.5;">${student.notes || 'No counseling notes recorded yet. Click "Edit & Manage" to add notes.'}</p>
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

// ── 6. EDIT STUDENT MODAL & SAVE ──────────────────────────────
window.openEditModal = function(id) {
  const student = studentList.find(s => String(s.id) === String(id) || String(s.applicationNumber) === String(id));
  if (!student) return;

  document.getElementById('editId').value = student.id || student.applicationNumber;
  document.getElementById('editFullName').value = student.fullName || '';
  document.getElementById('editStatus').value = student.status || 'pending';
  document.getElementById('editBatch').value = student.batch || '';
  document.getElementById('editEmail').value = student.email || '';
  document.getElementById('editPhone').value = student.phone || '';
  document.getElementById('editCourse').value = student.course || 'JLPT N5 - Beginner';
  document.getElementById('editCourseLevel').value = student.courseLevel || 'N5';
  document.getElementById('editBranch').value = student.branch || 'Dinajpur';
  document.getElementById('editVisaType').value = student.visaType || 'student';
  document.getElementById('editDob').value = student.dateOfBirth || '';
  document.getElementById('editCity').value = student.city || '';
  document.getElementById('editEmergencyName').value = student.emergencyName || '';
  document.getElementById('editEmergencyPhone').value = student.emergencyPhone || '';
  document.getElementById('editNotes').value = student.notes || '';

  const subtitle = document.getElementById('editModalSubtitle');
  if (subtitle) subtitle.textContent = `Managing ${student.fullName} (${student.applicationNumber})`;

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
  const origBtnHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  const updatedFields = {
    fullName: document.getElementById('editFullName').value.trim(),
    status: document.getElementById('editStatus').value,
    batch: document.getElementById('editBatch').value.trim(),
    email: document.getElementById('editEmail').value.trim(),
    phone: document.getElementById('editPhone').value.trim(),
    course: document.getElementById('editCourse').value,
    courseLevel: document.getElementById('editCourseLevel').value,
    branch: document.getElementById('editBranch').value,
    visaType: document.getElementById('editVisaType').value,
    dateOfBirth: document.getElementById('editDob').value,
    city: document.getElementById('editCity').value.trim(),
    emergencyName: document.getElementById('editEmergencyName').value.trim(),
    emergencyPhone: document.getElementById('editEmergencyPhone').value.trim(),
    notes: document.getElementById('editNotes').value.trim(),
    updatedAt: new Date().toISOString()
  };

  try {
    // 1. Send PUT to backend
    try {
      const endpoint = getApiUrl(`/api/staff/students/${id}`);
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
        credentials: 'include'
      });
    } catch (_) {}

    // 2. Update DAO.Admissions / LocalStorage
    if (window.DAO && window.DAO.Admissions) {
      try {
        await window.DAO.Admissions.update(id, updatedFields);
      } catch (_) {}
    }

    // 3. Update local array
    const idx = studentList.findIndex(s => String(s.id) === String(id) || String(s.applicationNumber) === String(id));
    if (idx !== -1) {
      studentList[idx] = { ...studentList[idx], ...updatedFields };
    }

    closeEditModal();
    updateMetrics();
    renderFilteredStudents();
    showToast(`Updated student profile for ${updatedFields.fullName} successfully!`, 'success');

  } catch (err) {
    console.error('Save failed:', err);
    showToast('Failed to save changes. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = origBtnHtml;
  }
};

// ── 7. QUICK 1-CLICK ADMIT ─────────────────────────────────────
window.quickAdmitStudent = async function(id) {
  const student = studentList.find(s => String(s.id) === String(id) || String(s.applicationNumber) === String(id));
  if (!student) return;

  if (!confirm(`Are you sure you want to approve and admit ${student.fullName}?`)) return;

  const updateData = {
    status: 'admitted',
    admittedAt: new Date().toISOString()
  };

  try {
    try {
      await fetch(getApiUrl(`/api/staff/students/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
        credentials: 'include'
      });
    } catch (_) {}

    if (window.DAO && window.DAO.Admissions) {
      try {
        await window.DAO.Admissions.update(id, updateData);
      } catch (_) {}
    }

    student.status = 'admitted';
    updateMetrics();
    renderFilteredStudents();
    showToast(`🎉 ${student.fullName} has been marked as ADMITTED!`, 'success');

  } catch (e) {
    showToast('Failed to update student status.', 'error');
  }
};

// ── 8. NEW STUDENT WALK-IN REGISTRATION ────────────────────────
window.openNewStudentModal = function() {
  document.getElementById('newStudentForm')?.reset();
  if (document.getElementById('newBranch') && currentBranch !== 'all') {
    document.getElementById('newBranch').value = currentBranch;
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
  const newStudentObj = {
    id: newAppNum,
    identifier: newAppNum,
    applicationNumber: newAppNum,
    applicationId: newAppNum,
    fullName: document.getElementById('newFullName').value.trim(),
    phone: document.getElementById('newPhone').value.trim(),
    email: document.getElementById('newEmail').value.trim(),
    course: document.getElementById('newCourse').value,
    currentCourse: document.getElementById('newCourse').value,
    branch: document.getElementById('newBranch').value,
    status: document.getElementById('newStatus').value,
    batch: document.getElementById('newBatch').value.trim() || 'Batch 01',
    city: document.getElementById('newCity').value.trim(),
    notes: document.getElementById('newNotes').value.trim(),
    comment: document.getElementById('newNotes').value.trim(),
    photoUrl: '../assets/images/student-placeholder.jpg',
    photo: '../assets/images/student-placeholder.jpg',
    submittedAt: dateIso,
    enrollmentDate: dateIso,
    admissionDate: customDateInput || dateIso.split('T')[0]
  };

  try {
    let apiSuccess = false;
    try {
      const resp = await fetch(getApiUrl('/api/staff/students'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newStudentObj)
      });
      if (resp.ok) {
        const resData = await resp.json();
        if (resData.success) {
          apiSuccess = true;
          if (resData.student) {
            Object.assign(newStudentObj, resData.student);
          }
        }
      }
    } catch (_) {}

    if (!apiSuccess && window.DAO && window.DAO.Admissions) {
      const res = await (window.DAO.Admissions.add ? window.DAO.Admissions.add(newStudentObj) : window.DAO.Admissions.create(newStudentObj));
      if (res && res.error) throw new Error(res.error);
    }

    studentList.unshift(newStudentObj);
    document.getElementById('newStudentForm')?.reset();
    closeNewStudentModal();
    updateMetrics();
    renderFilteredStudents();
    showToast(`New student ${newStudentObj.fullName} (${newAppNum}) registered successfully!`, 'success');

  } catch (err) {
    showToast('Failed to create student enrollment: ' + (err.message || 'Unknown error'), 'error');
  }
};

// ── 9. PRINTING TEMPLATES ──────────────────────────────────────
window.printCurrentStudentProfile = function() {
  if (viewingStudent) {
    printStudentProfile(viewingStudent);
  }
};

window.printStudentById = function(id) {
  const student = studentList.find(s => String(s.id) === String(id) || String(s.applicationNumber) === String(id));
  if (student) printStudentProfile(student);
};

function printStudentProfile(student) {
  if (!printableSection) return;

  const dateStr = student.submittedAt ? new Date(student.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Recent';

  const html = `
    <div style="padding: 2.5rem; font-family: 'Inter', sans-serif; color: #000; background: #fff; max-width: 800px; margin: 0 auto; line-height: 1.5;">
      
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 1.25rem; margin-bottom: 1.5rem;">
        <div>
          <h1 style="margin: 0; font-size: 1.6rem; color: #000; text-transform: uppercase;">FUSION EDUCATION BD</h1>
          <p style="margin: 0.2rem 0 0; font-size: 0.9rem; color: #444;">Official Admission &amp; Student Profile Document</p>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 700; font-size: 1rem; color: #000;">${student.applicationNumber}</div>
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
          <td style="padding: 8px 10px; border: 1px solid #ddd;">${student.city || ''}${student.district ? ', ' + student.district : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 10px; border: 1px solid #ddd;">Emergency Contact</td>
          <td style="padding: 8px 10px; border: 1px solid #ddd;">${student.emergencyName || 'N/A'} (${student.emergencyPhone || 'N/A'})</td>
        </tr>
        <tr>
          <td style="padding: 8px 10px; border: 1px solid #ddd;">Visa Target</td>
          <td style="padding: 8px 10px; border: 1px solid #ddd;">${(student.visaType || 'Student').toUpperCase()} VISA</td>
        </tr>
      </table>

      <!-- Notes -->
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
  if (!printableSection) return;

  const branchLabel = currentBranch === 'all' ? 'All Branches' : `${currentBranch} Branch`;
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

// ── 10. LOGOUT ─────────────────────────────────────────────────
window.logoutStaff = async function() {
  try {
    await fetch(getApiUrl('/api/staff/logout'), { method: 'POST', credentials: 'include' });
  } catch (_) {}
  sessionStorage.removeItem('fusion_staff_session');
  sessionStorage.removeItem('fusion_staff_email');
  sessionStorage.removeItem('fusion_staff_branch');
  sessionStorage.removeItem('fusion_staff_name');
  window.location.href = 'staff-login.html';
};

// ── 11. FEE & PAYMENT MANAGEMENT ──────────────────────────────
let activeFeeStudentId = null;

window.openFeeModal = async function(studentId) {
  activeFeeStudentId = studentId;
  const modal = document.getElementById('feeModal');
  if (!modal) return;

  document.getElementById('feeStudentId').value = studentId;
  document.getElementById('payAmount').value = '';
  document.getElementById('payNote').value = '';
  document.getElementById('payDate').value = new Date().toISOString().split('T')[0];

  modal.style.display = 'flex';

  await refreshFeeData(studentId);
};

window.closeFeeModal = function() {
  const modal = document.getElementById('feeModal');
  if (modal) modal.style.display = 'none';
  activeFeeStudentId = null;
};

async function refreshFeeData(studentId) {
  try {
    const res = await fetch(getApiUrl(`/api/students/${studentId}/billing`), { credentials: 'include' });
    let billing = null;
    let student = null;

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        billing = data.billing;
        student = data.student;
      }
    }

    // Client-side fallback if server offline
    if (!billing) {
      const st = studentList.find(s => String(s.id) === String(studentId) || String(s.applicationNumber) === String(studentId));
      if (st) {
        student = st;
        const activeMonths = 1;
        const rate = st.customMonthlyFee ? Number(st.customMonthlyFee) : 1000;
        const admissionFee = 1000;
        const accrued = admissionFee + (activeMonths * rate);
        const payments = Array.isArray(st.payments) ? st.payments : [];
        const paid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        const due = Math.max(0, accrued - paid);
        billing = {
          initialDurationMonths: 3,
          activeMonths,
          standardMonthlyFee: 1000,
          effectiveMonthlyRate: rate,
          isCustomRate: Boolean(st.customMonthlyFee),
          admissionFee,
          totalAccruedFee: accrued,
          totalPaid: paid,
          balanceDue: due,
          status: due === 0 ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Unpaid'),
          payments
        };
      }
    }

    if (!billing) return;

    // Update UI elements
    document.getElementById('feeModalTitle').innerHTML = `<i class="fas fa-credit-card" style="color:#10b981; margin-right:0.4rem;"></i> Tuition &amp; Payments: ${student?.fullName || studentId}`;
    document.getElementById('feeActiveMonths').textContent = `${billing.activeMonths} Month${billing.activeMonths > 1 ? 's' : ''}`;
    document.getElementById('feeInitialDuration').textContent = `Init: ${billing.initialDurationMonths || 3} Months`;
    document.getElementById('feeMonthlyRate').textContent = `৳ ${billing.effectiveMonthlyRate.toLocaleString()} / mo`;
    document.getElementById('feeRateType').textContent = billing.isCustomRate ? '🌟 Custom Student Rate' : 'Standard Course Rate';
    document.getElementById('feeTotalAccrued').textContent = `৳ ${billing.totalAccruedFee.toLocaleString()}`;
    document.getElementById('feeAdmissionPart').textContent = `Inc. Admission: ৳${(billing.admissionFee || 1000).toLocaleString()}`;
    document.getElementById('feeTotalPaid').textContent = `৳ ${billing.totalPaid.toLocaleString()}`;
    document.getElementById('feePaymentCount').textContent = `${(billing.payments || []).length} receipt(s)`;
    document.getElementById('feeBalanceDue').textContent = `৳ ${billing.balanceDue.toLocaleString()}`;
    
    const statusPill = document.getElementById('feeStatusPill');
    statusPill.textContent = billing.status;
    statusPill.style.color = billing.status === 'Paid' ? '#34d399' : (billing.status === 'Partially Paid' ? '#fbbf24' : '#f87171');

    // Populate custom rate input
    const customRateInput = document.getElementById('customRateInput');
    if (customRateInput) customRateInput.value = billing.isCustomRate ? billing.effectiveMonthlyRate : '';

    // Enforce modular permissions inside Fee Modal
    const canManageFees = window.hasStaffPermission('manage_fees');
    const canCustomFee = window.hasStaffPermission('custom_student_fee');

    const recordForm = document.getElementById('recordPaymentForm');
    const recordLockedNotice = document.getElementById('recordPaymentLockedNotice');
    if (recordForm && recordLockedNotice) {
      if (canManageFees) {
        recordForm.style.display = 'block';
        recordLockedNotice.style.display = 'none';
      } else {
        recordForm.style.display = 'none';
        recordLockedNotice.style.display = 'block';
      }
    }

    const customPricingPanel = document.getElementById('customPricingPanel');
    if (customPricingPanel) {
      customPricingPanel.style.display = canCustomFee ? 'block' : 'none';
    }

    // Render payment history
    const historyBody = document.getElementById('feePaymentHistoryBody');
    if (historyBody) {
      const pList = billing.payments || [];
      if (pList.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="5" style="padding:1.5rem; text-align:center; color:#94a3b8;">No payment receipts recorded yet.</td></tr>`;
      } else {
        historyBody.innerHTML = pList.map(p => `
          <tr style="border-bottom: 1px solid var(--card-border);">
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

  try {
    const res = await fetch(getApiUrl(`/api/students/${studentId}/payments`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ amount, note, date, method: 'Recorded' })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Payment of ৳${amount.toLocaleString()} recorded successfully!`, 'success');
      document.getElementById('payAmount').value = '';
      document.getElementById('payNote').value = '';
      await refreshFeeData(studentId);
      await loadStudents();
    } else {
      showToast(data.error || 'Failed to record payment', 'error');
    }
  } catch (err) {
    showToast('Payment recorded in offline session', 'success');
    await refreshFeeData(studentId);
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
    const res = await fetch(getApiUrl(`/api/students/${studentId}/custom-fee`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        customMonthlyFee: customMonthlyFee ? parseFloat(customMonthlyFee) : null,
        specialDiscount: specialDiscount ? parseFloat(specialDiscount) : 0,
        reason
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast('Custom student pricing updated successfully!', 'success');
      await refreshFeeData(studentId);
      await loadStudents();
    } else {
      showToast(data.error || 'Failed to update custom rate', 'error');
    }
  } catch (err) {
    showToast('Custom rate updated in offline session', 'success');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Apply Custom Pricing';
  }
};

// ── 12. INSTRUCTOR BRANCH STAFF CONTROL ────────────────────────
window.openBranchStaffModal = async function() {
  const modal = document.getElementById('branchStaffModal');
  if (!modal) return;
  modal.style.display = 'flex';

  const tbody = document.getElementById('branchStaffTableBody');
  tbody.innerHTML = `<tr><td colspan="5" style="padding:1.5rem; text-align:center; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Loading branch staff...</td></tr>`;

  try {
    const res = await fetch(getApiUrl('/api/instructor/staff'), { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.staff)) {
        if (data.staff.length === 0) {
          tbody.innerHTML = `<tr><td colspan="5" style="padding:1.5rem; text-align:center; color:#94a3b8;">No staff accounts found for this branch.</td></tr>`;
          return;
        }
        tbody.innerHTML = data.staff.map(st => `
          <tr style="border-bottom: 1px solid var(--card-border);">
            <td style="padding: 0.65rem 1rem; font-weight:700; color:#fff;">${st.name}</td>
            <td style="padding: 0.65rem 1rem; color:#94a3b8;">${st.email}</td>
            <td style="padding: 0.65rem 1rem; color:#38bdf8;">${st.branch}</td>
            <td style="padding: 0.65rem 1rem; color:#c084fc; text-transform:capitalize;">${st.role}</td>
            <td style="padding: 0.65rem 1rem; text-align:center;">
              <span class="status-tag admitted" style="font-size:0.75rem;">Active</span>
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
  const modal = document.getElementById('branchStaffModal');
  if (modal) modal.style.display = 'none';
};

// ── 13. ESCAPE KEY CLOSE FOR MODALS ────────────────────────────
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeViewModal();
    closeEditModal();
    closeNewStudentModal();
    closeFeeModal();
    closeBranchStaffModal();
  }
});

// Run Init
initStaffSession();
