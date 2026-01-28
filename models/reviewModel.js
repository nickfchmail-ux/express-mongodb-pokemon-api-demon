import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  rating: { type: Number, required: true, min: 1, max: 7 },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  pokemonId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Pokemon',
    required: true,
  },
});

reviewSchema.index({ userId: 1, pokemonId: 1 }, { unique: true });

const model = mongoose.model('PokemonReview', reviewSchema);

export default model;
