const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admissionController');

router.post('/submit', admissionController.submitAdmission);

module.exports = router;
