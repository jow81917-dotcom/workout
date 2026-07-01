const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { register, login, getProfile, updateProfile, changePassword } = require('../controllers/authController');

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginRules = [
  body('email').isEmail(),
  body('password').notEmpty(),
];

router.post('/register', registerRules, register);
router.post('/login',    loginRules,    login);
router.get('/profile',   authenticate,  getProfile);
router.put('/profile',   authenticate,  updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
