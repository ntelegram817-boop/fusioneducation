/**
 * Discount & Event Calculator Utility
 * Handles pricing, promotional discounts, and live countdown timers for course campaigns.
 */

/**
 * Extract numeric value from fee string (e.g., "৳ 15,000" -> 15000)
 * @param {string|number} feeStr - Fee string or number
 * @returns {number} Numeric fee value
 */
function extractFeeValue(feeStr) {
    if (typeof feeStr === 'number') return feeStr;
    if (!feeStr) return 0;
    return parseInt(String(feeStr).replace(/[^\d]/g, ''), 10) || 0;
}

/**
 * Format number to Bengali currency format
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount (e.g., "৳ 15,000")
 */
function formatCurrency(amount) {
    const num = Number(amount) || 0;
    const formatted = num.toLocaleString('en-US');
    return `৳ ${formatted}`;
}

/**
 * Check if a promotional event is currently active (endDate is future)
 * @param {string|Date} endDate - Target end date string or object
 * @returns {boolean}
 */
function isEventActive(endDate) {
    if (!endDate) return false;
    const end = new Date(endDate).getTime();
    return !isNaN(end) && end > Date.now();
}

/**
 * Calculate remaining time breakdown for a countdown target
 * @param {string|Date} endDate - Target end date
 * @returns {object} { days, hours, minutes, seconds, isExpired, totalSeconds }
 */
function getRemainingTime(endDate) {
    if (!endDate) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
    }
    const end = new Date(endDate).getTime();
    if (isNaN(end)) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
    }

    const diffMs = end - Date.now();
    if (diffMs <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
        totalSeconds
    };
}

/**
 * Format remaining time as readable countdown string: "02d : 14h : 35m : 12s"
 * @param {string|Date} endDate 
 * @returns {string}
 */
function formatCountdown(endDate) {
    const rem = getRemainingTime(endDate);
    if (rem.isExpired) return 'Offer Ended';

    const pad = n => String(n).padStart(2, '0');
    if (rem.days > 0) {
        return `${rem.days}d : ${pad(rem.hours)}h : ${pad(rem.minutes)}m : ${pad(rem.seconds)}s`;
    }
    return `${pad(rem.hours)}h : ${pad(rem.minutes)}m : ${pad(rem.seconds)}s`;
}

/**
 * Calculate discounted price
 * @param {number} originalPrice - Original price amount
 * @param {string} discountType - Type of discount: 'percentage', 'fixed', or 'none'
 * @param {number} discountValue - Discount value (percentage or fixed amount)
 * @returns {object} Object with originalPrice, discount amount, finalPrice
 */
function calculateDiscount(originalPrice, discountType, discountValue) {
    const result = {
        originalPrice: originalPrice,
        discountType: discountType || 'none',
        discountValue: discountValue || 0,
        discountAmount: 0,
        finalPrice: originalPrice,
        hasDiscount: false,
        discountPercent: 0
    };

    if (!discountType || discountType === 'none' || !discountValue) {
        return result;
    }

    if (discountType === 'percentage') {
        const percent = parseFloat(discountValue);
        if (percent > 0 && percent <= 100) {
            result.discountAmount = Math.floor(originalPrice * percent / 100);
            result.finalPrice = originalPrice - result.discountAmount;
            result.hasDiscount = true;
            result.discountPercent = percent;
        }
    } else if (discountType === 'fixed') {
        const fixed = parseFloat(discountValue);
        if (fixed > 0 && fixed < originalPrice) {
            result.discountAmount = fixed;
            result.finalPrice = originalPrice - result.discountAmount;
            result.hasDiscount = true;
            result.discountPercent = Math.round((fixed / originalPrice) * 100);
        }
    }

    return result;
}

/**
 * Get comprehensive course pricing and event status
 * @param {object} course - Course object from DB
 * @param {string} [selectedBranch] - Optional branch selected by user (e.g. 'Dinajpur', 'Dhaka', 'all')
 * @returns {object}
 */
