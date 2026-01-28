import express from 'express';
import { protect } from '../controllers/authController.js';
import {
  createOne,
  deleteOne,
  getAll,
  updateOne,
} from '../controllers/handlerFactory.js';
import Review from '../models/reviewModel.js';
const router = express.Router();

router.route('/').get(getAll(Review));

router.route('/createReview').post(protect, createOne(Review));

router.route('/updateReview').patch(protect, updateOne(Review));

router.route('/deleteReview').delete(protect, deleteOne(Review));

export default router;
