/**
 * Discount Calculator Utility
 * Calculates discounted prices based on percentage or fixed amount
 */

/**
 * Extract numeric value from fee string (e.g., "৳ 15,000" -> 15000)
 * @param {string} feeStr - Fee string
 * @returns {number} Numeric fee value
 */
function extractFeeValue(feeStr) {
    if (!feeStr) return 0;
    return parseInt(feeStr.replace(/[^\d]/g, '')) || 0;
}

/**
 * Format number to Bengali currency format
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount (e.g., "৳ 15,000")
 */
function formatCurrency(amount) {
    const formatted = amount.toLocaleString('en-US');
    return `৳ ${formatted}`;
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
        // Percentage discount
        const percent = parseFloat(discountValue);
        if (percent > 0 && percent <= 100) {
            result.discountAmount = Math.floor(originalPrice * percent / 100);
            result.finalPrice = originalPrice - result.discountAmount;
            result.hasDiscount = true;
            result.discountPercent = percent;
        }
    } else if (discountType === 'fixed') {
        // Fixed amount discount
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
 * Get discount information from course object
 * @param {object} course - Course object
 * @returns {object} Discount calculation result
 */
function getCourseDiscountInfo(course) {
    const originalPrice = extractFeeValue(course.fee);
    return calculateDiscount(
        originalPrice,
        course.discountType || 'none',
        course.discountValue || 0
    );
}

/**
 * Get discount badge HTML for display
 * @param {object} discountInfo - Discount calculation result
 * @returns {string} HTML badge string
 */
function getDiscountBadgeHTML(discountInfo) {
    if (!discountInfo.hasDiscount) return '';
    
    const badgeText = discountInfo.discountType === 'percentage' 
        ? `${discountInfo.discountPercent}% OFF`
        : `৳ ${discountInfo.discountAmount.toLocaleString('en-US')} OFF`;
    
    return `<div style="background: linear-gradient(135deg, #10b981, #34d399); color: white; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; text-align: center; margin-bottom: 0.75rem;">${badgeText}</div>`;
}

/**
 * Get price display HTML with strikethrough original if discounted
 * @param {object} discountInfo - Discount calculation result
 * @returns {string} HTML price string
 */
function getPriceHTML(discountInfo) {
    if (!discountInfo.hasDiscount) {
        return `<p style="font-size: 1.25rem; font-weight: 600; color: var(--primary);">${formatCurrency(discountInfo.originalPrice)}</p>`;
    }
    
    return `
        <p style="font-size: 1.25rem; font-weight: 600; color: var(--primary); display: flex; align-items: center; gap: 0.75rem;">
            ${formatCurrency(discountInfo.finalPrice)}
            <span style="font-size: 0.85rem; text-decoration: line-through; color: var(--text-secondary); font-weight: 400;">${formatCurrency(discountInfo.originalPrice)}</span>
        </p>
    `;
}

/**
 * Get complete price section HTML with discount badge and pricing
 * @param {object} course - Course object
 * @returns {string} HTML string
 */
function getCoursePriceSection(course) {
    const discountInfo = getCourseDiscountInfo(course);
    return `
        <div style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-light);">
            ${getDiscountBadgeHTML(discountInfo)}
            ${getPriceHTML(discountInfo)}
            <p style="color: var(--text-secondary); font-size: 0.9rem;">${course.duration || 'Program'}</p>
        </div>
    `;
}
