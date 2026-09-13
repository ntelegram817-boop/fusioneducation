// =====================================================
// FUSION EDUCATION BD - MAIN JAVASCRIPT
// ===================================================

// DOM Elements
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const scrollTopBtn = document.querySelector('.scroll-top');
const body = document.body;

// Dropdown Menu - 0.300 second visibility
let dropdownTimeout;
const navDropdown = document.querySelector('.nav-dropdown');
if (navDropdown) {
  const dropdownMenu = navDropdown.querySelector('.dropdown-menu');
  
  navDropdown.addEventListener('mouseenter', () => {
    clearTimeout(dropdownTimeout);
    dropdownMenu.classList.add('show');
  });
  
  navDropdown.addEventListener('mouseleave', () => {
    dropdownTimeout = setTimeout(() => {
      dropdownMenu.classList.remove('show');
    }, 300);
  });
}

// Mobile Menu Toggle
if (hamburger) {
  hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
  });

  // Close menu when link is clicked
  document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
      hamburger.classList.remove('active');
    });
  });
}

// Scroll to Top Button
window.addEventListener('scroll', () => {
  if (window.pageYOffset > 300) {
    scrollTopBtn?.classList.add('show');
  } else {
    scrollTopBtn?.classList.remove('show');
  }
});

scrollTopBtn?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Tab Functionality
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Show corresponding content
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId)?.classList.add('active');
    });
  });
}

// We removed the first initForms declaration entirely since it's redeclared at the bottom.

// Show Alert
function showAlert(message, type = 'success') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `<span>${message}</span>`;
  
  const container = document.querySelector('.container') || document.body;
  container.insertBefore(alert, container.firstChild);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    alert.style.opacity = '0';
    alert.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => alert.remove(), 300);
  }, 5000);
}

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return; // Guard against SyntaxError for empty hash links
    
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Counter Animation
function animateCounter(element, target, duration = 2000) {
  let current = 0;
  const increment = target / (duration / 16);
  const suffix = element.getAttribute('data-suffix') || '+';
  
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target + suffix;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current) + suffix;
    }
  }, 16);
}

// Intersection Observer for Performance, Lazy Loading & Animations
const observerOptions = {
  threshold: 0.08,
  rootMargin: '0px 0px -40px 0px'
};

const lazyAnimationObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');
      entry.target.classList.add('animated');
      
      // Animate counters
      if (entry.target.classList.contains('stat-number') || entry.target.querySelector('.stat-number')) {
        const statEl = entry.target.classList.contains('stat-number') ? entry.target : entry.target.querySelector('.stat-number');
        if (statEl && !statEl.animated) {
          const target = parseInt(statEl.textContent) || 0;
          if (target > 0) {
            animateCounter(statEl, target);
            statEl.animated = true;
          }
        }
      }
      
      obs.unobserve(entry.target);
    }
  });
}, observerOptions);

function observeLazyElements() {
  const elements = document.querySelectorAll('.card, .stat, .stat-card-modern, .course-card, .testimonial, .gallery-item, .story-card-modern, .reveal-lazy, .reveal-lazy-left, .reveal-lazy-right, .section .text-center');
  elements.forEach(el => {
    if (!el.classList.contains('is-revealed')) {
      if (!el.classList.contains('reveal-lazy') && !el.classList.contains('reveal-lazy-left') && !el.classList.contains('reveal-lazy-right')) {
        el.classList.add('reveal-lazy');
      }
      lazyAnimationObserver.observe(el);
    }
  });

  // Ensure all images have native lazy loading for data saving
  document.querySelectorAll('img:not([loading])').forEach(img => {
    if (!img.classList.contains('nav-logo-img')) {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    }
  });
}

// Observe initial static DOM
document.addEventListener('DOMContentLoaded', observeLazyElements);

// Re-observe whenever dynamic contents (courses, posts, testimonials) finish loading
window.addEventListener('load', () => {
  setTimeout(observeLazyElements, 300);
  setTimeout(observeLazyElements, 1000);
});

