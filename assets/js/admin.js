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

    function selectTheme(themeId, triggerToast = false) {
        const themeInput = document.getElementById('themeInput');
        if (themeInput) themeInput.value = themeId;
        
        document.querySelectorAll('.theme-option-card').forEach(card => {
            if (card.getAttribute('data-theme') === themeId) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
        
        try {
            localStorage.setItem('fusion_selected_theme', themeId);
        } catch (_) {}

        if (triggerToast) {
            showToast('নকশা মডেল নির্বাচিত হয়েছে। সেভ করতে নিচে "Save Site Settings" বাটনে ক্লিক করুন।', 'info');
        }
    }
    window.selectTheme = selectTheme;

    async function loadSettings() {
        if (!document.getElementById('heroTitleInput') && !document.getElementById('themeInput')) return;
        try {
            const data = await window.DAO.Settings.get();
            const brandColors = data.brandColors || { fusionColor: '#FFFFFF', educationColor: '#00AEEF' };
            const hero = data.hero || {};
            const contactInfo = data.contactInfo || {};
            const socialLinks = data.socialLinks || {};

            const currentTheme = data.theme || 'theme-dark-mandala';
            selectTheme(currentTheme, false);

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
                theme: document.getElementById('themeInput')?.value || 'theme-dark-mandala',
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
            try {
                localStorage.setItem('fusion_selected_theme', data.theme);
            } catch (_) {}
            showToast('Site settings & theme saved successfully!', 'success');
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

    window.syncDurationText = function(val) {
        const textInput = document.getElementById('courseDuration');
        if (textInput && val) {
            textInput.value = `${val} Month${parseInt(val, 10) > 1 ? 's' : ''}`;
        }
    };

    async function populateCourseBranchDropdown() {
        const select = document.getElementById('courseDiscountBranch');
        if (!select) return;
        try {
            let branches = [];
            if (window.DAO && window.DAO.Branches) {
                branches = await window.DAO.Branches.getAll();
            }
            if (!branches || !branches.length) {
                branches = await fetch('../data/branches.json').then(r => r.ok ? r.json() : []).catch(() => []);
            }
            if (Array.isArray(branches) && branches.length) {
                const curVal = select.value || 'all';
                select.innerHTML = '<option value="all">All Branches (সকল ব্রাঞ্চ)</option>' +
                    branches.map(b => `<option value="${b.name || b.displayName || b.id}">${b.displayName || b.name || b.id} Branch</option>`).join('');
                select.value = curVal;
            }
        } catch (err) {
            console.warn('[admin] populateCourseBranchDropdown note:', err.message);
        }
    }

    window.toggleMonthlyEventFields = function() {
        const enabled = document.getElementById('courseMonthlyEventEnabled')?.checked;
        const fields = document.getElementById('monthlyEventFields');
        if (fields) {
            fields.style.display = enabled ? 'block' : 'none';
        }
        if (typeof updateCoursePricePreview === 'function') {
            updateCoursePricePreview();
        }
    };

    window.updateCoursePricePreview = function() {
        const rawRegularFee = document.getElementById('courseRegularFee')?.value || '0';
        const regularFee = typeof extractFeeValue === 'function' 
            ? extractFeeValue(rawRegularFee) 
            : (parseFloat(String(rawRegularFee).replace(/[^\d.]/g, '')) || 0);
        const dtype = document.getElementById('courseDiscountType')?.value || 'none';
        const dval = parseFloat(document.getElementById('courseDiscountValue')?.value || '0');
        const dEnd = document.getElementById('courseDiscountEndDate')?.value;
        const preview = document.getElementById('discountPreview');
        const finalPriceEl = document.getElementById('previewFinalPrice');
        const origPriceEl = document.getElementById('previewOriginalPrice');
        const savingEl = document.getElementById('previewSaving');
        const branchVal = document.getElementById('courseDiscountBranch')?.value || 'all';
        const branchText = document.getElementById('courseDiscountBranch')?.selectedOptions?.[0]?.text || 'All Branches';
        const branchPreviewEl = document.getElementById('previewDiscountBranch');

        if (!preview) return;

        if (!regularFee || regularFee <= 0) {
            if (finalPriceEl) finalPriceEl.textContent = '৳ 0';
            if (origPriceEl) origPriceEl.style.display = 'none';
            if (savingEl) savingEl.style.display = 'none';
            if (branchPreviewEl) branchPreviewEl.style.display = 'none';
            return;
        }

        // Check if discount is expired
        let isExpired = false;
        if (dEnd && typeof isEventActive === 'function' && !isEventActive(dEnd)) {
            isExpired = true;
        }

        const isMonthlyOn = Boolean(document.getElementById('courseMonthlyEventEnabled')?.checked);
        const mFeeInput = parseFloat(document.getElementById('courseMonthlyFee')?.value || '1000') || 1000;
        const admFeeInput = parseFloat(document.getElementById('courseAdmissionFee')?.value || '0') || 0;

        const info = (!isExpired && dtype !== 'none' && dval > 0)
            ? calculateDiscount(regularFee, dtype, dval)
            : { hasDiscount: false, finalPrice: regularFee, originalPrice: regularFee, discountAmount: 0, discountPercent: 0 };

        if (info.hasDiscount) {
            if (finalPriceEl) finalPriceEl.textContent = formatCurrency(info.finalPrice);
            if (origPriceEl) {
                origPriceEl.textContent = formatCurrency(info.originalPrice);
                origPriceEl.style.display = 'inline';
            }
            if (savingEl) {
                savingEl.textContent = `You save ${formatCurrency(info.discountAmount)} (${info.discountPercent}%) on Full Course`;
                savingEl.style.display = 'block';
            }
            if (branchPreviewEl) {
                branchPreviewEl.innerHTML = branchVal === 'all'
                    ? '<i class="fas fa-globe" style="color:#38bdf8;"></i> Applicable: <strong>All Branches</strong>'
                    : `<i class="fas fa-map-marker-alt" style="color:#f59e0b;"></i> Applicable: <strong>${branchText}</strong>`;
                branchPreviewEl.style.display = 'block';
            }
        } else if (isMonthlyOn) {
            if (finalPriceEl) finalPriceEl.textContent = `৳ ${mFeeInput.toLocaleString()} / month`;
            if (origPriceEl) {
                origPriceEl.textContent = formatCurrency(regularFee);
                origPriceEl.style.display = 'inline';
            }
            if (savingEl) {
                savingEl.textContent = `🔥 Monthly Offer: ৳${mFeeInput.toLocaleString()}/mo ${admFeeInput > 0 ? `(Admission Fee: ৳${admFeeInput})` : '(No Admission Fee)'}`;
                savingEl.style.display = 'block';
            }
            if (branchPreviewEl) branchPreviewEl.style.display = 'none';
        } else {
            if (finalPriceEl) finalPriceEl.textContent = formatCurrency(regularFee);
            if (origPriceEl) origPriceEl.style.display = 'none';
            if (branchPreviewEl) branchPreviewEl.style.display = 'none';
            if (savingEl) {
                if (isExpired) {
                    savingEl.textContent = 'Discount offer expired';
                    savingEl.style.display = 'block';
                } else {
                    savingEl.textContent = '';
                    savingEl.style.display = 'none';
                }
            }
        }
    };

    // Alias for backward-compatibility
    window.updateDiscountPreview = window.updateCoursePricePreview;

    window.formatRegularFeeInput = function(input) {
        if (!input || !input.value) return;
        const val = typeof extractFeeValue === 'function' 
            ? extractFeeValue(input.value) 
            : parseFloat(String(input.value).replace(/[^\d.]/g, ''));
        if (val && !isNaN(val) && val > 0) {
            input.value = formatCurrency(val);
        }
        window.updateCoursePricePreview();
    };

    function resetCourseForm() {
        const form = document.getElementById('courseForm');
        if (form) form.reset();
        if (document.getElementById('courseId')) document.getElementById('courseId').value = '';
        if (document.getElementById('courseRegularFee')) document.getElementById('courseRegularFee').value = '৳ 15,000';
        if (document.getElementById('courseDiscountType')) document.getElementById('courseDiscountType').value = 'none';
        if (document.getElementById('courseDiscountValue')) document.getElementById('courseDiscountValue').value = '';
        if (document.getElementById('courseDiscountBranch')) document.getElementById('courseDiscountBranch').value = 'all';
        if (document.getElementById('courseDiscountEndDate')) document.getElementById('courseDiscountEndDate').value = '';
        if (document.getElementById('courseMonthlyEventEnabled')) document.getElementById('courseMonthlyEventEnabled').checked = false;
        if (document.getElementById('courseMonthlyEventTitle')) document.getElementById('courseMonthlyEventTitle').value = '';
        if (document.getElementById('courseMonthlyFee')) document.getElementById('courseMonthlyFee').value = '1500';
        if (document.getElementById('courseAdmissionFee')) document.getElementById('courseAdmissionFee').value = '1000';
        if (document.getElementById('courseMonthlyEventEndDate')) document.getElementById('courseMonthlyEventEndDate').value = '';
        if (document.getElementById('monthlyEventFields')) document.getElementById('monthlyEventFields').style.display = 'none';
        if (document.getElementById('courseInitialDurationMonths')) document.getElementById('courseInitialDurationMonths').value = '3';

        if (document.getElementById('courseSubmitBtn')) {
            document.getElementById('courseSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Save Course';
        }
        if (document.getElementById('formCardTitle')) {
            document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add New Course';
        }
        if (document.getElementById('formCancelBtn')) {
            document.getElementById('formCancelBtn').style.display = 'none';
        }
        updateCoursePricePreview();
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
        const initialDurationMonths = parseInt(document.getElementById('courseInitialDurationMonths')?.value || '3', 10);
        const duration = document.getElementById('courseDuration')?.value.trim() || `${initialDurationMonths} Months`;
        const rawRegularFee = document.getElementById('courseRegularFee')?.value || '15000';
        const regularFee = typeof extractFeeValue === 'function' 
            ? extractFeeValue(rawRegularFee) 
            : (parseFloat(String(rawRegularFee).replace(/[^\d.]/g, '')) || 15000);
        const discountType = document.getElementById('courseDiscountType')?.value || 'none';
        const discountValue = parseFloat(document.getElementById('courseDiscountValue')?.value || '0');
        const discountBranch = document.getElementById('courseDiscountBranch')?.value || 'all';
        const discountEndDate = document.getElementById('courseDiscountEndDate')?.value;

        const monthlyEventEnabled = Boolean(document.getElementById('courseMonthlyEventEnabled')?.checked);
        const monthlyEventTitle = document.getElementById('courseMonthlyEventTitle')?.value.trim() || 'Limited Intake: Monthly Tuition Offer';
        const monthlyFee = parseFloat(document.getElementById('courseMonthlyFee')?.value || '1500');
        const admissionFee = parseFloat(document.getElementById('courseAdmissionFee')?.value || '1000');
        const monthlyEventEndDate = document.getElementById('courseMonthlyEventEndDate')?.value;

        const students = document.getElementById('courseStudents')?.value.trim() || '20 per batch';
        const link = document.getElementById('courseLink')?.value.trim() || 'pages/admission.html';
        const description = document.getElementById('courseDescription')?.value.trim() || '';

        if (!title || !level) {
            showToast('Course title and level are required.', 'warning');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Course';
            }
            return;
        }

        const feeFormatted = `৳ ${regularFee.toLocaleString()}`;
        const course = {
            title,
            level,
            duration,
            initialDurationMonths,
            durationMonths: initialDurationMonths,
            regularFee,
            monthlyFee,
            admissionFee,
            billingType: 'course_fee',
            fee: feeFormatted,
            totalInitialFee: feeFormatted,
            students,
            link,
            description,
            discountType,
            discountValue: discountValue || 0,
            discountBranch: discountBranch || 'all',
            discountEndDate: discountEndDate ? new Date(discountEndDate).toISOString() : null,
            monthlyEvent: {
                enabled: monthlyEventEnabled,
                eventTitle: monthlyEventTitle,
                monthlyFee,
                admissionFee,
                endDate: monthlyEventEndDate ? new Date(monthlyEventEndDate).toISOString() : null
            },
            updatedAt: new Date().toISOString()
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
            const pricing = typeof getCoursePricing === 'function' ? getCoursePricing(course) : null;
            let priceHTML = '';

            if (pricing && pricing.hasDiscount && typeof formatCurrency === 'function') {
                const discountLabel = course.discountType === 'percentage'
                    ? `${course.discountValue}% OFF`
                    : `৳${Number(course.discountValue).toLocaleString()} OFF`;
                const branchNote = course.discountBranch && course.discountBranch !== 'all'
                    ? `<span class="discount-chip" style="background:rgba(56,189,248,0.15); color:#38bdf8; border-color:rgba(56,189,248,0.3);"><i class="fas fa-map-marker-alt"></i> ${course.discountBranch}</span>`
                    : '';
                priceHTML = `
                    <div class="course-card-price">
                        <span class="price-final">${formatCurrency(pricing.finalCourseFee)}</span>
                        <span class="price-original">${formatCurrency(pricing.regularFee)}</span>
                        <span class="discount-chip"><i class="fas fa-tag"></i> ${discountLabel}</span>
                        ${branchNote}
                    </div>`;
            } else {
                const regFee = pricing ? pricing.regularFee : (extractFeeValue(course.fee) || 15000);
                priceHTML = `
                    <div class="course-card-price">
                        <span class="price-final">${typeof formatCurrency === 'function' ? formatCurrency(regFee) : `৳ ${regFee.toLocaleString()}`}</span>
                        <span style="font-size:0.75rem; color:#94a3b8; font-weight:500;">(Full Course Fee)</span>
                    </div>`;
            }

            // Monthly Event Badge & Countdown
            let eventHTML = '';
            if (pricing && pricing.monthlyEvent && pricing.monthlyEvent.enabled) {
                if (pricing.monthlyEvent.isActive && pricing.monthlyEvent.endDate) {
                    eventHTML = `
                        <div class="live-event-card-strip" data-countdown-end="${pricing.monthlyEvent.endDate}" style="margin: 0.65rem 0; background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.08)); border: 1px solid rgba(245,158,11,0.35); border-radius: 8px; padding: 0.45rem 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem;">
                            <div style="font-size: 0.78rem; font-weight: 700; color: #f59e0b; display:flex; align-items:center; gap:0.35rem;">
                                <i class="fas fa-fire fa-beat"></i>
                                <span>Monthly Pay: ৳${pricing.monthlyEvent.monthlyFee.toLocaleString()}/mo</span>
                            </div>
                            <span class="countdown-display" style="font-size: 0.75rem; font-weight: 800; color: #fbbf24; background: rgba(0,0,0,0.3); padding: 0.15rem 0.45rem; border-radius: 4px;">
                                <i class="fas fa-clock"></i> <span class="countdown-text">${pricing.monthlyEvent.remainingText || ''}</span>
                            </span>
                        </div>
                    `;
                } else {
                    eventHTML = `
                        <div style="margin: 0.5rem 0; font-size: 0.75rem; color: #94a3b8;">
                            <i class="fas fa-history"></i> Monthly Pay Event ended
                        </div>
                    `;
                }
            }

            let targetUrl = '';
            if (course.link && course.link.trim()) {
                targetUrl = course.link.trim();
                if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('/')) {
                    targetUrl = '/' + targetUrl;
                }
            }

            const linkBtn = targetUrl
                ? `<a class="card-action-btn view-link" href="${targetUrl}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> View</a>`
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
                ${eventHTML}
                <div class="action-row">
                    <button class="card-action-btn edit" onclick="window.editCourse('${course.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="card-action-btn delete" onclick="window.deleteCourse('${course.id}')"><i class="fas fa-trash"></i> Delete</button>
                    ${linkBtn}
                </div>
            </div>`;
        }).join('');

        if (typeof initLiveCountdowns === 'function') {
            initLiveCountdowns();
        }
    }

    async function loadCourses() {
        const list = document.getElementById('coursesList');
        if (!list) return;

        try {
            await populateCourseBranchDropdown();
            courseList = await window.DAO.Courses.getAll();
            filteredCourses = [...courseList];

            // Update stats strip if present
            if (document.getElementById('totalCoursesCount')) {
                document.getElementById('totalCoursesCount').textContent = courseList.length;
            }
            if (document.getElementById('discountedCount')) {
                const discounted = courseList.filter(c => {
                    const pricing = typeof getCoursePricing === 'function' ? getCoursePricing(c) : null;
                    return pricing ? pricing.hasDiscount : (c.discountType && c.discountType !== 'none' && c.discountValue > 0);
                });
                document.getElementById('discountedCount').textContent = discounted.length;
            }
            if (document.getElementById('avgFeeDisplay')) {
                if (courseList.length > 0) {
                    const total = courseList.reduce((sum, c) => {
                        const pricing = typeof getCoursePricing === 'function' ? getCoursePricing(c) : null;
                        return sum + (pricing ? pricing.regularFee : (extractFeeValue(c.fee) || 15000));
                    }, 0);
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
        if (document.getElementById('courseInitialDurationMonths')) {
            document.getElementById('courseInitialDurationMonths').value = course.durationMonths || course.initialDurationMonths || 3;
        }

        const regularFee = course.regularFee !== undefined ? course.regularFee : (extractFeeValue(course.fee) || 15000);
        if (document.getElementById('courseRegularFee')) {
            document.getElementById('courseRegularFee').value = formatCurrency(regularFee);
        }
        if (document.getElementById('courseDiscountType')) document.getElementById('courseDiscountType').value = course.discountType || 'none';
        if (document.getElementById('courseDiscountValue')) document.getElementById('courseDiscountValue').value = course.discountValue || '';
        if (document.getElementById('courseDiscountBranch')) document.getElementById('courseDiscountBranch').value = course.discountBranch || 'all';
        
        // Format ISO date to YYYY-MM-DDTHH:mm for datetime-local input
        const formatInputDate = d => {
            if (!d) return '';
            try {
                const date = new Date(d);
                if (isNaN(date.getTime())) return '';
                const tzOffset = date.getTimezoneOffset() * 60000;
                return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
            } catch (_) { return ''; }
        };

        if (document.getElementById('courseDiscountEndDate')) {
            document.getElementById('courseDiscountEndDate').value = formatInputDate(course.discountEndDate);
        }

        // Monthly Event
        const monthlyEvent = course.monthlyEvent || {};
        const isEventOn = Boolean(monthlyEvent.enabled);
        if (document.getElementById('courseMonthlyEventEnabled')) {
            document.getElementById('courseMonthlyEventEnabled').checked = isEventOn;
        }
        if (document.getElementById('courseMonthlyEventTitle')) {
            document.getElementById('courseMonthlyEventTitle').value = monthlyEvent.eventTitle || '';
        }
        if (document.getElementById('courseMonthlyFee')) {
            document.getElementById('courseMonthlyFee').value = monthlyEvent.monthlyFee !== undefined ? monthlyEvent.monthlyFee : (course.monthlyFee !== undefined ? course.monthlyFee : 1500);
        }
        if (document.getElementById('courseAdmissionFee')) {
            document.getElementById('courseAdmissionFee').value = monthlyEvent.admissionFee !== undefined ? monthlyEvent.admissionFee : (course.admissionFee !== undefined ? course.admissionFee : 1000);
        }
        if (document.getElementById('courseMonthlyEventEndDate')) {
            document.getElementById('courseMonthlyEventEndDate').value = formatInputDate(monthlyEvent.endDate);
        }

        toggleMonthlyEventFields();

        if (document.getElementById('courseStudents')) document.getElementById('courseStudents').value = course.students || '';
        if (document.getElementById('courseDescription')) document.getElementById('courseDescription').value = course.description || '';
        if (document.getElementById('courseLink')) document.getElementById('courseLink').value = course.link || '';

        if (document.getElementById('courseSubmitBtn')) {
            document.getElementById('courseSubmitBtn').innerHTML = '<i class="fas fa-check"></i> Update Course';
        }
        if (document.getElementById('formCardTitle')) {
            document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-edit" style="color: #ef4444;"></i> Editing Course';
        }
        if (document.getElementById('formCancelBtn')) {
            document.getElementById('formCancelBtn').style.display = 'inline-flex';
        }

        updateCoursePricePreview();
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
       4. TESTIMONIALS & SUCCESS STORIES
       ============================================================ */
    let testimonialsList = [];

    function resetTestimonialForm() {
        const form = document.getElementById('testimonialForm');
        if (form) form.reset();
        if (document.getElementById('testimonialId')) document.getElementById('testimonialId').value = '';
        if (document.getElementById('testimonialSubmitBtn')) {
            document.getElementById('testimonialSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Save Success Story';
        }
        if (document.getElementById('formCardTitle')) {
            document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add Success Story';
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
        const rating = Number(document.getElementById('testimonialRating')?.value) || 5;
        const image = document.getElementById('testimonialImage')?.value.trim() || '';
        const text = document.getElementById('testimonialText')?.value.trim() || '';

        if (!name || !text) {
            showToast('Student name and success story text are required.', 'warning');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Success Story';
            }
            return;
        }

        const item = {
            name,
            course: role || 'Student in Japan',
            role: role || 'Student in Japan',
            rating: rating,
            quote: text,
            text: text,
            image: image,
            avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        };

        try {
            if (id) {
                await window.DAO.Testimonials.update(id, item);
                showToast('Success Story updated successfully!', 'success');
            } else {
                await window.DAO.Testimonials.add(item);
                showToast('Success Story added successfully!', 'success');
            }
            resetTestimonialForm();
            loadTestimonials();
        } catch (err) {
            console.error('Error saving success story', err);
            showToast('Failed to save story: ' + err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Save Success Story';
            }
        }
    }

    async function loadTestimonials() {
        const list = document.getElementById('testimonialsList');
        if (!list) return;
        try {
            testimonialsList = await window.DAO.Testimonials.getAll();

            if (document.getElementById('testimonialsCountBadge')) {
                document.getElementById('testimonialsCountBadge').innerHTML = `<i class="fas fa-award"></i> ${testimonialsList.length} stor${testimonialsList.length !== 1 ? 'ies' : 'y'}`;
            }

            if (!testimonialsList.length) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-award"></i></div>
                        <h3>No Success Stories Yet</h3>
                        <p>Add your first student success story using the form on the left.</p>
                    </div>`;
                return;
            }

            list.innerHTML = testimonialsList.map(item => {
                const role = item.course || item.role || 'Student in Japan';
                const text = item.quote || item.text || 'Great experience studying with Fusion Education BD.';
                const rating = Number(item.rating) || 5;
                const starsHtml = '★'.repeat(Math.min(5, Math.max(1, rating))) + '☆'.repeat(5 - Math.min(5, Math.max(1, rating)));
                const initials = item.avatar || (item.name ? item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST');
                const isImgUrl = item.image && (item.image.startsWith('http') || item.image.startsWith('../') || item.image.startsWith('data:'));

                return `
                <div class="item-card" style="border-radius: 14px; padding: 1.25rem 1.5rem; margin-bottom: 1rem; border: 1px solid var(--border); background: var(--bg-card);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                        <div style="display:flex; gap:0.85rem; align-items:center;">
                            ${isImgUrl ? `
                                <img src="${item.image}" alt="${item.name}" style="width:46px; height:46px; border-radius:50%; object-fit:cover; border:2px solid #e60012;">
                            ` : `
                                <div class="author-avatar-wrap" style="width:46px; height:46px; border-radius:50%; background:linear-gradient(135deg, #e60012, #ff4d5e); color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center;">${initials}</div>
                            `}
                            <div>
                                <h3 class="item-card-title" style="margin:0; font-size:1.05rem;">${item.name}</h3>
                                <p style="color:var(--text-secondary); font-size:0.82rem; margin:0.15rem 0 0; font-weight:600;">${role}</p>
                            </div>
                        </div>
                        <div style="color:#f59e0b; font-size:0.95rem;" title="${rating} Stars">${starsHtml}</div>
                    </div>
                    <p class="item-desc" style="font-style:italic; background:var(--bg); padding:0.85rem 1.1rem; border-radius:10px; border:1px solid var(--border); font-size:0.92rem; color:var(--text-primary); margin-bottom:0.85rem;">"${text}"</p>
                    <div class="action-row" style="display:flex; gap:0.5rem; justify-content:flex-end;">
                        <button class="card-action-btn edit" onclick="window.editTestimonial('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
                        <button class="card-action-btn delete" onclick="window.deleteTestimonial('${item.id}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>`;
            }).join('');
        } catch (err) {
            console.error('Error loading testimonials', err);
            list.innerHTML = '<div class="empty-state"><p style="color:var(--error);">Failed to load success stories.</p></div>';
        }
    }

    function editTestimonial(id) {
        const item = testimonialsList.find(e => String(e.id) === String(id));
        if (!item) return;

        if (document.getElementById('testimonialId')) document.getElementById('testimonialId').value = item.id;
        if (document.getElementById('testimonialName')) document.getElementById('testimonialName').value = item.name || '';
        if (document.getElementById('testimonialRole')) document.getElementById('testimonialRole').value = item.course || item.role || '';
        if (document.getElementById('testimonialRating')) document.getElementById('testimonialRating').value = String(item.rating || 5);
        if (document.getElementById('testimonialImage')) document.getElementById('testimonialImage').value = item.image || '';
        if (document.getElementById('testimonialText')) document.getElementById('testimonialText').value = item.quote || item.text || '';

        if (document.getElementById('testimonialSubmitBtn')) {
            document.getElementById('testimonialSubmitBtn').innerHTML = '<i class="fas fa-check"></i> Update Story';
        }
        if (document.getElementById('formCardTitle')) {
            document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Success Story';
        }
        if (document.getElementById('formCancelBtn')) {
            document.getElementById('formCancelBtn').style.display = 'inline-flex';
        }

        document.getElementById('formCard')?.scrollIntoView({ behavior: 'smooth' });
    }

    function deleteTestimonial(id) {
        openDeleteModal('Delete Success Story?', 'Are you sure you want to delete this student success story from the website?', async () => {
            await window.DAO.Testimonials.delete(id);
            showToast('Success story deleted successfully!', 'success');
            loadTestimonials();
            updateNavBadges();
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
                const dateStr = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : (msg.submittedAt ? new Date(msg.submittedAt).toLocaleString() : (msg.receivedAt || 'Recent'));
                const safeId = msg.id;
                const formattedSubject = (msg.subject || 'General Inquiry').replace(/-/g, ' ');
                return `
                <div class="item-card message-row-card" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.1rem 1.4rem; margin-bottom: 0.85rem; border-radius: 14px; background: var(--bg-card); border: 1px solid var(--border); transition: transform 0.2s, box-shadow 0.2s;">
                    <div style="display: flex; align-items: center; gap: 0.9rem; min-width: 0;">
                        <div style="width: 42px; height: 42px; border-radius: 10px; background: rgba(37,99,235,0.08); border: 1px solid rgba(37,99,235,0.2); display: flex; align-items: center; justify-content: center; color: #2563eb; font-size: 1rem; flex-shrink: 0;">
                            <i class="fas fa-user"></i>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                            <h3 style="font-size: 1.02rem; font-weight: 700; color: var(--text-primary); margin: 0;">${msg.name || 'Anonymous'}</h3>
                            <span style="background: rgba(37,99,235,0.1); color: #2563eb; border: 1px solid rgba(37,99,235,0.25); padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.76rem; font-weight: 700; text-transform: capitalize;">
                                ${formattedSubject}
                            </span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.85rem; flex-shrink: 0;">
                        <button type="button" class="btn btn-primary" onclick="window.viewContactMessageDetails('${safeId}')" style="padding: 0.45rem 1rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem; border-radius: 8px;">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <small style="color: var(--text-muted); font-size: 0.82rem; display: flex; align-items: center; gap: 0.35rem; white-space: nowrap;">
                            <i class="fas fa-calendar-alt"></i> ${dateStr}
                        </small>
                    </div>
                </div>`;
            }).join('');
        } catch (err) {
            console.error('Error loading messages', err);
            list.innerHTML = '<div class="empty-state"><p style="color:var(--error);">Failed to load messages.</p></div>';
        }
    }

    window.viewContactMessageDetails = async function(id) {
        try {
            const items = await window.DAO.ContactMessages.getAll();
            const msg = items.find(m => String(m.id) === String(id));
            if (!msg) {
                showToast('Message not found.', 'error');
                return;
            }

            const modal = document.getElementById('messageViewModal');
            if (!modal) return;

            const dateStr = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : (msg.submittedAt ? new Date(msg.submittedAt).toLocaleString() : (msg.receivedAt || 'Recent'));
            const formattedSubject = (msg.subject || 'General Inquiry').replace(/-/g, ' ');

            document.getElementById('modalMsgSenderName').textContent = msg.name || 'Anonymous';
            document.getElementById('modalMsgSubjectBadge').textContent = formattedSubject;

            document.getElementById('modalMsgBody').innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 0.85rem 1rem; border-radius: 12px;">
                        <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 0.25rem;">
                            <i class="fas fa-envelope" style="color: #38bdf8; margin-right: 0.35rem;"></i> Email Address
                        </div>
                        <div style="font-weight: 600; color: #fff; word-break: break-all;">
                            ${msg.email ? `<a href="mailto:${msg.email}" style="color: #38bdf8; text-decoration: none;">${msg.email}</a>` : 'Not provided'}
                        </div>
                    </div>

                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 0.85rem 1rem; border-radius: 12px;">
                        <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 0.25rem;">
                            <i class="fas fa-phone" style="color: #34d399; margin-right: 0.35rem;"></i> Phone Number
                        </div>
                        <div style="font-weight: 600; color: #fff;">
                            ${msg.phone ? `<a href="tel:${msg.phone}" style="color: #34d399; text-decoration: none;">${msg.phone}</a>` : 'Not provided'}
                        </div>
                    </div>

                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 0.85rem 1rem; border-radius: 12px;">
                        <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 0.25rem;">
                            <i class="fas fa-calendar-alt" style="color: #fbbf24; margin-right: 0.35rem;"></i> Received At
                        </div>
                        <div style="font-weight: 600; color: #e2e8f0; font-size: 0.9rem;">
                            ${dateStr}
                        </div>
                    </div>
                </div>

                <div style="margin-top: 1rem;">
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
                        <i class="fas fa-comment-dots" style="color: #e60012; margin-right: 0.35rem;"></i> Full Message Text
                    </label>
                    <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.25rem; font-size: 0.95rem; line-height: 1.6; color: #f1f5f9; white-space: pre-wrap; min-height: 100px;">
                        ${msg.message || 'No message text provided.'}
                    </div>
                </div>
            `;

            // Setup action buttons
            const actionLeft = document.getElementById('modalMsgActionLeft');
            if (actionLeft) {
                actionLeft.innerHTML = `
                    ${msg.email ? `
                        <a href="mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject || 'Inquiry at Fusion Education BD')}" class="btn btn-primary" style="padding: 0.5rem 1rem; text-decoration: none; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem;">
                            <i class="fas fa-reply"></i> Reply via Email
                        </a>
                    ` : ''}
                    ${msg.phone ? `
                        <a href="tel:${msg.phone}" class="btn btn-secondary" style="padding: 0.5rem 1rem; text-decoration: none; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem;">
                            <i class="fas fa-phone-alt"></i> Call
                        </a>
                    ` : ''}
                `;
            }

            const delBtn = document.getElementById('modalMsgDeleteBtn');
            if (delBtn) {
                delBtn.onclick = () => {
                    closeMessageModal();
                    window.deleteContactMessage(msg.id);
                };
            }

            modal.style.display = 'flex';
        } catch (e) {
            console.error('Error viewing message details:', e);
        }
    };

    window.closeMessageModal = function() {
        const modal = document.getElementById('messageViewModal');
        if (modal) modal.style.display = 'none';
    };

    window.deleteContactMessage = function(id) {
        openDeleteModal('Delete Message?', 'Are you sure you want to delete this contact message?', async () => {
            await window.DAO.ContactMessages.delete(id);
            showToast('Message deleted successfully!', 'success');
            loadContactMessages();
            updateNavBadges();
        });
    };

    /* ============================================================
       7. STUDENT ADMISSIONS  (see full implementation below ~line 1660)
       ============================================================ */
    // NOTE: The full loadAdmissions() with tab filtering, search, badge counts,
    // and view modal is implemented in the ADMISSIONS MANAGEMENT section below.
    // This section intentionally left as a placeholder to avoid duplicate declaration.

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
            const studentName = adm.fullName || adm.name || adm.studentName || 'Student Name';

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

            const safeId = adm.id || adm.applicationNumber || adm.applicationId;

            return `
                <div class="item-card" style="display:flex; gap:1.25rem; align-items:flex-start; padding:1.35rem; background:#0f172a; border:1px solid rgba(148,163,184,0.25); border-radius:16px; margin-bottom:1.1rem; flex-wrap:wrap;">
                    <img src="${photoSrc}" alt="Applicant Photo" style="width:75px; height:75px; border-radius:14px; object-fit:cover; border:2px solid ${isAdmitted ? '#10b981' : '#f59e0b'}; flex-shrink:0; background:#1e293b;" onerror="this.src='../assets/images/student-placeholder.jpg'">
                    <div style="flex:1; min-width:260px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.4rem;">
                            <div>
                                <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
                                    <h3 style="margin:0; font-size:1.18rem; color:#ffffff !important; font-weight:700;">${studentName}</h3>
                                    ${statusBadgeHtml}
                                </div>
                                <div style="margin-top:0.25rem;">
                                    <span style="font-size:0.82rem; color:#38bdf8; font-weight:700; letter-spacing:0.02em;">${adm.applicationNumber || adm.id || 'FEBD-APP'}</span>
                                    <span style="color:#94a3b8; font-size:0.78rem; margin-left:0.5rem;">• Submitted: ${dateStr}</span>
                                </div>
                            </div>
                            <span class="badge" style="background:rgba(37,99,235,0.2); color:#93c5fd; font-size:0.75rem; padding:0.25rem 0.65rem;">${branchStr}</span>
                        </div>
                        
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:0.5rem; font-size:0.85rem; color:#cbd5e1; margin:0.85rem 0;">
                            <div><i class="fas fa-book" style="color:#38bdf8; width:16px;"></i> <span style="color:#94a3b8;">Course:</span> <strong style="color:#ffffff;">${adm.course || 'N/A'} ${adm.courseLevel ? `(${adm.courseLevel})` : ''}</strong></div>
                            <div><i class="fas fa-envelope" style="color:#38bdf8; width:16px;"></i> <span style="color:#94a3b8;">Email:</span> <strong style="color:#ffffff;">${adm.email || 'N/A'}</strong></div>
                            <div><i class="fas fa-phone" style="color:#38bdf8; width:16px;"></i> <span style="color:#94a3b8;">Phone:</span> <strong style="color:#ffffff;">${adm.phone || 'N/A'}</strong></div>
                            <div><i class="fas fa-passport" style="color:#38bdf8; width:16px;"></i> <span style="color:#94a3b8;">Visa:</span> <strong style="color:#ffffff;">${adm.visaType ? adm.visaType.toUpperCase() : 'N/A'}</strong></div>
                            <div><i class="fas fa-map-marker-alt" style="color:#38bdf8; width:16px;"></i> <span style="color:#94a3b8;">Location:</span> <strong style="color:#ffffff;">${adm.city || ''}${adm.district ? ', ' + adm.district : ''}</strong></div>
                            <div><i class="fas fa-user-shield" style="color:#38bdf8; width:16px;"></i> <span style="color:#94a3b8;">Emergency:</span> <strong style="color:#ffffff;">${adm.emergencyName || 'N/A'} (${adm.emergencyPhone || ''})</strong></div>
                        </div>

                        <div style="margin-top:0.85rem; padding-top:0.85rem; border-top:1px solid rgba(148,163,184,0.15); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
                            <div style="display:flex; align-items:center; flex-wrap:wrap;">
                                <strong style="font-size:0.8rem; color:#ffffff; margin-right:0.5rem;"><i class="fas fa-paperclip"></i> Documents (${docs.length}):</strong>
                                ${docsHtml}
                            </div>
                            
                            <!-- Admin Actions (View & Delete only - Staff handles Edit) -->
                            <div style="display:flex; gap:0.5rem; align-items:center;">
                                <button type="button" class="btn outline" onclick="openAdminViewModal('${safeId}')" style="font-size:0.78rem; padding:0.4rem 0.85rem; background:rgba(37,99,235,0.18); color:#93c5fd; border-color:rgba(37,99,235,0.4); cursor:pointer;">
                                    <i class="fas fa-eye"></i> View Profile
                                </button>
                                <button type="button" class="btn danger" onclick="deleteAdmission('${safeId}')" style="font-size:0.78rem; padding:0.4rem 0.75rem; cursor:pointer;">
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
        const studentName = student.fullName || student.name || student.studentName || 'Student Profile';

        if (nameEl) nameEl.textContent = studentName;
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
            : '<span style="color:#94a3b8; font-size:0.88rem;">No documents uploaded.</span>';

        if (modalBody) {
            modalBody.innerHTML = `
                <div style="display:flex; gap:1.5rem; align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap;">
                    <img src="${photoSrc}" alt="Photo" style="width:100px; height:100px; border-radius:18px; object-fit:cover; border:2px solid #38bdf8; background:#1e293b;" onerror="this.src='../assets/images/student-placeholder.jpg'">
                    <div style="flex:1; min-width:240px;">
                        <h3 style="margin:0 0 0.25rem; font-size:1.35rem; color:#ffffff !important; font-weight:700;">${studentName}</h3>
                        <p style="margin:0 0 0.5rem; color:#38bdf8; font-weight:700; font-size:0.95rem;">Application Number: ${student.applicationNumber || student.id || 'N/A'}</p>
                        <p style="margin:0; color:#94a3b8; font-size:0.85rem;">Branch: <strong style="color:#ffffff;">${student.branch ? (student.branch.toUpperCase() + ' Branch') : 'Dinajpur Branch'}</strong> • Applied: <strong style="color:#ffffff;">${student.submittedAt ? new Date(student.submittedAt).toLocaleDateString('en-GB') : 'Recent'}</strong></p>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1rem; background:rgba(255,255,255,0.03); padding:1.25rem; border-radius:14px; border:1px solid rgba(148,163,184,0.18); margin-bottom:1.25rem;">
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">EMAIL ADDRESS</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${student.email || 'N/A'}</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">PHONE NUMBER</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${student.phone || 'N/A'}</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">FATHER'S NAME</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${student.fatherName || 'N/A'}</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">MOTHER'S NAME</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${student.motherName || 'N/A'}</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">DATE OF BIRTH / GENDER</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${student.dateOfBirth || 'N/A'} (${student.gender || 'N/A'})</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">BLOOD GROUP</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${student.bloodGroup ? `<span style="background:rgba(239,68,68,0.2);color:#fca5a5;padding:0.15rem 0.5rem;border-radius:6px;font-weight:700;">${student.bloodGroup}</span>` : 'N/A'}</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">NID / BIRTH CERTIFICATE</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${student.nidBirthCert || 'N/A'}</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">OCCUPATION &amp; RELIGION</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${student.occupation || 'N/A'} • ${student.religion || 'N/A'}</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">RESIDENTIAL ADDRESS</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${[student.address, student.city, student.district].filter(Boolean).join(', ') || 'N/A'}</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">PERMANENT ADDRESS</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${[student.permanentAddress, student.permanentCity, student.permanentDistrict].filter(Boolean).join(', ') || student.address || 'N/A'}</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">COURSE ENROLLED</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${student.course || 'N/A'} ${student.courseLevel ? `(${student.courseLevel})` : ''}</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">VISA TARGET</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${student.visaType ? student.visaType.toUpperCase() : 'N/A'}</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">HIGHEST EDUCATION</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${student.highestEducation ? student.highestEducation.toUpperCase() : 'N/A'}</strong></div>
                    <div><span style="color:#94a3b8; font-size:0.75rem; font-weight:600; letter-spacing:0.04em; display:block; text-transform:uppercase;">EMERGENCY CONTACT</span><strong style="color:#ffffff; font-size:0.92rem; display:block; margin-top:0.2rem;">${student.emergencyName || 'N/A'} (${student.emergencyPhone || ''})</strong></div>
                </div>

                <div style="margin-bottom:1.25rem;">
                    <h4 style="margin:0 0 0.5rem; color:#cbd5e1; font-size:0.95rem;"><i class="fas fa-paperclip"></i> Uploaded Documents (${docs.length})</h4>
                    <div>${docsHtml}</div>
                </div>

                ${student.comment ? `
                    <div style="background:rgba(255,255,255,0.02); padding:1rem; border-radius:10px; border:1px solid rgba(148,163,184,0.18); margin-bottom:1.25rem;">
                        <span style="color:#94a3b8; font-size:0.75rem; font-weight:600; display:block; text-transform:uppercase;">STUDENT COMMENTS / NOTES</span>
                        <p style="margin:0.25rem 0 0; color:#e2e8f0; font-size:0.9rem;">${student.comment}</p>
                    </div>
                ` : ''}

                <div style="background:rgba(56,189,248,0.08); padding:0.85rem 1rem; border-radius:10px; border:1px solid rgba(56,189,248,0.25); font-size:0.85rem; color:#bae6fd;">
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

    window.deleteAdmission = function(id) {
        openDeleteModal(
            'Delete Admission Application?',
            'This will permanently remove the student application record. This action cannot be undone.',
            async () => {
                try {
                    await window.DAO.Admissions.delete(id);
                    showToast('Admission application deleted successfully.', 'success');
                    loadAdmissions();
                    updateNavBadges();
                } catch (e) {
                    showToast('Failed to delete application. Please try again.', 'error');
                }
            }
        );
    };

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
    // window.deleteAdmission is already defined directly as window.deleteAdmission above
    window.logoutAdmin = logoutAdmin;

    // Run automatically on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAdminPanel);
    } else {
        initializeAdminPanel();
    }

})();
