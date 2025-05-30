const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
        unique: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please provide a valid email'
        ],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false // Don't return password by default
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    favorites: [{
        recipeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Recipe'
        },
        externalId: {
            type: String // For MealDB recipes
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to check if password matches
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate a JWT token
UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET || 'mysecretkey',
        { expiresIn: '30d' }
    );
};

// Method to add recipe to favorites
UserSchema.methods.addToFavorites = function(recipeId, externalId = null) {
    // Check if already in favorites
    const isAlreadyFavorite = this.favorites.some(fav =>
        (fav.recipeId && fav.recipeId.toString() === recipeId) ||
        (fav.externalId && fav.externalId === externalId)
    );

    if (!isAlreadyFavorite) {
        this.favorites.push({
            recipeId: recipeId,
            externalId: externalId
        });
    }

    return this.save();
};

// Method to remove recipe from favorites
UserSchema.methods.removeFromFavorites = function(recipeId, externalId = null) {
    this.favorites = this.favorites.filter(fav =>
        !(
            (fav.recipeId && fav.recipeId.toString() === recipeId) ||
            (fav.externalId && fav.externalId === externalId)
        )
    );

    return this.save();
};

// Method to check if recipe is in favorites
UserSchema.methods.isFavoriteRecipe = function(recipeId, externalId = null) {
    return this.favorites.some(fav =>
        (fav.recipeId && fav.recipeId.toString() === recipeId) ||
        (fav.externalId && fav.externalId === externalId)
    );
};

module.exports = mongoose.model('User', UserSchema);