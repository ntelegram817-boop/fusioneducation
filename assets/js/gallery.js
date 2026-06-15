const cmsKey = 'fusion_site_data';
const legacyKeys = ['galleryItems', 'fusion_gallery_items'];

const defaultSiteData = {
    hero: {
        title: 'Learn Japanese, Build Your Future',
        subtitle: 'Master the Japanese language and unlock education and work opportunities in Japan.',
        image: '',
        ctaText: 'Start Your Journey',
        ctaUrl: 'pages/admission.html',
        secondaryCtaText: 'Free Consultation',
        secondaryCtaUrl: 'pages/contact.html'
    },
    posts: [
        {
            id: 1,
            title: 'Student Success',
            text: 'আমাদের শিক্ষার্থীরা জাপানে সফলভাবে তাদের স্বপ্ন পূরণ করছেন।',
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23E60012' width='400' height='300'/%3E%3Ctext x='50%' y='50%' font-size='48' fill='white' text-anchor='middle' dy='.3em'%3EStudent Success%3C/text%3E%3C/svg%3E",
            photoLink: '',
            buttonText: 'Read Story',
            buttonUrl: 'pages/success-stories.html',
            photoSize: 'medium',
            layout: 'horizontal'
        }
    ],
    courses: [
        {
            id: 1,
            level: 'Beginner',
            title: 'JLPT N5',
            duration: '3 Months',
            students: '20 Students/Batch',
            fee: '৳ 15,000',
            description: 'Foundation level Japanese language basics, kanji, and conversation skills.',
            link: 'pages/courses.html'
        },
        {
            id: 2,
            level: 'Intermediate',
            title: 'JLPT N4',
            duration: '4 Months',
            students: '20 Students/Batch',
            fee: '৳ 20,000',
            description: 'Intermediate level with advanced kanji, grammar, and practical communication.',
            link: 'pages/courses.html'
        },
        {
            id: 3,
            level: 'Advanced',
            title: 'JLPT N3',
            duration: '5 Months',
            students: '20 Students/Batch',
            fee: '৳ 25,000',
            description: 'Advanced proficiency for professional work and further studies in Japan.',
            link: 'pages/courses.html'
        }
    ],
    testimonials: [
        {
            id: 1,
            name: 'Farhana Rahim',
            role: 'SSW Visa Approved',
            text: 'Fusion Education completely changed my life. From zero Japanese to passing JLPT N3 in just 9 months, and now I am working in Tokyo!',
            avatar: 'FR'
        },
        {
            id: 2,
            name: 'Rahim Uddin',
            role: 'Visa Success',
            text: 'The visa consultation process was so smooth. Everything was handled professionally and I got my SSW visa approved on the first try.',
            avatar: 'RU'
        },
        {
            id: 3,
            name: 'Mohammad Khan',
            role: 'JLPT N4 Certified',
            text: 'Best decision I made. The JLPT N4 course prepared me perfectly for the exam. Now I am earning good money in Japan.',
            avatar: 'MK'
        }
    ],
    faqs: [
        {
            id: 1,
            question: 'How long does it take to complete the JLPT N5 course?',
            answer: 'Our JLPT N5 course takes approximately 3 months with 20-25 hours of classroom instruction per week.'
        },
        {
            id: 2,
            question: 'What are the eligibility requirements for a Student Visa?',
            answer: 'You need to have completed high school and demonstrate basic Japanese language proficiency. We guide you through every step.'
        },
        {
            id: 3,
            question: 'Can I work while studying in Japan?',
            answer: 'Yes. Student visa holders can work up to 20 hours per week during the school year and full-time during vacations.'
        }
    ],
    contactInfo: {
        address: '90/2, Fakirpara, 100 Feet North from Fakirpara Masjid, Dinajpur 5200, Bangladesh',
        phone: '+8801302090286',
        email: 'contact@fusioneducationbd.com',
        hours: 'Thursday - Saturday, 10:00 AM - 6:00 PM'
    },
    socialLinks: {
        facebook: 'https://facebook.com/fusioneducationbd',
        instagram: 'https://instagram.com/fusioneducation2025',
        twitter: 'https://twitter.com/fusioneducationbd',
        linkedin: 'https://linkedin.com/company/fusioneducationbd',
        whatsapp: 'https://wa.me/8801302090286'
    },
    footerText: '© 2026 Fusion Education BD. All rights reserved.',
    adminUser: {
        email: 'admin@fusioneducation.com',
        password: 'admin123'
    },
    contactMessages: [],
    admissions: []
};

function generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