function getCoursePricing(course, selectedBranch = null) {
    if (!course) return null;

    // 1. Regular Course Fee
    const regularFee = Number(course.regularFee) || extractFeeValue(course.fee) || 15000;
    
    // 2. Check Course Fee Discount expiry & Branch matching
    let hasValidDiscount = false;
    let discountType = course.discountType || 'none';
    let discountValue = Number(course.discountValue) || 0;
    let discountBranch = course.discountBranch || 'all';

    let isBranchMatch = true;
    const isBranchRestricted = Boolean(discountBranch && discountBranch !== 'all');

    if (isBranchRestricted) {
        if (selectedBranch === null || selectedBranch === 'preview' || selectedBranch === 'all') {
            // General catalog / index preview mode: show available offer with branch tag
            isBranchMatch = true;
        } else if (typeof selectedBranch === 'string') {
            const cleanSel = selectedBranch.toLowerCase().replace(/branch/g, '').trim();
            const cleanTarget = String(discountBranch).toLowerCase().replace(/branch/g, '').trim();
            isBranchMatch = Boolean(cleanSel && cleanTarget && (cleanSel.includes(cleanTarget) || cleanTarget.includes(cleanSel)));
        } else {
            isBranchMatch = false;
        }
    }

    if (discountType !== 'none' && discountValue > 0 && isBranchMatch) {
        if (!course.discountEndDate || isEventActive(course.discountEndDate)) {
            hasValidDiscount = true;
        }
    }

    const discountInfo = hasValidDiscount 
        ? calculateDiscount(regularFee, discountType, discountValue)
        : {
            originalPrice: regularFee,
            discountType: 'none',
            discountValue: 0,
            discountAmount: 0,
            finalPrice: regularFee,
            hasDiscount: false,
            discountPercent: 0
        };

    // Attach branch information to discountInfo
    discountInfo.applicableBranch = discountBranch;
    discountInfo.isBranchRestricted = isBranchRestricted;
    discountInfo.isBranchMatch = isBranchMatch;

    // 3. Monthly Pay Event Status
    const monthlyEvent = course.monthlyEvent || {};
    const isMonthlyActive = Boolean(monthlyEvent.enabled && (!monthlyEvent.endDate || isEventActive(monthlyEvent.endDate)));
    const monthlyFee = Number(monthlyEvent.monthlyFee !== undefined ? monthlyEvent.monthlyFee : (course.monthlyFee || 1000));
    const admissionFee = Number(monthlyEvent.admissionFee !== undefined ? monthlyEvent.admissionFee : (course.admissionFee || 0));
    const monthlyEndDate = monthlyEvent.endDate || null;

    return {
        regularFee,
        finalCourseFee: discountInfo.finalPrice,
        discountInfo,
        hasDiscount: discountInfo.hasDiscount,
        discountBranch,
        discountEndDate: course.discountEndDate || null,
        isDiscountActive: hasValidDiscount,
        
        // Monthly Pay Event Details
        monthlyEvent: {
            enabled: Boolean(monthlyEvent.enabled),
            isActive: isMonthlyActive,
            eventTitle: monthlyEvent.eventTitle || 'Limited Intake: Monthly Tuition Offer',
            monthlyFee,
            admissionFee,
            endDate: monthlyEndDate,
            remainingText: isMonthlyActive ? formatCountdown(monthlyEndDate) : null
        }
    };
}

/**
 * Backward-compatible wrapper for getCourseDiscountInfo
 * @param {object} course 
 * @param {string} [selectedBranch] - Optional branch
 * @returns {object}
 */
function getCourseDiscountInfo(course, selectedBranch = null) {
    const pricing = getCoursePricing(course, selectedBranch);
    return pricing ? pricing.discountInfo : calculateDiscount(15000, 'none', 0);
}

/**
 * Get discount badge HTML for display
 * @param {object} discountInfo - Discount calculation result
 * @returns {string} HTML badge string
 */
function getDiscountBadgeHTML(discountInfo) {
    if (!discountInfo || !discountInfo.hasDiscount) return '';
    
    const badgeText = discountInfo.discountType === 'percentage' 
        ? `${discountInfo.discountPercent}% OFF`
        : `৳ ${discountInfo.discountAmount.toLocaleString('en-US')} OFF`;
    
    const branchBadge = discountInfo.applicableBranch && discountInfo.applicableBranch !== 'all'
        ? ` • ${discountInfo.applicableBranch}`
        : '';
    
    return `<div class="pricing-discount-badge" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 0.35rem 0.8rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 2px 8px rgba(16,185,129,0.3);"><i class="fas fa-tag"></i> ${badgeText}${branchBadge}</div>`;
}

/**
 * Get price display HTML with strikethrough original if discounted
 * @param {object} discountInfo - Discount calculation result
 * @returns {string} HTML price string
 */
