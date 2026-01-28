import mongoose from 'mongoose';

const pokemonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'pokemon must have a name'],
  },
  image: {
    type: String,
  },
  species: [String],
  descriptions: [String],
  hp: Number,
  attack: Number,
  defense: Number,
  special_actack: Number,
  special_defense: Number,
  speed: Number,
  created_at: Date,
});

const model = mongoose.model('Pokemon', pokemonSchema);

export default model;