// Active Navigation Link
function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  document.querySelectorAll('.nav-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('load', setActiveNavLink);

// Prevent multiple form submissions
function preventDoubleSubmit() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn.disabled) {
        e.preventDefault();
      }
    });
  });
}

// ===== GALLERY MANAGEMENT =====
async function loadGallery() {
  if (typeof renderAll === 'function') {
    renderAll();
    return;
  }

  const container = document.getElementById('gallery-container');
  if (!container) return;

  let galleryItems = [];
  try {
    const response = await fetch('/api/gallery');
    const data = await response.json();
    if (data.success && Array.isArray(data.gallery) && data.gallery.length > 0) {
      galleryItems = data.gallery;
    } else {
      // Fallback if API fails or is empty
      galleryItems = JSON.parse(localStorage.getItem('galleryItems')) || getDefaultGalleryItems();
    }
  } catch (err) {
    console.error('Error fetching gallery:', err);
    galleryItems = JSON.parse(localStorage.getItem('galleryItems')) || getDefaultGalleryItems();
  }
  
  if (galleryItems.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 2rem; grid-column: 1/-1;">No gallery items yet. <a href="admin/dashboard.html">Add one from Admin Panel</a></p>';
    return;
  }

  container.innerHTML = '';
  galleryItems.forEach((item) => {
    const galleryItem = document.createElement('div');
    galleryItem.className = 'card';
    galleryItem.style.cssText = 'display: flex; gap: 1.5rem; align-items: center; padding: 2rem;';
    
    galleryItem.innerHTML = `
      <img src="${item.image || 'https://via.placeholder.com/300x300?text=No+Image'}" 
           alt="${item.title}" 
           style="width: 200px; height: 200px; border-radius: 16px; object-fit: cover; flex-shrink: 0;">
      <div>
        <h3>${item.title}</h3>
        <p style="color: var(--primary); font-weight: 600; margin-bottom: 0.5rem;">${item.subtitle}</p>
        <p>${item.description}</p>
      </div>
    `;
    
    container.appendChild(galleryItem);
  });
}

function getDefaultGalleryItems() {
  return [
    {
      title: 'Your Story Here',
      subtitle: 'Share your achievement',
      description: 'This is a placeholder. Edit from Admin Panel to add your own photos and success stories.',
      image: 'https://via.placeholder.com/300x300?text=Gallery+1'
    }
  ];
}

async function handleContactFormSubmission(form) {
  const formData = new FormData(form);
  const message = {
    name: formData.get('name') || document.getElementById('name')?.value,
    email: formData.get('email') || document.getElementById('email')?.value,
    phone: formData.get('phone') || document.getElementById('phone')?.value,
    subject: formData.get('subject') || document.getElementById('subject')?.value || 'General Inquiry',
    message: formData.get('message') || document.getElementById('message')?.value
  };

  try {
    const response = await fetch('/api/contactMessages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    
    const data = await response.json();
    if (data.success) {
      showAlert('Message sent successfully! We will contact you shortly.', 'success');
      form.reset();
    } else {
      showAlert('Could not send message. Please try again.', 'error');
    }
  } catch (err) {
    console.error('Contact form submission error:', err);
    showAlert('Could not send message. Please try again.', 'error');
  }
}

// Unified initForms to replace the duplicate declaration
function initForms() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    if (form.dataset.skipGenericSubmit === 'true') return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader"></span> Submitting...';
      }
      
      try {
        if (form.id === 'contactForm') {
          await handleContactFormSubmission(form);
        } else {
          // generic form simulation if needed
          await new Promise(resolve => setTimeout(resolve, 1500));
          showAlert('Form submitted successfully!', 'success');
          form.reset();
        }
      } catch (error) {
        showAlert('Error submitting form. Please try again.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  });
}

// Initialize Everything
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initializeSiteData === 'function') {
    initializeSiteData();
  }
  initTabs();
  initForms();
  loadGallery();
});

preventDoubleSubmit();

console.log('Fusion Education BD - Premium Website Loaded ✨');
