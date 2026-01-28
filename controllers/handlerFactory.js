import APIFeatures from '../utils/apiFeature.js';
import AppError from '../utils/appError.js';
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
    try {
      // allow users to only update items belonging to themselve
      const item = await Model.findById(req.body.id);

      if (item?.userId && item?.userId.toString() !== req.user._id.toString()) {
        return next(
          new AppError('you are not allow to perform this action', 403),
        );
      }
      const id = req.body?.id;
      const patchData = req.body;

      if (req.file) {
        patchData.image = `/image/${req.user._id}/${req.file.filename}`;
      }

      const doc = await Model.findByIdAndUpdate(id, patchData, {
        new: true,
        runValidators: true,
      });

      return res.status(200).json({
        status: 'success',
        data: {
          data: doc,
        },
      });
    } catch (err) {
      return next(new AppError(err, 400));
    }
  };
}

export function createOne(Model) {
  return async (req, res, next) => {
    try {
      console.log(Model.modelName);
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
    console.log('params', req.params);
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
