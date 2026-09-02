/**
 * FUSION EDUCATION BD — STUDENT DASHBOARD DATA LOADER
 * Fetches and renders full student profile, courses, assignments, notices, visa status & fees
 */

(function () {
  'use strict';

  // Demo fallback student profile in case offline or testing
  const DEMO_STUDENTS = {
    "FEBD-2026-003": {
      identifier: "FEBD-2026-003",
      email: "manik2025245@gmail.com",
      fullName: "Manik I",
      phone: "01723372217",
      bloodGroup: "B+",
      address: "Dinajpur 5230",
      branch: "Dinajpur",
      photo: "/uploads/photos/1788258943110_t5u450.jpg",
      status: "Active Student",
      currentCourse: "JLPT N5",
      courseLevel: "Beginner (N5)",
      batch: "Batch 14 - JLPT N5 Morning",
      instructor: "Tanaka Sensei",
      progressPercent: 35,
      nextClass: {
        topic: "JLPT N5 Grammar: Lesson 03 & Hiragana Review",
        time: "Tomorrow at 09:30 AM",
        room: "Room 102, Dinajpur Campus & Zoom"
      },
      attendance: { attended: 6, total: 6, rate: "100%" },
      fees: { total: "15,000 BDT", paid: "1,000 BDT (Deposit)", due: "14,000 BDT", status: "Partially Paid" },
      visaApplication: {
        status: "Document Verification",
        university: "Tokyo International Language Academy",
        intake: "October 2026",
        step: 2,
        steps: [
          { title: "Application Submitted", done: true, date: "01 Sep 2026" },
          { title: "Document Verification", done: true, date: "Verified" },
          { title: "Translation & Legalization", done: false, date: "In Progress" },
          { title: "COE Application to Japan Immigration", done: false, date: "Pending" },
          { title: "Embassy Visa Stamp", done: false, date: "Pending" }
        ]
      },
      assignments: [
        { id: "asg_m1", title: "Hiragana & Katakana Stroke Order Sheet", dueDate: "In 3 days", status: "Pending", maxScore: 25 }
      ],
      messages: [
        { from: "Dinajpur Branch Desk", text: "Your enrollment in Batch 14 - JLPT N5 Morning is confirmed! Counseling verified.", time: "Today" }
      ]
    },
    "FEBD-2026-002": {
      identifier: "FEBD-2026-002",
      email: "shakil@example.com",
      fullName: "Md Shakil",
      phone: "01712345678",
      bloodGroup: "O+",
      address: "House 12, Road 4",
      branch: "Dinajpur",
      photo: "/uploads/photos/1788258781808_6d8v97.jpg",
      status: "Application Under Review",
      currentCourse: "JLPT N5 - Beginner",
      courseLevel: "Beginner (N5)",
      batch: "Upcoming Intake",
      instructor: "Assigned upon class start",
      progressPercent: 15,
      nextClass: {
        topic: "Orientation Briefing & Class Routine",
        time: "Schedule will be announced soon",
        room: "Campus & Online"
      },
      attendance: { attended: 0, total: 0, rate: "100%" },
      fees: { total: "15,000 BDT", paid: "5,000 BDT (Deposit)", due: "10,000 BDT", status: "Partially Paid" },
      visaApplication: {
        status: "Document Verification",
        step: 1,
        steps: [
          { title: "Application Submitted", done: true, date: "Recent" },
          { title: "Document Verification", done: false, date: "In Review" },
          { title: "COE Application", done: false, date: "Pending" }
        ]
      },
      assignments: [],
      messages: [
        { from: "Admin Desk", text: "Welcome to Fusion Education BD! Your admission application is being processed.", time: "Recent" }
      ]
    },
    "FE-2024-001": {
      identifier: "FE-2024-001",
      email: "student@fusion.com",
      fullName: "Amit Rahman",
      phone: "+880 1712 345678",
      bloodGroup: "O+",
      address: "House 12, Road 4, Dinajpur",
      branch: "Dinajpur",
      photo: "../assets/images/student-placeholder.jpg",
      status: "Active Student",
      currentCourse: "JLPT N4 - Intermediate Japanese",
      courseLevel: "Intermediate (N4)",
      batch: "Batch 2024-N4-D01",
      instructor: "Tanaka Sensei",
      progressPercent: 68,
      nextClass: {
        topic: "Grammar: Lesson 14 (~te kudasai / ~nakereba narimasen)",
        time: "Tomorrow at 10:00 AM",
        room: "Room 203 (Lab 1) & Zoom Online"
      },
      attendance: { attended: 28, total: 32, rate: "87.5%" },
      fees: { total: "18,000 BDT", paid: "18,000 BDT", due: "0 BDT", status: "Paid" },
      visaApplication: {
        status: "COE Applied",
        university: "Tokyo International Language Academy",
        intake: "October 2026",
        step: 3,
        steps: [
          { title: "Document Verification", done: true, date: "10 Jan 2026" },
          { title: "Translation & Legalization", done: true, date: "02 Feb 2026" },
          { title: "COE Application to Japan Immigration", done: true, date: "15 Feb 2026" },
          { title: "COE Issuance", done: false, date: "Expected April 2026" },
          { title: "Embassy Visa Stamp", done: false, date: "Pending" }
        ]
      },
      assignments: [
        { id: "asg_1", title: "Kanji Practice: Kanji Chapters 8-10 (40 Characters)", dueDate: "In 2 days", status: "Pending", maxScore: 25 },
        { id: "asg_2", title: "Listening Comprehension: Monologue & Dialogues N4", dueDate: "Next Monday", status: "Pending", maxScore: 50 },
        { id: "asg_3", title: "JLPT N4 Mock Test 1", dueDate: "Completed", status: "Graded", score: "86/100" }
      ],
      messages: [
        { from: "Tanaka Sensei (Instructor)", text: "Great job in yesterday's speaking session. Please memorize Kanji list 9 before next class.", time: "Yesterday" },
        { from: "Visa Desk (Admin)", text: "Your academic transcript translation is verified. COE submission is in progress.", time: "3 days ago" },
        { from: "Academic Office", text: "Mid-term mock test scheduled for 25th of this month.", time: "1 week ago" }
      ]
    }
  };

  const DEMO_STUDENT = DEMO_STUDENTS["FE-2024-001"];

  let currentStudentData = null;

  // Determine API base URL (handles Live Server port 5500 vs Node server port 3000)
  function getApiBase() {
    if (window.location.port === '3000') return '';
    return 'http://localhost:3000';
  }

  // Fetch Student Profile
  async function loadStudentProfile() {
    let identifier = localStorage.getItem('studentIdentifier') || sessionStorage.getItem('studentIdentifier');
    
    // If not in storage, check URL query param ?id=...
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('id')) {
      identifier = urlParams.get('id');
      localStorage.setItem('studentIdentifier', identifier);
    }

    if (!identifier) {
      identifier = "FE-2024-001"; // Default demo student ID
    }

    // Helper to find local fallback
    const findLocalFallback = (id) => {
      const clean = String(id).trim().toUpperCase();
      if (DEMO_STUDENTS[clean]) return DEMO_STUDENTS[clean];
      for (const key in DEMO_STUDENTS) {
        if (DEMO_STUDENTS[key].email.toLowerCase() === String(id).trim().toLowerCase()) {
          return DEMO_STUDENTS[key];
        }
      }
      return JSON.parse(localStorage.getItem('cached_student_profile') || 'null') || DEMO_STUDENT;
    };

    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/student/profile?identifier=${encodeURIComponent(identifier)}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        currentStudentData = data.student || data;
      } else {
        currentStudentData = findLocalFallback(identifier);
      }
    } catch (err) {
      currentStudentData = findLocalFallback(identifier);
    }

    if (currentStudentData) {
      localStorage.setItem('cached_student_profile', JSON.stringify(currentStudentData));
      renderDashboard(currentStudentData);
    }
  }

  // Render Full Dashboard
  function renderDashboard(student) {
    // 1. Profile & Header Info
    const studentNameEl = document.getElementById('studentName');
    if (studentNameEl) studentNameEl.textContent = student.fullName || 'Student';

    const welcomeTitleEl = document.getElementById('welcomeTitle');
    if (welcomeTitleEl) welcomeTitleEl.textContent = `Welcome back, ${student.fullName || 'Student'}!`;

    const studentPhotoEl = document.getElementById('studentPhoto');
    if (studentPhotoEl) {
      studentPhotoEl.src = student.photo || '../assets/images/student-placeholder.jpg';
      studentPhotoEl.alt = student.fullName || 'Student Photo';
    }

    const studentIdBadge = document.getElementById('studentIdBadge');
    if (studentIdBadge) studentIdBadge.textContent = student.identifier || 'FE-STUDENT';

    const studentEmailEl = document.getElementById('studentEmail');
    if (studentEmailEl) studentEmailEl.textContent = student.email || 'N/A';

    const studentPhoneEl = document.getElementById('studentPhone');
    if (studentPhoneEl) studentPhoneEl.textContent = student.phone || 'N/A';

    const studentBranchEl = document.getElementById('studentBranch');
    if (studentBranchEl) studentBranchEl.textContent = student.branch || 'Main Campus';

    const studentBloodEl = document.getElementById('studentBlood');
    if (studentBloodEl) studentBloodEl.textContent = student.bloodGroup || 'N/A';

    const studentStatusPill = document.getElementById('studentStatusPill');
    if (studentStatusPill) {
      studentStatusPill.innerHTML = `<i class="fas fa-user-check"></i> ${student.status || 'Active Student'}`;
    }

    // 2. Course & Academics
    const courseTitleEl = document.getElementById('courseTitle');
    if (courseTitleEl) courseTitleEl.textContent = student.currentCourse || 'Enrolled Course';

    const courseBatchEl = document.getElementById('courseBatch');
    if (courseBatchEl) courseBatchEl.textContent = `${student.batch || 'Batch 2024'} • ${student.instructor || 'Sensei'}`;

    const progressPercent = student.progressPercent || 60;
    const progressTextEl = document.getElementById('progressText');
    if (progressTextEl) progressTextEl.textContent = `${progressPercent}% completed`;

    const progressBarEl = document.getElementById('progressBar');
    if (progressBarEl) progressBarEl.style.width = `${progressPercent}%`;

    // 3. Next Class Schedule
    if (student.nextClass) {
      const nextClassTopicEl = document.getElementById('nextClassTopic');
      if (nextClassTopicEl) nextClassTopicEl.textContent = student.nextClass.topic || 'Upcoming lesson';

      const nextClassTimeEl = document.getElementById('nextClassTime');
      if (nextClassTimeEl) nextClassTimeEl.textContent = student.nextClass.time || 'Schedule will update soon';

      const nextClassRoomEl = document.getElementById('nextClassRoom');
      if (nextClassRoomEl) nextClassRoomEl.textContent = student.nextClass.room || 'Main Campus';
    }

    // 4. Attendance
    if (student.attendance) {
      const attendanceRateEl = document.getElementById('attendanceRate');
      if (attendanceRateEl) attendanceRateEl.textContent = student.attendance.rate || '90%';

      const attendanceCountEl = document.getElementById('attendanceCount');
      if (attendanceCountEl) attendanceCountEl.textContent = `${student.attendance.attended}/${student.attendance.total} Classes Attended`;
    }

    // 5. Fees & Payments
    if (student.fees) {
      const feeStatusEl = document.getElementById('feeStatus');
      if (feeStatusEl) {
        const isPaid = (student.fees.status || '').toLowerCase().includes('paid') && !(student.fees.status || '').toLowerCase().includes('partially');
        feeStatusEl.className = isPaid ? 'status-pill green' : 'status-pill yellow';
        feeStatusEl.innerHTML = `<i class="fas ${isPaid ? 'fa-check-circle' : 'fa-clock'}"></i> ${student.fees.status || 'Paid'}`;
      }

      const feeTotalEl = document.getElementById('feeTotal');
      if (feeTotalEl) feeTotalEl.textContent = student.fees.total || '0 BDT';

      const feePaidEl = document.getElementById('feePaid');
      if (feePaidEl) feePaidEl.textContent = student.fees.paid || '0 BDT';

      const feeDueEl = document.getElementById('feeDue');
      if (feeDueEl) feeDueEl.textContent = student.fees.due || '0 BDT';
    }

    const quickStatusText = document.getElementById('quickStatusText');
    if (quickStatusText) {
      quickStatusText.textContent = student.status || 'Active Student';
    }

    // 6. Visa Tracker
    if (student.visaApplication) {
      const visaStatusPill = document.getElementById('visaStatusPill');
      if (visaStatusPill) {
        visaStatusPill.innerHTML = `<i class="fas fa-passport"></i> ${student.visaApplication.status || 'Processing'}`;
      }

      const visaUniEl = document.getElementById('visaUniversity');
      if (visaUniEl) visaUniEl.textContent = student.visaApplication.university || 'Tokyo International Language Academy';

      const visaIntakeEl = document.getElementById('visaIntake');
      if (visaIntakeEl) visaIntakeEl.textContent = `Target Intake: ${student.visaApplication.intake || 'October 2026'}`;

      const timelineContainer = document.getElementById('visaTimelineContainer');
      if (timelineContainer && Array.isArray(student.visaApplication.steps)) {
        timelineContainer.innerHTML = student.visaApplication.steps.map((step, idx) => {
          const isDone = step.done === true;
          const isCurrent = !isDone && (idx === 0 || student.visaApplication.steps[idx - 1]?.done);
          
          let circleStyle = 'background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(148,163,184,0.25);';
          if (isDone) circleStyle = 'background: #10b981; color: #ffffff; box-shadow: 0 0 10px rgba(16,185,129,0.4);';
          else if (isCurrent) circleStyle = 'background: rgba(56,189,248,0.2); color: #38bdf8; border: 2px solid #38bdf8; box-shadow: 0 0 10px rgba(56,189,248,0.3);';

          return `
            <div style="display: flex; gap: 1rem; align-items: flex-start; position: relative; margin-bottom: 1.15rem;">
              <div style="width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; flex-shrink: 0; ${circleStyle}">
                ${isDone ? '<i class="fas fa-check"></i>' : idx + 1}
              </div>
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <strong style="color: ${isDone || isCurrent ? '#ffffff' : '#94a3b8'}; font-size: 0.92rem; font-weight: 600;">
                    ${step.title}
                  </strong>
                  ${isDone ? '<span style="font-size: 0.72rem; color: #34d399; font-weight: 600;"><i class="fas fa-check-circle"></i> Completed</span>' : (isCurrent ? '<span style="font-size: 0.72rem; color: #38bdf8; font-weight: 600;"><i class="fas fa-spinner fa-spin"></i> In Progress</span>' : '')}
                </div>
                <div style="font-size: 0.8rem; color: ${isDone ? '#34d399' : '#94a3b8'}; margin-top: 0.15rem;">
                  ${step.date}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 7. Assignments & Homework
    const assignmentsContainer = document.getElementById('assignmentsContainer');
    if (assignmentsContainer) {
      if (student.assignments && student.assignments.length > 0) {
        assignmentsContainer.innerHTML = student.assignments.map(asg => {
          const isGraded = asg.status === 'Graded';
          const pillClass = isGraded ? 'status-pill green' : 'status-pill yellow';
          return `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 0; border-bottom: 1px solid var(--border-light); gap: 0.65rem; flex-wrap: wrap;">
              <div>
                <div style="color: #ffffff; font-size: 0.92rem; font-weight: 600; margin-bottom: 0.25rem;">
                  ${asg.title}
                </div>
                <div style="font-size: 0.8rem; color: #94a3b8; display: flex; align-items: center; gap: 0.6rem;">
                  <span><i class="far fa-clock" style="color: #38bdf8;"></i> Due: ${asg.dueDate}</span>
                  ${asg.score ? `<span style="color: #34d399; font-weight: 700;"><i class="fas fa-award"></i> Score: ${asg.score}</span>` : ''}
                </div>
              </div>
              <span class="${pillClass}" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;">
                ${asg.status}
              </span>
            </li>
          `;
        }).join('');
      } else {
        assignmentsContainer.innerHTML = `<li style="color: #94a3b8; padding: 0.75rem 0;">No pending assignments for your batch.</li>`;
      }
    }

    // 8. Messages & Notices
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
      if (student.messages && student.messages.length > 0) {
        messagesContainer.innerHTML = student.messages.map(msg => `
          <li style="padding: 0.85rem 0; border-bottom: 1px solid var(--border-light);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-bottom: 0.35rem; gap: 0.5rem; flex-wrap: wrap;">
              <strong style="color: #38bdf8; font-size: 0.88rem; display: flex; align-items: center; gap: 0.4rem;">
                <i class="fas fa-bullhorn" style="font-size: 0.8rem; color: #fbbf24;"></i> ${msg.from}
              </strong>
              <span style="color: #94a3b8; font-size: 0.75rem; background: rgba(255,255,255,0.05); padding: 0.15rem 0.45rem; border-radius: 6px;">
                ${msg.time}
              </span>
            </div>
            <p style="margin: 0; color: #e2e8f0; font-size: 0.88rem; line-height: 1.5;">
              ${msg.text}
            </p>
          </li>
        `).join('');
      } else {
        messagesContainer.innerHTML = `<li style="color: #94a3b8; padding: 0.75rem 0;">No active notices for today.</li>`;
      }
    }
  }

  // Setup Edit Profile Modal / Form
  function setupEditProfileModal() {
    const editBtn = document.getElementById('editProfileBtn');
    const modal = document.getElementById('editProfileModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const editForm = document.getElementById('editProfileForm');

    if (!editBtn || !modal) return;

    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!currentStudentData) return;

      const editFullName = document.getElementById('editFullName');
      const editPhone = document.getElementById('editPhone');
      const editAddress = document.getElementById('editAddress');
      const editBloodGroup = document.getElementById('editBloodGroup');

      if (editFullName) editFullName.value = currentStudentData.fullName || '';
      if (editPhone) editPhone.value = currentStudentData.phone || '';
      if (editAddress) editAddress.value = currentStudentData.address || '';
      if (editBloodGroup) editBloodGroup.value = currentStudentData.bloodGroup || '';

      modal.style.display = 'flex';
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = editForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        const updatedData = {
          identifier: currentStudentData.identifier,
          fullName: document.getElementById('editFullName').value.trim(),
          phone: document.getElementById('editPhone').value.trim(),
          address: document.getElementById('editAddress').value.trim(),
          bloodGroup: document.getElementById('editBloodGroup').value.trim()
        };

        try {
          const apiBase = getApiBase();
          const res = await fetch(`${apiBase}/api/student/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData),
            credentials: 'include'
          });

          if (res.ok) {
            const data = await res.json();
            currentStudentData = { ...currentStudentData, ...data.student };
          } else {
            currentStudentData = { ...currentStudentData, ...updatedData };
          }
        } catch (err) {
          currentStudentData = { ...currentStudentData, ...updatedData };
        }

        localStorage.setItem('cached_student_profile', JSON.stringify(currentStudentData));
        renderDashboard(currentStudentData);
        modal.style.display = 'none';

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
      });
    }
  }

  // Setup Logout Button
  function setupLogout() {
    const logoutBtns = document.querySelectorAll('#logoutBtn, .student-logout-btn');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to log out?')) {
          try {
            const apiBase = getApiBase();
            await fetch(`${apiBase}/api/student/logout`, { method: 'POST', credentials: 'include' });
          } catch (e) {}

          localStorage.removeItem('studentIdentifier');
          localStorage.removeItem('cached_student_profile');
          sessionStorage.removeItem('studentIdentifier');
          sessionStorage.removeItem('student_authenticated');
          window.location.href = 'student-login.html';
        }
      });
    });
  }

  // Initialize on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadStudentProfile();
      setupEditProfileModal();
      setupLogout();
    });
  } else {
    loadStudentProfile();
    setupEditProfileModal();
    setupLogout();
  }
})();
