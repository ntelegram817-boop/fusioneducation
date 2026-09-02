const tabButtons = document.querySelectorAll('.tab-btn');

function switchTab(tabId) {
    const pane = document.getElementById(tabId);
    if (!pane) return;
    document.querySelectorAll('.tab-pane').forEach(panel => panel.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    pane.classList.add('active');
}

function showSuccess(message) {
    const messageBox = document.getElementById('successMessage');
    const text = document.getElementById('successText');
    text.textContent = message;
    messageBox.classList.add('show');
    setTimeout(() => messageBox.classList.remove('show'), 3000);
}

function previewImage(event, previewId) {
    const preview = document.getElementById(previewId);
    const target = event.target;
    const imageFile = target.type === 'file' ? target.files?.[0] : null;
    const imageUrl = target.value?.trim() || '';

    if (imageUrl) {
        preview.innerHTML = `<img src="${imageUrl}" alt="Preview">`;
        return;
    }

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(imageFile);
        return;
    }

    preview.innerHTML = 'Preview image will appear here.';
}

// Helpers for Firestore
const getCollection = (col) => window.db.collection(col);

async function uploadImage(file, path) {
    if (!file) return null;
    const storageRef = window.storage.ref();
    const fileRef = storageRef.child(`${path}/${Date.now()}_${file.name}`);
    await fileRef.put(file);
    return await fileRef.getDownloadURL();
}

/* ─── SETTINGS ─── */
async function loadSettings() {
    if (!document.getElementById('heroTitleInput')) return;
    try {
        const docSnap = await getCollection('settings').doc('site').get();
        const data = docSnap.exists ? docSnap.data() : {};
        
        const hero = data.hero || {};
        const contactInfo = data.contactInfo || {};
        const socialLinks = data.socialLinks || {};

        document.getElementById('heroTitleInput').value = hero.title || '';
        document.getElementById('heroSubtitleInput').value = hero.subtitle || '';
        document.getElementById('heroImageUrl').value = hero.image || '';
        const heroPreview = document.getElementById('heroPreview');
        if (heroPreview) {
            heroPreview.innerHTML = hero.image ? `<img src="${hero.image}" alt="Hero Preview">` : 'Upload or enter image URL to preview here.';
        }
        document.getElementById('heroCtaText').value = hero.ctaText || '';
        document.getElementById('heroCtaUrl').value = hero.ctaUrl || '';
        document.getElementById('heroSecondaryText').value = hero.secondaryCtaText || '';
        document.getElementById('heroSecondaryUrl').value = hero.secondaryCtaUrl || '';

        document.getElementById('contactAddress').value = contactInfo.address || '';
        document.getElementById('contactPhone').value = contactInfo.phone || '';
        document.getElementById('contactEmail').value = contactInfo.email || '';
        document.getElementById('contactHours').value = contactInfo.hours || '';

        document.getElementById('socialFacebook').value = socialLinks.facebook || '';
        document.getElementById('socialInstagram').value = socialLinks.instagram || '';
        document.getElementById('socialTwitter').value = socialLinks.twitter || '';
        document.getElementById('socialLinkedin').value = socialLinks.linkedin || '';
        document.getElementById('socialWhatsapp').value = socialLinks.whatsapp || '';

        document.getElementById('footerTextInput').value = data.footerText || '';
    } catch (err) {
        console.error("Error loading settings", err);
    }
}