function initializeSiteData() {
    if (localStorage.getItem(cmsKey)) {
        return;
    }

    for (const legacyKey of legacyKeys) {
        const legacyData = localStorage.getItem(legacyKey);
        if (legacyData) {
            try {
                const parsedItems = JSON.parse(legacyData);
                const siteData = { ...defaultSiteData, posts: [] };
                if (Array.isArray(parsedItems)) {
                    siteData.posts = parsedItems.map(item => ({
                        id: generateId(),
                        title: item.title || item.name || 'Untitled',
                        text: item.text || item.description || '',
                        image: item.image || 'https://via.placeholder.com/350x250',
                        photoLink: item.photoLink || '',
                        buttonText: item.buttonText || 'View',
                        buttonUrl: item.buttonUrl || '',
                        photoSize: item.photoSize || 'medium',
                        layout: item.layout || 'horizontal'
                    }));
                }
                localStorage.setItem(cmsKey, JSON.stringify(siteData));
                return;
            } catch (error) {
                console.warn('Legacy site data could not be parsed:', legacyKey, error);
            }
        }
    }

    localStorage.setItem(cmsKey, JSON.stringify(defaultSiteData));
}

function getSiteData() {
    const raw = localStorage.getItem(cmsKey);
    if (!raw) {
        initializeSiteData();
        return JSON.parse(localStorage.getItem(cmsKey));
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        console.error('Invalid site data, resetting to defaults.', error);
        localStorage.setItem(cmsKey, JSON.stringify(defaultSiteData));
        return JSON.parse(localStorage.getItem(cmsKey));
    }
}

function saveSiteData(data) {
    localStorage.setItem(cmsKey, JSON.stringify(data));
    renderAll();
}

function getSection(section) {
    const data = getSiteData();
    return Array.isArray(data[section]) ? data[section] : [];
}

function addSectionItem(section, item) {
    const data = getSiteData();
    data[section] = data[section] || [];
    item.id = generateId();
    data[section].push(item);
    saveSiteData(data);
    return item;
}

function updateSectionItem(section, id, updates) {
    const data = getSiteData();
    const list = data[section] || [];
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return null;
    data[section][index] = { ...data[section][index], ...updates };
    saveSiteData(data);
    return data[section][index];
}

function deleteSectionItem(section, id) {
    const data = getSiteData();
    data[section] = (data[section] || []).filter(item => item.id !== id);
    saveSiteData(data);
}

function saveContactMessage(message) {
    const data = getSiteData();
    data.contactMessages = data.contactMessages || [];
    data.contactMessages.unshift({ ...message, submittedAt: new Date().toISOString() });
    saveSiteData(data);
}

function getContactMessages() {
    return getSiteData().contactMessages || [];
}

function getAdmissions() {
    return getSection('admissions');
}

function getGalleryItems() {
    return getSection('posts');
}

function addGalleryItem(item) {
    return addSectionItem('posts', item);
}

function updateGalleryItem(id, updatedData) {
    return updateSectionItem('posts', id, updatedData);
}

function deleteGalleryItem(id) {
    deleteSectionItem('posts', id);
}

function renderHero() {
    const hero = getSiteData().hero || defaultSiteData.hero;
    const heroSection = document.getElementById('heroSection');
    const title = document.getElementById('heroTitle');
    const subtitle = document.getElementById('heroSubtitle');
    const heroCta = document.getElementById('heroCta');
    const heroSecondaryCta = document.getElementById('heroSecondaryCta');

    if (heroSection) {
        if (hero.image) {
            heroSection.style.backgroundImage = `linear-gradient(135deg, rgba(11, 18, 32, 0.85) 0%, rgba(31, 41, 55, 0.85) 100%), url(${hero.image})`;
        } else {
            heroSection.style.backgroundImage = '';
        }
    }
    if (title) title.textContent = hero.title;
    if (subtitle) subtitle.textContent = hero.subtitle;
    if (heroCta) {
        heroCta.textContent = hero.ctaText;
        heroCta.href = hero.ctaUrl;
    }
    if (heroSecondaryCta) {
        heroSecondaryCta.textContent = hero.secondaryCtaText;
        heroSecondaryCta.href = hero.secondaryCtaUrl;
    }
}

