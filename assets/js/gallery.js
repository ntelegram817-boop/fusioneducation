// ============================================================
// FUSION EDUCATION BD — PUBLIC PAGE RENDERER
// Reads all public data via window.DAO (dao.js)
// ============================================================

async function renderHero() {
    const heroSection = document.getElementById('heroSection');
    const title = document.getElementById('heroTitle');
    const subtitle = document.getElementById('heroSubtitle');
    const heroCta = document.getElementById('heroCta');
    const heroSec = document.getElementById('heroSecondaryCta');

    try {
        const data = window.DAO ? await window.DAO.Settings.get() : {};
        const hero = data.hero || {};

        if (heroSection) {
            const bgImg = hero.image || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&auto=format&fit=crop&q=80';
            heroSection.style.backgroundImage = `linear-gradient(135deg, rgba(11, 18, 32, 0.65) 0%, rgba(15, 23, 42, 0.45) 50%, rgba(230, 0, 18, 0.2) 100%), url(${bgImg})`;
            heroSection.style.backgroundSize = 'cover';
            heroSection.style.backgroundPosition = 'center';
        }
        if (title) title.textContent = hero.title || 'Learn Japanese, Build Your Future';
        if (subtitle) subtitle.textContent = hero.subtitle || 'Master the Japanese language and unlock opportunities for education and employment in Japan with our comprehensive training and visa support services.';
        if (heroCta) {
            heroCta.textContent = hero.ctaText || 'Start Your Journey';
            if (hero.ctaUrl) heroCta.href = hero.ctaUrl;
        }
        if (heroSec) {
            heroSec.textContent = hero.secondaryCtaText || 'Free Consultation';
            if (hero.secondaryCtaUrl) heroSec.href = hero.secondaryCtaUrl;
        }
    } catch (err) {
        console.error('[gallery] Error loading hero:', err);
    }
}

async function renderPosts() {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    try {
        const items = await window.DAO.Posts.getAll();

        container.innerHTML = '';
        if (!items.length) {
            container.innerHTML = '<p style="text-align:center;padding:2rem;grid-column:1/-1;">No posts available.</p>';
            return;
        }

        const photoSizeMap = { small: '250px', medium: '350px', large: '450px' };

        items.forEach(item => {
            const photoWidth = photoSizeMap[item.photoSize] || '350px';
            const hasPhotoLink = item.photoLink && item.photoLink.trim();
            const hasButton = item.buttonText && item.buttonUrl;

            const imageEl = `
                ${hasPhotoLink ? `<a href="${item.photoLink}" target="_blank" rel="noopener noreferrer">` : ''}
                    <img src="${item.image}" alt="${item.title}"
                         style="width:100%;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.15);">
                ${hasPhotoLink ? '</a>' : ''}
            `;
            const buttonHtml = hasButton
                ? `<a href="${item.buttonUrl}" target="_blank" rel="noopener noreferrer"
                      class="btn btn-primary"
                      style="margin-top:1rem;display:inline-flex;align-items:center;gap:0.5rem;">
                       ${item.buttonText}
                   </a>`
                : '';

            if (item.layout === 'horizontal') {
                container.innerHTML += `
                    <div class="gallery-item gallery-horizontal">
                        <div class="gallery-photo" style="flex:0 0 ${photoWidth};height:auto;">${imageEl}</div>
                        <div class="gallery-text" style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 2rem;">
                            <h3 style="color:var(--primary);margin-bottom:1rem;">${item.title}</h3>
                            <p style="line-height:1.8;color:var(--text-secondary);">${item.text}</p>
                            ${buttonHtml}
                        </div>
                    </div>`;
            } else {
                container.innerHTML += `
                    <div class="gallery-item gallery-vertical">
                        <div class="gallery-photo" style="width:100%;margin-bottom:1.5rem;">${imageEl}</div>
                        <div class="gallery-text">
                            <h3 style="color:var(--primary);margin-bottom:1rem;">${item.title}</h3>
                            <p style="line-height:1.8;color:var(--text-secondary);">${item.text}</p>
                            ${buttonHtml}
                        </div>
                    </div>`;
            }
        });
    } catch (err) {
        console.error('[gallery] Error loading posts:', err);
    }
}