async function saveSettings(event) {
    event.preventDefault();
    const heroImageUrl = document.getElementById('heroImageUrl').value.trim();
    const heroImageFile = document.getElementById('heroImageFile')?.files?.[0];
    
    let imageUrl = heroImageUrl;
    if (heroImageFile) {
        imageUrl = await uploadImage(heroImageFile, 'settings');
    }

    const data = {
        hero: {
            title: document.getElementById('heroTitleInput').value.trim(),
            subtitle: document.getElementById('heroSubtitleInput').value.trim(),
            image: imageUrl || '',
            ctaText: document.getElementById('heroCtaText').value.trim(),
            ctaUrl: document.getElementById('heroCtaUrl').value.trim(),
            secondaryCtaText: document.getElementById('heroSecondaryText').value.trim(),
            secondaryCtaUrl: document.getElementById('heroSecondaryUrl').value.trim()
        },
        contactInfo: {
            address: document.getElementById('contactAddress').value.trim(),
            phone: document.getElementById('contactPhone').value.trim(),
            email: document.getElementById('contactEmail').value.trim(),
            hours: document.getElementById('contactHours').value.trim()
        },
        socialLinks: {
            facebook: document.getElementById('socialFacebook').value.trim(),
            instagram: document.getElementById('socialInstagram').value.trim(),
            twitter: document.getElementById('socialTwitter').value.trim(),
            linkedin: document.getElementById('socialLinkedin').value.trim(),
            whatsapp: document.getElementById('socialWhatsapp').value.trim()
        },
        footerText: document.getElementById('footerTextInput').value.trim()
    };

    await getCollection('settings').doc('site').set(data, { merge: true });
    showSuccess('Site settings saved successfully.');
    loadSettings();
}

/* ─── POSTS ─── */
function resetPostForm() {
    document.getElementById('postForm').reset();
    document.getElementById('postId').value = '';
    document.getElementById('postSubmitBtn').textContent = 'Save Post';
    document.getElementById('postPreview').innerHTML = 'Preview image will appear here.';
}

