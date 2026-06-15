# Fusion Education BD - Premium Website

A modern, premium website for Fusion Education BD Japanese language institute and visa consultation agency, built with cutting-edge design principles and best practices.

## 🎨 Design Features

### Visual Design
- **Premium Design System**: RGB glowing borders, glassmorphism effects, smooth animations
- **Color Scheme**:
  - Primary: #E60012 (Japan Red)
  - Secondary: #111827 (Dark)
  - Accent: #2563EB (Blue)
  - Background: #0B1020 & #F8FAFC

### Typography
- **Headings**: Poppins / Sora
- **Body**: Inter
- **Responsive**: Mobile-first design

### Interactive Elements
- Animated RGB glowing borders on buttons, cards, and inputs
- Smooth hover effects and transitions
- Floating WhatsApp and scroll-to-top buttons
- Sticky navigation header
- Mobile hamburger menu
- Multi-step forms with progress indicators

## 📁 Project Structure

```
website-2/
├── index.html                 # Home page
├── assets/
│   ├── css/
│   │   └── style.css         # Main stylesheet with design system
│   ├── js/
│   │   └── main.js           # JavaScript for interactions
│   └── images/               # Image assets folder
├── pages/
│   ├── about.html            # About Us page
│   ├── courses.html          # Courses page
│   ├── visa-support.html     # Visa Support services
│   ├── contact.html          # Contact page
│   ├── admission.html        # Online admission form
│   ├── success-stories.html  # Student success stories
│   ├── student-login.html    # Student login
│   └── admin-login.html      # Admin login
└── admin/                     # Admin dashboard folder
```

## 🚀 Pages Included

### Public Pages
1. **Home** - Landing page with hero section, courses, services, testimonials
2. **About Us** - Mission, vision, core values, team information
3. **Courses** - JLPT N5/N4/N3 and Kaiwa classes with detailed information
4. **Visa Support** - Student, SSW, and TITP visa services with process
5. **Success Stories** - Student testimonials and success cases
6. **Contact** - Contact form and location information
7. **Admission Form** - Multi-step online application form

### User Pages (Placeholder)
8. **Student Login** - For enrolled students to access resources
9. **Admin Login** - For staff/admin dashboard access

## 🎯 Key Sections

### Home Page Components
- Hero section with CTA buttons
- Statistics/counters (animated)
- Why Choose Us cards
- Course showcase
- Our Process (4-step visa process)
- Visa Services cards
- Student Testimonials
- FAQ section
- Call-to-action section
- Contact section
- Footer with social links

### Course Cards
- Course thumbnail with emoji
- Level badge (Beginner/Intermediate/Advanced)
- Course title and description
- Course fees
- Duration and schedule
- Class size
- Enroll button with RGB glow

### Admission Form
- Multi-step wizard (3 steps):
  1. Personal Information
  2. Educational Information
  3. Documents & Agreement
- Progress bar
- Form validation
- File upload support
- Terms & conditions agreement

## 💻 Technical Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS variables, gradients, animations
- **JavaScript (Vanilla)**: No dependencies, vanilla JS
- **Icons**: Font Awesome 6.4.0
- **Fonts**: Google Fonts (Inter, Poppins, Sora)

## 📱 Responsive Design

- **Mobile First**: Designed for mobile-first experience
- **Breakpoints**:
  - Mobile: < 768px (hamburger menu, single column)
  - Tablet: 768px - 1024px (2 columns)
  - Desktop: > 1024px (3-4 columns)

## 🎨 CSS Features

### Design System Variables
```css
--primary: #E60012
--secondary: #111827
--accent: #2563EB
--background-dark: #0B1020
--background-light: #F8FAFC
--shadow-*: Various shadow levels
--transition-*: Various transition speeds
```

### Reusable Components
- `.btn` - Button styles (primary, secondary, outline, ghost)
- `.card` - Card container with hover effects
- `.card-glow` - Card with RGB glowing border
- `.glass` / `.glass-dark` - Glassmorphism effect
- `.grid` - Responsive grid (grid-2, grid-3, grid-4)
- Utility classes for spacing, text, colors

### Animations
- `rgb-glow` - Animated RGB glowing border
- `slideInDown` / `slideInUp` - Slide animations
- `bounce` - Bounce animation for floating buttons
- `spin` - Loader animation
- Smooth transitions on all interactive elements

