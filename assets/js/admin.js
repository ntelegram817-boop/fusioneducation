const tabButtons = document.querySelectorAll('.tab-btn');

function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(panel => panel.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    document.getElementById(tabId).classList.add('active');
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

function loadSettings() {
    const data = getSiteData();
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
}

function saveSettings(event) {
    event.preventDefault();
    const data = getSiteData();
    const heroImageUrl = document.getElementById('heroImageUrl').value.trim();
    const heroImageFile = document.getElementById('heroImageFile').files[0];

    const saveHero = (imageValue) => {
        data.hero = {
            title: document.getElementById('heroTitleInput').value.trim(),
            subtitle: document.getElementById('heroSubtitleInput').value.trim(),
            image: imageValue || '',
            ctaText: document.getElementById('heroCtaText').value.trim(),
            ctaUrl: document.getElementById('heroCtaUrl').value.trim(),
            secondaryCtaText: document.getElementById('heroSecondaryText').value.trim(),
            secondaryCtaUrl: document.getElementById('heroSecondaryUrl').value.trim()
        };

        data.contactInfo = {
            address: document.getElementById('contactAddress').value.trim(),
            phone: document.getElementById('contactPhone').value.trim(),
            email: document.getElementById('contactEmail').value.trim(),
            hours: document.getElementById('contactHours').value.trim()
        };

        data.socialLinks = {
            facebook: document.getElementById('socialFacebook').value.trim(),
            instagram: document.getElementById('socialInstagram').value.trim(),
            twitter: document.getElementById('socialTwitter').value.trim(),
            linkedin: document.getElementById('socialLinkedin').value.trim(),
            whatsapp: document.getElementById('socialWhatsapp').value.trim()
        };

        data.footerText = document.getElementById('footerTextInput').value.trim();
        saveSiteData(data);
        showSuccess('Site settings saved successfully.');
        loadSettings();
    };

    if (heroImageUrl) {
        saveHero(heroImageUrl);
    } else if (heroImageFile) {
        const reader = new FileReader();
        reader.onload = (e) => saveHero(e.target.result);
        reader.readAsDataURL(heroImageFile);
    } else {
        saveHero('');
    }
}

function resetPostForm() {
    document.getElementById('postForm').reset();
    document.getElementById('postId').value = '';
    document.getElementById('postSubmitBtn').textContent = 'Save Post';
    document.getElementById('postPreview').innerHTML = 'Preview image will appear here.';
}

function handlePostForm(event) {
    event.preventDefault();
    const postId = document.getElementById('postId').value;
    const title = document.getElementById('postTitle').value.trim();
    const text = document.getElementById('postText').value.trim();
    const imageUrl = document.getElementById('postImageUrl').value.trim();
    const photoLink = document.getElementById('postPhotoLink').value.trim();
    const buttonText = document.getElementById('postButtonText').value.trim();
    const buttonUrl = document.getElementById('postButtonUrl').value.trim();
    const layout = document.getElementById('postLayout').value;
    const photoSize = document.getElementById('postPhotoSize').value;
    const imageFile = document.getElementById('postImageFile').files[0];

    if (!title || !text) {
        showSuccess('Post title and description are required.');
        return;
    }

    const saveItem = (imageData) => {
        const item = { title, text, image: imageData, photoLink, buttonText, buttonUrl, layout, photoSize };

        if (postId) {
            updateGalleryItem(Number(postId), item);
            showSuccess('Post updated successfully.');
        } else {
            addGalleryItem(item);
            showSuccess('Post added successfully.');
        }
        resetPostForm();
        loadPosts();
    };

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (e) => saveItem(e.target.result);
        reader.readAsDataURL(imageFile);
    } else if (imageUrl) {
        saveItem(imageUrl);
    } else {
        showSuccess('Please provide an image URL or upload a file.');
    }
}

