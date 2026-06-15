const studentTableBody = document.getElementById('studentTableBody');
const emptyMessage = document.getElementById('emptyMessage');
const staffNameField = document.getElementById('staffName');
const staffBranchField = document.getElementById('staffBranch');
const studentCountField = document.getElementById('studentCount');
const latestStatusField = document.getElementById('latestStatus');
const refreshButton = document.getElementById('refreshButton');
const logoutButton = document.getElementById('logoutButton');
const printBranchButton = document.getElementById('printBranchButton');
const studentModal = document.getElementById('studentModal');
const modalCloseButton = document.getElementById('modalCloseButton');
const modalCloseFooter = document.getElementById('modalCloseFooter');
const printStudentButton = document.getElementById('printStudentButton');
const modalName = document.getElementById('modalName');
const modalSubtitle = document.getElementById('modalSubtitle');
const modalCourse = document.getElementById('modalCourse');
const modalDocumentId = document.getElementById('modalDocumentId');
const modalEmail = document.getElementById('modalEmail');
const modalPhone = document.getElementById('modalPhone');
const modalStatus = document.getElementById('modalStatus');
const modalAdmissionDate = document.getElementById('modalAdmissionDate');
const modalBranch = document.getElementById('modalBranch');
const modalNotes = document.getElementById('modalNotes');
const modalDocumentPreview = document.getElementById('modalDocumentPreview');
const printableSection = document.getElementById('printableSection');

let currentStudent = null;
let studentList = [];

async function requestJson(path, options = {}) {
  const response = await fetch(path, options);

  if (response.status === 401) {
    window.location.href = '/pages/staff-login.html';
    return null;
  }

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || 'Unable to load data');
  }

  return payload;
}

