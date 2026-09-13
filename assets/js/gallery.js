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
            heroSection.style.backgroundImage = `linear-gradient(180deg, rgba(8, 10, 16, 0.72) 0%, rgba(8, 10, 16, 0.35) 45%, rgba(8, 10, 16, 0.88) 100%), url(${bgImg})`;
            heroSection.style.backgroundSize = 'cover';
            heroSection.style.backgroundPosition = 'center 35%';
        }
        if (title) title.textContent = hero.title || 'Learn Japanese , Build Your Future';
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
                    <img src="${item.image}" alt="${item.title}" loading="lazy" decoding="async"
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
        if (!courses || !courses.length) {
            container.innerHTML = '<p style="text-align:center;padding:2rem;grid-column:1/-1;">No courses available.</p>';
            return;
        }

        container.innerHTML = courses.map(course => {
            const pricing = typeof getCoursePricing === 'function' ? getCoursePricing(course) : null;
            const regularFeeVal = pricing ? pricing.regularFee : (Number(course.regularFee) || (typeof extractFeeValue === 'function' ? extractFeeValue(course.fee) : 15000));
            const regularFeeStr = typeof formatCurrency === 'function' ? formatCurrency(regularFeeVal) : (course.fee || `৳ ${regularFeeVal}`);
            const discountInfo = pricing ? pricing.discountInfo : (typeof getCourseDiscountInfo === 'function' ? getCourseDiscountInfo(course) : null);
            const hasDiscount = Boolean(pricing ? pricing.hasDiscount : (discountInfo && discountInfo.hasDiscount));

            const branchLabel = course.discountBranch && course.discountBranch !== 'all'
                ? `${course.discountBranch} Branch`
                : 'All Branches';

            const isMonthlyOffer = Boolean(pricing && pricing.monthlyEvent && pricing.monthlyEvent.isActive);

            const discountBadgeHtml = hasDiscount
                ? `<div class="course-discount-pill" style="display:inline-flex; align-items:center; gap:0.35rem; background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-size: 0.72rem; font-weight: 700; padding: 0.22rem 0.6rem; border-radius: 999px; box-shadow: 0 2px 6px rgba(16,185,129,0.3);">
                     <i class="fas fa-tag"></i> ${discountInfo.discountType === 'percentage' ? `${discountInfo.discountPercent}% OFF` : `৳ ${discountInfo.discountAmount.toLocaleString('en-US')} OFF`}
                   </div>`
                : (isMonthlyOffer
                    ? `<div class="course-discount-pill" style="display:inline-flex; align-items:center; gap:0.35rem; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-size: 0.72rem; font-weight: 700; padding: 0.22rem 0.6rem; border-radius: 999px; box-shadow: 0 2px 6px rgba(245,158,11,0.3);">
                         <i class="fas fa-fire"></i> Monthly Offer
                       </div>`
                    : '');

            const branchTagHtml = hasDiscount && course.discountBranch && course.discountBranch !== 'all'
                ? `<div style="font-size: 0.75rem; color: #10b981; font-weight: 600; margin-top: 0.25rem; display: flex; align-items: center; gap: 0.3rem;">
                     <i class="fas fa-map-marker-alt"></i> Discount at ${branchLabel}
                   </div>`
                : '';

            let feeDisplay = '';
            if (hasDiscount) {
                feeDisplay = `<div style="display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap;">
                     <span style="font-size: 1.45rem; font-weight: 800; color: #10b981;">${typeof formatCurrency === 'function' ? formatCurrency(pricing ? pricing.finalCourseFee : discountInfo.finalPrice) : `৳ ${(pricing ? pricing.finalCourseFee : discountInfo.finalPrice)}`}</span>
                     <span style="text-decoration: line-through; opacity: 0.55; font-size: 0.92rem; color: #94a3b8; font-weight: 500;">${regularFeeStr}</span>
                   </div>
                   ${branchTagHtml}`;
            } else if (isMonthlyOffer) {
                const mFeeVal = pricing.monthlyEvent.monthlyFee || 1000;
                feeDisplay = `<div style="display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap;">
                     <span style="font-size: 1.45rem; font-weight: 800; color: #f59e0b;">৳ ${mFeeVal.toLocaleString()}<span style="font-size:0.85rem; font-weight:600; color:#cbd5e1;"> / month</span></span>
                     <span style="text-decoration: line-through; opacity: 0.55; font-size: 0.92rem; color: #94a3b8; font-weight: 500;">${regularFeeStr}</span>
                   </div>`;
            } else {
                feeDisplay = `<div style="font-size: 1.45rem; font-weight: 800; color: var(--primary);">${regularFeeStr}</div>`;
            }

            // Live Countdown Timer Strip (Discount & Monthly Event)
            let countdownHtml = '';
            if (pricing && pricing.hasDiscount && pricing.discountEndDate && typeof isEventActive === 'function' && isEventActive(pricing.discountEndDate)) {
                countdownHtml = `
                    <div class="course-countdown-strip" data-countdown-end="${pricing.discountEndDate}" style="margin: 0.65rem 0; background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.1)); border: 1px solid rgba(245,158,11,0.35); border-radius: 8px; padding: 0.4rem 0.65rem; display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; font-size: 0.76rem;">
                        <span style="color: #f59e0b; font-weight: 700; display:flex; align-items:center; gap:0.3rem;">
                            <i class="fas fa-stopwatch fa-spin"></i> Offer Ends:
                        </span>
                        <span class="countdown-display" style="font-family: monospace; font-weight: 800; color: #fbbf24; background: rgba(0,0,0,0.35); padding: 0.15rem 0.45rem; border-radius: 4px;">
                            <span class="countdown-text">${typeof formatCountdown === 'function' ? formatCountdown(pricing.discountEndDate) : ''}</span>
                        </span>
                    </div>`;
            } else if (isMonthlyOffer && pricing.monthlyEvent.endDate) {
                countdownHtml = `
                    <div class="course-countdown-strip" data-countdown-end="${pricing.monthlyEvent.endDate}" style="margin: 0.65rem 0; background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.08)); border: 1px solid rgba(245,158,11,0.35); border-radius: 8px; padding: 0.4rem 0.65rem; display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; font-size: 0.76rem;">
                        <span style="color: #f59e0b; font-weight: 700; display:flex; align-items:center; gap:0.3rem;">
                            <i class="fas fa-fire fa-beat"></i> Monthly: ৳${pricing.monthlyEvent.monthlyFee.toLocaleString()}/mo
                        </span>
                        <span class="countdown-display" style="font-family: monospace; font-weight: 800; color: #fbbf24; background: rgba(0,0,0,0.35); padding: 0.15rem 0.45rem; border-radius: 4px;">
                            <span class="countdown-text">${pricing.monthlyEvent.remainingText || (typeof formatCountdown === 'function' ? formatCountdown(pricing.monthlyEvent.endDate) : '')}</span>
                        </span>
                    </div>`;
            }

            const offerBadgeHtml = hasDiscount 
                ? `<div style="position: absolute; top: 12px; right: 12px; background: rgba(16,185,129,0.92); backdrop-filter:blur(4px); color: white; padding: 0.25rem 0.65rem; border-radius: 8px; font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; gap: 0.3rem; box-shadow: 0 4px 10px rgba(0,0,0,0.25);"><i class="fas fa-tag"></i> SPECIAL DISCOUNT</div>`
                : (isMonthlyOffer ? `<div style="position: absolute; top: 12px; right: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); backdrop-filter:blur(4px); color: white; padding: 0.25rem 0.65rem; border-radius: 8px; font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; gap: 0.3rem; box-shadow: 0 4px 10px rgba(0,0,0,0.25);"><i class="fas fa-fire"></i> MONTHLY OFFER</div>` : '');

            return `
            <div class="course-card" style="position: relative;">
                <div class="course-thumbnail" style="position: relative;">
                    <span>📘</span>
                    ${offerBadgeHtml}
                </div>
                <div class="course-content">
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.5rem;">
                        <span class="course-level">${course.level}</span>
                        ${discountBadgeHtml}
                    </div>
                    <h3 class="course-title">${course.title}</h3>
                    <div class="course-meta">
                        <div class="course-meta-item"><i class="fas fa-clock"></i> ${course.duration}</div>
                        <div class="course-meta-item"><i class="fas fa-users"></i> ${course.students}</div>
                    </div>
                    <div class="course-fee" style="margin: 0.75rem 0;">${feeDisplay}</div>
                    ${countdownHtml}
                    <p style="font-size:0.9rem; line-height: 1.5; color: var(--text-secondary);">${course.description}</p>
                    <a href="${course.link || 'pages/admission.html'}" class="btn btn-primary" style="width:100%;margin-top:1.25rem;">View Course / Enroll</a>
                </div>
            </div>`;
        }).join('');

        if (typeof initLiveCountdowns === 'function') {
            initLiveCountdowns();
        }
    } catch (err) {
        console.error('[gallery] Error loading courses:', err);
    }
}

