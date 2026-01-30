import express from 'express';
import {
  forgotPassword,
  logout,
  resetPassword,
  signIn,
  signUp,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', signUp).post('/signin', signIn);

router.route('/logout').post(logout);
router.route('/forgotPassword').post(forgotPassword);
router.route('/forgotPassword/:token').patch(resetPassword);

export default router;
