const getCollection = (col) => window.db.collection(col);

async function renderHero() {
    const heroSection = document.getElementById('heroSection');
    const title = document.getElementById('heroTitle');
    const subtitle = document.getElementById('heroSubtitle');
    const heroCta = document.getElementById('heroCta');
    const heroSecondaryCta = document.getElementById('heroSecondaryCta');

    try {
        const docSnap = await getCollection('settings').doc('site').get();
        if (docSnap.exists) {
            const data = docSnap.data();
            const hero = data.hero || {};
            
            if (heroSection) {
                if (hero.image) {
                    heroSection.style.backgroundImage = `linear-gradient(135deg, rgba(11, 18, 32, 0.85) 0%, rgba(31, 41, 55, 0.85) 100%), url(${hero.image})`;
                } else {
                    heroSection.style.backgroundImage = '';
                }
            }
            if (title) title.textContent = hero.title || 'Learn Japanese, Build Your Future';
            if (subtitle) subtitle.textContent = hero.subtitle || 'Master the Japanese language and unlock education and work opportunities in Japan.';
            if (heroCta) {
                heroCta.textContent = hero.ctaText || 'Start Your Journey';
                if(hero.ctaUrl) heroCta.href = hero.ctaUrl;
            }
            if (heroSecondaryCta) {
                heroSecondaryCta.textContent = hero.secondaryCtaText || 'Free Consultation';
                if(hero.secondaryCtaUrl) heroSecondaryCta.href = hero.secondaryCtaUrl;
            }
        }
    } catch(err) {
        console.error("Error loading hero", err);
    }
}

async function renderPosts() {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    try {
        const snapshot = await getCollection('posts').orderBy('createdAt', 'desc').get();
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));

        container.innerHTML = '';
        if (!items.length) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; grid-column: 1/-1;">No posts available.</p>';
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
    } catch(err) {
        console.error("Error loading posts", err);
    }
}

async function renderCourses() {
    const container = document.getElementById('coursesGrid');
    if (!container) return;

    try {
        const snapshot = await getCollection('courses').orderBy('createdAt', 'desc').get();
        const courses = [];
        snapshot.forEach(doc => courses.push({ id: doc.id, ...doc.data() }));

        container.innerHTML = '';
        if (!courses.length) {
            container.innerHTML = '<p style="text-align:center; padding:2rem; grid-column:1/-1;">No courses available.</p>';
            return;
        }

        container.innerHTML = courses.map(course => {
            const discountInfo = typeof getCourseDiscountInfo === 'function' ? getCourseDiscountInfo(course) : null;
            const feeDisplay = discountInfo && discountInfo.hasDiscount 
                ? `<span style="text-decoration: line-through; opacity: 0.6; margin-right: 0.5rem;">${course.fee}</span> <strong>${formatCurrency(discountInfo.finalPrice)}</strong>`
                : `<strong>${course.fee}</strong>`;

            return `
            <div class="course-card">
                <div class="course-thumbnail">📘</div>
                <div class="course-content">
                    <span class="course-level">${course.level}</span>
                    <h3 class="course-title">${course.title}</h3>
                    <div class="course-meta">
                        <div class="course-meta-item"><i class="fas fa-clock"></i> ${course.duration}</div>
                        <div class="course-meta-item"><i class="fas fa-users"></i> ${course.students}</div>
                    </div>
                    <div class="course-fee">${feeDisplay}</div>
                    <p style="font-size: 0.9rem;">${course.description}</p>
                    <a href="${course.link || 'pages/contact.html'}" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">View Course</a>
                </div>
            </div>
            `;
        }).join('');
    } catch(err) {
        console.error("Error loading courses", err);
    }
}

async function renderTestimonials() {
    const container = document.getElementById('testimonialsContainer');
    if (!container) return;

    try {
        const snapshot = await getCollection('testimonials').orderBy('createdAt', 'desc').get();
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));

        if (!items.length) {
            container.innerHTML = '<p style="text-align:center; padding:2rem; grid-column:1/-1;">No testimonials yet.</p>';
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
    } catch(err) {
        console.error("Error loading testimonials", err);
    }
}

async function renderFaqs() {
    const container = document.getElementById('faqList');
    if (!container) return;

    try {
        const snapshot = await getCollection('faqs').orderBy('createdAt', 'desc').get();
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));

        if (!items.length) {
            container.innerHTML = '<p style="text-align:center; padding:2rem; grid-column:1/-1;">No FAQs available.</p>';
            return;
        }

        container.innerHTML = items.map(faq => `
            <div class="card mb-3">
                <h4 style="margin-bottom: 0.5rem;">${faq.question}</h4>
                <p>${faq.answer}</p>
            </div>
        `).join('');
    } catch(err) {
        console.error("Error loading FAQs", err);
    }
}

async function renderContactAndSocials() {
    try {
        const docSnap = await getCollection('settings').doc('site').get();
        if (docSnap.exists) {
            const data = docSnap.data();
            const info = data.contactInfo || {};
            const links = data.socialLinks || {};

            // Contact
            const addressEl = document.getElementById('contact-address');
            const phoneEl = document.getElementById('contact-phone');
            const emailEl = document.getElementById('contact-email');
            const hoursEl = document.getElementById('contact-hours');

            if (addressEl) addressEl.innerHTML = (info.address || '').replace(/\n/g, '<br>');
            if (phoneEl) {
                phoneEl.textContent = info.phone || '';
                phoneEl.href = info.phone ? `tel:${info.phone.replace(/\s+/g, '')}` : '#';
            }
            if (emailEl) {
                emailEl.textContent = info.email || '';
                emailEl.href = info.email ? `mailto:${info.email}` : '#';
            }
            if (hoursEl) hoursEl.textContent = info.hours || '';

            // Socials
            const setHref = (id, href) => {
                const el = document.getElementById(id);
                if (el && href) el.href = href;
            };

            setHref('social-facebook', links.facebook);
            setHref('social-instagram', links.instagram);
            setHref('social-twitter', links.twitter);
            setHref('social-linkedin', links.linkedin);
            setHref('social-whatsapp', links.whatsapp);

            // Footer
            const footer = document.getElementById('footerText');
            if (footer && data.footerText) {
                footer.textContent = data.footerText;
            }
        }
    } catch(err) {
        console.error("Error loading contact and socials", err);
    }
}

async function renderAll() {
    await renderHero();
    await renderPosts();
    await renderCourses();
    await renderTestimonials();
    await renderFaqs();
    await renderContactAndSocials();
}

document.addEventListener('DOMContentLoaded', function() {
    if(window.db) {
        renderAll();
    }
});