let storyCurrentIndex = 0;
let storyAutoPlayTimer = null;

async function renderTestimonials() {
    const container = document.getElementById('testimonialsContainer');
    if (!container) return;

    try {
        const items = await window.DAO.Testimonials.getAll();

        if (!items || !items.length) {
            container.innerHTML = '<p style="text-align:center;padding:2rem;width:100%;color:#64748b;">No success stories published yet.</p>';
            return;
        }

        container.innerHTML = items.map(t => {
            const quoteText = t.quote || t.text || t.message || 'Fusion Education BD guided my Japanese language training and visa processing smoothly!';
            const studentName = t.name || 'Alumni Student';
            const studentRole = t.course || t.role || t.status || 'JLPT Student • Japan Visa';
            const rating = Number(t.rating) || 5;
            const starsHtml = '★'.repeat(Math.min(5, Math.max(1, rating))) + '☆'.repeat(5 - Math.min(5, Math.max(1, rating)));
            const initials = studentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'FE';
            const isImgUrl = t.image && (t.image.startsWith('http') || t.image.startsWith('../') || t.image.startsWith('data:'));

            return `
            <div class="story-slide-item">
                <div class="story-card-modern">
                    <div>
                        <div class="story-card-header">
                            <div class="story-stars" title="${rating} out of 5 stars">${starsHtml}</div>
                            <span class="story-quote-icon">“</span>
                        </div>
                        <p class="story-quote-text">"${quoteText}"</p>
                    </div>
                    <div class="story-author-box">
                        ${isImgUrl ? `
                            <img src="${t.image}" alt="${studentName}" class="story-author-avatar" loading="lazy" decoding="async" onerror="this.outerHTML='<div class=\\'story-author-initials\\'>${initials}</div>'">
                        ` : `
                            <div class="story-author-initials">${t.avatar || initials}</div>
                        `}
                        <div>
                            <div class="story-author-name">${studentName}</div>
                            <div class="story-author-role"><i class="fas fa-check-circle" style="font-size:0.75rem;"></i> ${studentRole}</div>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

        initStoryCarousel(items.length);

    } catch (err) {
        console.error('[gallery] Error loading testimonials:', err);
    }
}

function initStoryCarousel(totalItems) {
    const track = document.getElementById('testimonialsContainer');
    const prevBtn = document.getElementById('prevStoryBtn');
    const nextBtn = document.getElementById('nextStoryBtn');
    const dotsContainer = document.getElementById('storyDots');
    const wrapper = document.querySelector('.stories-carousel-wrapper');
    if (!track) return;

    function getVisibleCards() {
        if (window.innerWidth <= 640) return 1;
        if (window.innerWidth <= 992) return 2;
        return 3;
    }

    function getMaxIndex() {
        const visible = getVisibleCards();
        return Math.max(0, totalItems - visible);
    }

    function updateCarousel() {
        const visible = getVisibleCards();
        const maxIdx = getMaxIndex();
        if (storyCurrentIndex > maxIdx) storyCurrentIndex = maxIdx;
        if (storyCurrentIndex < 0) storyCurrentIndex = 0;

        const slides = track.querySelectorAll('.story-slide-item');
        if (slides.length && slides[0]) {
            const slideWidth = slides[0].offsetWidth;
            const gap = 24; // 1.5rem gap
            track.style.transform = `translateX(-${storyCurrentIndex * (slideWidth + gap)}px)`;
        }

        // Update dots
        if (dotsContainer) {
            const totalDots = maxIdx + 1;
            dotsContainer.innerHTML = Array.from({ length: totalDots }).map((_, i) => `
                <button type="button" class="story-dot ${i === storyCurrentIndex ? 'active' : ''}" aria-label="Go to slide ${i + 1}" onclick="goToStorySlide(${i})"></button>
            `).join('');
        }

        if (prevBtn) prevBtn.style.opacity = storyCurrentIndex === 0 ? '0.4' : '1';
        if (nextBtn) nextBtn.style.opacity = storyCurrentIndex >= maxIdx ? '0.4' : '1';
    }

    window.goToStorySlide = function(idx) {
        storyCurrentIndex = idx;
        updateCarousel();
    };

    if (prevBtn) {
        prevBtn.onclick = () => {
            const maxIdx = getMaxIndex();
            storyCurrentIndex = storyCurrentIndex > 0 ? storyCurrentIndex - 1 : maxIdx;
            updateCarousel();
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            const maxIdx = getMaxIndex();
            storyCurrentIndex = storyCurrentIndex < maxIdx ? storyCurrentIndex + 1 : 0;
            updateCarousel();
        };
    }

    // Auto Play every 4.5 seconds
    if (storyAutoPlayTimer) clearInterval(storyAutoPlayTimer);
    storyAutoPlayTimer = setInterval(() => {
        const maxIdx = getMaxIndex();
        storyCurrentIndex = storyCurrentIndex < maxIdx ? storyCurrentIndex + 1 : 0;
        updateCarousel();
    }, 4500);

    if (wrapper) {
        wrapper.onmouseenter = () => {
            if (storyAutoPlayTimer) clearInterval(storyAutoPlayTimer);
        };
        wrapper.onmouseleave = () => {
            if (storyAutoPlayTimer) clearInterval(storyAutoPlayTimer);
            storyAutoPlayTimer = setInterval(() => {
                const maxIdx = getMaxIndex();
                storyCurrentIndex = storyCurrentIndex < maxIdx ? storyCurrentIndex + 1 : 0;
                updateCarousel();
            }, 4500);
        };
    }

    window.addEventListener('resize', updateCarousel);
    setTimeout(updateCarousel, 100);
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

    if (typeof observeLazyElements === 'function') {
        observeLazyElements();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if (window.DAO) {
        renderAll();
    } else {
        setTimeout(renderAll, 100);
    }
});