function getPriceHTML(discountInfo) {
    if (!discountInfo || !discountInfo.hasDiscount) {
        return `<span class="price-final" style="font-size: 1.35rem; font-weight: 800; color: #38bdf8;">${formatCurrency(discountInfo?.originalPrice || 0)}</span>`;
    }
    
    return `
        <div style="display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap;">
            <span class="price-final" style="font-size: 1.45rem; font-weight: 800; color: #38bdf8;">${formatCurrency(discountInfo.finalPrice)}</span>
            <span class="price-original" style="font-size: 0.95rem; text-decoration: line-through; color: #94a3b8; font-weight: 500;">${formatCurrency(discountInfo.originalPrice)}</span>
        </div>
    `;
}

/**
 * Get comprehensive course price and offer section HTML for course detail cards
 * @param {object} course
 * @returns {string}
 */
function getCoursePriceSection(course) {
    if (!course) return '';
    const pricing = typeof getCoursePricing === 'function' ? getCoursePricing(course) : null;
    const regularFeeVal = pricing ? pricing.regularFee : (Number(course.regularFee) || 15000);
    const regularFeeStr = typeof formatCurrency === 'function' ? formatCurrency(regularFeeVal) : `৳ ${regularFeeVal}`;
    const hasDiscount = Boolean(pricing && pricing.hasDiscount);
    const isMonthlyOffer = Boolean(pricing && pricing.monthlyEvent && pricing.monthlyEvent.isActive);

    let priceHtml = '';
    let countdownHtml = '';

    if (hasDiscount) {
        const discInfo = pricing.discountInfo;
        const discBadgeText = discInfo.discountType === 'percentage'
            ? `${discInfo.discountPercent}% OFF`
            : `৳ ${discInfo.discountAmount.toLocaleString('en-US')} OFF`;
        
        priceHtml = `
            <div style="display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
                <span style="font-size: 1.4rem; font-weight: 800; color: #10b981;">${typeof formatCurrency === 'function' ? formatCurrency(pricing.finalCourseFee) : `৳ ${pricing.finalCourseFee}`}</span>
                <span style="text-decoration: line-through; opacity: 0.55; font-size: 0.95rem; color: #94a3b8; font-weight: 500;">${regularFeeStr}</span>
                <span style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 6px;">
                    <i class="fas fa-tag"></i> ${discBadgeText}
                </span>
            </div>
        `;
        if (pricing.discountEndDate && typeof isEventActive === 'function' && isEventActive(pricing.discountEndDate)) {
            countdownHtml = `
                <div class="course-countdown-strip" data-countdown-end="${pricing.discountEndDate}" style="margin: 0.5rem 0; background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.1)); border: 1px solid rgba(245,158,11,0.35); border-radius: 8px; padding: 0.35rem 0.65rem; display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; font-size: 0.78rem;">
                    <span style="color: #f59e0b; font-weight: 700; display:flex; align-items:center; gap:0.3rem;">
                        <i class="fas fa-stopwatch fa-spin"></i> Discount Ends:
                    </span>
                    <span class="countdown-display" style="font-family: monospace; font-weight: 800; color: #fbbf24; background: rgba(0,0,0,0.35); padding: 0.15rem 0.45rem; border-radius: 4px;">
                        <span class="countdown-text">${typeof formatCountdown === 'function' ? formatCountdown(pricing.discountEndDate) : ''}</span>
                    </span>
                </div>
            `;
        }
    } else if (isMonthlyOffer) {
        const mFeeVal = pricing.monthlyEvent.monthlyFee || 1000;
        priceHtml = `
            <div style="display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
                <span style="font-size: 1.4rem; font-weight: 800; color: #f59e0b;">৳ ${mFeeVal.toLocaleString()}<span style="font-size: 0.85rem; font-weight: 600; color: #cbd5e1;"> / month</span></span>
                <span style="text-decoration: line-through; opacity: 0.55; font-size: 0.95rem; color: #94a3b8; font-weight: 500;">${regularFeeStr}</span>
                <span style="background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); color: #fbbf24; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 6px;">
                    <i class="fas fa-fire"></i> Monthly Offer
                </span>
            </div>
        `;
        if (pricing.monthlyEvent.endDate && typeof isEventActive === 'function' && isEventActive(pricing.monthlyEvent.endDate)) {
            countdownHtml = `
                <div class="course-countdown-strip" data-countdown-end="${pricing.monthlyEvent.endDate}" style="margin: 0.5rem 0; background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.08)); border: 1px solid rgba(245,158,11,0.35); border-radius: 8px; padding: 0.35rem 0.65rem; display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; font-size: 0.78rem;">
                    <span style="color: #f59e0b; font-weight: 700; display:flex; align-items:center; gap:0.3rem;">
                        <i class="fas fa-fire fa-beat"></i> Monthly Pay: ৳${mFeeVal.toLocaleString()}/mo
                    </span>
                    <span class="countdown-display" style="font-family: monospace; font-weight: 800; color: #fbbf24; background: rgba(0,0,0,0.35); padding: 0.15rem 0.45rem; border-radius: 4px;">
                        <span class="countdown-text">${pricing.monthlyEvent.remainingText || (typeof formatCountdown === 'function' ? formatCountdown(pricing.monthlyEvent.endDate) : '')}</span>
                    </span>
                </div>
            `;
        }
    } else {
        priceHtml = `<p style="font-size: 1.25rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">${regularFeeStr}</p>`;
    }

    const durationText = course.duration || `${course.durationMonths || 3} Months Program`;
    return `
        ${priceHtml}
        ${countdownHtml}
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0.25rem 0 0;">${durationText}</p>
    `;
}

