/**
 * FUSION EDUCATION BD — STUDENT PORTAL CONTROLLER & DATA LOADER
 * Powers the vertical sidebar dashboard, tabs, real payment ledger, routine, and My Profile
 */

// Expose tab switcher globally for inline triggers
window.switchPortalTab = function (tabId) {
  const tabs = document.querySelectorAll('.portal-tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));

  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.add('active');
  }

  // Update active button state in sidebar
  const navBtns = document.querySelectorAll('.sidebar-nav-btn');
  navBtns.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Close mobile sidebar if open
  const sidebar = document.getElementById('portalSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
  }
  if (backdrop && backdrop.classList.contains('open')) {
    backdrop.classList.remove('open');
  }

  // Update URL hash without jumping
  if (history.pushState) {
    history.pushState(null, null, '#' + tabId.replace('tab-', ''));
  }
};

(function () {
  'use strict';

  // Demo fallback student profiles in case offline or testing
  const DEMO_STUDENTS = {
    "FEBD-2026-003": {
      identifier: "FEBD-2026-003",
      email: "manik2025245@gmail.com",
      fullName: "Manik I",
      fatherName: "Abdur Rahim",
      motherName: "Fatema Begum",
      dateOfBirth: "2002-04-15",
      occupation: "Student",
      religion: "Islam",
      phone: "01723372217",
      bloodGroup: "B+",
      address: "Dinajpur 5230",
      permanentAddress: "Vill: Gopinathpur, Upazila: Dinajpur Sadar, Dist: Dinajpur",
      branch: "Dinajpur",
      photo: "/uploads/photos/1788258943110_t5u450.jpg",
      status: "Active Student",
      currentCourse: "JLPT N5 - Beginner",
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
      fees: { total: "15,000 BDT", paid: "1,000 BDT", due: "14,000 BDT", status: "Partially Paid" },
      payments: [
        { id: "TXN-89421", date: "2026-09-01", amount: 1000, method: "bKash", note: "Admission Deposit", recordedBy: "Campus Accounts" }
      ],
      visaApplication: {
        status: "Document Verification",
        university: "Tokyo International Language Academy",
        intake: "October 2026 Intake",
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
      fatherName: "Kalam Hossain",
      motherName: "Salma Begum",
      dateOfBirth: "2001-11-20",
      occupation: "Student",
      religion: "Islam",
      phone: "01712345678",
      bloodGroup: "O+",
      address: "House 12, Road 4, Dinajpur",
      permanentAddress: "Dinajpur Sadar, Dinajpur",
      branch: "Dinajpur",
      photo: "/uploads/photos/1788258781808_6d8v97.jpg",
      status: "Application Under Review",
      currentCourse: "JLPT N5 - Beginner",
      courseLevel: "Beginner (N5)",
      batch: "Upcoming Intake",
      instructor: "Tanaka Sensei",
      progressPercent: 15,
      nextClass: {
        topic: "Orientation Briefing & Class Routine",
        time: "Sunday at 10:00 AM",
        room: "Campus & Online"
      },
      attendance: { attended: 0, total: 0, rate: "100%" },
      fees: { total: "15,000 BDT", paid: "5,000 BDT", due: "10,000 BDT", status: "Partially Paid" },
      payments: [
        { id: "TXN-88102", date: "2026-08-28", amount: 5000, method: "Cash Desk", note: "Seat Booking Deposit", recordedBy: "Mahmudul Hasan" }
      ],
      visaApplication: {
        status: "Document Verification",
        university: "Tokyo International Language Academy",
        intake: "October 2026 Intake",
        step: 1,
        steps: [
          { title: "Application Submitted", done: true, date: "28 Aug 2026" },
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
      fatherName: "Abul Kashem Rahman",
      motherName: "Monowara Begum",
      dateOfBirth: "2000-08-14",
      occupation: "Job Holder (Private)",
      religion: "Islam",
      phone: "+880 1712 345678",
      bloodGroup: "O+",
      address: "House 12, Road 4, Dinajpur",
      permanentAddress: "House 12, Road 4, Dinajpur 5200",
      branch: "Dinajpur Campus",
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
        room: "Room 102 & Zoom Online"
      },
      attendance: { attended: 28, total: 32, rate: "87.5%" },
      fees: { total: "18,000 BDT", paid: "18,000 BDT", due: "0 BDT", status: "Paid in Full" },
      payments: [
        { id: "TXN-74190", date: "2026-01-15", amount: 9000, method: "bKash", note: "1st Installment", recordedBy: "Accounts" },
        { id: "TXN-76832", date: "2026-02-20", amount: 9000, method: "Bank Transfer", note: "Final Installment", recordedBy: "Accounts" }
      ],
      visaApplication: {
        status: "COE Applied",
        university: "Tokyo International Language Academy",
        intake: "October 2026 Intake",
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

  function getApiBase() {
    if (window.location.port === '3000') return '';
    return 'http://localhost:3000';
  }

  // Setup tab listeners
  function setupTabs() {
    const navBtns = document.querySelectorAll('.sidebar-nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = btn.getAttribute('data-tab');
        if (tabId) {
          window.switchPortalTab(tabId);
        }
      });
    });

    // Check URL Hash on load
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const candidateTabId = 'tab-' + hash;
      if (document.getElementById(candidateTabId)) {
        window.switchPortalTab(candidateTabId);
      }
    }
  }

  // Setup mobile sidebar menu toggle
  function setupMobileSidebar() {
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const sidebar = document.getElementById('portalSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
      });
    }

    if (closeBtn && sidebar) {
      closeBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
      });
    }

    if (backdrop && sidebar) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('open');
      });
    }
  }

  // Load student profile from API
  async function loadStudentProfile() {
    let identifier = localStorage.getItem('studentIdentifier') || sessionStorage.getItem('studentIdentifier');
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('id')) {
      identifier = urlParams.get('id');
      localStorage.setItem('studentIdentifier', identifier);
    }

    if (!identifier) {
      identifier = "FE-2024-001";
    }

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

  // Render full dashboard content
  function renderDashboard(student) {
    // 1. Sidebar & Topbar Profile
    const studentNameEl = document.getElementById('studentName');
    if (studentNameEl) studentNameEl.textContent = student.fullName || 'Student';

    const topbarGreeting = document.getElementById('topbarGreeting');
    if (topbarGreeting) topbarGreeting.textContent = `Welcome back, ${student.fullName ? student.fullName.split(' ')[0] : 'Student'}! 👋`;

    const studentPhotoEl = document.getElementById('studentPhoto');
    if (studentPhotoEl) {
      studentPhotoEl.src = student.photo || student.photoUrl || '../assets/images/student-placeholder.jpg';
      studentPhotoEl.alt = student.fullName || 'Student Photo';
    }

    const studentIdBadge = document.getElementById('studentIdBadge');
    if (studentIdBadge) studentIdBadge.textContent = student.identifier || 'FE-STUDENT';

    const studentStatusPill = document.getElementById('studentStatusPill');
    if (studentStatusPill) {
      studentStatusPill.innerHTML = `<i class="fas fa-check-circle"></i> ${student.status || 'Active Student'}`;
    }

    const studentBranchEl = document.getElementById('studentBranch');
    if (studentBranchEl) studentBranchEl.textContent = student.branch ? `${student.branch} Campus` : 'Dinajpur Campus';

    // 2. KPI: Course Progress
    const courseTitleEl = document.getElementById('courseTitle');
    if (courseTitleEl) courseTitleEl.textContent = student.currentCourse || student.course || 'JLPT Japanese Course';

    const courseBatchEl = document.getElementById('courseBatch');
    if (courseBatchEl) courseBatchEl.textContent = `${student.batch || 'Batch 2024'} • ${student.instructor || 'Tanaka Sensei'}`;

    const progressPercent = student.progressPercent !== undefined ? student.progressPercent : 65;
    const progressTextEl = document.getElementById('progressText');
    if (progressTextEl) progressTextEl.textContent = `${progressPercent}% completed`;

    const progressBarEl = document.getElementById('progressBar');
    if (progressBarEl) progressBarEl.style.width = `${progressPercent}%`;

    // 3. KPI: Attendance Rate
    if (student.attendance) {
      const attendanceRateEl = document.getElementById('attendanceRate');
      if (attendanceRateEl) attendanceRateEl.textContent = student.attendance.rate || '92%';

      const attendanceCountEl = document.getElementById('attendanceCount');
      if (attendanceCountEl) {
        if (student.attendance.total > 0) {
          attendanceCountEl.textContent = `${student.attendance.attended}/${student.attendance.total} Classes Attended`;
        } else {
          attendanceCountEl.textContent = 'Enrolled & Regular';
        }
      }
    }

    // 4. KPI: Fees & Balance
    let totalFeeStr = '15,000 BDT';
    let paidFeeStr = '0 BDT';
    let dueFeeStr = '15,000 BDT';
    let feeStatusText = 'Due';

    if (student.fees) {
      totalFeeStr = student.fees.total || totalFeeStr;
      paidFeeStr = student.fees.paid || paidFeeStr;
      dueFeeStr = student.fees.due || dueFeeStr;
      feeStatusText = student.fees.status || feeStatusText;
    } else if (student.feeInfo) {
      totalFeeStr = (student.feeInfo.finalFee || 15000).toLocaleString() + ' BDT';
      const paid = Array.isArray(student.payments) ? student.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) : 0;
      const finalFee = Number(student.feeInfo.finalFee) || 15000;
      paidFeeStr = paid.toLocaleString() + ' BDT';
      dueFeeStr = Math.max(0, finalFee - paid).toLocaleString() + ' BDT';
      feeStatusText = paid >= finalFee ? 'Paid in Full' : (paid > 0 ? 'Partially Paid' : 'Due');
    }

    const feeDueEl = document.getElementById('feeDue');
    if (feeDueEl) feeDueEl.textContent = dueFeeStr;

    const feeTotalEl = document.getElementById('feeTotal');
    if (feeTotalEl) feeTotalEl.textContent = totalFeeStr;

    const feePaidEl = document.getElementById('feePaid');
    if (feePaidEl) feePaidEl.textContent = paidFeeStr;

    const feeStatusEl = document.getElementById('feeStatus');
    if (feeStatusEl) {
      const isPaid = feeStatusText.toLowerCase().includes('paid') && !feeStatusText.toLowerCase().includes('partially');
      feeStatusEl.className = isPaid ? 'status-pill green' : 'status-pill yellow';
      feeStatusEl.innerHTML = `<i class="fas ${isPaid ? 'fa-check-circle' : 'fa-clock'}"></i> ${feeStatusText}`;
    }

    // Fees Tab Stats
    const feeTotalTab = document.getElementById('feeTotalTab');
    if (feeTotalTab) feeTotalTab.textContent = totalFeeStr;

    const feeDiscountTab = document.getElementById('feeDiscountTab');
    if (feeDiscountTab) {
      const discount = student.feeInfo?.discount || student.feeInfo?.specialDiscount || 1500;
      feeDiscountTab.textContent = Number(discount).toLocaleString() + ' BDT';
    }

    const feePaidTab = document.getElementById('feePaidTab');
    if (feePaidTab) feePaidTab.textContent = paidFeeStr;

    const feeDueTab = document.getElementById('feeDueTab');
    if (feeDueTab) feeDueTab.textContent = dueFeeStr;

    // 5. Payment Ledger Table
    const paymentLedgerBody = document.getElementById('paymentLedgerBody');
    if (paymentLedgerBody) {
      const payments = Array.isArray(student.payments) && student.payments.length > 0 ? student.payments : (
        student.fees?.paid && student.fees.paid !== '0 BDT' ? [
          {
            id: 'REC-' + (student.identifier || '2026'),
            date: '2026-09-01',
            method: 'Campus Accounts Desk',
            amount: student.fees.paid.replace(' BDT', ''),
            recordedBy: 'Accounts Officer'
          }
        ] : []
      );

      if (payments.length > 0) {
        paymentLedgerBody.innerHTML = payments.map(p => `
          <tr>
            <td><i class="far fa-calendar-alt" style="color: var(--portal-primary); margin-right: 0.35rem;"></i> ${p.date || 'Recent'}</td>
            <td><strong style="font-family: monospace; color: #bae6fd;">${p.id || p.note || 'REC-GEN'}</strong></td>
            <td><span class="status-pill cyan" style="font-size: 0.72rem;">${p.method || 'Cash Desk'}</span></td>
            <td><strong style="color: #34d399; font-size: 0.95rem;">${Number(p.amount).toLocaleString()} BDT</strong></td>
            <td><span style="color: var(--portal-text-muted); font-size: 0.8rem;">${p.recordedBy || 'Campus Staff'}</span></td>
            <td><span class="status-pill green" style="font-size: 0.7rem;"><i class="fas fa-check-circle"></i> Confirmed</span></td>
          </tr>
        `).join('');
      } else {
        paymentLedgerBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--portal-text-muted); padding: 1.5rem;">
              No online transactions recorded yet. Payments at Dinajpur desk will reflect here automatically.
            </td>
          </tr>
        `;
      }
    }

    // 6. Next Class Routine & Countdown
    const nextClassTopicEl = document.getElementById('nextClassTopic');
    const nextClassTimeEl = document.getElementById('nextClassTime');
    const nextClassRoomEl = document.getElementById('nextClassRoom');
    const classCountdownWrap = document.getElementById('classCountdownWrap');
    const classCountdownText = document.getElementById('classCountdownText');
    const nextClassHeaderTitle = document.getElementById('nextClassHeaderTitle');

    if (student.classSchedule && nextClassTimeEl) {
      nextClassTimeEl.textContent = student.classSchedule;
    } else if (student.nextClass?.time && nextClassTimeEl) {
      nextClassTimeEl.textContent = student.nextClass.time;
    }

    if (student.nextClass?.topic && nextClassTopicEl) {
      nextClassTopicEl.textContent = student.nextClass.topic;
    }

    if (student.nextClass?.room && nextClassRoomEl) {
      nextClassRoomEl.innerHTML = `<i class="fas fa-door-open"></i> ${student.nextClass.room || 'Room 102 & Zoom Live'}`;
    }

    // Countdown if classStartDate is in the future
    if (student.classStartDate && classCountdownWrap && classCountdownText) {
      const startDateTime = new Date(student.classStartDate + 'T10:00:00');
      const now = new Date();
      const diffMs = startDateTime - now;
      if (diffMs > 0) {
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        classCountdownWrap.style.display = 'inline-flex';
        classCountdownText.textContent = `ক্লাস শুরু হতে বাকি: ${days} দিন ${hours} ঘণ্টা (${student.classStartDate})`;
        if (nextClassHeaderTitle) nextClassHeaderTitle.textContent = 'Upcoming Batch Class';
      } else {
        classCountdownWrap.style.display = 'none';
        if (nextClassHeaderTitle) nextClassHeaderTitle.textContent = 'Next Scheduled Class';
      }
    } else if (classCountdownWrap) {
      classCountdownWrap.style.display = 'none';
    }

    // 6b. Course Completion & Official Exam Dhaka Guidance Card
    const completionBannerCard = document.getElementById('completionBannerCard');
    const examSubmittedNotice = document.getElementById('examSubmittedNotice');
    const completionStatusPill = document.getElementById('completionStatusPill');

    const isGrad = (student.courseStatus === 'completed') || (student.status && student.status.toLowerCase() === 'graduated');
    const isAwaiting = student.courseStatus === 'awaiting_completion';

    if (completionBannerCard) {
      if (isGrad || isAwaiting) {
        completionBannerCard.style.display = 'block';
        if (completionStatusPill) {
          completionStatusPill.innerHTML = isGrad 
            ? '<i class="fas fa-check-double"></i> Graduated / Completed' 
            : '<i class="fas fa-clock"></i> Awaiting Staff Clearance';
          completionStatusPill.className = isGrad ? 'status-pill green' : 'status-pill yellow';
        }
        if (student.examInfo && student.examInfo.resultStatus && student.examInfo.resultStatus !== 'not_applied') {
          if (examSubmittedNotice) {
            examSubmittedNotice.style.display = 'inline-flex';
            examSubmittedNotice.innerHTML = `<i class="fas fa-check-circle"></i> ${student.examInfo.examType} (${student.examInfo.resultStatus.toUpperCase()}) Submitted`;
          }
        }
      } else {
        completionBannerCard.style.display = 'none';
      }
    }

    // 7. Informational Visa Showcase
    if (student.visaApplication) {
      const visaStatusPill = document.getElementById('visaStatusPill');
      if (visaStatusPill) {
        visaStatusPill.innerHTML = `<i class="fas fa-passport"></i> ${student.visaApplication.status || 'COE Applied'}`;
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
          
          let dotClass = 'pending';
          if (isDone) dotClass = 'done';
          else if (isCurrent) dotClass = 'current';

          return `
            <div class="visa-step-item">
              <div class="visa-step-dot ${dotClass}">
                ${isDone ? '<i class="fas fa-check"></i>' : idx + 1}
              </div>
              <div class="visa-step-info">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <h4 class="visa-step-title" style="color: ${isDone || isCurrent ? '#ffffff' : '#94a3b8'};">
                    ${step.title}
                  </h4>
                  ${isDone ? '<span class="status-pill green" style="font-size: 0.68rem;"><i class="fas fa-check"></i> Done</span>' : (isCurrent ? '<span class="status-pill cyan" style="font-size: 0.68rem;"><i class="fas fa-spinner fa-spin"></i> Processing</span>' : '')}
                </div>
                <div class="visa-step-date">
                  ${step.date}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 8. Homework & Assignments
    const assignmentsContainer = document.getElementById('assignmentsContainer');
    if (assignmentsContainer) {
      if (student.assignments && student.assignments.length > 0) {
        assignmentsContainer.innerHTML = student.assignments.map(asg => {
          const isGraded = asg.status === 'Graded';
          const pillClass = isGraded ? 'status-pill green' : 'status-pill yellow';
          return `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--portal-border); border-radius: var(--portal-radius-md); gap: 0.75rem; flex-wrap: wrap;">
              <div>
                <div style="color: #ffffff; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.2rem;">
                  ${asg.title}
                </div>
                <div style="font-size: 0.78rem; color: var(--portal-text-muted); display: flex; align-items: center; gap: 0.65rem;">
                  <span><i class="far fa-clock" style="color: var(--portal-primary);"></i> Due: ${asg.dueDate}</span>
                  ${asg.score ? `<span style="color: #34d399; font-weight: 700;"><i class="fas fa-award"></i> Score: ${asg.score}</span>` : ''}
                </div>
              </div>
              <span class="${pillClass}" style="font-size: 0.72rem;">
                ${asg.status}
              </span>
            </li>
          `;
        }).join('');
      } else {
        assignmentsContainer.innerHTML = `<li style="color: var(--portal-text-muted); padding: 0.85rem 1rem; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed var(--portal-border); font-size: 0.85rem;">No pending assignments for your batch.</li>`;
      }
    }

    // 9. Messages & Live Bulletins
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
      if (student.messages && student.messages.length > 0) {
        messagesContainer.innerHTML = student.messages.map(msg => `
          <li style="padding: 0.85rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--portal-border); border-radius: var(--portal-radius-md);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; margin-bottom: 0.35rem; gap: 0.5rem; flex-wrap: wrap;">
              <strong style="color: var(--portal-primary); display: flex; align-items: center; gap: 0.4rem;">
                <i class="fas fa-bullhorn" style="color: var(--portal-warning);"></i> ${msg.from}
              </strong>
              <span style="color: var(--portal-text-dim); font-size: 0.72rem; background: rgba(255,255,255,0.05); padding: 0.15rem 0.45rem; border-radius: 4px;">
                ${msg.time}
              </span>
            </div>
            <p style="margin: 0; color: #e2e8f0; font-size: 0.85rem; line-height: 1.5;">
              ${msg.text}
            </p>
          </li>
        `).join('');
      } else {
        messagesContainer.innerHTML = `<li style="color: var(--portal-text-muted); padding: 0.85rem 1rem; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed var(--portal-border); font-size: 0.85rem;">No active notices for today.</li>`;
      }
    }

    // 10. Printable Digital Student ID Card
    const studentIdCardPhoto = document.getElementById('studentIdCardPhoto');
    if (studentIdCardPhoto) {
      studentIdCardPhoto.src = student.photo || student.photoUrl || '../assets/images/student-placeholder.jpg';
    }

    const studentIdCardName = document.getElementById('studentIdCardName');
    if (studentIdCardName) studentIdCardName.textContent = student.fullName || 'Student Name';

    const studentIdCardId = document.getElementById('studentIdCardId');
    if (studentIdCardId) studentIdCardId.textContent = student.identifier || 'FE-STUDENT';

    const studentIdCardCourse = document.getElementById('studentIdCardCourse');
    if (studentIdCardCourse) studentIdCardCourse.textContent = student.currentCourse || student.course || 'JLPT Japanese';

    const studentIdCardBlood = document.getElementById('studentIdCardBlood');
    if (studentIdCardBlood) studentIdCardBlood.textContent = student.bloodGroup || 'N/A';

    const studentIdCardBranch = document.getElementById('studentIdCardBranch');
    if (studentIdCardBranch) studentIdCardBranch.textContent = student.branch || 'Dinajpur';

    // 11. Comprehensive My Profile Information (Read-Only)
    const bioId = document.getElementById('bioId');
    if (bioId) bioId.textContent = student.identifier || '-';

    const bioStatusBadge = document.getElementById('bioStatusBadge');
    if (bioStatusBadge) bioStatusBadge.innerHTML = `<i class="fas fa-check-circle"></i> ${student.status || 'Active Student'}`;

    const bioCourse = document.getElementById('bioCourse');
    if (bioCourse) bioCourse.textContent = student.currentCourse || student.course || 'JLPT Japanese';

    const bioBatch = document.getElementById('bioBatch');
    if (bioBatch) bioBatch.textContent = student.batch || 'Batch 2024';

    const bioInstructor = document.getElementById('bioInstructor');
    if (bioInstructor) bioInstructor.textContent = student.instructor || 'Tanaka Sensei';

    const bioIntake = document.getElementById('bioIntake');
    if (bioIntake) bioIntake.textContent = student.visaApplication?.intake || 'October 2026 Intake';

    const bioFullName = document.getElementById('bioFullName');
    if (bioFullName) bioFullName.textContent = student.fullName || '-';

    const bioFatherName = document.getElementById('bioFatherName');
    if (bioFatherName) bioFatherName.textContent = student.fatherName || '-';

    const bioMotherName = document.getElementById('bioMotherName');
    if (bioMotherName) bioMotherName.textContent = student.motherName || '-';

    const bioDob = document.getElementById('bioDob');
    if (bioDob) bioDob.textContent = student.dateOfBirth || '-';

    const bioBlood = document.getElementById('bioBlood');
    if (bioBlood) bioBlood.textContent = student.bloodGroup || 'N/A';

    const bioOccupation = document.getElementById('bioOccupation');
    if (bioOccupation) bioOccupation.textContent = student.occupation || 'Student';

    const bioReligion = document.getElementById('bioReligion');
    if (bioReligion) bioReligion.textContent = student.religion || 'Islam';

    const bioPhone = document.getElementById('bioPhone');
    if (bioPhone) bioPhone.textContent = student.phone || '-';

    const bioEmail = document.getElementById('bioEmail');
    if (bioEmail) bioEmail.textContent = student.email || '-';

    const bioAddress = document.getElementById('bioAddress');
    if (bioAddress) bioAddress.textContent = student.address || '-';

    const bioPermanentAddress = document.getElementById('bioPermanentAddress');
    if (bioPermanentAddress) bioPermanentAddress.textContent = student.permanentAddress || student.address || '-';

    const bioBranch = document.getElementById('bioBranch');
    if (bioBranch) bioBranch.textContent = student.branch ? `${student.branch} Campus` : 'Dinajpur Campus';

    // 12. Verified Student Documents & Certificates
    const docsListEl = document.getElementById('studentDocumentsList');
    const docBadgeEl = document.getElementById('studentDocCountBadge');
    const docs = student.documents || (student.documentUrls ? student.documentUrls.map((u, i) => ({ name: `Verified Document ${i+1}`, url: u })) : []);

    if (docBadgeEl) {
      docBadgeEl.textContent = `${docs.length} Verified`;
    }

    if (docsListEl) {
      if (docs.length > 0) {
        docsListEl.innerHTML = docs.map((d, i) => `
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid var(--portal-border); border-radius:10px; padding:0.75rem 1rem; gap:0.75rem; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <div style="width:38px; height:38px; border-radius:8px; background:rgba(56,189,248,0.15); display:flex; align-items:center; justify-content:center; color:#38bdf8; font-size:1.1rem;">
                <i class="fas ${d.url && d.url.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-alt'}"></i>
              </div>
              <div>
                <div style="color:#ffffff; font-size:0.9rem; font-weight:600;">${d.name || `Document ${i+1}`}</div>
                <div style="color:var(--portal-text-muted); font-size:0.75rem;">${d.size ? (d.size > 1024 ? (d.size/1024).toFixed(1) + ' KB' : d.size + ' B') : 'Verified Record'} • Authorized</div>
              </div>
            </div>
            <a href="${d.url}" target="_blank" class="topbar-btn primary" style="font-size:0.78rem; padding:0.4rem 0.85rem; text-decoration:none; display:inline-flex; align-items:center; gap:0.35rem;">
              <i class="fas fa-download"></i> View / Download
            </a>
          </div>
        `).join('');
      } else {
        docsListEl.innerHTML = `
          <div style="text-align:center; padding:1.25rem; color:var(--portal-text-muted); font-size:0.85rem; background:rgba(255,255,255,0.02); border-radius:10px; border:1px dashed var(--portal-border);">
            <i class="fas fa-folder-open" style="font-size:1.8rem; margin-bottom:0.5rem; opacity:0.5; display:block;"></i>
            No documents or certificates uploaded yet. Contact your campus counselor to attach your papers.
          </div>
        `;
      }
    }
  }

  // Setup Logout Button
  function setupLogout() {
    const logoutBtns = document.querySelectorAll('#logoutBtn, .student-logout-btn');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to log out from the Student Portal?')) {
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

  // Setup Notification Bell Trigger
  function setupNotificationBell() {
    const bellBtn = document.getElementById('notifBellBtn');
    if (bellBtn) {
      bellBtn.addEventListener('click', () => {
        window.switchPortalTab('tab-overview');
        const msgContainer = document.getElementById('messagesContainer');
        if (msgContainer) {
          msgContainer.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  // 12. Exam Result & Certificate Submission Modal Handlers
  window.openExamSubmitModal = function() {
    const modal = document.getElementById('examSubmitModal');
    if (modal) {
      modal.style.display = 'flex';
      if (currentStudentData && currentStudentData.examInfo) {
        const info = currentStudentData.examInfo;
        if (info.examType && document.getElementById('examType')) document.getElementById('examType').value = info.examType;
        if (info.examDate && document.getElementById('examDate')) document.getElementById('examDate').value = info.examDate;
        if (info.rollNumber && document.getElementById('examRollNumber')) document.getElementById('examRollNumber').value = info.rollNumber;
        if (info.resultStatus && document.getElementById('examResultStatus')) document.getElementById('examResultStatus').value = info.resultStatus;
        if (info.score && document.getElementById('examScore')) document.getElementById('examScore').value = info.score;
        if (info.certificateUrl && document.getElementById('examCertUrl')) document.getElementById('examCertUrl').value = info.certificateUrl;
        if (info.notes && document.getElementById('examNotes')) document.getElementById('examNotes').value = info.notes;
      }
    }
  };

  window.closeExamSubmitModal = function() {
    const modal = document.getElementById('examSubmitModal');
    if (modal) {
      modal.style.display = 'none';
    }
  };

  window.handleExamResultSubmit = async function(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('submitExamBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সাবমিট হচ্ছে...';
    }

    const payload = {
      studentId: currentStudentData?.identifier || currentStudentData?.id || localStorage.getItem('studentIdentifier') || 'FE-2024-001',
      examType: document.getElementById('examType')?.value || 'JLPT',
      examCenter: document.getElementById('examCenter')?.value || 'Dhaka, Bangladesh',
      examDate: document.getElementById('examDate')?.value || '',
      rollNumber: document.getElementById('examRollNumber')?.value || '',
      resultStatus: document.getElementById('examResultStatus')?.value || 'passed',
      score: document.getElementById('examScore')?.value || '',
      certificateUrl: document.getElementById('examCertUrl')?.value || '',
      notes: document.getElementById('examNotes')?.value || ''
    };

    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/student/submit-exam-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.success) {
        alert('🎉 আপনার অফিসিয়াল পরীক্ষার ফলাফল ও সার্টিফিকেট সফলভাবে গ্রহণ করা হয়েছে! ফিউশন এডুকেশনের জাপানিজ ভিসা ও COE ফাইল প্রসেসিং সক্রিয় করা হয়েছে।');
        window.closeExamSubmitModal();
        if (data.student) {
          currentStudentData = data.student;
          renderDashboard(currentStudentData);
        } else {
          loadStudentProfile();
        }
        window.switchPortalTab('tab-visa');
      } else {
        alert(data.error || 'ফলাফল সাবমিট করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    } catch (err) {
      console.error('Exam submit error:', err);
      alert('সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'জমা দিন ও ভিসা প্রসেসিং শুরু করুন';
      }
    }
  };

  // Initialize on DOM Ready
  function init() {
    setupTabs();
    setupMobileSidebar();
    loadStudentProfile();
    setupLogout();
    setupNotificationBell();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