function buildStudentRow(student, index) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${index + 1}</td>
    <td>${student.fullName}</td>
    <td>${student.course}</td>
    <td>${student.passportOrNid}</td>
    <td><img src="${student.documentPreview}" alt="Document preview" style="width: 88px; height: 56px; object-fit: cover; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.18);" /></td>
    <td>
      <div class="actions">
        <button class="action-pill" type="button" data-action="view" data-id="${student.id}"><i class="fas fa-eye"></i> View</button>
        <button class="action-pill" type="button" data-action="print" data-id="${student.id}"><i class="fas fa-print"></i> Print</button>
      </div>
    </td>
  `;

  return tr;
}

function updateSummary(students, staffProfile) {
  studentCountField.textContent = students.length;
  latestStatusField.textContent = students[0] ? students[0].status : 'No students found';
  staffNameField.textContent = staffProfile.name || 'Staff Member';
  staffBranchField.textContent = staffProfile.branch || 'Unknown';
}

function renderTable(students) {
  studentTableBody.innerHTML = '';

  if (!students.length) {
    emptyMessage.textContent = 'No students are assigned to your branch.';
    emptyMessage.style.display = 'block';
    return;
  }

  emptyMessage.style.display = 'none';
  students.forEach((student, index) => {
    studentTableBody.appendChild(buildStudentRow(student, index));
  });
}

async function loadStudents() {
  try {
    const [profileResponse, listResponse] = await Promise.all([
      requestJson('/api/staff/me'),
      requestJson('/api/staff/students')
    ]);

    if (!profileResponse || !listResponse) {
      return;
    }

    studentList = listResponse.students;
    renderTable(studentList);
    updateSummary(studentList, profileResponse);
  } catch (error) {
    emptyMessage.textContent = error.message;
    emptyMessage.style.display = 'block';
  }
}

function showModal(student) {
  currentStudent = student;
  modalName.textContent = student.fullName;
  modalSubtitle.textContent = `${student.course} • ${student.branch}`;
  modalCourse.textContent = student.course;
  modalDocumentId.textContent = student.passportOrNid;
  modalEmail.textContent = student.email;
  modalPhone.textContent = student.phone;
  modalStatus.textContent = student.status;
  modalAdmissionDate.textContent = student.admissionDate;
  modalBranch.textContent = student.branch;
  modalNotes.textContent = student.notes;
  modalDocumentPreview.src = student.documentPreview;
  studentModal.classList.add('open');
}

function hideModal() {
  studentModal.classList.remove('open');
  currentStudent = null;
}

function buildPrintTemplate(student) {
  return `
    <div class="printable-sheet" style="padding: 2rem; background: #ffffff; color: #111827; font-family: 'Inter', sans-serif;">
      <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <div>
          <h1 style="margin: 0; font-size: 2rem;">Fusion Education</h1>
          <p style="margin: 0.5rem 0 0; color: #475569;">Student Profile Sheet</p>
        </div>
        <div style="text-align: right; color: #475569;">
          <p style="margin: 0;">Branch: ${student.branch}</p>
          <p style="margin: 0;">Printed: ${new Date().toLocaleDateString()}</p>
        </div>
      </header>
      <section style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
        <div>
          <h2 style="margin: 0 0 0.75rem; font-size: 1.1rem; color: #0f172a;">Student Details</h2>
          <p style="margin: 0.35rem 0;"><strong>Name:</strong> ${student.fullName}</p>
          <p style="margin: 0.35rem 0;"><strong>Course:</strong> ${student.course}</p>
          <p style="margin: 0.35rem 0;"><strong>Passport / NID:</strong> ${student.passportOrNid}</p>
          <p style="margin: 0.35rem 0;"><strong>Email:</strong> ${student.email}</p>
          <p style="margin: 0.35rem 0;"><strong>Phone:</strong> ${student.phone}</p>
          <p style="margin: 0.35rem 0;"><strong>Status:</strong> ${student.status}</p>
          <p style="margin: 0.35rem 0;"><strong>Admitted:</strong> ${student.admissionDate}</p>
        </div>
        <div style="background: #f8fafc; border-radius: 22px; padding: 1rem; border: 1px solid #e2e8f0;">
          <h2 style="margin: 0 0 0.75rem; font-size: 1.1rem; color: #0f172a;">Notes</h2>
          <p style="margin: 0; color: #475569; line-height: 1.75;">${student.notes}</p>
        </div>
      </section>
      <section style="border-top: 1px solid #e2e8f0; padding-top: 1.5rem; display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 1.5rem;">
        <div>
          <h2 style="margin: 0 0 0.75rem; font-size: 1.1rem; color: #0f172a;">Document Preview</h2>
          <img src="${student.documentPreview}" style="width: 100%; border-radius: 18px; border: 1px solid #e2e8f0;" alt="Student document preview" />
        </div>
        <div style="display: grid; gap: 1rem;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 1rem;">
            <p style="margin: 0 0 0.5rem; font-weight: 700; color: #0f172a;">Profile Summary</p>
            <p style="margin: 0; color: #475569; line-height: 1.7;">Use this page as the printed student profile sheet for branch review and admissions verification.</p>
          </div>
        </div>
      </section>
    </div>
  `;
}

function printStudentProfile(student) {
  printableSection.innerHTML = buildPrintTemplate(student);
  window.print();
  printableSection.innerHTML = '';
}

function printBranchSummary() {
  const summaryHtml = `
    <div class="printable-sheet" style="padding: 2rem; background: #ffffff; color: #111827; font-family: 'Inter', sans-serif;">
      <header style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="margin: 0; font-size: 2rem;">Fusion Education</h1>
          <p style="margin: 0.5rem 0 0; color: #475569;">Branch Student Summary</p>
        </div>
        <div style="text-align: right; color: #475569;">
          <p style="margin: 0;">Printed: ${new Date().toLocaleDateString()}</p>
        </div>
      </header>
      <section style="border-top: 1px solid #e2e8f0; padding-top: 1.5rem;">
        <h2 style="margin: 0 0 1rem; font-size: 1.2rem; color: #0f172a;">Students (${studentList.length})</h2>
        ${studentList
          .map(
            (student, index) => `
            <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0;">
              <p style="margin: 0.25rem 0; font-weight: 700;">${index + 1}. ${student.fullName}</p>
              <p style="margin: 0.25rem 0; color: #475569;">${student.course} • ${student.passportOrNid} • ${student.status}</p>
            </div>
          `
          )
          .join('')}
      </section>
    </div>
  `;

  printableSection.innerHTML = summaryHtml;
  window.print();
  printableSection.innerHTML = '';
}

function handleTableActions(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const studentId = Number(button.dataset.id);
  const student = studentList.find((item) => item.id === studentId);

  if (!student) return;

  if (action === 'view') {
    showModal(student);
  } else if (action === 'print') {
    printStudentProfile(student);
  }
}

async function logoutStaff() {
  try {
    const response = await fetch('/api/staff/logout', { method: 'POST' });
    const payload = await response.json();

    if (payload.success) {
      window.location.href = '/pages/staff-login.html';
    }
  } catch (error) {
    console.error('Logout failed', error);
  }
}

refreshButton.addEventListener('click', loadStudents);
logoutButton.addEventListener('click', logoutStaff);
printBranchButton.addEventListener('click', printBranchSummary);
studentTableBody.addEventListener('click', handleTableActions);
modalCloseButton.addEventListener('click', hideModal);
modalCloseFooter.addEventListener('click', hideModal);
printStudentButton.addEventListener('click', () => {
  if (currentStudent) {
    printStudentProfile(currentStudent);
  }
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && studentModal.classList.contains('open')) {
    hideModal();
  }
});

loadStudents();