if (typeof window !== 'undefined') {
    window.getCoursePriceSection = getCoursePriceSection;
}

/**
 * Render an event countdown timer badge
 * @param {string|Date} endDate 
 * @param {string} title 
 * @returns {string}
 */
function getEventCountdownBadgeHTML(endDate, title = 'Special Offer') {
    if (!isEventActive(endDate)) return '';
    const countdown = formatCountdown(endDate);
    return `
        <div class="live-event-badge" data-countdown-end="${endDate}" style="background: linear-gradient(135deg, rgba(239,68,68,0.18), rgba(245,158,11,0.15)); border: 1px solid rgba(245,158,11,0.45); border-radius: 10px; padding: 0.5rem 0.75rem; margin-top: 0.65rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 700; color: #f59e0b;">
                <i class="fas fa-fire fa-beat" style="--fa-animation-duration: 1.5s;"></i>
                <span>${title}</span>
            </div>
            <div class="countdown-display" style="font-family: monospace; font-size: 0.82rem; font-weight: 800; color: #fbbf24; background: rgba(0,0,0,0.35); padding: 0.2rem 0.55rem; border-radius: 6px; letter-spacing: 0.04em;">
                <i class="fas fa-stopwatch" style="margin-right: 0.25rem;"></i><span class="countdown-text">${countdown}</span>
            </div>
        </div>
    `;
}

/**
 * Initialize live ticking timers on all [data-countdown-end] elements in the page
 */
var countdownIntervalId = typeof window !== 'undefined' ? (window.countdownIntervalId || null) : null;
function initLiveCountdowns() {
    if (countdownIntervalId) clearInterval(countdownIntervalId);

    function tick() {
        const elements = document.querySelectorAll('[data-countdown-end]');
        elements.forEach(el => {
            const end = el.getAttribute('data-countdown-end');
            if (!end) return;

            const rem = getRemainingTime(end);
            const textSpan = el.querySelector('.countdown-text') || el;
            if (rem.isExpired) {
                textSpan.textContent = 'Offer Expired';
                el.style.opacity = '0.6';
                if (el.classList.contains('hide-on-expire')) {
                    el.style.display = 'none';
                }
            } else {
                const pad = n => String(n).padStart(2, '0');
                let str = '';
                if (rem.days > 0) {
                    str = `${rem.days}d : ${pad(rem.hours)}h : ${pad(rem.minutes)}m : ${pad(rem.seconds)}s`;
                } else {
                    str = `${pad(rem.hours)}h : ${pad(rem.minutes)}m : ${pad(rem.seconds)}s`;
                }
                textSpan.textContent = str;
            }
        });
    }

    tick();
    countdownIntervalId = setInterval(tick, 1000);
}

// Auto-run when DOM is ready in browser
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLiveCountdowns);
    } else {
        initLiveCountdowns();
    }
}

// Export for Node if required
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        extractFeeValue,
        formatCurrency,
        isEventActive,
        getRemainingTime,
        formatCountdown,
        calculateDiscount,
        getCoursePricing,
        getCourseDiscountInfo,
        getDiscountBadgeHTML,
        getPriceHTML,
        getCoursePriceSection,
        getEventCountdownBadgeHTML,
        initLiveCountdowns
    };
}
