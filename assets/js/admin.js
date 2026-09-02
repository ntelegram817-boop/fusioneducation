// ============================================================
// FUSION EDUCATION BD — ADMIN DASHBOARD JAVASCRIPT
// Universal Data Access via window.DAO with robust API & LocalStorage
// ============================================================

(function () {
    'use strict';

    /* ─── TOAST NOTIFICATIONS ─── */
    function showToast(message, type = 'success') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 400);
        }, 3200);
    }

    // Support legacy showSuccess calls
    function showSuccess(message) {
        showToast(message, 'success');
    }

    /* ─── IMAGE PREVIEW ─── */
    function previewImage(event, previewId) {
        const preview = document.getElementById(previewId);
        if (!preview) return;

        const target = event.target;
        const imageFile = target.type === 'file' ? target.files?.[0] : null;
        const imageUrl = target.value ? target.value.trim() : '';

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = e => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(imageFile);
            return;
        }

        if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:') || imageUrl.startsWith('../') || imageUrl.startsWith('/'))) {
            preview.innerHTML = `<img src="${imageUrl}" alt="Preview" onerror="this.parentElement.innerHTML='Invalid image URL'">`;
            return;
        }

        preview.innerHTML = 'Upload or enter an image URL to preview here.';
    }

    /* ─── CONFIRM DELETE MODAL ─── */
    let currentDeleteCallback = null;

    function openDeleteModal(title, desc, confirmCallback) {
        let modal = document.getElementById('deleteModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'deleteModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-box">
                    <div class="modal-icon"><i class="fas fa-trash-alt"></i></div>
                    <div class="modal-title" id="deleteModalTitle">Confirm Delete</div>
                    <p class="modal-desc" id="deleteModalDesc">Are you sure you want to delete this item? This action cannot be undone.</p>
                    <div class="modal-actions">
                        <button class="modal-btn cancel" id="deleteModalCancel">Cancel</button>
                        <button class="modal-btn confirm" id="deleteModalConfirm">Delete</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('deleteModalCancel').addEventListener('click', closeDeleteModal);
            document.getElementById('deleteModal').addEventListener('click', (e) => {
                if (e.target === modal) closeDeleteModal();
            });
            document.getElementById('deleteModalConfirm').addEventListener('click', async () => {
                if (typeof currentDeleteCallback === 'function') {
                    const btn = document.getElementById('deleteModalConfirm');
                    btn.disabled = true;
                    btn.textContent = 'Deleting...';
                    try {
                        await currentDeleteCallback();
                    } catch (e) {
                        console.error('Delete error:', e);
                    } finally {
                        btn.disabled = false;
                        btn.textContent = 'Delete';
                        closeDeleteModal();
                    }
                }
            });
        }

        if (title) document.getElementById('deleteModalTitle').textContent = title;
        if (desc) document.getElementById('deleteModalDesc').textContent = desc;

        currentDeleteCallback = confirmCallback;
        modal.classList.add('open');
    }

    function closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        if (modal) modal.classList.remove('open');
        currentDeleteCallback = null;
    }

    /* ─── BADGE COUNTERS ─── */
    async function updateNavBadges() {
        try {
            if (!window.DAO) return;
            
            // Messages count
            if (document.getElementById('navMsgCount')) {
                const msgs = await window.DAO.ContactMessages.getAll();
                const badge = document.getElementById('navMsgCount');
                badge.textContent = msgs.length || '0';
            }

            // Admissions counts
            if (document.getElementById('navAdmCount') || document.getElementById('navPendingCount') || document.getElementById('navAdmittedCount')) {
                const adms = await window.DAO.Admissions.getAll();
                const list = Array.isArray(adms) ? adms : [];
                let pCount = 0;
                let aCount = 0;
                list.forEach(a => {
                    const st = (a.status || 'pending').toLowerCase();
                    if (st === 'admitted' || st === 'approved' || st === 'active') {
                        aCount++;
                    } else {
                        pCount++;
                    }
                });

                const badge = document.getElementById('navAdmCount');
                if (badge) badge.textContent = list.length || '0';

                const pBadge = document.getElementById('navPendingCount');
                if (pBadge) pBadge.textContent = pCount;

                const aBadge = document.getElementById('navAdmittedCount');
                if (aBadge) aBadge.textContent = aCount;
            }
        } catch (e) {
            console.warn('Badge count error:', e);
        }
    }

    /* ============================================================
       1. SITE SETTINGS
       ============================================================ */
    function updateBrandColorPreview(fusionColor, educationColor) {
        const previewFusion = document.getElementById('previewFusionText');
        const previewEducation = document.getElementById('previewEducationText');
        if (previewFusion) previewFusion.style.color = fusionColor;
        if (previewEducation) previewEducation.style.color = educationColor;

        if (window.DAO && typeof window.DAO.applyBrandColors === 'function') {
            window.DAO.applyBrandColors({ fusionColor, educationColor });
        }
    }

    window.syncColorInput = function(target, color) {
        if (target === 'fusion') {
            const hexInput = document.getElementById('fusionColorHex');
            if (hexInput) hexInput.value = color.toUpperCase();
        } else {
            const hexInput = document.getElementById('educationColorHex');
            if (hexInput) hexInput.value = color.toUpperCase();
        }
        const fusion = document.getElementById('fusionColorInput')?.value || '#FFFFFF';
        const education = document.getElementById('educationColorInput')?.value || '#00AEEF';
        updateBrandColorPreview(fusion, education);
    };

    window.syncColorPicker = function(target, hex) {
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
        if (target === 'fusion') {
            const picker = document.getElementById('fusionColorInput');
            if (picker) picker.value = hex;
        } else {
            const picker = document.getElementById('educationColorInput');
            if (picker) picker.value = hex;
        }
        const fusion = document.getElementById('fusionColorInput')?.value || '#FFFFFF';
        const education = document.getElementById('educationColorInput')?.value || '#00AEEF';
        updateBrandColorPreview(fusion, education);
    };

    window.setColor = function(target, hex) {
        if (target === 'fusion') {
            const picker = document.getElementById('fusionColorInput');
            const input = document.getElementById('fusionColorHex');
            if (picker) picker.value = hex;
            if (input) input.value = hex.toUpperCase();
        } else {
            const picker = document.getElementById('educationColorInput');
            const input = document.getElementById('educationColorHex');
            if (picker) picker.value = hex;
            if (input) input.value = hex.toUpperCase();
        }
        const fusion = document.getElementById('fusionColorInput')?.value || '#FFFFFF';
        const education = document.getElementById('educationColorInput')?.value || '#00AEEF';
        updateBrandColorPreview(fusion, education);
    };

    async function loadSettings() {
        if (!document.getElementById('heroTitleInput')) return;
        try {
            const data = await window.DAO.Settings.get();
            const brandColors = data.brandColors || { fusionColor: '#FFFFFF', educationColor: '#00AEEF' };
            const hero = data.hero || {};
            const contactInfo = data.contactInfo || {};
            const socialLinks = data.socialLinks || {};

            if (document.getElementById('fusionColorInput')) {
                document.getElementById('fusionColorInput').value = brandColors.fusionColor || '#FFFFFF';
            }
            if (document.getElementById('fusionColorHex')) {
                document.getElementById('fusionColorHex').value = (brandColors.fusionColor || '#FFFFFF').toUpperCase();
            }
            if (document.getElementById('educationColorInput')) {
                document.getElementById('educationColorInput').value = brandColors.educationColor || '#00AEEF';
            }
            if (document.getElementById('educationColorHex')) {
                document.getElementById('educationColorHex').value = (brandColors.educationColor || '#00AEEF').toUpperCase();
            }
            updateBrandColorPreview(brandColors.fusionColor || '#FFFFFF', brandColors.educationColor || '#00AEEF');

            if (document.getElementById('heroTitleInput')) document.getElementById('heroTitleInput').value = hero.title || '';
            if (document.getElementById('heroSubtitleInput')) document.getElementById('heroSubtitleInput').value = hero.subtitle || '';
            if (document.getElementById('heroImageUrl')) document.getElementById('heroImageUrl').value = hero.image || '';
            if (document.getElementById('heroCtaText')) document.getElementById('heroCtaText').value = hero.ctaText || '';
            if (document.getElementById('heroCtaUrl')) document.getElementById('heroCtaUrl').value = hero.ctaUrl || '';
            if (document.getElementById('heroSecondaryText')) document.getElementById('heroSecondaryText').value = hero.secondaryCtaText || '';
            if (document.getElementById('heroSecondaryUrl')) document.getElementById('heroSecondaryUrl').value = hero.secondaryCtaUrl || '';

            const heroPreview = document.getElementById('heroPreview');
            if (heroPreview) {
                heroPreview.innerHTML = hero.image
                    ? `<img src="${hero.image}" alt="Hero Preview">`
                    : 'Upload or enter image URL to preview here.';
            }

            if (document.getElementById('contactAddress')) document.getElementById('contactAddress').value = contactInfo.address || '';
            if (document.getElementById('contactPhone')) document.getElementById('contactPhone').value = contactInfo.phone || '';
            if (document.getElementById('contactEmail')) document.getElementById('contactEmail').value = contactInfo.email || '';
            if (document.getElementById('contactHours')) document.getElementById('contactHours').value = contactInfo.hours || '';

            if (document.getElementById('socialFacebook')) document.getElementById('socialFacebook').value = socialLinks.facebook || '';
            if (document.getElementById('socialInstagram')) document.getElementById('socialInstagram').value = socialLinks.instagram || '';
            if (document.getElementById('socialTwitter')) document.getElementById('socialTwitter').value = socialLinks.twitter || '';
            if (document.getElementById('socialLinkedin')) document.getElementById('socialLinkedin').value = socialLinks.linkedin || '';
            if (document.getElementById('socialWhatsapp')) document.getElementById('socialWhatsapp').value = socialLinks.whatsapp || '';

            if (document.getElementById('footerTextInput')) document.getElementById('footerTextInput').value = data.footerText || '';
        } catch (err) {
            console.error('Error loading settings', err);
            showToast('Failed to load settings', 'error');
        }
    }

    async function saveSettings(event) {
        event.preventDefault();
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            const heroImageUrl = document.getElementById('heroImageUrl')?.value.trim() || '';
            const heroImageFile = document.getElementById('heroImageFile')?.files?.[0];

            let imageUrl = heroImageUrl;
            if (heroImageFile) {
                imageUrl = await window.DAO.Storage.upload(heroImageFile, 'settings');
            }

            const data = {
                brandColors: {
                    fusionColor: document.getElementById('fusionColorHex')?.value.trim() || document.getElementById('fusionColorInput')?.value || '#FFFFFF',
                    educationColor: document.getElementById('educationColorHex')?.value.trim() || document.getElementById('educationColorInput')?.value || '#00AEEF'
                },
                hero: {
                    title: document.getElementById('heroTitleInput')?.value.trim() || '',
                    subtitle: document.getElementById('heroSubtitleInput')?.value.trim() || '',
                    image: imageUrl || '',
                    ctaText: document.getElementById('heroCtaText')?.value.trim() || '',
                    ctaUrl: document.getElementById('heroCtaUrl')?.value.trim() || '',
                    secondaryCtaText: document.getElementById('heroSecondaryText')?.value.trim() || '',
                    secondaryCtaUrl: document.getElementById('heroSecondaryUrl')?.value.trim() || ''
                },
                contactInfo: {
                    address: document.getElementById('contactAddress')?.value.trim() || '',
                    phone: document.getElementById('contactPhone')?.value.trim() || '',
                    email: document.getElementById('contactEmail')?.value.trim() || '',
                    hours: document.getElementById('contactHours')?.value.trim() || ''
                },
                socialLinks: {
                    facebook: document.getElementById('socialFacebook')?.value.trim() || '',
                    instagram: document.getElementById('socialInstagram')?.value.trim() || '',
                    twitter: document.getElementById('socialTwitter')?.value.trim() || '',
                    linkedin: document.getElementById('socialLinkedin')?.value.trim() || '',
                    whatsapp: document.getElementById('socialWhatsapp')?.value.trim() || ''
                },
                footerText: document.getElementById('footerTextInput')?.value.trim() || ''
            };

            await window.DAO.Settings.save(data);
            showToast('Site settings & brand colors saved successfully!', 'success');
            loadSettings();
        } catch (err) {
            console.error('Error saving settings', err);
            showToast('Failed to save settings: ' + err.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Site Settings';
            }
        }
    }

    /* ============================================================
       2. HOME POSTS
       ============================================================ */
    let postsList = [];

    function resetPostForm() {
        const form = document.getElementById('postForm');
        if (form) form.reset();
        if (document.getElementById('postId')) document.getElementById('postId').value = '';
        if (document.getElementById('postSubmitBtn')) {
            document.getElementById('postSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Save Post';
        }
        if (document.getElementById('formCardTitle')) {
            document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add New Post';
        }
        if (document.getElementById('formCancelBtn')) {
            document.getElementById('formCancelBtn').style.display = 'none';
        }
        if (document.getElementById('postPreview')) {
            document.getElementById('postPreview').innerHTML = 'Upload or enter an image URL to preview here.';
        }
    }

    async function handlePostForm(event) {
        event.preventDefault();
        const btn = document.getElementById('postSubmitBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        const postId = document.getElementById('postId')?.value;
        const title = document.getElementById('postTitle')?.value.trim() || '';
        const text = document.getElementById('postText')?.value.trim() || '';
        let imageUrl = document.getElementById('postImageUrl')?.value.trim() || '';
        const photoLink = document.getElementById('postPhotoLink')?.value.trim() || '';
        const buttonText = document.getElementById('postButtonText')?.value.trim() || '';
        const buttonUrl = document.getElementById('postButtonUrl')?.value.trim() || '';
        const layout = document.getElementById('postLayout')?.value || 'horizontal';
        const photoSize = document.getElementById('postPhotoSize')?.value || 'medium';
        const imageFile = document.getElementById('postImageFile')?.files?.[0];

        if (!title || !text) {
            showToast('Post title and description are required.', 'warning');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Post';
            }
            return;
        }

        try {
            if (imageFile) {
                imageUrl = await window.DAO.Storage.upload(imageFile, 'posts');
            }

            const item = { title, text, image: imageUrl, photoLink, buttonText, buttonUrl, layout, photoSize };

            if (postId) {
                await window.DAO.Posts.update(postId, item);
                showToast('Post updated successfully!', 'success');
            } else {
                await window.DAO.Posts.add(item);
                showToast('Post created successfully!', 'success');
            }
            resetPostForm();
            loadPosts();
        } catch (err) {
            console.error('Error saving post', err);
            showToast('Failed to save post: ' + err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Post';
            }
        }
    }

    async function loadPosts() {
        const list = document.getElementById('postsList');
        if (!list) return;
        try {
            postsList = await window.DAO.Posts.getAll();

            if (document.getElementById('postsCountBadge')) {
                document.getElementById('postsCountBadge').innerHTML = `<i class="fas fa-newspaper"></i> ${postsList.length} post${postsList.length !== 1 ? 's' : ''}`;
            }

            if (!postsList.length) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-newspaper"></i></div>
                        <h3>No Posts Found</h3>
                        <p>Create your first home post using the form on the left.</p>
                    </div>`;
                return;
            }

            list.innerHTML = postsList.map(post => `
                <div class="item-card">
                    <div class="post-grid">
                        <div>
                            <img class="post-thumb" src="${post.image || 'https://images.unsplash.com/photo-1528164344705-475426879c0d?w=400'}" alt="${post.title}" onerror="this.src='https://images.unsplash.com/photo-1528164344705-475426879c0d?w=400'">
                        </div>
                        <div>
                            <div class="item-card-top">
                                <h3 class="item-card-title">${post.title}</h3>
                                <span class="badge-status blue">${post.layout || 'horizontal'}</span>
                            </div>
                            <div class="item-meta">
                                <span class="meta-pill"><i class="fas fa-image"></i> ${post.photoSize || 'medium'} size</span>
                                ${post.buttonText ? `<span class="meta-pill accent"><i class="fas fa-external-link-alt"></i> Button: "${post.buttonText}"</span>` : ''}
                            </div>
                            <p class="item-desc">${post.text}</p>
                            <div class="action-row">
                                <button class="card-action-btn edit" onclick="window.editPost('${post.id}')"><i class="fas fa-edit"></i> Edit</button>
                                <button class="card-action-btn delete" onclick="window.deletePost('${post.id}')"><i class="fas fa-trash"></i> Delete</button>
                            </div>
                        </div>
                    </div>
                </div>`).join('');
        } catch (err) {
            console.error('Error loading posts', err);
            list.innerHTML = '<div class="empty-state"><p style="color:var(--error);">Failed to load posts.</p></div>';
        }
    }

    function editPost(id) {
        const item = postsList.find(p => String(p.id) === String(id));
        if (!item) return;

        if (document.getElementById('postId')) document.getElementById('postId').value = item.id;
        if (document.getElementById('postTitle')) document.getElementById('postTitle').value = item.title || '';
        if (document.getElementById('postText')) document.getElementById('postText').value = item.text || '';
        if (document.getElementById('postImageUrl')) document.getElementById('postImageUrl').value = item.image || '';
        if (document.getElementById('postPhotoLink')) document.getElementById('postPhotoLink').value = item.photoLink || '';
        if (document.getElementById('postButtonText')) document.getElementById('postButtonText').value = item.buttonText || '';
        if (document.getElementById('postButtonUrl')) document.getElementById('postButtonUrl').value = item.buttonUrl || '';
        if (document.getElementById('postLayout')) document.getElementById('postLayout').value = item.layout || 'horizontal';
        if (document.getElementById('postPhotoSize')) document.getElementById('postPhotoSize').value = item.photoSize || 'medium';

        const preview = document.getElementById('postPreview');
        if (preview) {
            preview.innerHTML = item.image ? `<img src="${item.image}" alt="Preview">` : 'Upload or enter an image URL to preview here.';
        }

        if (document.getElementById('postSubmitBtn')) {
            document.getElementById('postSubmitBtn').innerHTML = '<i class="fas fa-check"></i> Update Post';
        }
        if (document.getElementById('formCardTitle')) {
            document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-edit"></i> Editing Post';
        }
        if (document.getElementById('formCancelBtn')) {
            document.getElementById('formCancelBtn').style.display = '';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function deletePost(id) {
        openDeleteModal('Delete Post?', 'Are you sure you want to remove this post from the homepage?', async () => {
            await window.DAO.Posts.delete(id);
            showToast('Post deleted successfully!', 'success');
            loadPosts();
        });
    }

    /* ============================================================
       3. COURSES
       ============================================================ */
    let courseList = [];
    let filteredCourses = [];

    function resetCourseForm() {
        const form = document.getElementById('courseForm');
        if (form) form.reset();
        if (document.getElementById('courseId')) document.getElementById('courseId').value = '';
        if (document.getElementById('courseDiscountType')) document.getElementById('courseDiscountType').value = 'none';
        if (document.getElementById('courseDiscountValue')) document.getElementById('courseDiscountValue').value = '';
        if (document.getElementById('courseSubmitBtn')) {
            document.getElementById('courseSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Save Course';
        }
        if (document.getElementById('formCardTitle')) {
            document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add New Course';
        }
        if (document.getElementById('formCancelBtn')) {
            document.getElementById('formCancelBtn').style.display = 'none';
        }
        if (document.getElementById('discountPreview')) {
            document.getElementById('discountPreview').classList.remove('show');
        }
    }

    function updateDiscountPreview() {
        const feeStr = document.getElementById('courseFee')?.value || '';
        const dtype = document.getElementById('courseDiscountType')?.value || 'none';
        const dval = parseFloat(document.getElementById('courseDiscountValue')?.value || '0');
        const preview = document.getElementById('discountPreview');

        if (!preview) return;

        if (!feeStr || dtype === 'none' || !dval || isNaN(dval)) {
            preview.classList.remove('show');
            return;
        }

        if (typeof calculateDiscount !== 'function' || typeof extractFeeValue !== 'function' || typeof formatCurrency !== 'function') {
            preview.classList.remove('show');
            return;
        }

        const origVal = extractFeeValue(feeStr);
        if (!origVal) {
            preview.classList.remove('show');
            return;
        }

        const info = calculateDiscount(origVal, dtype, dval);
        if (!info.hasDiscount) {
            preview.classList.remove('show');
            return;
        }

        if (document.getElementById('previewFinalPrice')) document.getElementById('previewFinalPrice').textContent = formatCurrency(info.finalPrice);
        if (document.getElementById('previewOriginalPrice')) document.getElementById('previewOriginalPrice').textContent = formatCurrency(info.originalPrice);
        if (document.getElementById('previewSaving')) document.getElementById('previewSaving').textContent = `You save ${formatCurrency(info.discountAmount)} (${info.discountPercent}%)`;
        preview.classList.add('show');
    }

    async function handleCourseForm(event) {
        event.preventDefault();
        const btn = document.getElementById('courseSubmitBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        const courseId = document.getElementById('courseId')?.value;
        const title = document.getElementById('courseTitle')?.value.trim() || '';
        const level = document.getElementById('courseLevel')?.value.trim() || '';
        const duration = document.getElementById('courseDuration')?.value.trim() || '';
        const initialDurationMonths = parseInt(document.getElementById('courseInitialDurationMonths')?.value || '3', 10);
        const monthlyFee = parseFloat(document.getElementById('courseMonthlyFee')?.value || '1000');
        const admissionFee = parseFloat(document.getElementById('courseAdmissionFee')?.value || '1000');
        const billingType = document.getElementById('courseBillingType')?.value || 'monthly_recurring';
        const students = document.getElementById('courseStudents')?.value.trim() || '';
        const fee = document.getElementById('courseFee')?.value.trim() || `৳ ${monthlyFee.toLocaleString()} / month`;
        const description = document.getElementById('courseDescription')?.value.trim() || '';
        const link = document.getElementById('courseLink')?.value.trim() || '';
        const discountType = document.getElementById('courseDiscountType')?.value || 'none';
        const discountValue = document.getElementById('courseDiscountValue')?.value;

        if (!title || !level) {
            showToast('Course title and level are required.', 'warning');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Course';
            }
            return;
        }

        const course = {
            title, level, duration, initialDurationMonths, monthlyFee, admissionFee, billingType,
            students, fee, description, link,
            discountType: discountType || 'none',
            discountValue: discountValue ? parseFloat(discountValue) : 0
        };

        try {
            if (courseId) {
                await window.DAO.Courses.update(courseId, course);
                showToast('Course updated successfully!', 'success');
            } else {
                await window.DAO.Courses.add(course);
                showToast('Course created successfully!', 'success');
            }
            resetCourseForm();
            loadCourses();
        } catch (err) {
            console.error('Error saving course', err);
            showToast('Failed to save course: ' + err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Course';
            }
        }
    }

    function renderCourseCards(courses) {
        const list = document.getElementById('coursesList');
        if (!list) return;

        if (document.getElementById('coursesCountBadge')) {
            document.getElementById('coursesCountBadge').innerHTML = `<i class="fas fa-layer-group"></i> ${courses.length} course${courses.length !== 1 ? 's' : ''}`;
        }

        if (!courses.length) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-book-open"></i></div>
                    <h3>No Courses Found</h3>
                    <p>Add your first course using the form on the left.</p>
                </div>`;
            return;
        }

        list.innerHTML = courses.map(course => {
            const discountInfo = typeof getCourseDiscountInfo === 'function' ? getCourseDiscountInfo(course) : null;
            let priceHTML = '';

            if (discountInfo && discountInfo.hasDiscount && typeof formatCurrency === 'function') {
                const discountLabel = course.discountType === 'percentage'
                    ? `${course.discountValue}% OFF`
                    : `৳${Number(course.discountValue).toLocaleString()} OFF`;
                priceHTML = `
                    <div class="course-card-price">
                        <span class="price-final">${formatCurrency(discountInfo.finalPrice)}</span>
                        <span class="price-original">${formatCurrency(discountInfo.originalPrice)}</span>
                        <span class="discount-chip"><i class="fas fa-tag"></i> ${discountLabel}</span>
                    </div>`;
            } else {
                const feeVal = typeof extractFeeValue === 'function' ? extractFeeValue(course.fee) : 0;
                priceHTML = `
                    <div class="course-card-price">
                        <span class="price-final">${feeVal > 0 && typeof formatCurrency === 'function' ? formatCurrency(feeVal) : (course.fee || '—')}</span>
                    </div>`;
            }

            const linkBtn = course.link
                ? `<button class="card-action-btn view-link" onclick="window.open('${course.link}', '_blank')"><i class="fas fa-external-link-alt"></i> View</button>`
                : '';

            return `
            <div class="item-card" id="course-card-${course.id}">
                <div class="item-card-top">
                    <div class="item-card-title">${course.title || 'Untitled Course'}</div>
                    <span class="badge-status blue">${course.level || 'General'}</span>
                </div>
                ${course.description ? `<p class="item-desc">${course.description}</p>` : ''}
                <div class="item-meta">
                    ${course.duration ? `<span class="meta-pill"><i class="fas fa-clock"></i> ${course.duration}</span>` : ''}
                    ${course.students ? `<span class="meta-pill"><i class="fas fa-users"></i> ${course.students}</span>` : ''}
                    ${course.link ? `<span class="meta-pill accent"><i class="fas fa-link"></i> Linked</span>` : ''}
                </div>
                ${priceHTML}
                <div class="action-row">
                    <button class="card-action-btn edit" onclick="window.editCourse('${course.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="card-action-btn delete" onclick="window.deleteCourse('${course.id}')"><i class="fas fa-trash"></i> Delete</button>
                    ${linkBtn}
                </div>
            </div>`;
        }).join('');
    }

    async function loadCourses() {
        const list = document.getElementById('coursesList');
        if (!list) return;

        try {
            courseList = await window.DAO.Courses.getAll();
            filteredCourses = [...courseList];

            // Update stats strip if present
            if (document.getElementById('totalCoursesCount')) {
                document.getElementById('totalCoursesCount').textContent = courseList.length;
            }
            if (document.getElementById('discountedCount')) {
                const discounted = courseList.filter(c => c.discountType && c.discountType !== 'none' && c.discountValue > 0);
                document.getElementById('discountedCount').textContent = discounted.length;
            }
            if (document.getElementById('avgFeeDisplay')) {
                if (courseList.length > 0 && typeof extractFeeValue === 'function') {
                    const total = courseList.reduce((sum, c) => sum + extractFeeValue(c.fee), 0);
                    const avg = Math.round(total / courseList.length);
                    document.getElementById('avgFeeDisplay').textContent = avg > 0 ? `৳${(avg/1000).toFixed(0)}k` : '—';
                } else {
                    document.getElementById('avgFeeDisplay').textContent = '—';
                }
            }

            renderCourseCards(filteredCourses);
        } catch (err) {
            console.error('Error loading courses', err);
            list.innerHTML = '<div class="empty-state"><p style="color:var(--error);">Failed to load courses.</p></div>';
        }
    }

    function filterCourses(query) {
        const q = (query || '').toLowerCase().trim();
        filteredCourses = q
            ? courseList.filter(c =>
                (c.title || '').toLowerCase().includes(q) ||
                (c.level || '').toLowerCase().includes(q) ||
                (c.description || '').toLowerCase().includes(q))
            : [...courseList];
        renderCourseCards(filteredCourses);
    }

    function editCourse(id) {
        const course = courseList.find(item => String(item.id) === String(id));
        if (!course) return;

        if (document.getElementById('courseId')) document.getElementById('courseId').value = course.id;
        if (document.getElementById('courseTitle')) document.getElementById('courseTitle').value = course.title || '';
        if (document.getElementById('courseLevel')) document.getElementById('courseLevel').value = course.level || '';
        if (document.getElementById('courseDuration')) document.getElementById('courseDuration').value = course.duration || '';
        if (document.getElementById('courseInitialDurationMonths')) document.getElementById('courseInitialDurationMonths').value = course.initialDurationMonths || 3;
        if (document.getElementById('courseMonthlyFee')) document.getElementById('courseMonthlyFee').value = course.monthlyFee !== undefined ? course.monthlyFee : 1000;
        if (document.getElementById('courseAdmissionFee')) document.getElementById('courseAdmissionFee').value = course.admissionFee !== undefined ? course.admissionFee : 1000;
        if (document.getElementById('courseBillingType')) document.getElementById('courseBillingType').value = course.billingType || 'monthly_recurring';
        if (document.getElementById('courseStudents')) document.getElementById('courseStudents').value = course.students || '';
        if (document.getElementById('courseFee')) document.getElementById('courseFee').value = course.fee || '';
        if (document.getElementById('courseDescription')) document.getElementById('courseDescription').value = course.description || '';
        if (document.getElementById('courseLink')) document.getElementById('courseLink').value = course.link || '';
        if (document.getElementById('courseDiscountType')) document.getElementById('courseDiscountType').value = course.discountType || 'none';
        if (document.getElementById('courseDiscountValue')) document.getElementById('courseDiscountValue').value = course.discountValue || '';

        if (document.getElementById('courseSubmitBtn')) {
            document.getElementById('courseSubmitBtn').innerHTML = '<i class="fas fa-check"></i> Update Course';
        }
        if (document.getElementById('formCardTitle')) {
            document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-edit"></i> Editing Course';
        }
        if (document.getElementById('formCancelBtn')) {
            document.getElementById('formCancelBtn').style.display = '';
        }

        updateDiscountPreview();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function deleteCourse(id) {
        openDeleteModal('Delete Course?', 'Are you sure you want to delete this course from the catalogue?', async () => {
            await window.DAO.Courses.delete(id);
            showToast('Course removed successfully!', 'success');
            loadCourses();
        });
    }

    /* ============================================================
       4. TESTIMONIALS
       ============================================================ */
    let testimonialsList = [];

    function resetTestimonialForm() {
        const form = document.getElementById('testimonialForm');
        if (form) form.reset();
        if (document.getElementById('testimonialId')) document.getElementById('testimonialId').value = '';
        if (document.getElementById('testimonialSubmitBtn')) {
            document.getElementById('testimonialSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Save Testimonial';
        }
        if (document.getElementById('formCardTitle')) {
            document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add Testimonial';
        }
        if (document.getElementById('formCancelBtn')) {
            document.getElementById('formCancelBtn').style.display = 'none';
        }
    }

    async function handleTestimonialForm(event) {
        event.preventDefault();
        const btn = document.getElementById('testimonialSubmitBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        const id = document.getElementById('testimonialId')?.value;
        const name = document.getElementById('testimonialName')?.value.trim() || '';
        const role = document.getElementById('testimonialRole')?.value.trim() || '';
        const text = document.getElementById('testimonialText')?.value.trim() || '';
        const avatar = document.getElementById('testimonialAvatar')?.value.trim() || '';

        if (!name || !text) {
            showToast('Name and testimonial text are required.', 'warning');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Testimonial';
            }
            return;
        }

        const item = {
            name,
            role: role || 'Student',
            text,
            avatar: avatar || name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        };

        try {
            if (id) {
                await window.DAO.Testimonials.update(id, item);
                showToast('Testimonial updated successfully!', 'success');
            } else {
                await window.DAO.Testimonials.add(item);
                showToast('Testimonial added successfully!', 'success');
            }
            resetTestimonialForm();
            loadTestimonials();
        } catch (err) {
            console.error('Error saving testimonial', err);
            showToast('Failed to save testimonial: ' + err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Testimonial';
            }
        }
    }

    async function loadTestimonials() {
        const list = document.getElementById('testimonialsList');
        if (!list) return;
        try {
            testimonialsList = await window.DAO.Testimonials.getAll();

            if (document.getElementById('testimonialsCountBadge')) {
                document.getElementById('testimonialsCountBadge').innerHTML = `<i class="fas fa-user-check"></i> ${testimonialsList.length} testimonial${testimonialsList.length !== 1 ? 's' : ''}`;
            }

            if (!testimonialsList.length) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-user-check"></i></div>
                        <h3>No Testimonials Yet</h3>
                        <p>Add your first student testimonial using the form on the left.</p>
                    </div>`;
                return;
            }

            list.innerHTML = testimonialsList.map(item => {
                const role = item.role || item.course || 'Student';
                const text = item.text || item.quote || 'Great experience studying Japanese.';
                const initials = item.avatar || (item.name ? item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST');
                return `
                <div class="item-card">
                    <div style="display:flex; gap:1rem; align-items:center; margin-bottom:0.75rem;">
                        <div class="author-avatar-wrap">${initials}</div>
                        <div>
                            <h3 class="item-card-title" style="margin:0;">${item.name}</h3>
                            <p style="color:var(--text-secondary); font-size:0.85rem; margin:0.15rem 0 0;">${role}</p>
                        </div>
                    </div>
                    <p class="item-desc">"${text}"</p>
                    <div class="action-row">
                        <button class="card-action-btn edit" onclick="window.editTestimonial('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
                        <button class="card-action-btn delete" onclick="window.deleteTestimonial('${item.id}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>`;
            }).join('');
        } catch (err) {
            console.error('Error loading testimonials', err);
            list.innerHTML = '<div class="empty-state"><p style="color:var(--error);">Failed to load testimonials.</p></div>';
        }
    }

    function editTestimonial(id) {
        const item = testimonialsList.find(e => String(e.id) === String(id));
        if (!item) return;

        if (document.getElementById('testimonialId')) document.getElementById('testimonialId').value = item.id;
        if (document.getElementById('testimonialName')) document.getElementById('testimonialName').value = item.name || '';
        if (document.getElementById('testimonialRole')) document.getElementById('testimonialRole').value = item.role || item.course || '';
        if (document.getElementById('testimonialText')) document.getElementById('testimonialText').value = item.text || item.quote || '';
        if (document.getElementById('testimonialAvatar')) document.getElementById('testimonialAvatar').value = item.avatar || '';

        if (document.getElementById('testimonialSubmitBtn')) {
            document.getElementById('testimonialSubmitBtn').innerHTML = '<i class="fas fa-check"></i> Update Testimonial';
        }
        if (document.getElementById('formCardTitle')) {
            document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-edit"></i> Editing Testimonial';
        }
        if (document.getElementById('formCancelBtn')) {
            document.getElementById('formCancelBtn').style.display = '';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function deleteTestimonial(id) {
        openDeleteModal('Delete Testimonial?', 'Are you sure you want to remove this testimonial?', async () => {
            await window.DAO.Testimonials.delete(id);
            showToast('Testimonial removed successfully!', 'success');
            loadTestimonials();
        });
    }

    /* ============================================================
       5. FAQS
       ============================================================ */
    let faqsList = [];

    function resetFaqForm() {
        const form = document.getElementById('faqForm');
        if (form) form.reset();
        if (document.getElementById('faqId')) document.getElementById('faqId').value = '';
        if (document.getElementById('faqSubmitBtn')) {
            document.getElementById('faqSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Save FAQ';
        }
        if (document.getElementById('formCardTitle')) {
            document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add New FAQ';
        }
        if (document.getElementById('formCancelBtn')) {
            document.getElementById('formCancelBtn').style.display = 'none';
        }
    }

    async function handleFaqForm(event) {
        event.preventDefault();
        const btn = document.getElementById('faqSubmitBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        const id = document.getElementById('faqId')?.value;
        const question = document.getElementById('faqQuestion')?.value.trim() || '';
        const answer = document.getElementById('faqAnswer')?.value.trim() || '';

        if (!question || !answer) {
            showToast('FAQ question and answer are required.', 'warning');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save FAQ';
            }
            return;
        }

        const item = { question, answer };
        try {
            if (id) {
                await window.DAO.Faqs.update(id, item);
                showToast('FAQ updated successfully!', 'success');
            } else {
                await window.DAO.Faqs.add(item);
                showToast('FAQ created successfully!', 'success');
            }
            resetFaqForm();
            loadFaqs();
        } catch (err) {
            console.error('Error saving FAQ', err);
            showToast('Failed to save FAQ: ' + err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save FAQ';
            }
        }
    }

    async function loadFaqs() {
        const list = document.getElementById('faqsList');
        if (!list) return;
        try {
            faqsList = await window.DAO.Faqs.getAll();

            if (document.getElementById('faqsCountBadge')) {
                document.getElementById('faqsCountBadge').innerHTML = `<i class="fas fa-question-circle"></i> ${faqsList.length} FAQ${faqsList.length !== 1 ? 's' : ''}`;
            }

            if (!faqsList.length) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-question-circle"></i></div>
                        <h3>No FAQs Added</h3>
                        <p>Create your first question and answer using the form on the left.</p>
                    </div>`;
                return;
            }

            list.innerHTML = faqsList.map(item => `
                <div class="item-card">
                    <div class="item-card-top">
                        <h3 class="item-card-title"><i class="fas fa-question-circle" style="color:var(--primary); margin-right:0.4rem;"></i> ${item.question}</h3>
                    </div>
                    <p class="item-desc" style="white-space:pre-line;">${item.answer}</p>
                    <div class="action-row">
                        <button class="card-action-btn edit" onclick="window.editFaq('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
                        <button class="card-action-btn delete" onclick="window.deleteFaq('${item.id}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>`).join('');
        } catch (err) {
            console.error('Error loading FAQs', err);
            list.innerHTML = '<div class="empty-state"><p style="color:var(--error);">Failed to load FAQs.</p></div>';
        }
    }

    function editFaq(id) {
        const item = faqsList.find(e => String(e.id) === String(id));
        if (!item) return;

        if (document.getElementById('faqId')) document.getElementById('faqId').value = item.id;
        if (document.getElementById('faqQuestion')) document.getElementById('faqQuestion').value = item.question || '';
        if (document.getElementById('faqAnswer')) document.getElementById('faqAnswer').value = item.answer || '';

        if (document.getElementById('faqSubmitBtn')) {
            document.getElementById('faqSubmitBtn').innerHTML = '<i class="fas fa-check"></i> Update FAQ';
        }
        if (document.getElementById('formCardTitle')) {
            document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-edit"></i> Editing FAQ';
        }
        if (document.getElementById('formCancelBtn')) {
            document.getElementById('formCancelBtn').style.display = '';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function deleteFaq(id) {
        openDeleteModal('Delete FAQ?', 'Are you sure you want to remove this FAQ item?', async () => {
            await window.DAO.Faqs.delete(id);
            showToast('FAQ deleted successfully!', 'success');
            loadFaqs();
        });
    }

    /* ============================================================
       6. CONTACT MESSAGES
       ============================================================ */
    async function loadContactMessages() {
        const list = document.getElementById('messagesList');
        if (!list) return;
        try {
            const items = await window.DAO.ContactMessages.getAll();

            if (document.getElementById('messagesCountBadge')) {
                document.getElementById('messagesCountBadge').innerHTML = `<i class="fas fa-envelope"></i> ${items.length} message${items.length !== 1 ? 's' : ''}`;
            }

            if (!items.length) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-inbox"></i></div>
                        <h3>Inbox Empty</h3>
                        <p>No contact messages submitted yet from the contact page.</p>
                    </div>`;
                return;
            }

            list.innerHTML = items.map(msg => {
                const dateStr = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : (msg.submittedAt ? new Date(msg.submittedAt).toLocaleString() : 'Recent');
                return `
                <div class="item-card">
                    <div class="item-card-top">
                        <div>
                            <h3 class="item-card-title" style="display:inline-block; margin-right:0.5rem;">${msg.name || 'Anonymous'}</h3>
                            <span class="badge-status blue">${msg.subject || 'General Inquiry'}</span>
                        </div>
                        <small style="color:var(--text-muted); font-size:0.8rem;"><i class="fas fa-calendar-alt"></i> ${dateStr}</small>
                    </div>
                    <div class="item-meta">
                        ${msg.email ? `<span class="meta-pill"><i class="fas fa-envelope"></i> <a href="mailto:${msg.email}" style="color:inherit; text-decoration:none;">${msg.email}</a></span>` : ''}
                        ${msg.phone ? `<span class="meta-pill"><i class="fas fa-phone"></i> <a href="tel:${msg.phone}" style="color:inherit; text-decoration:none;">${msg.phone}</a></span>` : ''}
                    </div>
                    <p class="item-desc" style="background:var(--bg); padding:0.9rem 1.1rem; border-radius:var(--radius-sm); border:1px solid var(--border);">${msg.message || 'No message text.'}</p>
                    <div class="action-row">
                        ${msg.email ? `<a class="card-action-btn view-link" href="mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject || 'Inquiry at Fusion Education BD')}"><i class="fas fa-reply"></i> Reply via Email</a>` : ''}
                        <button class="card-action-btn delete" onclick="window.deleteContactMessage('${msg.id}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>`;
            }).join('');
        } catch (err) {
            console.error('Error loading messages', err);
            list.innerHTML = '<div class="empty-state"><p style="color:var(--error);">Failed to load messages.</p></div>';
        }
    }

    function deleteContactMessage(id) {
        openDeleteModal('Delete Message?', 'Are you sure you want to delete this contact message?', async () => {
            await window.DAO.ContactMessages.delete(id);
            showToast('Message deleted successfully!', 'success');
            loadContactMessages();
            updateNavBadges();
        });
    }

    /* ============================================================
       7. STUDENT ADMISSIONS
       ============================================================ */
    async function loadAdmissions() {
        const list = document.getElementById('admissionsList');
        if (!list) return;
        try {
            const admissions = await window.DAO.Admissions.getAll();

            if (document.getElementById('admissionsCountBadge')) {
                document.getElementById('admissionsCountBadge').innerHTML = `<i class="fas fa-user-graduate"></i> ${admissions.length} application${admissions.length !== 1 ? 's' : ''}`;
            }

            if (!admissions.length) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-user-graduate"></i></div>
                        <h3>No Applications Yet</h3>
                        <p>Submitted admission forms from the website will appear here.</p>
                    </div>`;
                return;
            }

            list.innerHTML = admissions.map(item => {
                const dateStr = item.submittedAt ? new Date(item.submittedAt).toLocaleString() : (item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recent');
                const appNo = item.applicationNumber || item.id;
                return `
                <div class="item-card">
                    <div class="item-card-top">
                        <div>
                            <h3 class="item-card-title">${item.fullName || 'Applicant'}</h3>
                            <span class="badge-status green"><i class="fas fa-id-card"></i> ${appNo}</span>
                        </div>
                        <small style="color:var(--text-muted); font-size:0.8rem;"><i class="fas fa-clock"></i> ${dateStr}</small>
                    </div>
                    <div class="item-meta">
                        ${item.email ? `<span class="meta-pill"><i class="fas fa-envelope"></i> ${item.email}</span>` : ''}
                        ${item.phone ? `<span class="meta-pill"><i class="fas fa-phone"></i> ${item.phone}</span>` : ''}
                        ${item.course ? `<span class="meta-pill accent"><i class="fas fa-book"></i> ${item.course}</span>` : ''}
                        ${item.branch ? `<span class="meta-pill"><i class="fas fa-map-marker-alt"></i> ${item.branch}</span>` : ''}
                        ${item.visaType ? `<span class="meta-pill"><i class="fas fa-passport"></i> ${item.visaType}</span>` : ''}
                    </div>
                    ${item.comment ? `<p class="item-desc" style="background:var(--bg); padding:0.75rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border);"><strong>Comments:</strong> ${item.comment}</p>` : ''}
                    <div class="action-row">
                        ${item.photoUrl ? `<a class="card-action-btn view-link" href="${item.photoUrl}" target="_blank"><i class="fas fa-image"></i> View Photo</a>` : ''}
                        ${item.documentUrl ? `<a class="card-action-btn view-link" href="${item.documentUrl}" target="_blank"><i class="fas fa-file-pdf"></i> View Document</a>` : ''}
                        <button class="card-action-btn delete" onclick="window.deleteAdmission('${item.id}')"><i class="fas fa-trash"></i> Remove</button>
                    </div>
                </div>`;
            }).join('');
        } catch (err) {
            console.error('Error loading admissions', err);
            list.innerHTML = '<div class="empty-state"><p style="color:var(--error);">Failed to load admissions.</p></div>';
        }
    }

    function deleteAdmission(id) {
        openDeleteModal('Delete Application?', 'Are you sure you want to delete this student admission record?', async () => {
            await window.DAO.Admissions.delete(id);
            showToast('Admission application removed!', 'success');
            loadAdmissions();
            updateNavBadges();
        });
    }

    /* ============================================================
       8. ADMIN USER & AUTH SETTINGS
       ============================================================ */
    const DEFAULT_ADMIN_EMAIL = 'admin@fusioneducation.com';
    const DEFAULT_ADMIN_PASS = 'admin123';

    async function loadUserSettings() {
        const emailInput = document.getElementById('adminEmail');
        if (!emailInput) return;

        try {
            let adminEmail = DEFAULT_ADMIN_EMAIL;
            const local = localStorage.getItem('fusion_edu_adminUser');
            if (local) {
                const parsed = JSON.parse(local);
                if (parsed && parsed.email) adminEmail = parsed.email;
            }

            if (window.DAO && window.DAO.Settings) {
                const settings = await window.DAO.Settings.get();
                if (settings && settings.adminUser && settings.adminUser.email) {
                    adminEmail = settings.adminUser.email;
                }
            }

            emailInput.value = adminEmail;
        } catch (e) {
            emailInput.value = DEFAULT_ADMIN_EMAIL;
        }
    }

    async function saveUserSettings(event) {
        event.preventDefault();
        const email = document.getElementById('adminEmail')?.value.trim();
        const password = document.getElementById('adminPassword')?.value.trim();
        const confirmPass = document.getElementById('adminConfirmPassword')?.value.trim();

        if (!email) {
            showToast('Admin email is required.', 'warning');
            return;
        }

        if (password && password.length < 6) {
            showToast('Password must be at least 6 characters long.', 'warning');
            return;
        }

        if (confirmPass && password !== confirmPass) {
            showToast('Passwords do not match.', 'error');
            return;
        }

        const creds = { email, password: password || DEFAULT_ADMIN_PASS };
        localStorage.setItem('fusion_edu_adminUser', JSON.stringify(creds));

        try {
            if (window.DAO && window.DAO.Settings) {
                await window.DAO.Settings.save({ adminUser: creds });
            }
            showToast('Admin credentials updated successfully!', 'success');
            if (document.getElementById('adminPassword')) document.getElementById('adminPassword').value = '';
            if (document.getElementById('adminConfirmPassword')) document.getElementById('adminConfirmPassword').value = '';
        } catch (err) {
            console.error('Error saving user settings', err);
            showToast('Credentials saved locally.', 'success');
        }
    }

    function logoutAdmin(event) {
        if (event) event.preventDefault();
        sessionStorage.removeItem('fusion_admin_session');
        showToast('Logged out successfully', 'info');
        setTimeout(() => {
            window.location.href = '../pages/admin-login.html';
        }, 300);
    }

    /* ============================================================
       ADMISSIONS MANAGEMENT (Admission Pending vs Admitted Students - Read Only)
       ============================================================ */
    let currentAdmissionTab = 'pending';
    let allAdmissionsCache = [];

    // Check URL param on page load
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTab = urlParams.get('tab');
        if (urlTab === 'pending' || urlTab === 'admitted' || urlTab === 'all') {
            currentAdmissionTab = urlTab;
        }
    } catch (_) {}

    window.switchAdmissionTab = function(tab) {
        currentAdmissionTab = tab;

        // Update active tab buttons
        document.getElementById('tabBtnPending')?.classList.toggle('active', tab === 'pending');
        document.getElementById('tabBtnAdmitted')?.classList.toggle('active', tab === 'admitted');
        document.getElementById('tabBtnAll')?.classList.toggle('active', tab === 'all');

        // Update title
        const titleEl = document.getElementById('admissionsViewTitle');
        if (titleEl) {
            if (tab === 'pending') {
                titleEl.innerHTML = '<i class="fas fa-user-clock" style="color: #f59e0b;"></i> Admission Pending Applications';
            } else if (tab === 'admitted') {
                titleEl.innerHTML = '<i class="fas fa-user-check" style="color: #10b981;"></i> Admitted Students List';
            } else {
                titleEl.innerHTML = '<i class="fas fa-list-ul" style="color: var(--primary);"></i> All Admission Records';
            }
        }

        renderFilteredAdmissions();
    };

    window.handleAdmissionSearch = function() {
        renderFilteredAdmissions();
    };

    function renderFilteredAdmissions() {
        const container = document.getElementById('admissionsList');
        const badge = document.getElementById('admissionsCountBadge');
        if (!container) return;

        const searchTerm = (document.getElementById('admSearchInput')?.value || '').trim().toLowerCase();
        const branchFilter = (document.getElementById('admBranchFilter')?.value || 'all').toLowerCase();

        let filtered = allAdmissionsCache.filter(adm => {
            const status = (adm.status || 'pending').toLowerCase();
            const isAdmitted = status === 'admitted' || status === 'approved' || status === 'active';
            const isPending = !isAdmitted;

            // Tab filter
            if (currentAdmissionTab === 'pending' && !isPending) return false;
            if (currentAdmissionTab === 'admitted' && !isAdmitted) return false;

            // Branch filter
            if (branchFilter !== 'all') {
                const admBranch = (adm.branch || 'dinajpur').toLowerCase();
                if (!admBranch.includes(branchFilter)) return false;
            }

            // Search filter
            if (searchTerm) {
                const matchStr = `${adm.fullName || ''} ${adm.applicationNumber || ''} ${adm.id || ''} ${adm.email || ''} ${adm.phone || ''} ${adm.course || ''} ${adm.city || ''}`.toLowerCase();
                if (!matchStr.includes(searchTerm)) return false;
            }

            return true;
        });

        if (badge) {
            const label = currentAdmissionTab === 'pending' ? 'pending' : (currentAdmissionTab === 'admitted' ? 'admitted' : 'total');
            badge.innerHTML = `<i class="fas fa-user-graduate"></i> ${filtered.length} ${label} applications`;
        }

        if (!filtered.length) {
            container.innerHTML = `
                <div style="text-align:center; padding:3.5rem 1rem; color:var(--text-secondary);">
                    <i class="fas fa-folder-open" style="font-size:2.8rem; margin-bottom:1rem; opacity:0.35;"></i>
                    <h3 style="color:#cbd5e1; margin:0 0 0.5rem; font-size:1.1rem;">No ${currentAdmissionTab === 'pending' ? 'Pending Admission' : (currentAdmissionTab === 'admitted' ? 'Admitted' : '')} records found</h3>
                    <p style="margin:0; font-size:0.88rem;">${searchTerm || branchFilter !== 'all' ? 'Try adjusting your search query or branch filter.' : 'New applications will appear here automatically.'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(adm => {
            const photoSrc = adm.photoUrl || '../assets/images/student-placeholder.jpg';
            const dateStr = adm.submittedAt ? new Date(adm.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
            const branchStr = adm.branch ? (adm.branch.charAt(0).toUpperCase() + adm.branch.slice(1) + ' Branch') : 'Dinajpur Branch';
            const status = (adm.status || 'pending').toLowerCase();
            const isAdmitted = status === 'admitted' || status === 'approved' || status === 'active';

            const statusBadgeHtml = isAdmitted
                ? `<span class="badge" style="background:rgba(16,185,129,0.2); color:#6ee7b7; border:1px solid rgba(16,185,129,0.4);"><i class="fas fa-check-circle"></i> Admitted Student</span>`
                : `<span class="badge" style="background:rgba(245,158,11,0.2); color:#fcd34d; border:1px solid rgba(245,158,11,0.4);"><i class="fas fa-clock"></i> Admission Pending</span>`;

            // Documents list
            const docs = adm.documents || (adm.documentUrls ? adm.documentUrls.map((u, i) => ({ name: `Document ${i+1}`, url: u })) : (adm.documentUrl ? [{ name: 'Attached Document', url: adm.documentUrl }] : []));

            const docsHtml = docs.length > 0
                ? docs.map((d, i) => `
                    <a href="${d.url}" target="_blank" class="btn outline" style="font-size:0.75rem; padding:0.25rem 0.6rem; display:inline-flex; align-items:center; gap:0.35rem; margin-right:0.4rem; margin-top:0.35rem; text-decoration:none;">
                        <i class="fas fa-file-download" style="color:var(--primary);"></i> ${d.name || `Doc ${i+1}`}
                    </a>
                  `).join('')
                : '<span style="color:var(--text-secondary); font-size:0.8rem;">No documents</span>';

            const safeId = adm.id || adm.applicationNumber;

            return `
                <div class="item-card" style="display:flex; gap:1.25rem; align-items:flex-start; padding:1.35rem; background:rgba(255,255,255,0.02); border:1px solid var(--border-light); border-radius:16px; margin-bottom:1.1rem; flex-wrap:wrap;">
                    <img src="${photoSrc}" alt="Applicant Photo" style="width:75px; height:75px; border-radius:14px; object-fit:cover; border:2px solid ${isAdmitted ? '#10b981' : '#f59e0b'}; flex-shrink:0; background:#1e293b;">
                    <div style="flex:1; min-width:260px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.4rem;">
                            <div>
                                <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
                                    <h3 style="margin:0; font-size:1.18rem; color:#fff;">${adm.fullName || 'Student Name'}</h3>
                                    ${statusBadgeHtml}
                                </div>
                                <div style="margin-top:0.25rem;">
                                    <span style="font-size:0.82rem; color:var(--primary); font-weight:700; letter-spacing:0.02em;">${adm.applicationNumber || adm.id || 'FEBD-APP'}</span>
                                    <span style="color:var(--text-secondary); font-size:0.78rem; margin-left:0.5rem;">• Submitted: ${dateStr}</span>
                                </div>
                            </div>
                            <span class="badge" style="background:rgba(37,99,235,0.2); color:#93c5fd; font-size:0.75rem; padding:0.25rem 0.65rem;">${branchStr}</span>
                        </div>
                        
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:0.5rem; font-size:0.85rem; color:var(--text-secondary); margin:0.85rem 0;">
                            <div><i class="fas fa-book" style="color:var(--primary); width:16px;"></i> <strong>Course:</strong> ${adm.course || 'N/A'} ${adm.courseLevel ? `(${adm.courseLevel})` : ''}</div>
                            <div><i class="fas fa-envelope" style="color:var(--primary); width:16px;"></i> <strong>Email:</strong> ${adm.email || 'N/A'}</div>
                            <div><i class="fas fa-phone" style="color:var(--primary); width:16px;"></i> <strong>Phone:</strong> ${adm.phone || 'N/A'}</div>
                            <div><i class="fas fa-passport" style="color:var(--primary); width:16px;"></i> <strong>Visa:</strong> ${adm.visaType ? adm.visaType.toUpperCase() : 'N/A'}</div>
                            <div><i class="fas fa-map-marker-alt" style="color:var(--primary); width:16px;"></i> <strong>Location:</strong> ${adm.city || ''}${adm.district ? ', ' + adm.district : ''}</div>
                            <div><i class="fas fa-user-shield" style="color:var(--primary); width:16px;"></i> <strong>Emergency:</strong> ${adm.emergencyName || 'N/A'} (${adm.emergencyPhone || ''})</div>
                        </div>

                        <div style="margin-top:0.85rem; padding-top:0.85rem; border-top:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
                            <div style="display:flex; align-items:center; flex-wrap:wrap;">
                                <strong style="font-size:0.8rem; color:#fff; margin-right:0.5rem;"><i class="fas fa-paperclip"></i> Documents (${docs.length}):</strong>
                                ${docsHtml}
                            </div>
                            
                            <!-- Admin Actions (View & Delete only - Staff handles Edit) -->
                            <div style="display:flex; gap:0.5rem; align-items:center;">
                                <button type="button" class="btn outline" onclick="openAdminViewModal('${safeId}')" style="font-size:0.78rem; padding:0.4rem 0.85rem; background:rgba(37,99,235,0.12); color:#93c5fd; border-color:rgba(37,99,235,0.35);">
                                    <i class="fas fa-eye"></i> View Profile
                                </button>
                                <button type="button" class="btn danger" onclick="deleteAdmission('${safeId}')" style="font-size:0.78rem; padding:0.4rem 0.75rem;">
                                    <i class="fas fa-trash-alt"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function loadAdmissions() {
        const container = document.getElementById('admissionsList');
        if (!container) return;

        try {
            const data = await window.DAO.Admissions.getAll();
            allAdmissionsCache = Array.isArray(data) ? data : [];

            // Compute counts
            let pendingCount = 0;
            let admittedCount = 0;

            allAdmissionsCache.forEach(adm => {
                const status = (adm.status || 'pending').toLowerCase();
                if (status === 'admitted' || status === 'approved' || status === 'active') {
                    admittedCount++;
                } else {
                    pendingCount++;
                }
            });

            // Update badge counts in UI
            if (document.getElementById('tabPendingBadge')) document.getElementById('tabPendingBadge').textContent = pendingCount;
            if (document.getElementById('tabAdmittedBadge')) document.getElementById('tabAdmittedBadge').textContent = admittedCount;
            if (document.getElementById('tabAllBadge')) document.getElementById('tabAllBadge').textContent = allAdmissionsCache.length;

            if (document.getElementById('navPendingCount')) document.getElementById('navPendingCount').textContent = pendingCount;
            if (document.getElementById('navAdmittedCount')) document.getElementById('navAdmittedCount').textContent = admittedCount;
            if (document.getElementById('navAdmCount')) document.getElementById('navAdmCount').textContent = allAdmissionsCache.length;

            // Highlight nav pills
            if (currentAdmissionTab === 'pending') {
                document.getElementById('navPendingPill')?.classList.add('active');
                document.getElementById('navAdmittedPill')?.classList.remove('active');
            } else if (currentAdmissionTab === 'admitted') {
                document.getElementById('navAdmittedPill')?.classList.add('active');
                document.getElementById('navPendingPill')?.classList.remove('active');
            }

            renderFilteredAdmissions();

        } catch (err) {
            console.error('[Admin] Error loading admissions:', err);
            container.innerHTML = '<p class="error-msg">Failed to load admissions.</p>';
        }
    }

    // Modal helpers
    let currentModalStudent = null;

    window.openAdminViewModal = function(id) {
        const student = allAdmissionsCache.find(a => String(a.id) === String(id) || String(a.applicationNumber) === String(id) || String(a.applicationId) === String(id));
        if (!student) return;

        currentModalStudent = student;
        const modal = document.getElementById('adminViewModal');
        const modalBody = document.getElementById('adminModalBody');
        const nameEl = document.getElementById('modalStudentName');
        const badgeEl = document.getElementById('modalHeaderStatusBadge');

        const status = (student.status || 'pending').toLowerCase();
        const isAdmitted = status === 'admitted' || status === 'approved' || status === 'active';

        if (nameEl) nameEl.textContent = student.fullName || 'Student Profile';
        if (badgeEl) {
            badgeEl.className = isAdmitted ? 'badge badge-success' : 'badge badge-warning';
            badgeEl.style.background = isAdmitted ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)';
            badgeEl.style.color = isAdmitted ? '#6ee7b7' : '#fcd34d';
            badgeEl.innerHTML = isAdmitted ? '<i class="fas fa-check-circle"></i> Admitted Student' : '<i class="fas fa-clock"></i> Admission Pending';
        }

        const photoSrc = student.photoUrl || '../assets/images/student-placeholder.jpg';
        const docs = student.documents || (student.documentUrls ? student.documentUrls.map((u, i) => ({ name: `Document ${i+1}`, url: u })) : (student.documentUrl ? [{ name: 'Attached Document', url: student.documentUrl }] : []));

        const docsHtml = docs.length > 0
            ? docs.map((d, i) => `
                <a href="${d.url}" target="_blank" style="display:inline-flex; align-items:center; gap:0.5rem; background:rgba(37,99,235,0.15); border:1px solid rgba(37,99,235,0.3); color:#93c5fd; padding:0.4rem 0.75rem; border-radius:8px; text-decoration:none; font-size:0.85rem; margin-right:0.5rem; margin-top:0.4rem;">
                    <i class="fas fa-file-download"></i> ${d.name || `Document ${i+1}`}
                </a>
              `).join('')
            : '<span style="color:var(--text-secondary); font-size:0.88rem;">No documents uploaded.</span>';

        if (modalBody) {
            modalBody.innerHTML = `
                <div style="display:flex; gap:1.5rem; align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap;">
                    <img src="${photoSrc}" alt="Photo" style="width:100px; height:100px; border-radius:18px; object-fit:cover; border:2px solid var(--primary); background:#1e293b;">
                    <div style="flex:1; min-width:240px;">
                        <h3 style="margin:0 0 0.25rem; font-size:1.35rem; color:#fff;">${student.fullName || 'Student Name'}</h3>
                        <p style="margin:0 0 0.5rem; color:var(--primary); font-weight:700; font-size:0.95rem;">Application Number: ${student.applicationNumber || student.id || 'N/A'}</p>
                        <p style="margin:0; color:var(--text-secondary); font-size:0.85rem;">Branch: <strong>${student.branch ? (student.branch.toUpperCase() + ' Branch') : 'Dinajpur Branch'}</strong> • Applied: <strong>${student.submittedAt ? new Date(student.submittedAt).toLocaleDateString('en-GB') : 'Recent'}</strong></p>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1rem; background:rgba(255,255,255,0.02); padding:1.25rem; border-radius:14px; border:1px solid var(--border-light); margin-bottom:1.25rem;">
                    <div><span style="color:var(--text-secondary); font-size:0.8rem; display:block;">EMAIL</span><strong>${student.email || 'N/A'}</strong></div>
                    <div><span style="color:var(--text-secondary); font-size:0.8rem; display:block;">PHONE</span><strong>${student.phone || 'N/A'}</strong></div>
                    <div><span style="color:var(--text-secondary); font-size:0.8rem; display:block;">DATE OF BIRTH</span><strong>${student.dateOfBirth || 'N/A'} (${student.gender || 'N/A'})</strong></div>
                    <div><span style="color:var(--text-secondary); font-size:0.8rem; display:block;">LOCATION</span><strong>${student.city || ''}${student.district ? ', ' + student.district : ''}</strong></div>
                    <div><span style="color:var(--text-secondary); font-size:0.8rem; display:block;">COURSE APPLIED</span><strong>${student.course || 'N/A'} ${student.courseLevel ? `(${student.courseLevel})` : ''}</strong></div>
                    <div><span style="color:var(--text-secondary); font-size:0.8rem; display:block;">VISA TYPE</span><strong>${student.visaType ? student.visaType.toUpperCase() : 'N/A'}</strong></div>
                    <div><span style="color:var(--text-secondary); font-size:0.8rem; display:block;">HIGHEST EDUCATION</span><strong>${student.highestEducation ? student.highestEducation.toUpperCase() : 'N/A'}</strong></div>
                    <div><span style="color:var(--text-secondary); font-size:0.8rem; display:block;">EMERGENCY CONTACT</span><strong>${student.emergencyName || 'N/A'} (${student.emergencyPhone || ''})</strong></div>
                </div>

                <div style="margin-bottom:1.25rem;">
                    <h4 style="margin:0 0 0.5rem; color:#cbd5e1; font-size:0.95rem;"><i class="fas fa-paperclip"></i> Uploaded Documents (${docs.length})</h4>
                    <div>${docsHtml}</div>
                </div>

                ${student.comment ? `
                    <div style="background:rgba(255,255,255,0.02); padding:1rem; border-radius:10px; border:1px solid var(--border-light); margin-bottom:1.25rem;">
                        <span style="color:var(--text-secondary); font-size:0.8rem; display:block;">STUDENT COMMENTS / NOTES</span>
                        <p style="margin:0.25rem 0 0; color:#e2e8f0; font-size:0.9rem;">${student.comment}</p>
                    </div>
                ` : ''}

                <div style="background:rgba(56,189,248,0.06); padding:0.85rem; border-radius:10px; border:1px solid rgba(56,189,248,0.2); font-size:0.82rem; color:#bae6fd;">
                    <i class="fas fa-lock"></i> <strong>Read-Only View:</strong> To edit student records or update status to Admitted, please access the <strong>Staff Dashboard</strong>.
                </div>
            `;
        }

        modal?.classList.add('open');
    };

    window.closeAdminModal = function() {
        document.getElementById('adminViewModal')?.classList.remove('open');
        currentModalStudent = null;
    };

    window.printModalContent = function() {
        if (!currentModalStudent) return;
        window.print();
    };

    async function deleteAdmission(id) {
        if (!confirm('Are you sure you want to delete this admission application?')) return;
        try {
            await window.DAO.Admissions.delete(id);
            showToast('Admission application deleted.', 'success');
            loadAdmissions();
        } catch (e) {
            showToast('Failed to delete application.', 'error');
        }
    }

    /* ============================================================
       INIT & EVENT LISTENERS
       ============================================================ */
    function initAllAdminForms() {
        document.getElementById('settingsForm')?.addEventListener('submit', saveSettings);
        document.getElementById('postForm')?.addEventListener('submit', handlePostForm);
        document.getElementById('courseForm')?.addEventListener('submit', handleCourseForm);
        document.getElementById('testimonialForm')?.addEventListener('submit', handleTestimonialForm);
        document.getElementById('faqForm')?.addEventListener('submit', handleFaqForm);
        document.getElementById('userForm')?.addEventListener('submit', saveUserSettings);
    }

    function initializeAdminPanel() {
        initAllAdminForms();
        loadSettings();
        loadPosts();
        loadCourses();
        loadTestimonials();
        loadFaqs();
        loadContactMessages();
        loadAdmissions();
        loadUserSettings();
        updateNavBadges();
    }

    // Expose all necessary functions to global window for inline onclick/onchange handlers
    window.showToast = showToast;
    window.showSuccess = showSuccess;
    window.previewImage = previewImage;
    window.openDeleteModal = openDeleteModal;
    window.closeDeleteModal = closeDeleteModal;

    window.resetPostForm = resetPostForm;
    window.editPost = editPost;
    window.deletePost = deletePost;

    window.resetCourseForm = resetCourseForm;
    window.editCourse = editCourse;
    window.deleteCourse = deleteCourse;
    window.filterCourses = filterCourses;
    window.updateDiscountPreview = updateDiscountPreview;

    window.resetTestimonialForm = resetTestimonialForm;
    window.editTestimonial = editTestimonial;
    window.deleteTestimonial = deleteTestimonial;

    window.resetFaqForm = resetFaqForm;
    window.editFaq = editFaq;
    window.deleteFaq = deleteFaq;

    window.deleteContactMessage = deleteContactMessage;
    window.deleteAdmission = deleteAdmission;
    window.logoutAdmin = logoutAdmin;

    // Run automatically on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAdminPanel);
    } else {
        initializeAdminPanel();
    }

})();
