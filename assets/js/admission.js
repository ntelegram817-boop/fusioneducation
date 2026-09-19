// ============================================================
// FUSION EDUCATION BD — ADMISSION WIZARD JS
// Handles: step navigation, validation, previews, submit, PDF
// ============================================================
(function () {
    'use strict';

    // ── BD phone regex (matches: 01XXXXXXXXX / +8801XXXXXXXXX) ─
    const BD_PHONE = /^(\+880|880|0)?1[3-9]\d{8}$/;
    const MAX_FILE_MB = 5;

    let currentStep = 1;
    let photoFile   = null;
    let docFiles    = []; // Stores up to 4+ documents

    // ── Course list (populated from API) ────────────────────────
    let admissionCourseList = [];

    // ==========================================================
    // STEP PROGRESS RENDERER
    // ==========================================================
    function renderStepper(step) {
        [1, 2, 3].forEach(n => {
            const item   = document.getElementById(`stepper-item-${n}`);
            const circle = document.getElementById(`stepper-circle-${n}`);
            const label  = document.getElementById(`stepper-label-${n}`);

            if (!item) return;

            item.classList.remove('active', 'done');
            circle.classList.remove('active', 'done');
            circle.textContent = n;

            if (n < step) {
                item.classList.add('done');
                circle.classList.add('done');
                circle.textContent = ''; // replaced by CSS ✓
            } else if (n === step) {
                item.classList.add('active');
                circle.classList.add('active');
            }
        });

        // Connectors
        const c1 = document.getElementById('connector-1-2');
        const c2 = document.getElementById('connector-2-3');
        if (c1) { c1.classList.toggle('done', step > 1); c1.classList.toggle('active', step === 2); }
        if (c2) { c2.classList.toggle('done', step > 2); c2.classList.toggle('active', step === 3); }
    }

    // ==========================================================
    // SHOW / HIDE STEPS
    // ==========================================================
    function showStep(n) {
        [1, 2, 3].forEach(i => {
            const el = document.getElementById(`step-panel-${i}`);
            if (el) el.style.display = (i === n) ? 'block' : 'none';
        });
        currentStep = n;
        renderStepper(n);
        window.scrollTo({ top: document.getElementById('admission-form-section')?.offsetTop - 100 || 0, behavior: 'smooth' });
    }

    // ==========================================================
    // INLINE ERROR UTILITIES
    // ==========================================================
    function showErr(inputId, msg) {
        const input = document.getElementById(inputId);
        const errEl = document.getElementById(`err-${inputId}`);
        if (input)  { input.classList.add('input-error'); input.classList.remove('input-valid'); }
        if (errEl)  { errEl.textContent = '⚠ ' + msg; errEl.classList.add('visible'); }
    }

    function clearErr(inputId) {
        const input = document.getElementById(inputId);
        const errEl = document.getElementById(`err-${inputId}`);
        if (input)  { input.classList.remove('input-error'); input.classList.add('input-valid'); }
        if (errEl)  { errEl.classList.remove('visible'); }
    }

    function clearAllErrors() {
        document.querySelectorAll('.input-error, .input-valid').forEach(el => {
            el.classList.remove('input-error', 'input-valid');
        });
        document.querySelectorAll('.field-error-msg.visible').forEach(el => {
            el.classList.remove('visible');
        });
    }

    function val(id) { return (document.getElementById(id)?.value || '').trim(); }

    // ==========================================================
    // AGE CALCULATOR
    // ==========================================================
    function calculateAge(dob) {
        if (!dob) return null;
        const birth = new Date(dob);
        const now   = new Date();
        let years   = now.getFullYear() - birth.getFullYear();
        let months  = now.getMonth() - birth.getMonth();
        if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) { years--; months += 12; }
        if (now.getDate() < birth.getDate()) months--;
        if (months < 0) months += 12;
        return { years, months };
    }

    function updateAgeBadge() {
        const dob   = val('dateOfBirth');
        const badge = document.getElementById('age-badge');
        if (!badge) return;
        if (!dob) { badge.style.display = 'none'; return; }
        const age = calculateAge(dob);
        if (!age) { badge.style.display = 'none'; return; }
        badge.style.display = 'inline-flex';
        badge.innerHTML = `<i class="fas fa-birthday-cake"></i> Age: ${age.years} years${age.months ? ', ' + age.months + ' months' : ''}`;
    }

    // ==========================================================
    // STEP 1 VALIDATION
    // ==========================================================
    function validateStep1() {
        clearAllErrors();
        let valid = true;

        const fullName = val('fullName');
        if (!fullName || fullName.length < 2) { showErr('fullName', 'Please enter your full name (min 2 characters).'); valid = false; }
        else clearErr('fullName');

        const fatherName = val('fatherName');
        if (!fatherName || fatherName.length < 2) { showErr('fatherName', "Please enter father's name (min 2 characters)."); valid = false; }
        else clearErr('fatherName');

        const motherName = val('motherName');
        if (!motherName || motherName.length < 2) { showErr('motherName', "Please enter mother's name (min 2 characters)."); valid = false; }
        else clearErr('motherName');

        const email = val('email');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('email', 'Please enter a valid email address.'); valid = false; }
        else clearErr('email');

        const phone = val('phone');
        if (!BD_PHONE.test(phone)) { showErr('phone', 'Enter a valid BD number (e.g. 01XXXXXXXXX or +8801XXXXXXXXX).'); valid = false; }
        else clearErr('phone');

        const dob = val('dateOfBirth');
        if (!dob) { showErr('dateOfBirth', 'Please select your date of birth.'); valid = false; }
        else {
            const age = calculateAge(dob);
            if (!age || age.years < 12) { showErr('dateOfBirth', 'Applicant must be at least 12 years old.'); valid = false; }
            else if (age.years > 65)    { showErr('dateOfBirth', 'Please check the date of birth.'); valid = false; }
            else clearErr('dateOfBirth');
        }

        const gender = val('gender');
        if (!gender) { showErr('gender', 'Please select your gender.'); valid = false; }
        else clearErr('gender');

        // nidBirthCert & bloodGroup are optional - no validation errors required

        const occupation = val('occupation');
        if (!occupation) { showErr('occupation', 'Please select your occupation.'); valid = false; }
        else clearErr('occupation');

        const religion = val('religion');
        if (!religion) { showErr('religion', 'Please select your religion.'); valid = false; }
        else clearErr('religion');

        // Residential Address
        const address = val('address');
        if (!address) { showErr('address', 'Please enter residential village / road / area.'); valid = false; }
        else clearErr('address');

        const city = val('city');
        if (!city) { showErr('city', 'Please enter residential city / upazila.'); valid = false; }
        else clearErr('city');

        const district = val('district');
        if (!district) { showErr('district', 'Please enter residential district.'); valid = false; }
        else clearErr('district');

        // Permanent Address
        const permAddress = val('permanentAddress');
        if (!permAddress) { showErr('permanentAddress', 'Please enter permanent village / road / area.'); valid = false; }
        else clearErr('permanentAddress');

        const permCity = val('permanentCity');
        if (!permCity) { showErr('permanentCity', 'Please enter permanent city / upazila.'); valid = false; }
        else clearErr('permanentCity');

        const permDistrict = val('permanentDistrict');
        if (!permDistrict) { showErr('permanentDistrict', 'Please enter permanent district.'); valid = false; }
        else clearErr('permanentDistrict');

        return valid;
    }

    // ==========================================================
    // PERMANENT ADDRESS AUTO-FILL ("Same as Residential Address")
    // ==========================================================
    function setupAddressAutoFill() {
        const checkbox = document.getElementById('sameAsResidential');
        const badge = document.getElementById('same-address-badge');
        const resAddress = document.getElementById('address');
        const resCity = document.getElementById('city');
        const resDistrict = document.getElementById('district');

        const permAddress = document.getElementById('permanentAddress');
        const permCity = document.getElementById('permanentCity');
        const permDistrict = document.getElementById('permanentDistrict');

        if (!checkbox) return;

        function syncAddresses() {
            if (checkbox.checked) {
                if (permAddress && resAddress) permAddress.value = resAddress.value;
                if (permCity && resCity) permCity.value = resCity.value;
                if (permDistrict && resDistrict) permDistrict.value = resDistrict.value;

                if (permAddress) { permAddress.readOnly = true; permAddress.style.backgroundColor = 'rgba(255,255,255,0.03)'; }
                if (permCity) { permCity.readOnly = true; permCity.style.backgroundColor = 'rgba(255,255,255,0.03)'; }
                if (permDistrict) { permDistrict.readOnly = true; permDistrict.style.backgroundColor = 'rgba(255,255,255,0.03)'; }

                clearErr('permanentAddress');
                clearErr('permanentCity');
                clearErr('permanentDistrict');

                if (badge) badge.style.display = 'inline-flex';
            } else {
                if (permAddress) { permAddress.readOnly = false; permAddress.style.backgroundColor = ''; }
                if (permCity) { permCity.readOnly = false; permCity.style.backgroundColor = ''; }
                if (permDistrict) { permDistrict.readOnly = false; permDistrict.style.backgroundColor = ''; }

                if (badge) badge.style.display = 'none';
            }
        }

        checkbox.addEventListener('change', syncAddresses);

        [resAddress, resCity, resDistrict].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    if (checkbox.checked) {
                        syncAddresses();
                    }
                });
            }
        });
    }

    // ==========================================================
    // STEP 2 VALIDATION
    // ==========================================================
    function validateStep2() {
        clearAllErrors();
        let valid = true;

        if (!val('highestEducation')) { showErr('highestEducation', 'Please select your education level.'); valid = false; }
        else clearErr('highestEducation');

        if (!val('course')) { showErr('course', 'Please select a course.'); valid = false; }
        else clearErr('course');

        if (!val('courseLevel')) { showErr('courseLevel', 'Please select a course level.'); valid = false; }
        else clearErr('courseLevel');

        if (!val('branch')) { showErr('branch', 'Please select a branch.'); valid = false; }
        else clearErr('branch');

        if (!val('japaneseExperience')) { showErr('japaneseExperience', 'Please select your Japanese experience.'); valid = false; }
        else clearErr('japaneseExperience');

        if (!val('visaType')) { showErr('visaType', 'Please select a visa type.'); valid = false; }
        else clearErr('visaType');

        const eName = val('emergencyName');
        if (!eName || eName.length < 2) { showErr('emergencyName', 'Please enter the emergency contact name.'); valid = false; }
        else clearErr('emergencyName');

        const ePhone = val('emergencyPhone');
        if (!BD_PHONE.test(ePhone)) { showErr('emergencyPhone', 'Enter a valid BD emergency contact number.'); valid = false; }
        else clearErr('emergencyPhone');

        return valid;
    }

    // ==========================================================
    // STEP 3 VALIDATION
    // ==========================================================
    function validateStep3() {
        clearAllErrors();
        let valid = true;

        // Photo is optional but must be valid if provided
        if (photoFile) {
            if (photoFile.size > 10 * 1024 * 1024) {
                showErr('photo', 'Photo exceeds 10 MB limit.'); valid = false;
            } else clearErr('photo');
        }

        // Validate any uploaded documents
        if (docFiles.length > 0) {
            for (let i = 0; i < docFiles.length; i++) {
                if (docFiles[i].size > 10 * 1024 * 1024) {
                    showErr('educationDoc', `File "${docFiles[i].name}" exceeds 10 MB limit.`);
                    valid = false;
                    break;
                }
            }
        }

        const terms = document.getElementById('terms');
        if (!terms?.checked) { showErr('terms', 'You must agree to the Terms & Conditions.'); valid = false; }
        else clearErr('terms');

        return valid;
    }

    // ==========================================================
    // SIMPLIFIED PHOTO PREVIEW
    // ==========================================================
    function setupPhotoPreview() {
        const input = document.getElementById('photo');
        const img = document.getElementById('photo-preview-img');
        const placeholder = document.getElementById('photo-preview-placeholder');
        const removeBtn = document.getElementById('btn-remove-photo');
        const statusText = document.getElementById('photo-file-status');

        if (!input) return;

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            clearErr('photo');

            if (file.size > 10 * 1024 * 1024) {
                showErr('photo', 'Photo must be under 10 MB.');
                return;
            }

            photoFile = file;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (img) {
                    img.src = ev.target.result;
                    img.style.display = 'block';
                }
                if (placeholder) placeholder.style.display = 'none';
                if (removeBtn) removeBtn.style.display = 'inline-flex';
                if (statusText) statusText.innerHTML = `<strong style="color:#6ee7b7;">✓ ${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
            };
            reader.readAsDataURL(file);
        });

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                photoFile = null;
                input.value = '';
                if (img) {
                    img.src = '';
                    img.style.display = 'none';
                }
                if (placeholder) placeholder.style.display = 'block';
                removeBtn.style.display = 'none';
                if (statusText) statusText.textContent = "No photo chosen yet. Click 'Choose Photo' to upload.";
                clearErr('photo');
            });
        }
    }

    // ==========================================================
    // MULTI-DOCUMENT (UP TO 4+) PREVIEW & LIST
    // ==========================================================
    function renderDocList() {
        const container = document.getElementById('docs-list-container');
        const badge = document.getElementById('doc-count-badge');
        if (!container) return;

        if (badge) {
            badge.textContent = `${docFiles.length} / 4 Selected`;
            badge.style.background = docFiles.length > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(37,99,235,0.15)';
            badge.style.color = docFiles.length > 0 ? '#6ee7b7' : '#93c5fd';
        }

        if (docFiles.length === 0) {
            container.innerHTML = `
                <div id="no-docs-hint" style="font-size: 0.85rem; color: var(--text-secondary); font-style: italic;">
                    No documents attached yet. Click '+ Add / Select Documents' to attach your certificates.
                </div>
            `;
            return;
        }

        container.innerHTML = docFiles.map((file, idx) => {
            const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
            const iconClass = isPdf ? 'fas fa-file-pdf' : 'fas fa-file-image';
            const iconColor = isPdf ? '#f87171' : '#38bdf8';
            const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 0.65rem 0.9rem; border-radius: 10px; border: 1px solid var(--border-light); gap: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0;">
                        <span style="background: rgba(37,99,235,0.2); color: #93c5fd; font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px;">#${idx + 1}</span>
                        <i class="${iconClass}" style="color: ${iconColor}; font-size: 1.15rem;"></i>
                        <div style="min-width: 0;">
                            <div style="font-size: 0.88rem; color: #fff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${sizeStr}</div>
                        </div>
                    </div>
                    <button type="button" class="btn-remove-doc" data-index="${idx}" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;" title="Remove this document">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');

        // Attach remove handlers
        container.querySelectorAll('.btn-remove-doc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                if (!isNaN(index)) {
                    docFiles.splice(index, 1);
                    renderDocList();
                }
            });
        });
    }

    function setupDocPreview() {
        const input = document.getElementById('educationDoc');
        if (!input) return;

        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            clearErr('educationDoc');

            files.forEach(file => {
                if (file.size > 10 * 1024 * 1024) {
                    showErr('educationDoc', `File "${file.name}" exceeds 10 MB.`);
                    return;
                }
                // Avoid exact duplicate
                if (!docFiles.some(f => f.name === file.name && f.size === file.size)) {
                    if (docFiles.length < 5) {
                        docFiles.push(file);
                    }
                }
            });

            input.value = ''; // Reset input to allow re-selecting
            renderDocList();
        });
    }

    // ==========================================================
    // REVIEW PANEL POPULATION
    // ==========================================================
    function populateReview() {
        const docsSummary = docFiles.length > 0
            ? docFiles.map((f, i) => `[${i + 1}] ${f.name}`).join(' • ')
            : '— (not uploaded)';

        const resAddr = [val('address'), val('city'), val('district')].filter(Boolean).join(', ');
        const permAddr = [val('permanentAddress'), val('permanentCity'), val('permanentDistrict')].filter(Boolean).join(', ');

        const map = {
            'rev-fullName':          val('fullName'),
            'rev-fatherName':        val('fatherName') || '—',
            'rev-motherName':        val('motherName') || '—',
            'rev-email':             val('email'),
            'rev-phone':             val('phone'),
            'rev-dob':               val('dateOfBirth') + (() => { const a = calculateAge(val('dateOfBirth')); return a ? ` (${a.years} yrs)` : ''; })(),
            'rev-gender':            val('gender') ? val('gender').charAt(0).toUpperCase() + val('gender').slice(1) : '—',
            'rev-nidBirthCert':      val('nidBirthCert') || '— (Not provided)',
            'rev-bloodGroup':        val('bloodGroup') ? val('bloodGroup') : '— (Not provided)',
            'rev-occupation':        val('occupation') || '—',
            'rev-religion':          val('religion') || '—',
            'rev-resAddress':        resAddr || '—',
            'rev-permAddress':       permAddr || '—',
            'rev-city':              val('city') + (val('district') ? ', ' + val('district') : ''),
            'rev-education':         val('highestEducation').toUpperCase() || '—',
            'rev-course':            val('course') || '—',
            'rev-courseLevel':       val('courseLevel') || '—',
            'rev-branch':            val('branch') ? val('branch').charAt(0).toUpperCase() + val('branch').slice(1) + ' Branch' : '—',
            'rev-visa':              val('visaType').toUpperCase() || '—',
            'rev-emergency':         val('emergencyName') + (val('emergencyPhone') ? ' · ' + val('emergencyPhone') : ''),
            'rev-photo':             photoFile ? '✅ ' + photoFile.name : '— (not uploaded)',
            'rev-doc':               docsSummary,
        };
        Object.entries(map).forEach(([id, text]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        });
    }

    // ==========================================================
    // COURSE API + FEE DISPLAY (with robust fallback & level sync)
    // ==========================================================
    // ── Course list (populated from API) ────────────────────────
    const DEFAULT_COURSES = [
        { id: 'course-n5', title: 'JLPT N5 - Beginner', level: 'N5', fee: '৳ 15,000', discountType: 'none', discountValue: 0 },
        { id: 'course-n4', title: 'JLPT N4 - Intermediate', level: 'N4', fee: '৳ 20,000', discountType: 'none', discountValue: 0 },
        { id: 'course-n3', title: 'JLPT N3 - Advanced', level: 'N3', fee: '৳ 25,000', discountType: 'none', discountValue: 0 },
        { id: 'course-speaking', title: 'Conversation Kaiwa', level: 'Speaking', fee: '৳ 10,000', discountType: 'none', discountValue: 0 }
    ];

    function getApiEndpoints(path) {
        const endpoints = [];
        if (window.location.protocol.startsWith('http')) {
            endpoints.push(path);
        }
        if (window.location.port === '5500' || window.location.port === '5501') {
            endpoints.push(window.location.protocol + '//' + window.location.hostname + ':3000' + path);
        }
        // Fallback for file:/// protocol execution
        if (window.location.protocol === 'file:') {
            endpoints.push('http://localhost:3000' + path);
        }
        return [...new Set(endpoints)];
    }

    function readFileAsDataURL(file) {
        if (!file) return Promise.resolve(null);
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }

    function renderCourseOptions(courses) {
        const courseSelect = document.getElementById('course');
        const levelSelect = document.getElementById('courseLevel');
        if (!courseSelect) return;

        admissionCourseList = courses;
        const currentVal = courseSelect.value;
        courseSelect.innerHTML = '<option value="">Choose a course</option>';

        courses.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.title || c.level || `course-${c.id}`;
            opt.dataset.level = c.level || '';
            const feeStr = c.regularFee ? `৳ ${Number(c.regularFee).toLocaleString()}` : (c.fee || '');
            opt.textContent = `${c.title || c.level}${feeStr ? ' (' + feeStr + ')' : ''}`;
            courseSelect.appendChild(opt);
        });

        if (currentVal) courseSelect.value = currentVal;

        // Auto-select from URL params if present
        const urlParams = new URLSearchParams(window.location.search);
        const urlCourse = urlParams.get('course') || urlParams.get('level') || '';
        if (urlCourse) {
            const cleanUrl = urlCourse.toLowerCase();
            const matched = courses.find(c => 
                (c.id && c.id.toLowerCase().includes(cleanUrl)) ||
                (c.title && c.title.toLowerCase().includes(cleanUrl)) ||
                (c.level && c.level.toLowerCase() === cleanUrl)
            );
            if (matched) {
                courseSelect.value = matched.title || matched.level;
                if (levelSelect && matched.level) levelSelect.value = matched.level;
                const durSelect = document.getElementById('courseDurationSelect');
                if (durSelect) durSelect.value = matched.durationMonths || matched.initialDurationMonths || 3;
                updateFeeDisplay();
            }
        }
    }

    function syncCourseAndLevel() {
        const courseSelect = document.getElementById('course');
        const levelSelect = document.getElementById('courseLevel');
        const durationSelect = document.getElementById('courseDurationSelect');

        if (courseSelect) {
            courseSelect.addEventListener('change', () => {
                const selectedVal = courseSelect.value;
                if (!selectedVal) return;

                const matched = admissionCourseList.find(c => (c.title || c.level) === selectedVal);
                if (matched) {
                    if (levelSelect && matched.level && Array.from(levelSelect.options).some(o => o.value === matched.level)) {
                        levelSelect.value = matched.level;
                        clearErr('courseLevel');
                    }
                    if (durationSelect && (matched.durationMonths || matched.initialDurationMonths)) {
                        durationSelect.value = matched.durationMonths || matched.initialDurationMonths;
                    }
                }
                updateFeeDisplay();
            });
        }

        const branchSelect = document.getElementById('branch');
        if (branchSelect) {
            branchSelect.addEventListener('change', () => {
                updateFeeDisplay();
            });
        }

        if (levelSelect) {
            levelSelect.addEventListener('change', () => {
                const selectedLevel = levelSelect.value;
                if (!selectedLevel || !courseSelect) return;

                const matched = admissionCourseList.find(c => c.level === selectedLevel);
                if (matched) {
                    courseSelect.value = matched.title || matched.level;
                    clearErr('course');
                    if (durationSelect && (matched.durationMonths || matched.initialDurationMonths)) {
                        durationSelect.value = matched.durationMonths || matched.initialDurationMonths;
                    }
                    updateFeeDisplay();
                }
            });
        }
    }

    async function populateCourseOptions() {
        // Initial render with fallback so dropdown is never empty
        renderCourseOptions(DEFAULT_COURSES);
        syncCourseAndLevel();

        if (window.DAO && window.DAO.Courses) {
            try {
                const list = await window.DAO.Courses.getAll();
                if (Array.isArray(list) && list.length > 0) {
                    renderCourseOptions(list);
                    return;
                }
            } catch (_) {}
        }

        const endpoints = getApiEndpoints('/api/courses');
        for (const ep of endpoints) {
            try {
                const res = await fetch(ep);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.courses) && data.courses.length > 0) {
                        renderCourseOptions(data.courses);
                        break;
                    }
                }
            } catch (_) {}
        }
    }

    // ── Course fee display (Auto-Detect Active Offer System) ──────
    function updateFeeDisplay() {
        const selectedVal = val('course');
        const feeDisplay  = document.getElementById('courseFeeDisplay');
        const feeContent  = document.getElementById('courseFeeContent');
        const planSelect  = document.getElementById('paymentPlanSelect');
        const optMonthly  = document.getElementById('optMonthlyPay');
        const durationSel = document.getElementById('courseDurationSelect');

        if (!selectedVal || !feeDisplay || !feeContent) return;

        const selectedCourse = admissionCourseList.find(c => {
            const key = c.title || c.level || `course-${c.id}`;
            return key === selectedVal || c.title === selectedVal;
        });

        if (!selectedCourse) { feeDisplay.style.display = 'none'; return; }

        const selectedBranch = val('branch');

        // Auto-set duration from course data
        const courseDuration = selectedCourse.durationMonths || selectedCourse.initialDurationMonths || 3;
        if (durationSel) {
            durationSel.value = courseDuration;
        }

        // Pricing computation with branch-specific discounts
        const pricing = typeof getCoursePricing === 'function' 
            ? getCoursePricing(selectedCourse, selectedBranch)
            : {
                regularFee: Number(selectedCourse.regularFee) || 15000,
                finalCourseFee: Number(selectedCourse.regularFee) || 15000,
                hasDiscount: false,
                discountInfo: { hasDiscount: false, finalPrice: 15000, originalPrice: 15000 },
                monthlyEvent: { enabled: false, isActive: false, monthlyFee: 1500, admissionFee: 1000 }
            };

        // Check if Monthly Pay Event is active
        const isMonthlyActive = Boolean(pricing.monthlyEvent && pricing.monthlyEvent.isActive);

        // ── AUTO-DETECT ACTIVE OFFER ──────────────────────────────
        // Silently set the hidden plan select
        const activePlan = isMonthlyActive ? 'monthly_pay' : 'course_fee';
        if (planSelect) planSelect.value = activePlan;

        // ── ACTIVE OFFER BANNER ───────────────────────────────────
        const bannerEl = document.getElementById('activeOfferBanner');
        if (bannerEl) {
            if (isMonthlyActive) {
                const mFee = pricing.monthlyEvent.monthlyFee || 1000;
                const regFee = typeof formatCurrency === 'function' ? formatCurrency(pricing.regularFee) : `৳ ${pricing.regularFee}`;
                let countdownBadge = '';
                if (pricing.monthlyEvent.endDate && typeof isEventActive === 'function' && isEventActive(pricing.monthlyEvent.endDate)) {
                    countdownBadge = `
                        <span class="countdown-display" data-countdown-end="${pricing.monthlyEvent.endDate}"
                            style="font-size:0.75rem; font-weight:800; color:#fbbf24; background:rgba(0,0,0,0.35); padding:0.15rem 0.5rem; border-radius:5px; font-family:monospace;">
                            <i class="fas fa-stopwatch"></i> <span class="countdown-text">${typeof formatCountdown === 'function' ? formatCountdown(pricing.monthlyEvent.endDate) : ''}</span>
                        </span>`;
                }
                bannerEl.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; background:linear-gradient(135deg,rgba(245,158,11,0.14),rgba(239,68,68,0.08)); border:1px solid rgba(245,158,11,0.4); border-radius:10px; padding:0.6rem 0.9rem;">
                        <i class="fas fa-fire" style="color:#f59e0b;"></i>
                        <span style="font-size:0.84rem; font-weight:700; color:#fbbf24;">${pricing.monthlyEvent.eventTitle || 'মাসিক ফি অফার'}</span>
                        <span style="font-size:0.8rem; color:#94a3b8; text-decoration:line-through;">${regFee}</span>
                        <span style="font-size:0.9rem; font-weight:800; color:#f59e0b;">৳ ${mFee.toLocaleString()}<span style="font-size:0.72rem; font-weight:500; color:#cbd5e1;"> / মাস</span></span>
                        ${countdownBadge}
                    </div>`;
                bannerEl.style.display = 'block';
            } else if (pricing.hasDiscount) {
                const discInfo = pricing.discountInfo;
                const discLabel = discInfo.discountType === 'percentage'
                    ? `${discInfo.discountPercent}% OFF`
                    : `৳ ${discInfo.discountAmount.toLocaleString()} OFF`;
                let countdownBadge = '';
                if (pricing.discountEndDate && typeof isEventActive === 'function' && isEventActive(pricing.discountEndDate)) {
                    countdownBadge = `
                        <span class="countdown-display" data-countdown-end="${pricing.discountEndDate}"
                            style="font-size:0.75rem; font-weight:800; color:#fbbf24; background:rgba(0,0,0,0.35); padding:0.15rem 0.5rem; border-radius:5px; font-family:monospace;">
                            <i class="fas fa-stopwatch"></i> <span class="countdown-text">${typeof formatCountdown === 'function' ? formatCountdown(pricing.discountEndDate) : ''}</span>
                        </span>`;
                }
                bannerEl.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(56,189,248,0.08)); border:1px solid rgba(16,185,129,0.38); border-radius:10px; padding:0.6rem 0.9rem;">
                        <i class="fas fa-tag" style="color:#10b981;"></i>
                        <span style="font-size:0.84rem; font-weight:700; color:#6ee7b7;">কোর্স ফি ডিসকাউন্ট অফার</span>
                        <span style="font-size:0.8rem; color:#94a3b8; text-decoration:line-through;">${typeof formatCurrency === 'function' ? formatCurrency(pricing.regularFee) : `৳ ${pricing.regularFee}`}</span>
                        <span style="font-size:0.9rem; font-weight:800; color:#10b981;">${typeof formatCurrency === 'function' ? formatCurrency(pricing.finalCourseFee) : `৳ ${pricing.finalCourseFee}`}</span>
                        <span style="background:rgba(16,185,129,0.18); border:1px solid rgba(16,185,129,0.3); color:#6ee7b7; font-size:0.72rem; font-weight:700; padding:0.18rem 0.5rem; border-radius:5px;">${discLabel}</span>
                        ${countdownBadge}
                    </div>`;
                bannerEl.style.display = 'block';
            } else {
                bannerEl.style.display = 'none';
            }
        }

        const durationMonths = courseDuration;

        let html = '';
        let lockedFeeData = {};

        if (activePlan === 'course_fee') {
            const discountBadge = typeof getDiscountBadgeHTML === 'function' ? getDiscountBadgeHTML(pricing.discountInfo) : '';
            const priceHtml = typeof getPriceHTML === 'function' ? getPriceHTML(pricing.discountInfo) : `৳ ${pricing.finalCourseFee.toLocaleString()}`;

            let timerBadge = '';
            if (pricing.isDiscountActive && pricing.discountEndDate && typeof isEventActive === 'function' && isEventActive(pricing.discountEndDate)) {
                timerBadge = `
                    <div style="margin-top: 0.5rem; font-size: 0.82rem; color: #38bdf8; display:flex; align-items:center; gap:0.4rem;" data-countdown-end="${pricing.discountEndDate}">
                        <i class="fas fa-stopwatch"></i> <span>Discount Ends in: <strong class="countdown-text">${formatCountdown(pricing.discountEndDate)}</strong></span>
                    </div>
                `;
            }

            let branchFeedback = '';
            if (pricing.discountInfo.isBranchRestricted) {
                if (pricing.discountInfo.isBranchMatch) {
                    branchFeedback = `
                        <div style="margin-top: 0.55rem; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #6ee7b7; display:flex; align-items:center; gap:0.4rem;">
                            <i class="fas fa-check-circle" style="color:#10b981;"></i>
                            <span><strong>${pricing.discountInfo.applicableBranch} ব্রাঞ্চের</strong> বিশেষ ছাড় সফলভাবে কার্যকর হয়েছে!</span>
                        </div>
                    `;
                } else if (selectedBranch) {
                    branchFeedback = `
                        <div style="margin-top: 0.55rem; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3); border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #fbbf24; display:flex; align-items:center; gap:0.4rem;">
                            <i class="fas fa-info-circle" style="color:#f59e0b;"></i>
                            <span>এই স্পেশাল ডিসকাউন্ট অফারটি শুধুমাত্র <strong>${pricing.discountInfo.applicableBranch} ব্রাঞ্চের</strong> জন্য প্রযোজ্য।</span>
                        </div>
                    `;
                } else {
                    branchFeedback = `
                        <div style="margin-top: 0.55rem; background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.3); border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #7dd3fc; display:flex; align-items:center; gap:0.4rem;">
                            <i class="fas fa-map-marker-alt" style="color:#38bdf8;"></i>
                            <span><strong>${pricing.discountInfo.applicableBranch} ব্রাঞ্চের</strong> জন্য বিশেষ ছাড় রয়েছে। নিচে ব্রাঞ্চ নির্বাচন করলে ছাড় প্রযোজ্য হবে।</span>
                        </div>
                    `;
                }
            }

            html = `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: #94a3b8; font-weight: 700; margin-bottom: 0.35rem; letter-spacing: 0.05em;">PLAN: <span style="color:#ffffff;">FULL COURSE PACKAGE</span></div>
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            ${priceHtml}
                            ${discountBadge}
                        </div>
                        ${timerBadge}
                    </div>
                </div>
                ${branchFeedback}
                <div style="margin-top: 0.95rem; padding-top: 0.75rem; border-top: 1px solid rgba(148,163,184,0.15); font-size: 0.85rem; color: #cbd5e1; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                    <span><i class="fas fa-calendar-alt" style="color: #38bdf8;"></i> Duration: <strong style="color:#ffffff;">${durationMonths} Months</strong></span>
                    <span><i class="fas fa-receipt" style="color: #38bdf8;"></i> Total Course Fee: <strong style="color: #38bdf8; font-size: 1.05rem;">${formatCurrency(pricing.finalCourseFee)}</strong></span>
                </div>
            `;

            lockedFeeData = {
                course: selectedCourse.title || selectedCourse.level,
                level: selectedCourse.level || val('courseLevel'),
                billingPlan: 'course_fee',
                offerType: pricing.hasDiscount ? 'discount_offer' : 'regular',
                durationMonths,
                regularFee: pricing.regularFee,
                discount: pricing.discountInfo?.discountAmount || 0,
                baseFee: pricing.regularFee,
                finalFee: pricing.finalCourseFee,
                monthlyFee: 0,
                admissionFee: 0
            };

        } else if (activePlan === 'monthly_pay') {
            const mEvent = pricing.monthlyEvent;
            const admFee = mEvent.admissionFee || 0;
            const mFee = mEvent.monthlyFee || 1000;
            const initialPayment = admFee > 0 ? (admFee + mFee) : mFee;
            const totalProjected = admFee + (durationMonths * mFee);

            html = `
                <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(148,163,184,0.2); border-radius: 10px; padding: 1rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; font-size: 0.88rem; color: #cbd5e1;">
                        <div>
                            <div style="font-size: 0.75rem; color: #94a3b8;">Initial Payment:</div>
                            <div style="font-size: 1.25rem; font-weight: 800; color: #10b981;">${formatCurrency(initialPayment)}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: #94a3b8;">Monthly Fee:</div>
                            <div style="font-size: 1.25rem; font-weight: 800; color: #f59e0b;">${formatCurrency(mFee)}</div>
                        </div>
                    </div>
                </div>
            `;

            lockedFeeData = {
                course: selectedCourse.title || selectedCourse.level,
                level: selectedCourse.level || val('courseLevel'),
                billingPlan: 'monthly_pay',
                offerType: 'monthly_offer',
                durationMonths,
                regularFee: pricing.regularFee,
                discount: 0,
                baseFee: admFee,
                finalFee: initialPayment,
                monthlyFee: mFee,
                admissionFee: admFee
            };
        }

        feeContent.innerHTML = html;
        feeDisplay.style.display = 'block';

        if (typeof initLiveCountdowns === 'function') {
            initLiveCountdowns();
        }

        // Store fee info for submission
        let feeInput = document.getElementById('courseFeeInfo');
        if (!feeInput) {
            feeInput = document.createElement('input');
            feeInput.type = 'hidden';
            feeInput.id   = 'courseFeeInfo';
            feeInput.name = 'feeInfo';
            document.getElementById('admissionForm').appendChild(feeInput);
        }
        feeInput.value = JSON.stringify(lockedFeeData);
    }
    window.updateFeeDisplay = updateFeeDisplay;

    // ==========================================================
    // FORM SUBMISSION (Online & Resilient Local Storage Fallback)
    // ==========================================================
    async function submitForm() {
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting Application...';
        }

        const formData = new FormData();

        // Personal & Family
        formData.append('fullName',          val('fullName'));
        formData.append('fatherName',        val('fatherName'));
        formData.append('motherName',        val('motherName'));
        formData.append('email',             val('email'));
        formData.append('phone',             val('phone'));
        formData.append('dateOfBirth',       val('dateOfBirth'));
        formData.append('gender',            val('gender'));
        formData.append('nidBirthCert',      val('nidBirthCert'));
        formData.append('bloodGroup',        val('bloodGroup'));
        formData.append('occupation',        val('occupation'));
        formData.append('religion',          val('religion'));

        // Addresses
        formData.append('address',           val('address'));
        formData.append('city',              val('city'));
        formData.append('district',          val('district'));
        formData.append('permanentAddress',  val('permanentAddress'));
        formData.append('permanentCity',     val('permanentCity'));
        formData.append('permanentDistrict', val('permanentDistrict'));

        // Course
        formData.append('highestEducation',   val('highestEducation'));
        formData.append('course',             val('course'));
        formData.append('courseLevel',        val('courseLevel'));
        formData.append('branch',             val('branch'));
        formData.append('japaneseExperience', val('japaneseExperience'));
        formData.append('visaType',           val('visaType'));

        // Emergency
        formData.append('emergencyName',  val('emergencyName'));
        formData.append('emergencyPhone', val('emergencyPhone'));

        // Optional
        formData.append('comment', val('comment'));
        const feeInfo = document.getElementById('courseFeeInfo')?.value || '';
        if (feeInfo) formData.append('feeInfo', feeInfo);

        // Files
        if (photoFile) formData.append('photo', photoFile);
        if (docFiles && docFiles.length > 0) {
            docFiles.forEach(file => {
                formData.append('educationDoc', file);
            });
        }

        let submissionSuccessful = false;
        let responseJson = null;

        // Try backend endpoints first
        const endpoints = getApiEndpoints('/api/admission/submit');
        for (const ep of endpoints) {
            try {
                const response = await fetch(ep, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json().catch(() => null);

                if (response.ok && result && result.success) {
                    submissionSuccessful = true;
                    responseJson = result;
                    break;
                } else if (response.status === 422 && result && result.fields) {
                    // Validation failure returned by express-validator
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
                    }
                    showFormError(result.error || 'Please correct the highlighted fields.');
                    result.fields.forEach(f => showErr(f.field, f.message));
                    return;
                }
            } catch (netErr) {
                // Endpoint not reachable, try next
            }
        }

        // If backend succeeded
        if (submissionSuccessful && responseJson) {
            // Also sync to local DAO for instant offline/portal reflection
            try {
                if (window.DAO && window.DAO.Admissions) {
                    await window.DAO.Admissions.add({
                        id: responseJson.applicationNumber,
                        applicationNumber: responseJson.applicationNumber,
                        applicationId: responseJson.applicationNumber,
                        fullName: val('fullName'),
                        fatherName: val('fatherName'),
                        motherName: val('motherName'),
                        email: val('email'),
                        phone: val('phone'),
                        dateOfBirth: val('dateOfBirth'),
                        gender: val('gender'),
                        nidBirthCert: val('nidBirthCert'),
                        bloodGroup: val('bloodGroup'),
                        occupation: val('occupation'),
                        religion: val('religion'),
                        address: val('address'),
                        city: val('city'),
                        district: val('district'),
                        permanentAddress: val('permanentAddress'),
                        permanentCity: val('permanentCity'),
                        permanentDistrict: val('permanentDistrict'),
                        highestEducation: val('highestEducation'),
                        course: val('course'),
                        courseLevel: val('courseLevel'),
                        branch: val('branch'),
                        japaneseExperience: val('japaneseExperience'),
                        visaType: val('visaType'),
                        emergencyName: val('emergencyName'),
                        emergencyPhone: val('emergencyPhone'),
                        comment: val('comment'),
                        photoUrl: responseJson.photoUrl || '',
                        documentUrls: responseJson.documentUrls || [],
                        submittedAt: new Date().toISOString()
                    });
                }
            } catch (_) {}

            showSuccessCard(responseJson.applicationNumber, responseJson.applicantName);
            return;
        }

        // ── Offline / Local Resilience Fallback ──────────────────
        try {
            const currentYear = new Date().getFullYear();
            const seq = Math.floor(100 + Math.random() * 900);
            const generatedAppNumber = `FEBD-${currentYear}-${seq}`;

            const photoDataUrl = photoFile ? await readFileAsDataURL(photoFile) : '';
            const docDataPromises = docFiles.map(async f => ({
                name: f.name,
                size: f.size,
                type: f.type,
                url: await readFileAsDataURL(f)
            }));
            const resolvedDocs = await Promise.all(docDataPromises);

            const admissionRecord = {
                id: generatedAppNumber,
                applicationId: generatedAppNumber,
                applicationNumber: generatedAppNumber,
                submittedAt: new Date().toISOString(),
                fullName: val('fullName'),
                fatherName: val('fatherName'),
                motherName: val('motherName'),
                email: val('email'),
                phone: val('phone'),
                dateOfBirth: val('dateOfBirth'),
                gender: val('gender'),
                nidBirthCert: val('nidBirthCert'),
                bloodGroup: val('bloodGroup'),
                occupation: val('occupation'),
                religion: val('religion'),
                address: val('address'),
                city: val('city'),
                district: val('district'),
                permanentAddress: val('permanentAddress'),
                permanentCity: val('permanentCity'),
                permanentDistrict: val('permanentDistrict'),
                highestEducation: val('highestEducation'),
                course: val('course'),
                courseLevel: val('courseLevel'),
                branch: val('branch'),
                japaneseExperience: val('japaneseExperience'),
                visaType: val('visaType'),
                emergencyName: val('emergencyName'),
                emergencyPhone: val('emergencyPhone'),
                comment: val('comment'),
                feeInfo: feeInfo ? JSON.parse(feeInfo) : null,
                photoUrl: photoDataUrl || '../assets/images/student-placeholder.jpg',
                documentUrls: resolvedDocs.map(d => d.url),
                documents: resolvedDocs,
                status: 'pending'
            };

            // Save to DAO
            if (window.DAO && window.DAO.Admissions) {
                await window.DAO.Admissions.add(admissionRecord);
            } else {
                const STORAGE_KEY = 'fusion_edu_admissions';
                let localList = [];
                try {
                    localList = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                } catch (_) { localList = []; }
                localList.unshift(admissionRecord);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(localList));
            }

            showSuccessCard(generatedAppNumber, admissionRecord.fullName);

        } catch (fallbackErr) {
            console.error('[Admission] Fallback error:', fallbackErr);
            showFormError('Could not process submission. Please try again.');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
            }
        }
    }

    function showFormError(msg) {
        let errBox = document.getElementById('form-submit-error');
        if (!errBox) {
            errBox = document.createElement('div');
            errBox.id = 'form-submit-error';
            errBox.className = 'alert alert-error';
            document.getElementById('step-panel-3')?.prepend(errBox);
        }
        errBox.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
        errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // ==========================================================
    // SUCCESS CARD
    // ==========================================================
    function showSuccessCard(appNumber, name) {
        const formWrap   = document.getElementById('admission-form-wrap');
        const successWrap = document.getElementById('admission-success-wrap');

        if (formWrap)    formWrap.style.display   = 'none';
        if (successWrap) successWrap.style.display = 'block';

        const appNumEl   = document.getElementById('success-app-number');
        const appNameEl  = document.getElementById('success-name');
        const appPassEl  = document.getElementById('success-password');
        const appCourseEl = document.getElementById('success-course');
        
        if (appNumEl)  appNumEl.textContent  = appNumber;
        if (appNameEl) appNameEl.textContent = name || val('fullName');
        
        if (appPassEl) {
            const phone = val('phone');
            appPassEl.textContent = phone ? phone : 'FEBD2026';
        }
        
        if (appCourseEl) {
            const courseSelect = document.getElementById('course');
            const courseName = courseSelect && courseSelect.options[courseSelect.selectedIndex] 
                               ? courseSelect.options[courseSelect.selectedIndex].text 
                               : val('course');
            appCourseEl.textContent = courseName || 'Japanese Language Course';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ==========================================================
    // PDF / PRINT
    // ==========================================================
    function printApplication() {
        window.print();
    }

    // ==========================================================
    // DYNAMIC BRANCHES & COURSES
    // ==========================================================
    async function populateBranchOptions() {
        const branchSelect = document.getElementById('branch');
        if (!branchSelect) return;

        try {
            let branches = [];
            if (window.DAO && window.DAO.Branches) {
                branches = await window.DAO.Branches.getAll();
            } else {
                const res = await fetch('/api/branches');
                if (res.ok) {
                    const data = await res.json();
                    branches = data.branches || [];
                }
            }

            if (Array.isArray(branches) && branches.length > 0) {
                const cur = branchSelect.value;
                branchSelect.innerHTML = '<option value="">Choose a branch</option>' + branches.map(b => {
                    const rawVal = (b.name || b.displayName || '').trim();
                    const valKey = rawVal.toLowerCase();
                    const label = b.displayName || (rawVal ? (rawVal.charAt(0).toUpperCase() + rawVal.slice(1) + ' Branch') : 'Branch');
                    return `<option value="${valKey}">${label}</option>`;
                }).join('');
                if (cur) branchSelect.value = cur;
            }
        } catch (err) {
            console.warn('[Admission] Could not load dynamic branches:', err);
        }
    }

    // ==========================================================
    // WIRE UP EVENTS
    // ==========================================================
    document.addEventListener('DOMContentLoaded', () => {
        // Navigation
        document.getElementById('btn-step1-next')?.addEventListener('click', () => {
            if (validateStep1()) showStep(2);
        });
        document.getElementById('btn-step2-back')?.addEventListener('click', () => showStep(1));
        document.getElementById('btn-step2-next')?.addEventListener('click', () => {
            if (validateStep2()) { populateReview(); showStep(3); }
        });
        document.getElementById('btn-step3-back')?.addEventListener('click', () => showStep(2));

        // Submit
        document.getElementById('admissionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateStep3()) submitForm();
        });

        // Age calculator
        document.getElementById('dateOfBirth')?.addEventListener('change', updateAgeBadge);

        // Address auto-fill sync
        setupAddressAutoFill();

        // File previews
        setupPhotoPreview();
        setupDocPreview();

        // Branches & Course API
        populateBranchOptions();
        populateCourseOptions();
        document.getElementById('course')?.addEventListener('change', updateFeeDisplay);
        document.getElementById('branch')?.addEventListener('change', updateFeeDisplay);

        // Print button
        document.getElementById('btn-print')?.addEventListener('click', printApplication);

        // Init stepper
        renderStepper(1);
    });

    // Expose for potential external use
    window.AdmissionWizard = { showStep, printApplication };

}());
