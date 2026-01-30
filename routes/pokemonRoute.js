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

router.route('/updatePokemon').patch(
  (req, res, next) => {
    console.log('1. Reached /updatePokemon PATCH route');
    next();
  },
  protect, // add log inside protect if possible
  (req, res, next) => {
    console.log('2. Passed protect - user authenticated');
    next();
  },
  restrictedTo('admin'),
  (req, res, next) => {
    console.log('3. Passed restrictedTo - user is admin');
    next();
  },
  uploadImage,
  (req, res, next) => {
    console.log('4. Passed uploadImage');
    next();
  },
  resizeImage,
  (req, res, next) => {
    console.log('5. Passed resizeImage');
    next();
  },
  (req, res, next) => {
    console.log('6. Reached updateOne handler');
    next();
  },
  updateOne(Pokemon),
);
export default router;
