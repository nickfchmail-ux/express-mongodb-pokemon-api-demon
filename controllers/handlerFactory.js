import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import APIFeatures from '../utils/apiFeature.js';
import AppError from '../utils/appError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function deleteOne(Model) {
  return async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      return res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (err) {
      next(new AppError(err, 400));
    }
  };
}

export function updateOne(Model) {
  return async (req, res, next) => {
    console.log('params: ', req.params.id);
    console.log('model', Model.modelName);
    try {
      const id = req.params.id;
      if (!id) {
        return next(new AppError('No ID provided for update', 400));
      }

      const item = await Model.findById(id);
      console.log('item: ', item);
      if (!item) {
        return next(new AppError('No document found with that ID', 404));
      }
      if (item.userId && item.userId.toString() !== req.user._id.toString()) {
        return next(
          new AppError('You are not allowed to perform this action', 403),
        );
      }

      const patchData = { ...req.body };
      //users are not allow to amend the fields below:
      const restrictedProperty = [
        '_id',
        'userId',
        'pokemonId',
        '__v',
        'password',
        'passwordConfirm',
        'role',
        'email',
        'passwordResetExpires',
        'passwordResetToken',
        'passwordChangeAt',
      ];
      //delete forbidden fields from the body, so that no action would be performed for these
      restrictedProperty.forEach((p) => {
        if (patchData[p]) {
          delete patchData[p];
        }
      });

      let newImagePath = null;
      if (req.file) {
        newImagePath = `/image/user-${req.user._id}/${req.file.filename}`;
        patchData.image = newImagePath;
      }

      // Perform the update
      const doc = await Model.findByIdAndUpdate(id, patchData, {
        new: true,
        runValidators: true,
      });

      // Delete old image if a new one was uploaded and old path is different
      if (newImagePath && item.image && item.image !== newImagePath) {
        const oldFilePath = path.join(__dirname, '..', 'public', item.image);
        try {
          await fs.unlink(oldFilePath);
        } catch (err) {
          if (err.code !== 'ENOENT') {
            // ignore if file already missing
            console.error(
              `Failed to delete old image ${oldFilePath}:`,
              err.message,
            );
          }
        }
      }

      return res.status(200).json({
        status: 'success',
        data: { data: doc },
      });
    } catch (err) {
      return next(new AppError(err.message || err, 400));
    }
  };
}
export function createOne(Model) {
  return async (req, res, next) => {
    try {
      let receivedBody = { ...req.body };
      receivedBody.userId = req.user._id;
      if (req.file) {
        receivedBody.image = `/image/${req.user._id}/${req.file.filename}`;
      }

      const doc = await Model.create(receivedBody);
      res.status(201).json({
        status: 'success',
        data: {
          data: doc,
        },
      });
    } catch (err) {
      //for pokemon review model, handle situation when duplicated review is created
      if (err.code === 11000) {
        if (Model.modelName === 'PokemonReview') {
          return next(
            new AppError(
              'You already reviewed this Pokémon. Only one review per user per Pokémon is allowed.',
              400,
            ),
          );
        }
      }
      //general error handling
      return next(new AppError(err, 400));
    }
  };
}

export function getOne(Model) {
  return async (req, res, next) => {
    try {
      let query = Model.findById(req.params.id);

      const doc = await query;

      if (!doc) {
        return next(new AppError('No document found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          data: doc,
        },
      });
    } catch (err) {
      next(new AppError(err, 400));
    }
  };
}

export function getAll(Model) {
  return async (req, res, next) => {
    try {
      // To allow for nested GET reviews on tour (hack)
      let filter = {};

      const features = new APIFeatures(Model.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();
      // const doc = await features.query.explain();
      const doc = await features.query;

      // SEND RESPONSE
      res.status(200).json({
        status: 'success',
        results: doc.length,
        data: {
          data: doc,
        },
      });
    } catch (err) {
      next(new AppError(err, 400));
    }
  };
}
