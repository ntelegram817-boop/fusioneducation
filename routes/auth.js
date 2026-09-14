const express = require('express');
const router = express.Router();
const fbDb = require('../utils/firebaseDb');

// ── 1. Lookup Email by ID (For Student Login) ────────────────
router.get('/lookup-email', async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'Missing ID' });
    
    const cleanId = String(id).trim().toLowerCase();
    
    // First try students collection
    const students = await fbDb.readData('students') || [];
    let student = students.find(s => 
        (s.identifier && s.identifier.toLowerCase() === cleanId) ||
        (s.email && s.email.toLowerCase() === cleanId)
    );
    
    if (student && student.email) {
        return res.json({ success: true, email: student.email });
    }
    
    // Try admissions
    const admissions = await fbDb.readData('admissions') || [];
    let adm = admissions.find(a => 
        (a.applicationNumber && a.applicationNumber.toLowerCase() === cleanId) ||
        (a.applicationId && a.applicationId.toLowerCase() === cleanId) ||
        (a.id && String(a.id).toLowerCase() === cleanId) ||
        (a.email && a.email.toLowerCase() === cleanId)
    );
    
    if (adm && adm.email) {
        return res.json({ success: true, email: adm.email });
    }
    
    return res.status(404).json({ success: false, error: 'Registration number not found' });
});

// ── 2. Validate Firebase Token & Create Student Session ───────
router.post('/student', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, error: 'Missing token' });
    
    try {
        const decodedToken = await fbDb.getAuth().verifyIdToken(idToken);
        const email = decodedToken.email;
        
        // Find student in our db
        const students = await fbDb.readData('students') || [];
        let student = students.find(s => s.email && s.email.toLowerCase() === email.toLowerCase());
        
        if (!student) {
            // Find in admissions and auto-create
            const admissions = await fbDb.readData('admissions') || [];
            let adm = admissions.find(a => a.email && a.email.toLowerCase() === email.toLowerCase());
            
            if (adm) {
                student = {
                    id: adm.id,
                    identifier: adm.applicationNumber || adm.id,
                    email: adm.email,
                    fullName: adm.fullName,
                    branch: adm.branch,
                    status: 'admitted',
                    currentCourse: adm.course
                };
                students.unshift(student);
                await fbDb.writeData('students', students);
            }
        }
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student record not found in system.' });
        }
        
        res.cookie('fusion_student_id', student.identifier, { 
            httpOnly: true, 
            sameSite: 'lax',
            maxAge: 86400000 
        });
        
        return res.json({ success: true, redirect: '/pages/student-dashboard.html' });
    } catch (err) {
        console.error('Firebase Auth error (Student):', err);
        return res.status(401).json({ success: false, error: 'Invalid authentication token.' });
    }
});

// ── 3. Validate Google Token for Staff ────────────────────────
router.post('/staff', async (req, res) => {
    const { idToken, branch } = req.body;
    if (!idToken) return res.status(400).json({ success: false, error: 'Missing token' });
    
    try {
        const decodedToken = await fbDb.getAuth().verifyIdToken(idToken);
        const email = decodedToken.email;
        
        // Find staff in our db
        const users = await fbDb.readData('users') || [];
        let staff = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        
        if (!staff) {
            const staffList = await fbDb.readData('staff') || [];
            staff = staffList.find(s => s.email && s.email.toLowerCase() === email.toLowerCase());
        }
        
        if (!staff) {
            return res.status(403).json({ success: false, error: 'Access Denied. Your Google account is not registered as a Staff member by the Admin.' });
        }
        
        const userBranch = branch || staff.branch || 'Dinajpur';
        
        res.cookie('fusion_staff_email', staff.email, { httpOnly: false, sameSite: 'lax', maxAge: 86400000 });
        res.cookie('fusion_staff_branch', userBranch, { httpOnly: false, sameSite: 'lax', maxAge: 86400000 });
        res.cookie('fusion_staff_role', staff.role || 'staff', { httpOnly: false, sameSite: 'lax', maxAge: 86400000 });
        
        return res.json({ success: true, redirect: '/pages/staff-dashboard.html' });
    } catch (err) {
        console.error('Firebase Auth error (Staff):', err);
        return res.status(401).json({ success: false, error: 'Invalid authentication token.' });
    }
});

// ── 4. Change Password (via Firebase Auth) ───────────────────
router.post('/change-password', async (req, res) => {
    // This expects the frontend to verify the old password and provide an idToken or we can just use Admin SDK if authenticated
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) return res.status(400).json({ success: false, error: 'Missing required fields' });
    
    try {
        // Find user by email in firebase auth
        const userRecord = await fbDb.getAuth().getUserByEmail(email);
        
        // Update password
        await fbDb.getAuth().updateUser(userRecord.uid, {
            password: newPassword
        });
        
        return res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        return res.status(500).json({ success: false, error: 'Failed to update password. ' + err.message });
    }
});

module.exports = router;
