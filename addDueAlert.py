import os

filepath = os.path.join(os.path.dirname(__file__), 'assets/js/student-dashboard-data.js')
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    // Render full dashboard content
  function renderDashboard(student) {
    // 1. Sidebar & Topbar Profile
    const studentNameEl = document.getElementById('studentName');
    if (studentNameEl) studentNameEl.textContent = student.fullName || 'Student';

    const topbarGreeting = document.getElementById('topbarGreeting');
    if (topbarGreeting) topbarGreeting.textContent = Welcome back, ! Y'<;'''

replacement = '''    // Render full dashboard content
  function renderDashboard(student) {
    // 1. Sidebar & Topbar Profile
    const studentNameEl = document.getElementById('studentName');
    if (studentNameEl) studentNameEl.textContent = student.fullName || 'Student';

    const topbarGreeting = document.getElementById('topbarGreeting');
    if (topbarGreeting) topbarGreeting.textContent = Welcome back, ! Y'<;
    
    // Due Alert Injection
    let dueAmount = 0;
    if (student.fees && student.fees.due) {
        dueAmount = parseInt(String(student.fees.due).replace(/[^\d]/g, ''), 10) || 0;
    }
    
    const existingAlert = document.getElementById('student-due-alert');
    if (existingAlert) existingAlert.remove();
    
    if (dueAmount > 0) {
        const topbarWrap = document.querySelector('.topbar-greeting-wrap');
        if (topbarWrap) {
            const alertDiv = document.createElement('div');
            alertDiv.id = 'student-due-alert';
            alertDiv.style.cssText = 'margin-top: 8px; padding: 6px 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; color: #ef4444; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; animation: pulse 2s infinite;';
            alertDiv.innerHTML = <i class="fas fa-exclamation-triangle"></i> ݦ? ?ݜ  ݮY  BDT s΅ ݬ ?YY!  ?> ݮY s ?ݨ ݮݨY ??ݭYs;
            topbarWrap.appendChild(alertDiv);
        }
    }'''

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Due alert added to student-dashboard-data.js")
else:
    print("Target string not found for due alert")