function renderPosts() {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    const items = getGalleryItems();
    container.innerHTML = '';
    if (!items.length) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; grid-column: 1/-1;">No posts available. <a href="../admin/dashboard.html">Add one from Admin Panel</a></p>';
        return;
    }

    const photoSizeMap = {
        small: '250px',
        medium: '350px',
        large: '450px'
    };

    items.forEach(item => {
        const photoWidth = photoSizeMap[item.photoSize] || '350px';
        const hasPhotoLink = item.photoLink && item.photoLink.trim();
        const hasButton = item.buttonText && item.buttonUrl;

        const imageElement = `
            ${hasPhotoLink ? `<a href="${item.photoLink}" target="_blank" rel="noopener noreferrer">` : ''}
                <img src="${item.image}" alt="${item.title}" style="width: 100%; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
            ${hasPhotoLink ? '</a>' : ''}
        `;

        const buttonHtml = hasButton ? `
            <a href="${item.buttonUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="margin-top: 1rem; display: inline-flex; align-items: center; gap: 0.5rem;">${item.buttonText}</a>
        ` : '';

        if (item.layout === 'horizontal') {
            container.innerHTML += `
                <div class="gallery-item gallery-horizontal">
                    <div class="gallery-photo" style="flex: 0 0 ${photoWidth}; height: auto;">
                        ${imageElement}
                    </div>
                    <div class="gallery-text" style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 2rem;">
                        <h3 style="color: var(--primary); margin-bottom: 1rem;">${item.title}</h3>
                        <p style="line-height: 1.8; color: var(--text-secondary);">${item.text}</p>
                        ${buttonHtml}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML += `
                <div class="gallery-item gallery-vertical">
                    <div class="gallery-photo" style="width: 100%; margin-bottom: 1.5rem;">
                        ${imageElement}
                    </div>
                    <div class="gallery-text">
                        <h3 style="color: var(--primary); margin-bottom: 1rem;">${item.title}</h3>
                        <p style="line-height: 1.8; color: var(--text-secondary);">${item.text}</p>
                        ${buttonHtml}
                    </div>
                </div>
            `;
        }
    });
}

function renderCourses() {
    const container = document.getElementById('coursesGrid');
    if (!container) return;

    const courses = getSection('courses');
    container.innerHTML = '';
    if (!courses.length) {
        container.innerHTML = '<p style="text-align:center; padding:2rem; grid-column:1/-1;">No courses configured. Add courses in the admin dashboard.</p>';
        return;
    }

    container.innerHTML = courses.map(course => `
        <div class="course-card">
            <div class="course-thumbnail">📘</div>
            <div class="course-content">
                <span class="course-level">${course.level}</span>
                <h3 class="course-title">${course.title}</h3>
                <div class="course-meta">
                    <div class="course-meta-item"><i class="fas fa-clock"></i> ${course.duration}</div>
                    <div class="course-meta-item"><i class="fas fa-users"></i> ${course.students}</div>
                </div>
                <div class="course-fee">${course.fee}</div>
                <p style="font-size: 0.9rem;">${course.description}</p>
                <a href="${course.link}" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">View Course</a>
            </div>
        </div>
    `).join('');
}

function renderTestimonials() {
    const container = document.getElementById('testimonialsContainer');
    if (!container) return;

    const items = getSection('testimonials');
    if (!items.length) {
        container.innerHTML = '<p style="text-align:center; padding:2rem; grid-column:1/-1;">No testimonials yet. Add them from the admin panel.</p>';
        return;
    }

    container.innerHTML = items.map(testimonial => `
        <div class="testimonial">
            <div class="testimonial-quote">"</div>
            <p class="testimonial-text">${testimonial.text}</p>
            <div class="testimonial-author">
                <div class="author-avatar">${testimonial.avatar || testimonial.name.slice(0,2).toUpperCase()}</div>
                <div class="author-info">
                    <h4>${testimonial.name}</h4>
                    <p>${testimonial.role}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function renderFaqs() {
    const container = document.getElementById('faqList');
    if (!container) return;

    const items = getSection('faqs');
    if (!items.length) {
        container.innerHTML = '<p style="text-align:center; padding:2rem; grid-column:1/-1;">No FAQs yet. Add questions in the admin dashboard.</p>';
        return;
    }

    container.innerHTML = items.map(faq => `
        <div class="card mb-3">
            <h4 style="margin-bottom: 0.5rem;">${faq.question}</h4>
            <p>${faq.answer}</p>
        </div>
    `).join('');
}

function renderContactInfo() {
    const info = getSiteData().contactInfo || defaultSiteData.contactInfo;
    const addressEl = document.getElementById('contact-address');
    const phoneEl = document.getElementById('contact-phone');
    const emailEl = document.getElementById('contact-email');
    const hoursEl = document.getElementById('contact-hours');

    if (addressEl) addressEl.innerHTML = info.address.replace(/\n/g, '<br>');
    if (phoneEl) {
        phoneEl.textContent = info.phone;
        phoneEl.href = `tel:${info.phone.replace(/\s+/g, '')}`;
    }
    if (emailEl) {
        emailEl.textContent = info.email;
        emailEl.href = `mailto:${info.email}`;
    }
    if (hoursEl) hoursEl.textContent = info.hours;
}

function renderSocialLinks() {
    const links = getSiteData().socialLinks || defaultSiteData.socialLinks;
    const setHref = (id, href) => {
        const el = document.getElementById(id);
        if (el) el.href = href;
    };

    setHref('social-facebook', links.facebook);
    setHref('social-instagram', links.instagram);
    setHref('social-twitter', links.twitter);
    setHref('social-linkedin', links.linkedin);
    setHref('social-whatsapp', links.whatsapp);
}

function renderFooter() {
    const footer = document.getElementById('footerText');
    if (!footer) return;
    footer.textContent = getSiteData().footerText || defaultSiteData.footerText;
}

function renderAll() {
    renderHero();
    renderPosts();
    renderCourses();
    renderTestimonials();
    renderFaqs();
    renderContactInfo();
    renderSocialLinks();
    renderFooter();
}

function loadGallery() {
    renderPosts();
}

document.addEventListener('DOMContentLoaded', function() {
    initializeSiteData();
    renderAll();
});

window.addEventListener('storage', function(event) {
    if (event.key === cmsKey || legacyKeys.includes(event.key)) {
        renderAll();
    }
});
