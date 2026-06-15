const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcrypt');
const { generatePassword } = require('../utils/passwordGenerator');
const { sendCredentialsEmail } = require('../utils/emailSender');

const STUDENT_SOURCE = path.join(__dirname, '../data/students.json');

async function submitAdmission(req, res) {
  try {
    const { fullName, email, phone, course, branch, visaType, comment } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !course || !branch || !visaType) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Load existing students
    let students = [];
    try {
      const raw = await fs.readFile(STUDENT_SOURCE, 'utf8');
      students = JSON.parse(raw);
    } catch (err) {
      students = [];
    }

    // Check if email already admitted
    if (students.some(s => s.email?.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    // Generate random password
    const generatedPassword = generatePassword(8);
    const passwordHash = await bcrypt.hash(generatedPassword, 12);

    // Create new student record
    const newStudent = {
      id: students.length + 1,
      fullName,
      email,
      phone,
      course,
      branch: branch.charAt(0).toUpperCase() + branch.slice(1),
      visaType,
      passportOrNid: 'PENDING',
      documentPreview: 'https://via.placeholder.com/320x220?text=Document+Pending',
      status: 'Admitted - Pending Payment',
      admissionDate: new Date().toISOString().split('T')[0],
      notes: comment || '',
      passwordHash
    };

    // Add to students array
    students.push(newStudent);

    // Save updated students.json
    await fs.writeFile(STUDENT_SOURCE, JSON.stringify(students, null, 2), 'utf8');

    // Send email with credentials
    const emailResult = await sendCredentialsEmail(email, fullName, generatedPassword);

    res.json({
      success: true,
      message: 'Admission successful! Login credentials have been sent to your email.',
      email,
      studentId: newStudent.id,
      emailSent: emailResult.success
    });

    console.log(`✅ Admission recorded: ${fullName} (${email})`);
  } catch (err) {
    console.error('Admission error:', err);
    res.status(500).json({ success: false, error: 'Failed to process admission' });
  }
}

module.exports = { submitAdmission };
