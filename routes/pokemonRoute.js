import express from 'express';
import { protect, restrictedTo } from '../controllers/authController.js';
import {
  resizeImage,
  uploadImage,
} from '../controllers/fileUploadController.js';
import {
  createOne,
  deleteOne,
  getAll,
  getOne,
  updateOne,
} from '../controllers/handlerFactory.js';
import Pokemon from '../models/pokemonModel.js';

const router = express.Router();

router.route('/').get(getAll(Pokemon));

router.route('/:id').get(getOne(Pokemon));

router
  .route('/createPokemon')
  .post(
    protect,
    restrictedTo('admin'),
    uploadImage,
    resizeImage,
    createOne(Pokemon),
  );

router.route('/:id').delete(protect, restrictedTo('admin'), deleteOne(Pokemon));

router
  .route('/updatePokemon')
  .patch(
    protect,
    restrictedTo('admin'),
    uploadImage,
    resizeImage,
    updateOne(Pokemon),
  );
export default router;