## 🔧 JavaScript Features

- Mobile menu toggle with hamburger
- Scroll-to-top button
- Tab functionality
- Form submission handling
- Counter animation
- Intersection Observer for lazy animations
- Active navigation link highlighting
- Smooth scrolling for anchor links

## 📋 Forms Included

1. **Contact Form** - Quick inquiry form
2. **Admission Form** - Complete multi-step application
3. **Newsletter** - (Optional, can be added)

## 🎓 Customization Guide

### Colors
Edit `/assets/css/style.css` `:root` variables:
```css
:root {
  --primary: #E60012;
  --secondary: #111827;
  /* Update other colors as needed */
}
```

### Typography
Fonts are loaded from Google Fonts. To change:
1. Edit the `<link>` tag in `<head>`
2. Update font family in CSS

### Content
- Edit HTML files directly in `pages/` folder
- Update images in `assets/images/` folder
- Modify text and content as needed

## 🚀 Getting Started

1. **Open in Browser**:
   - Simply open `index.html` in your web browser
   - No build process required

2. **Local Development**:
   - Use VS Code with Live Server extension
   - Or run: `python -m http.server 8000`

3. **Deployment**:
   - Upload all files to web hosting server
   - Maintain folder structure
   - Update links if deploying to subdirectory

## 📧 Contact Form Setup

To make contact forms functional:
1. Add backend API endpoint in `main.js`
2. Use services like:
   - Formspree (formspree.io)
   - Basin (basin.io)
   - Netlify Forms
   - Custom backend

Example:
```javascript
// In main.js, update the form submission handler
const formData = new FormData(form);
await fetch('YOUR_FORM_ENDPOINT', {
  method: 'POST',
  body: formData
});
```

## 🔐 Admin Dashboard (Future)

Create admin pages in `admin/` folder for:
- Student management
- Course management
- Visa application tracking
- Analytics dashboard
- Payment/fee management
- Document verification

## 📱 Mobile Optimization

- Hamburger menu for mobile navigation
- Responsive images and typography
- Touch-friendly buttons (60px minimum)
- Optimized images for faster loading
- Mobile-optimized forms

## ♿ Accessibility

- Semantic HTML5 structure
- Alt text for images (ready to add)
- ARIA labels (ready to add)
- Keyboard navigation support
- Color contrast compliance
- Focus states on interactive elements

## 🔍 SEO Ready

- Semantic HTML structure
- Meta descriptions in pages
- Heading hierarchy (H1, H2, H3)
- Alt attributes for images
- Open Graph tags (ready to add)
- Structured data (ready to add)

## 📊 Performance Tips

1. **Image Optimization**:
   - Use WebP format when possible
   - Compress images before uploading
   - Use appropriate image sizes

2. **Caching**:
   - Enable browser caching on server
   - Minify CSS and JS for production

3. **Loading**:
   - Images load faster with proper sizes
   - CSS is optimized for performance

## 🎨 Customization Examples

### Change Primary Color
```css
/* In style.css */
:root {
  --primary: #2563EB; /* Change to blue */
}
```

### Add New Course
```html
<!-- In pages/courses.html -->
<div class="course-card">
  <div class="course-thumbnail">🎵</div>
  <div class="course-content">
    <h3>JLPT N2 Advanced</h3>
    <!-- Add your course details -->
  </div>
</div>
```

### Modify Footer
Edit the `<footer>` section in `index.html` and other pages.

## 🐛 Troubleshooting

1. **Images not loading**: Check image path and ensure images exist in `assets/images/`
2. **Styles not applying**: Clear browser cache (Ctrl+Shift+Delete)
3. **Links broken**: Verify relative paths are correct
4. **Mobile menu not working**: Ensure `main.js` is loaded correctly
5. **Forms not submitting**: Add backend API endpoint for form submission

## 📚 Browser Support

- Chrome/Edge (Latest)
- Firefox (Latest)
- Safari (Latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📝 License

This website template is created for Fusion Education BD. Feel free to customize and use for your needs.

## 🤝 Support

For questions or support:
- Email: contact@fusioneducationbd.com
- Phone: +880 1302 090286
- WhatsApp: +880 1302 090286

---

**Last Updated**: May 20, 2026
**Version**: 1.0.0
**Created with**: HTML5, CSS3, Vanilla JavaScript