function loadPosts() {
    const list = document.getElementById('postsList');
    const posts = getGalleryItems();

    if (!posts.length) {
        list.innerHTML = '<p style="color: var(--text-secondary);">No posts yet. Add a post from the form above.</p>';
        return;
    }

    list.innerHTML = posts.map(post => `
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
                        <button class="btn btn-primary" onclick="editPost(${post.id})"><i class="fas fa-edit"></i> Edit</button>
                        <button class="outline-btn" onclick="deletePost(${post.id})"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function editPost(id) {
    const item = getGalleryItems().find(post => post.id === id);
    if (!item) return;

    document.getElementById('postId').value = item.id;
    document.getElementById('postTitle').value = item.title;
    document.getElementById('postText').value = item.text;
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

function deletePost(id) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    deleteGalleryItem(id);
    loadPosts();
    showSuccess('Post deleted successfully.');
}

function resetCourseForm() {
    document.getElementById('courseForm').reset();
    document.getElementById('courseId').value = '';
    document.getElementById('courseSubmitBtn').textContent = 'Save Course';
}

function handleCourseForm(event) {
    event.preventDefault();
    const courseId = document.getElementById('courseId').value;
    const title = document.getElementById('courseTitle').value.trim();
    const level = document.getElementById('courseLevel').value.trim();
    const duration = document.getElementById('courseDuration').value.trim();
    const students = document.getElementById('courseStudents').value.trim();
    const fee = document.getElementById('courseFee').value.trim();
    const description = document.getElementById('courseDescription').value.trim();
    const link = document.getElementById('courseLink').value.trim();

    if (!title || !level) {
        showSuccess('Course title and level are required.');
        return;
    }

    const data = getSiteData();
    const course = { title, level, duration, students, fee, description, link };

    if (courseId) {
        updateSectionItem('courses', Number(courseId), course);
        showSuccess('Course updated successfully.');
    } else {
        addSectionItem('courses', course);
        showSuccess('Course added successfully.');
    }

    resetCourseForm();
    loadCourses();
}

function loadCourses() {
    const list = document.getElementById('coursesList');
    const courses = getSection('courses');
    if (!courses.length) {
        list.innerHTML = '<p style="color: var(--text-secondary);">No courses configured yet. Add a course above.</p>';
        return;
    }
    list.innerHTML = courses.map(course => `
        <div class="item-card">
            <h3>${course.title}</h3>
            <div class="item-meta">
                <span><i class="fas fa-layer-group"></i> ${course.level}</span>
                <span><i class="fas fa-clock"></i> ${course.duration}</span>
                <span><i class="fas fa-users"></i> ${course.students}</span>
            </div>
            <p>${course.description}</p>
            <div class="item-meta" style="margin-top: 0.75rem;">
                <span><i class="fas fa-money-bill-wave"></i> ${course.fee}</span>
                <span><i class="fas fa-link"></i> ${course.link || 'No link'}</span>
            </div>
            <div class="action-row">
                <button class="btn btn-primary" onclick="editCourse(${course.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="outline-btn" onclick="deleteCourse(${course.id})"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
}

function editCourse(id) {
    const course = getSection('courses').find(item => item.id === id);
    if (!course) return;
    document.getElementById('courseId').value = course.id;
    document.getElementById('courseTitle').value = course.title;
    document.getElementById('courseLevel').value = course.level;
    document.getElementById('courseDuration').value = course.duration;
    document.getElementById('courseStudents').value = course.students;
    document.getElementById('courseFee').value = course.fee;
    document.getElementById('courseDescription').value = course.description;
    document.getElementById('courseLink').value = course.link;
    document.getElementById('courseSubmitBtn').textContent = 'Update Course';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteCourse(id) {
    if (!confirm('Delete this course?')) return;
    deleteSectionItem('courses', id);
    loadCourses();
    showSuccess('Course removed successfully.');
}

function resetTestimonialForm() {
    document.getElementById('testimonialForm').reset();
    document.getElementById('testimonialId').value = '';
    document.getElementById('testimonialSubmitBtn').textContent = 'Save Testimonial';
}

function handleTestimonialForm(event) {
    event.preventDefault();
    const id = document.getElementById('testimonialId').value;
    const name = document.getElementById('testimonialName').value.trim();
    const role = document.getElementById('testimonialRole').value.trim();
    const text = document.getElementById('testimonialText').value.trim();
    const avatar = document.getElementById('testimonialAvatar').value.trim();

    if (!name || !text) {
        showSuccess('Name and testimonial text are required.');
        return;
    }

    const item = { name, role, text, avatar: avatar || name.slice(0, 2).toUpperCase() };
    if (id) {
        updateSectionItem('testimonials', Number(id), item);
        showSuccess('Testimonial updated successfully.');
    } else {
        addSectionItem('testimonials', item);
        showSuccess('Testimonial added successfully.');
    }

    resetTestimonialForm();
    loadTestimonials();
}

function loadTestimonials() {
    const list = document.getElementById('testimonialsList');
    const items = getSection('testimonials');
    if (!items.length) {
        list.innerHTML = '<p style="color: var(--text-secondary);">No testimonials yet. Add one above.</p>';
        return;
    }
    list.innerHTML = items.map(item => `
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
                <button class="btn btn-primary" onclick="editTestimonial(${item.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="outline-btn" onclick="deleteTestimonial(${item.id})"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
}

function editTestimonial(id) {
    const item = getSection('testimonials').find(entry => entry.id === id);
    if (!item) return;
    document.getElementById('testimonialId').value = item.id;
    document.getElementById('testimonialName').value = item.name;
    document.getElementById('testimonialRole').value = item.role;
    document.getElementById('testimonialText').value = item.text;
    document.getElementById('testimonialAvatar').value = item.avatar;
    document.getElementById('testimonialSubmitBtn').textContent = 'Update Testimonial';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteTestimonial(id) {
    if (!confirm('Delete this testimonial?')) return;
    deleteSectionItem('testimonials', id);
    loadTestimonials();
    showSuccess('Testimonial deleted successfully.');
}

function resetFaqForm() {
    document.getElementById('faqForm').reset();
    document.getElementById('faqId').value = '';
    document.getElementById('faqSubmitBtn').textContent = 'Save FAQ';
}

function handleFaqForm(event) {
    event.preventDefault();
    const id = document.getElementById('faqId').value;
    const question = document.getElementById('faqQuestion').value.trim();
    const answer = document.getElementById('faqAnswer').value.trim();

    if (!question || !answer) {
        showSuccess('FAQ question and answer are required.');
        return;
    }

    const item = { question, answer };
    if (id) {
        updateSectionItem('faqs', Number(id), item);
        showSuccess('FAQ updated successfully.');
    } else {
        addSectionItem('faqs', item);
        showSuccess('FAQ added successfully.');
    }

    resetFaqForm();
    loadFaqs();
}

function loadFaqs() {
    const list = document.getElementById('faqsList');
    const items = getSection('faqs');
    if (!items.length) {
        list.innerHTML = '<p style="color: var(--text-secondary);">No FAQ items. Add questions above.</p>';
        return;
    }
    list.innerHTML = items.map(item => `
        <div class="item-card">
            <h3>${item.question}</h3>
            <p>${item.answer}</p>
            <div class="action-row">
                <button class="btn btn-primary" onclick="editFaq(${item.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="outline-btn" onclick="deleteFaq(${item.id})"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
}

function editFaq(id) {
    const item = getSection('faqs').find(entry => entry.id === id);
    if (!item) return;
    document.getElementById('faqId').value = item.id;
    document.getElementById('faqQuestion').value = item.question;
    document.getElementById('faqAnswer').value = item.answer;
    document.getElementById('faqSubmitBtn').textContent = 'Update FAQ';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteFaq(id) {
    if (!confirm('Delete this FAQ item?')) return;
    deleteSectionItem('faqs', id);
    loadFaqs();
    showSuccess('FAQ removed successfully.');
}

function loadContactMessages() {
    const list = document.getElementById('messagesList');
    const items = getContactMessages();
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
                <small style="color: var(--text-secondary);">${new Date(message.submittedAt).toLocaleString()}</small>
            </div>
            <p>${message.message}</p>
        </div>
    `).join('');
}

function loadAdmissions() {
    const list = document.getElementById('admissionsList');
    const admissions = getAdmissions();
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
                <small style="color: var(--text-secondary);">${item.submittedAt ? new Date(item.submittedAt).toLocaleString() : 'No date'}</small>
            </div>
            <div class="item-meta" style="display:flex; flex-wrap:wrap; gap:1rem; margin-bottom:0.75rem;">
                <span><i class="fas fa-book"></i> ${item.course}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${item.branch}</span>
                <span><i class="fas fa-flag"></i> ${item.visaType}</span>
            </div>
            <p style="margin-bottom:0.75rem;">${item.comment || 'No additional comments.'}</p>
            <div class="action-row">
                <button class="outline-btn" onclick="deleteAdmission(${item.id})"><i class="fas fa-trash"></i> Remove</button>
            </div>
        </div>
    `).join('');
}

function deleteAdmission(id) {
    if (!confirm('Delete this admission application?')) return;
    deleteSectionItem('admissions', id);
    loadAdmissions();
    showSuccess('Admission application removed.');
}

function loadUserSettings() {
    const admin = getSiteData().adminUser || { email: '', password: '' };
    document.getElementById('adminEmail').value = admin.email;
    document.getElementById('adminPassword').value = admin.password;
}

function saveUserSettings(event) {
    event.preventDefault();
    const data = getSiteData();
    data.adminUser = {
        email: document.getElementById('adminEmail').value.trim(),
        password: document.getElementById('adminPassword').value.trim()
    };
    saveSiteData(data);
    showSuccess('Admin login credentials updated.');
}

function initializeAdminPanel() {
    loadSettings();
    loadPosts();
    loadCourses();
    loadTestimonials();
    loadFaqs();
    loadContactMessages();
    loadAdmissions();
    loadUserSettings();
}

function initAdminForms() {
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);
    document.getElementById('postForm').addEventListener('submit', handlePostForm);
    document.getElementById('courseForm').addEventListener('submit', handleCourseForm);
    document.getElementById('testimonialForm').addEventListener('submit', handleTestimonialForm);
    document.getElementById('faqForm').addEventListener('submit', handleFaqForm);
    document.getElementById('userForm').addEventListener('submit', saveUserSettings);
}

function refreshEverything() {
    initializeSiteData();
    renderAll();
    loadSettings();
    loadPosts();
    loadCourses();
    loadTestimonials();
    loadFaqs();
    loadContactMessages();
    loadUserSettings();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeSiteData();
    initAdminForms();
    initializeAdminPanel();
    switchTab('settings-tab');
});
