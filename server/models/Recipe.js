// server/models/Recipe.js
const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    measure: {
        type: String,
        trim: true
    }
});

const RecipeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    category: {
        type: String,
        trim: true
    },
    cuisine: {
        type: String,
        trim: true
    },
    instructions: {
        type: String,
        required: true
    },
    ingredients: [IngredientSchema],
    videoUrl: {
        type: String,
        trim: true
    },
    sourceUrl: {
        type: String,
        trim: true
    },
    externalId: {
        type: String,
        trim: true,
        index: true
    },
    isFavorite: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Add text index for search functionality
RecipeSchema.index({
    name: 'text',
    category: 'text',
    cuisine: 'text',
    'ingredients.name': 'text'
});

// Update the updatedAt timestamp before saving
RecipeSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Recipe', RecipeSchema);