async function handlePostForm(event) {
    event.preventDefault();
    const btn = document.getElementById('postSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const postId = document.getElementById('postId').value;
    const title = document.getElementById('postTitle').value.trim();
    const text = document.getElementById('postText').value.trim();
    let imageUrl = document.getElementById('postImageUrl').value.trim();
    const photoLink = document.getElementById('postPhotoLink').value.trim();
    const buttonText = document.getElementById('postButtonText').value.trim();
    const buttonUrl = document.getElementById('postButtonUrl').value.trim();
    const layout = document.getElementById('postLayout').value;
    const photoSize = document.getElementById('postPhotoSize').value;
    const imageFile = document.getElementById('postImageFile')?.files?.[0];

    if (!title || !text) {
        showSuccess('Post title and description are required.');
        btn.disabled = false;
        btn.textContent = 'Save Post';
        return;
    }

    try {
        if (imageFile) {
            imageUrl = await uploadImage(imageFile, 'posts');
        }

        const item = { title, text, image: imageUrl, photoLink, buttonText, buttonUrl, layout, photoSize, createdAt: firebase.firestore.FieldValue.serverTimestamp() };

        if (postId) {
            await getCollection('posts').doc(postId).update(item);
            showSuccess('Post updated successfully.');
        } else {
            await getCollection('posts').add(item);
            showSuccess('Post added successfully.');
        }
        resetPostForm();
        loadPosts();
    } catch (err) {
        console.error("Error saving post", err);
        showSuccess('Failed to save post.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Post';
    }
}

let postsList = [];
async function loadPosts() {
    const list = document.getElementById('postsList');
    if(!list) return;
    try {
        const snapshot = await getCollection('posts').orderBy('createdAt', 'desc').get();
        postsList = [];
        snapshot.forEach(doc => postsList.push({ id: doc.id, ...doc.data() }));

        if (!postsList.length) {
            list.innerHTML = '<p style="color: var(--text-secondary);">No posts yet. Add a post from the form above.</p>';
            return;
        }

        list.innerHTML = postsList.map(post => `
            <div class="item-card">
                <div class="item-grid">
                    <div>
                        <img src="${post.image}" alt="${post.title}">
                    </div>
                    <div>
                        <h3 style="margin-bottom: 0.75rem;">${post.title}</h3>
                        <div class="item-meta">
                            <span><i class="fas fa-align-left"></i> ${post.layout}</span>
                            <span><i class="fas fa-image"></i> ${post.photoSize}</span>
                        </div>
                        <p>${post.text}</p>
                        <div class="action-row">
                            <button class="btn btn-primary" onclick="editPost('${post.id}')"><i class="fas fa-edit"></i> Edit</button>
                            <button class="outline-btn" onclick="deletePost('${post.id}')"><i class="fas fa-trash"></i> Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Error loading posts", err);
        list.innerHTML = '<p style="color: var(--error);">Error loading posts.</p>';
    }
}

function editPost(id) {
    const item = postsList.find(post => post.id === id);
    if (!item) return;

    document.getElementById('postId').value = item.id;
    document.getElementById('postTitle').value = item.title || '';
    document.getElementById('postText').value = item.text || '';
    document.getElementById('postImageUrl').value = item.image || '';
    document.getElementById('postPhotoLink').value = item.photoLink || '';
    document.getElementById('postButtonText').value = item.buttonText || '';
    document.getElementById('postButtonUrl').value = item.buttonUrl || '';
    document.getElementById('postLayout').value = item.layout || 'horizontal';
    document.getElementById('postPhotoSize').value = item.photoSize || 'medium';
    document.getElementById('postPreview').innerHTML = `<img src="${item.image}" alt="Preview">`;
    document.getElementById('postSubmitBtn').textContent = 'Update Post';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deletePost(id) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
        await getCollection('posts').doc(id).delete();
        loadPosts();
        showSuccess('Post deleted successfully.');
    } catch (err) {
        console.error("Error deleting post", err);
        showSuccess('Failed to delete post.');
    }
}

/* ─── COURSES ─── */
function resetCourseForm() {
    document.getElementById('courseForm').reset();
    document.getElementById('courseId').value = '';
    document.getElementById('courseDiscountType').value = 'none';
    document.getElementById('courseDiscountValue').value = '';
    document.getElementById('courseSubmitBtn').textContent = 'Save Course';
}

async function handleCourseForm(event) {
    event.preventDefault();
    const btn = document.getElementById('courseSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const courseId = document.getElementById('courseId').value;
    const title = document.getElementById('courseTitle').value.trim();
    const level = document.getElementById('courseLevel').value.trim();
    const duration = document.getElementById('courseDuration').value.trim();
    const students = document.getElementById('courseStudents').value.trim();
    const fee = document.getElementById('courseFee').value.trim();
    const description = document.getElementById('courseDescription').value.trim();
    const link = document.getElementById('courseLink').value.trim();
    const discountType = document.getElementById('courseDiscountType').value;
    const discountValue = document.getElementById('courseDiscountValue').value;

    if (!title || !level) {
        showSuccess('Course title and level are required.');
        btn.disabled = false;
        btn.textContent = 'Save Course';
        return;
    }

    const course = { 
        title, level, duration, students, fee, description, link,
        discountType: discountType || 'none',
        discountValue: discountValue ? parseFloat(discountValue) : 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (courseId) {
            await getCollection('courses').doc(courseId).update(course);
            showSuccess('Course updated successfully.');
        } else {
            await getCollection('courses').add(course);
            showSuccess('Course added successfully.');
        }
        resetCourseForm();
        loadCourses();
    } catch (err) {
        console.error("Error saving course", err);
        showSuccess('Failed to save course.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Course';
    }
}

let courseList = [];
async function loadCourses() {
    const list = document.getElementById('coursesList');
    if (!list) return;
    
    try {
        const snapshot = await getCollection('courses').orderBy('createdAt', 'desc').get();
        courseList = [];
        snapshot.forEach(doc => courseList.push({ id: doc.id, ...doc.data() }));

        if (!courseList.length) {
            list.innerHTML = '<p style="color: var(--text-secondary);">No courses configured yet. Add a course above.</p>';
            return;
        }

        list.innerHTML = courseList.map(course => {
            const discountInfo = typeof getCourseDiscountInfo === 'function' ? getCourseDiscountInfo(course) : null;
            const feeDisplay = discountInfo && discountInfo.hasDiscount 
                ? `<span style="text-decoration: line-through; opacity: 0.6; margin-right: 0.5rem;">${course.fee}</span> <strong>${formatCurrency(discountInfo.finalPrice)}</strong>`
                : `<strong>${course.fee}</strong>`;
            const discountText = discountInfo && discountInfo.hasDiscount 
                ? (course.discountType === 'percentage' ? `${course.discountValue}% off` : `৳ ${Number(course.discountValue).toLocaleString()} off`)
                : 'No discount applied.';

            return `
            <div class="item-card">
                <h3>${course.title}</h3>
                <div class="item-meta">
                    <span><i class="fas fa-layer-group"></i> ${course.level}</span>
                    <span><i class="fas fa-clock"></i> ${course.duration}</span>
                    <span><i class="fas fa-users"></i> ${course.students}</span>
                </div>
                <p>${course.description}</p>
                <div class="item-meta" style="margin-top: 0.75rem;">
                    <span><i class="fas fa-money-bill-wave"></i> ${feeDisplay}</span>
                    <span><i class="fas fa-link"></i> ${course.link || 'No link'}</span>
                </div>
                <p style="margin-top: 0.75rem; color: var(--text-secondary);">Discount: ${discountText}</p>
                <div class="action-row">
                    <button class="btn btn-primary" onclick="editCourse('${course.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="outline-btn" onclick="deleteCourse('${course.id}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `;
        }).join('');
        
        // update stats if they exist
        if(document.getElementById('totalCoursesCount')) {
            document.getElementById('totalCoursesCount').textContent = courseList.length;
            const discounted = courseList.filter(c => c.discountType && c.discountType !== 'none' && c.discountValue > 0);
            document.getElementById('discountedCount').textContent = discounted.length;
        }

    } catch (err) {
        console.error("Error loading courses", err);
        list.innerHTML = '<p style="color: var(--error);">Error loading courses.</p>';
    }
}

function editCourse(id) {
    const course = courseList.find(item => item.id === id);
    if (!course) return;
    document.getElementById('courseId').value = course.id;
    document.getElementById('courseTitle').value = course.title || '';
    document.getElementById('courseLevel').value = course.level || '';
    document.getElementById('courseDuration').value = course.duration || '';
    document.getElementById('courseStudents').value = course.students || '';
    document.getElementById('courseFee').value = course.fee || '';
    document.getElementById('courseDescription').value = course.description || '';
    document.getElementById('courseLink').value = course.link || '';
    document.getElementById('courseDiscountType').value = course.discountType || 'none';
    document.getElementById('courseDiscountValue').value = course.discountValue || '';
    document.getElementById('courseSubmitBtn').textContent = 'Update Course';
    
    // For admin/courses.html which has formCardTitle
    if(document.getElementById('formCardTitle')) {
        document.getElementById('formCardTitle').innerHTML = '<i class="fas fa-edit"></i> Editing Course';
        document.getElementById('formCancelBtn').style.display = '';
        if(typeof updateDiscountPreview === 'function') updateDiscountPreview();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteCourse(id) {
    if (!confirm('Delete this course?')) return;
    try {
        await getCollection('courses').doc(id).delete();
        showSuccess('Course removed successfully.');
        loadCourses();
    } catch (err) {
        console.error("Error deleting course", err);
        showSuccess('Failed to delete course.');
    }
}

/* ─── TESTIMONIALS ─── */
function resetTestimonialForm() {
    document.getElementById('testimonialForm').reset();
    document.getElementById('testimonialId').value = '';
    document.getElementById('testimonialSubmitBtn').textContent = 'Save Testimonial';
}

async function handleTestimonialForm(event) {
    event.preventDefault();
    const btn = document.getElementById('testimonialSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const id = document.getElementById('testimonialId').value;
    const name = document.getElementById('testimonialName').value.trim();
    const role = document.getElementById('testimonialRole').value.trim();
    const text = document.getElementById('testimonialText').value.trim();
    const avatar = document.getElementById('testimonialAvatar').value.trim();

    if (!name || !text) {
        showSuccess('Name and testimonial text are required.');
        btn.disabled = false;
        btn.textContent = 'Save Testimonial';
        return;
    }

    const item = { name, role, text, avatar: avatar || name.slice(0, 2).toUpperCase(), createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    
    try {
        if (id) {
            await getCollection('testimonials').doc(id).update(item);
            showSuccess('Testimonial updated successfully.');
        } else {
            await getCollection('testimonials').add(item);
            showSuccess('Testimonial added successfully.');
        }
        resetTestimonialForm();
        loadTestimonials();
    } catch (err) {
        console.error("Error saving testimonial", err);
        showSuccess('Failed to save testimonial.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Testimonial';
    }
}

let testimonialsList = [];
async function loadTestimonials() {
    const list = document.getElementById('testimonialsList');
    if (!list) return;
    try {
        const snapshot = await getCollection('testimonials').orderBy('createdAt', 'desc').get();
        testimonialsList = [];
        snapshot.forEach(doc => testimonialsList.push({ id: doc.id, ...doc.data() }));

        if (!testimonialsList.length) {
            list.innerHTML = '<p style="color: var(--text-secondary);">No testimonials yet. Add one above.</p>';
            return;
        }
        list.innerHTML = testimonialsList.map(item => `
            <div class="item-card">
                <div style="display:flex; gap:1rem; align-items:center; margin-bottom:0.75rem;">
                    <div class="author-avatar">${item.avatar || item.name.slice(0,2).toUpperCase()}</div>
                    <div>
                        <h3>${item.name}</h3>
                        <p style="color: var(--text-secondary);">${item.role}</p>
                    </div>
                </div>
                <p>${item.text}</p>
                <div class="action-row">
                    <button class="btn btn-primary" onclick="editTestimonial('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="outline-btn" onclick="deleteTestimonial('${item.id}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Error loading testimonials", err);
    }
}

function editTestimonial(id) {
    const item = testimonialsList.find(entry => entry.id === id);
    if (!item) return;
    document.getElementById('testimonialId').value = item.id;
    document.getElementById('testimonialName').value = item.name || '';
    document.getElementById('testimonialRole').value = item.role || '';
    document.getElementById('testimonialText').value = item.text || '';
    document.getElementById('testimonialAvatar').value = item.avatar || '';
    document.getElementById('testimonialSubmitBtn').textContent = 'Update Testimonial';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteTestimonial(id) {
    if (!confirm('Delete this testimonial?')) return;
    try {
        await getCollection('testimonials').doc(id).delete();
        loadTestimonials();
        showSuccess('Testimonial deleted successfully.');
    } catch(err) {
        console.error("Error deleting testimonial", err);
    }
}

/* ─── FAQS ─── */
function resetFaqForm() {
    document.getElementById('faqForm').reset();
    document.getElementById('faqId').value = '';
    document.getElementById('faqSubmitBtn').textContent = 'Save FAQ';
}

async function handleFaqForm(event) {
    event.preventDefault();
    const btn = document.getElementById('faqSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const id = document.getElementById('faqId').value;
    const question = document.getElementById('faqQuestion').value.trim();
    const answer = document.getElementById('faqAnswer').value.trim();

    if (!question || !answer) {
        showSuccess('FAQ question and answer are required.');
        btn.disabled = false;
        btn.textContent = 'Save FAQ';
        return;
    }

    const item = { question, answer, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
        if (id) {
            await getCollection('faqs').doc(id).update(item);
            showSuccess('FAQ updated successfully.');
        } else {
            await getCollection('faqs').add(item);
            showSuccess('FAQ added successfully.');
        }
        resetFaqForm();
        loadFaqs();
    } catch(err) {
        console.error("Error saving FAQ", err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save FAQ';
    }
}

let faqsList = [];
async function loadFaqs() {
    const list = document.getElementById('faqsList');
    if (!list) return;
    try {
        const snapshot = await getCollection('faqs').orderBy('createdAt', 'desc').get();
        faqsList = [];
        snapshot.forEach(doc => faqsList.push({ id: doc.id, ...doc.data() }));

        if (!faqsList.length) {
            list.innerHTML = '<p style="color: var(--text-secondary);">No FAQ items. Add questions above.</p>';
            return;
        }
        list.innerHTML = faqsList.map(item => `
            <div class="item-card">
                <h3>${item.question}</h3>
                <p>${item.answer}</p>
                <div class="action-row">
                    <button class="btn btn-primary" onclick="editFaq('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="outline-btn" onclick="deleteFaq('${item.id}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `).join('');
    } catch(err) {
        console.error("Error loading FAQs", err);
    }
}

function editFaq(id) {
    const item = faqsList.find(entry => entry.id === id);
    if (!item) return;
    document.getElementById('faqId').value = item.id;
    document.getElementById('faqQuestion').value = item.question || '';
    document.getElementById('faqAnswer').value = item.answer || '';
    document.getElementById('faqSubmitBtn').textContent = 'Update FAQ';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteFaq(id) {
    if (!confirm('Delete this FAQ item?')) return;
    try {
        await getCollection('faqs').doc(id).delete();
        loadFaqs();
        showSuccess('FAQ removed successfully.');
    } catch(err) {
        console.error("Error deleting FAQ", err);
    }
}

/* ─── CONTACT MESSAGES ─── */
async function loadContactMessages() {
    const list = document.getElementById('messagesList');
    if (!list) return;
    try {
        const snapshot = await getCollection('contactMessages').orderBy('submittedAt', 'desc').get();
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));

        if (!items.length) {
            list.innerHTML = '<p style="color: var(--text-secondary);">No messages have been submitted yet.</p>';
            return;
        }
        list.innerHTML = items.map(message => `
            <div class="item-card">
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1rem;">
                    <div>
                        <strong>${message.name}</strong> • ${message.subject || 'General'}
                        <p style="margin:0.5rem 0 0; color: var(--text-secondary);">${message.email} • ${message.phone}</p>
                    </div>
                    <small style="color: var(--text-secondary);">${message.submittedAt ? new Date(message.submittedAt.toDate()).toLocaleString() : ''}</small>
                </div>
                <p>${message.message}</p>
                <div class="action-row">
                    <button class="outline-btn" onclick="deleteContactMessage('${message.id}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `).join('');
    } catch(err) {
        console.error("Error loading messages", err);
    }
}

async function deleteContactMessage(id) {
    if (!confirm('Delete this message?')) return;
    try {
        await getCollection('contactMessages').doc(id).delete();
        loadContactMessages();
    } catch(err) {
        console.error("Error deleting message", err);
    }
}

/* ─── ADMISSIONS ─── */
async function loadAdmissions() {
    const list = document.getElementById('admissionsList');
    if (!list) return;
    try {
        const snapshot = await getCollection('admissions').orderBy('submittedAt', 'desc').get();
        const admissions = [];
        snapshot.forEach(doc => admissions.push({ id: doc.id, ...doc.data() }));

        if (!admissions.length) {
            list.innerHTML = '<p style="color: var(--text-secondary);">No admission applications have been submitted yet.</p>';
            return;
        }
        list.innerHTML = admissions.map(item => `
            <div class="item-card">
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1rem;">
                    <div>
                        <h3 style="margin:0;">${item.fullName}</h3>
                        <p style="margin:0.25rem 0 0; color: var(--text-secondary);">${item.email} • ${item.phone}</p>
                    </div>
                    <small style="color: var(--text-secondary);">${item.submittedAt ? new Date(item.submittedAt.toDate()).toLocaleString() : 'No date'}</small>
                </div>
                <div class="item-meta" style="display:flex; flex-wrap:wrap; gap:1rem; margin-bottom:0.75rem;">
                    <span><i class="fas fa-book"></i> ${item.course}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${item.branch}</span>
                    <span><i class="fas fa-flag"></i> ${item.visaType}</span>
                </div>
                <p style="margin-bottom:0.75rem;">${item.comment || 'No additional comments.'}</p>
                <div class="action-row">
                    <button class="outline-btn" onclick="deleteAdmission('${item.id}')"><i class="fas fa-trash"></i> Remove</button>
                </div>
            </div>
        `).join('');
    } catch(err) {
        console.error("Error loading admissions", err);
    }
}

async function deleteAdmission(id) {
    if (!confirm('Delete this admission application?')) return;
    try {
        await getCollection('admissions').doc(id).delete();
        loadAdmissions();
        showSuccess('Admission application removed.');
    } catch(err) {
        console.error("Error deleting admission", err);
    }
}

/* ─── USER SETTINGS (AUTH) ─── */
function loadUserSettings() {
    // With Firebase Auth, we usually don't show the password.
    // If they want to change password, we'll use Firebase updatePassword
    if (!document.getElementById('adminEmail')) return;
    const user = window.auth.currentUser;
    if(user) {
        document.getElementById('adminEmail').value = user.email || '';
    }
}

async function saveUserSettings(event) {
    event.preventDefault();
    const password = document.getElementById('adminPassword').value.trim();
    if(password && password.length >= 6) {
        try {
            await window.auth.currentUser.updatePassword(password);
            showSuccess('Admin password updated successfully.');
            document.getElementById('adminPassword').value = '';
        } catch(err) {
            console.error("Error updating password", err);
            showSuccess('Failed to update password. You may need to re-login.');
        }
    } else {
        showSuccess('Password must be at least 6 characters long.');
    }
}

function initializeAdminPanel() {
    loadSettings();
    loadPosts();
    loadCourses();
    loadTestimonials();
    loadFaqs();
    loadContactMessages();
    loadAdmissions();
    
    // Listen for auth state to load user settings
    window.auth.onAuthStateChanged((user) => {
        if(user) {
            loadUserSettings();
        }
    });
}

function initAdminForms() {
    document.getElementById('settingsForm')?.addEventListener('submit', saveSettings);
    document.getElementById('postForm')?.addEventListener('submit', handlePostForm);
    document.getElementById('courseForm')?.addEventListener('submit', handleCourseForm);
    document.getElementById('testimonialForm')?.addEventListener('submit', handleTestimonialForm);
    document.getElementById('faqForm')?.addEventListener('submit', handleFaqForm);
    document.getElementById('userForm')?.addEventListener('submit', saveUserSettings);
}

document.addEventListener('DOMContentLoaded', () => {
    // Ensure firebase is ready
    if(window.db) {
        initAdminForms();
        initializeAdminPanel();
        if (document.querySelector('.tab-pane')) {
            switchTab('settings-tab');
        }
    }
});

// Expose functions to window for inline onclick handlers
window.switchTab = switchTab;
window.previewImage = previewImage;
window.resetPostForm = resetPostForm;
window.editPost = editPost;
window.deletePost = deletePost;
window.resetCourseForm = resetCourseForm;
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;
window.resetTestimonialForm = resetTestimonialForm;
window.editTestimonial = editTestimonial;
window.deleteTestimonial = deleteTestimonial;
window.resetFaqForm = resetFaqForm;
window.editFaq = editFaq;
window.deleteFaq = deleteFaq;
window.deleteAdmission = deleteAdmission;
window.deleteContactMessage = deleteContactMessage;