async function renderCourses() {
    const container = document.getElementById('coursesGrid');
    if (!container) return;

    try {
        const courses = await window.DAO.Courses.getAll();

        container.innerHTML = '';
        if (!courses.length) {
            container.innerHTML = '<p style="text-align:center;padding:2rem;grid-column:1/-1;">No courses available.</p>';
            return;
        }

        container.innerHTML = courses.map(course => {
            const discountInfo = typeof getCourseDiscountInfo === 'function' ? getCourseDiscountInfo(course) : null;
            const feeDisplay = discountInfo && discountInfo.hasDiscount
                ? `<span style="text-decoration:line-through;opacity:0.6;margin-right:0.5rem;">${course.fee}</span>
                   <strong>${formatCurrency(discountInfo.finalPrice)}</strong>`
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
                    <p style="font-size:0.9rem;">${course.description}</p>
                    <a href="${course.link || 'pages/contact.html'}" class="btn btn-primary" style="width:100%;margin-top:1rem;">View Course</a>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error('[gallery] Error loading courses:', err);
    }
}

async function renderTestimonials() {
    const container = document.getElementById('testimonialsContainer');
    if (!container) return;

    try {
        const items = await window.DAO.Testimonials.getAll();

        if (!items.length) {
            container.innerHTML = '<p style="text-align:center;padding:2rem;grid-column:1/-1;">No testimonials yet.</p>';
            return;
        }

        container.innerHTML = items.map(t => `
            <div class="testimonial">
                <div class="testimonial-quote">"</div>
                <p class="testimonial-text">${t.text}</p>
                <div class="testimonial-author">
                    <div class="author-avatar">${t.avatar || t.name.slice(0, 2).toUpperCase()}</div>
                    <div class="author-info">
                        <h4>${t.name}</h4>
                        <p>${t.role}</p>
                    </div>
                </div>
            </div>`).join('');
    } catch (err) {
        console.error('[gallery] Error loading testimonials:', err);
    }
}

async function renderFaqs() {
    const container = document.getElementById('faqList');
    if (!container) return;

    try {
        const items = await window.DAO.Faqs.getAll();

        if (!items.length) {
            container.innerHTML = '<p style="text-align:center;padding:2rem;">No FAQs available.</p>';
            return;
        }

        container.innerHTML = items.map(faq => `
            <div class="card mb-3">
                <h4 style="margin-bottom:0.5rem;">${faq.question}</h4>
                <p>${faq.answer}</p>
            </div>`).join('');
    } catch (err) {
        console.error('[gallery] Error loading FAQs:', err);
    }
}

async function renderContactAndSocials() {
    try {
        const data = await window.DAO.Settings.get();
        const info = data.contactInfo || {};
        const links = data.socialLinks || {};

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

        const setHref = (id, href) => {
            const el = document.getElementById(id);
            if (el && href) el.href = href;
        };
        setHref('social-facebook', links.facebook);
        setHref('social-instagram', links.instagram);
        setHref('social-twitter', links.twitter);
        setHref('social-linkedin', links.linkedin);
        setHref('social-whatsapp', links.whatsapp);

        const footer = document.getElementById('footerText');
        if (footer && data.footerText) footer.textContent = data.footerText;

        if (data.brandColors && window.DAO && typeof window.DAO.applyBrandColors === 'function') {
            window.DAO.applyBrandColors(data.brandColors);
        }

    } catch (err) {
        console.error('[gallery] Error loading contact & socials:', err);
    }
}

async function renderAll() {
    await Promise.all([
        renderHero(),
        renderPosts(),
        renderCourses(),
        renderTestimonials(),
        renderFaqs(),
        renderContactAndSocials()
    ]);
}

document.addEventListener('DOMContentLoaded', function () {
    if (window.DAO) {
        renderAll();
    } else {
        setTimeout(renderAll, 100);
    }
});
