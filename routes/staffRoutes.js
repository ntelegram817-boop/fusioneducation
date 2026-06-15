const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

// Staff login route receives email, password, and selected branch.
router.post('/login', staffController.loginStaff);

// Staff logout route clears authenticated session data.
router.post('/logout', staffController.ensureStaffAuthenticated, staffController.logoutStaff);

// Retrieve staff profile and branch information for UI rendering.
router.get('/me', staffController.ensureStaffAuthenticated, staffController.getStaffProfile);

// Retrieve the student list for the authenticated staff branch only.
router.get('/students', staffController.ensureStaffAuthenticated, staffController.getBranchStudents);

module.exports = router;
