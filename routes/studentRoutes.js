const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.post('/login', studentController.loginStudent);
router.post('/logout', studentController.ensureStudentAuthenticated, studentController.logoutStudent);
router.get('/me', studentController.ensureStudentAuthenticated, studentController.getStudentProfile);

module.exports = router;
