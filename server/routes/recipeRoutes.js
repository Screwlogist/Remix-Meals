// server/routes/recipeRoutes.js - Updated to work primarily with local database
const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Helper function to add favorite status to recipes for a specific user
function addFavoriteStatus(recipes, user) {
    if (!user) return recipes;

    return recipes.map(recipe => {
        const recipeId = recipe._id;
        const externalId = recipe.externalId;

        const isFavorite = user.isFavoriteRecipe(recipeId, externalId);

        return {
            ...recipe.toObject ? recipe.toObject() : recipe,
            isFavorite
        };
    });
}

// GET /api/recipes - Get all recipes with pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000;
        const skip = (page - 1) * limit;

        let recipes = await Recipe.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Recipe.countDocuments();

        // If user is authenticated, add favorite status
        let user = null;
        if (req.headers.authorization) {
            try {
                const jwt = require('jsonwebtoken');
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey');
                user = await User.findById(decoded.id);
            } catch (err) {
                // If token is invalid, continue without user context
            }
        }

        if (user) {
            recipes = addFavoriteStatus(recipes, user);
        }

        res.status(200).json({
            success: true,
            count: recipes.length,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            recipes
        });
    } catch (error) {
        console.error('Error getting recipes:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// GET /api/recipes/search - Search recipes by single ingredient or name
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a search query'
            });
        }

        // Get user context for favorites
        let user = null;
        if (req.headers.authorization) {
            try {
                const jwt = require('jsonwebtoken');
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey');
                user = await User.findById(decoded.id);
            } catch (err) {
                // Continue without user context
            }
        }

        // Search in our local database
        let recipes = [];

        if (query.length >= 2) {
            recipes = await Recipe.find(
                { $text: { $search: query } },
                { score: { $meta: "textScore" } }
            )
                .sort({ score: { $meta: "textScore" } })
                .limit(20);
        } else {
            recipes = await Recipe.find({
                $or: [
                    { name: new RegExp(query, 'i') },
                    { category: new RegExp(query, 'i') },
                    { cuisine: new RegExp(query, 'i') },
                    { 'ingredients.name': new RegExp(query, 'i') }
                ]
            }).limit(20);
        }

        // Add favorite status if user is authenticated
        if (user) {
            recipes = addFavoriteStatus(recipes, user);
        }

        return res.status(200).json({
            success: true,
            count: recipes.length,
            recipes
        });

    } catch (error) {
        console.error('Error searching recipes:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// GET /api/recipes/search-multi - Search recipes by multiple ingredients
router.get('/search-multi', async (req, res) => {
    try {
        const ingredientsParam = req.query.ingredients;

        if (!ingredientsParam) {
            return res.status(400).json({
                success: false,
                error: 'Please provide at least one ingredient'
            });
        }

        const ingredients = ingredientsParam.split(',').map(i => i.trim().toLowerCase());

        if (ingredients.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide at least one ingredient'
            });
        }

        // Get user context for favorites
        let user = null;
        if (req.headers.authorization) {
            try {
                const jwt = require('jsonwebtoken');
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey');
                user = await User.findById(decoded.id);
            } catch (err) {
                // Continue without user context
            }
        }

        // Search in our local database for recipes containing ALL ingredients
        const query = {
            $and: ingredients.map(ingredient => ({
                'ingredients.name': { $regex: ingredient, $options: 'i' }
            }))
        };

        let recipes = await Recipe.find(query).limit(20);

        // If not enough results, try searching for recipes with ANY of the ingredients
        if (recipes.length < 5) {
            const orQuery = {
                $or: ingredients.map(ingredient => ({
                    'ingredients.name': { $regex: ingredient, $options: 'i' }
                }))
            };

            const additionalRecipes = await Recipe.find(orQuery)
                .limit(20 - recipes.length);

            // Remove duplicates and combine
            const existingIds = new Set(recipes.map(r => r._id.toString()));
            const newRecipes = additionalRecipes.filter(r => !existingIds.has(r._id.toString()));
            recipes = [...recipes, ...newRecipes];
        }

        // Add favorite status if user is authenticated
        if (user) {
            recipes = addFavoriteStatus(recipes, user);
        }

        return res.status(200).json({
            success: true,
            count: recipes.length,
            recipes
        });

    } catch (error) {
        console.error('Error searching recipes by multiple ingredients:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// GET /api/recipes/random - Get a random recipe
router.get('/random', async (req, res) => {
    try {
        // Get user context for favorites
        let user = null;
        if (req.headers.authorization) {
            try {
                const jwt = require('jsonwebtoken');
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey');
                user = await User.findById(decoded.id);
            } catch (err) {
                // Continue without user context
            }
        }

        // Get a random recipe from our local database
        const count = await Recipe.countDocuments();

        if (count === 0) {
            return res.status(404).json({
                success: false,
                error: 'No recipes found. Please run the import script first.'
            });
        }

        const random = Math.floor(Math.random() * count);
        let recipe = await Recipe.findOne().skip(random);

        // Add favorite status if user is authenticated
        if (user) {
            recipe = {
                ...recipe.toObject(),
                isFavorite: user.isFavoriteRecipe(recipe._id, recipe.externalId)
            };
        }

        return res.status(200).json({
            success: true,
            recipe
        });
    } catch (error) {
        console.error('Error getting random recipe:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// GET /api/recipes/favorites - Get user's favorite recipes (PROTECTED ROUTE)
router.get('/favorites', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('favorites.recipeId');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get all favorite recipes (both internal and by external ID)
        const favoriteRecipes = [];

        for (const fav of user.favorites) {
            let recipe = null;

            if (fav.recipeId) {
                // Internal recipe
                recipe = fav.recipeId;
            } else if (fav.externalId) {
                // Find by external ID
                recipe = await Recipe.findOne({ externalId: fav.externalId });
            }

            if (recipe) {
                favoriteRecipes.push({
                    ...recipe.toObject(),
                    isFavorite: true,
                    addedAt: fav.addedAt
                });
            }
        }

        // Sort by addedAt date (most recent first)
        favoriteRecipes.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

        res.status(200).json({
            success: true,
            count: favoriteRecipes.length,
            recipes: favoriteRecipes
        });
    } catch (error) {
        console.error('Error getting favorite recipes:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// GET /api/recipes/:id - Get recipe by ID
router.get('/:id', async (req, res) => {
    try {
        // Get user context for favorites
        let user = null;
        if (req.headers.authorization) {
            try {
                const jwt = require('jsonwebtoken');
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey');
                user = await User.findById(decoded.id);
            } catch (err) {
                // Continue without user context
            }
        }

        let recipe = null;

        // Try to find by MongoDB ID first
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            recipe = await Recipe.findById(req.params.id);
        } else {
            // Try to find by external ID
            recipe = await Recipe.findOne({ externalId: req.params.id });
        }

        if (!recipe) {
            return res.status(404).json({
                success: false,
                error: 'Recipe not found'
            });
        }

        // Add favorite status if user is authenticated
        if (user) {
            recipe = {
                ...recipe.toObject(),
                isFavorite: user.isFavoriteRecipe(recipe._id, recipe.externalId)
            };
        }

        res.status(200).json({
            success: true,
            recipe
        });
    } catch (error) {
        console.error('Error getting recipe by ID:', error);

        if (error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                error: 'Recipe not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// PUT /api/recipes/:id/favorite - Toggle favorite status for authenticated user
router.put('/:id/favorite', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        let recipe = null;

        // Try to find by MongoDB ID first
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            recipe = await Recipe.findById(req.params.id);
        } else {
            // Try to find by external ID
            recipe = await Recipe.findOne({ externalId: req.params.id });
        }

        if (!recipe) {
            return res.status(404).json({
                success: false,
                error: 'Recipe not found'
            });
        }

        // Check if recipe is already in favorites
        const isCurrentlyFavorite = user.isFavoriteRecipe(recipe._id, recipe.externalId);

        if (isCurrentlyFavorite) {
            // Remove from favorites
            await user.removeFromFavorites(recipe._id, recipe.externalId);
        } else {
            // Add to favorites
            await user.addToFavorites(recipe._id, recipe.externalId);
        }

        // Return the updated status
        const updatedUser = await User.findById(req.user.id);
        const newFavoriteStatus = updatedUser.isFavoriteRecipe(recipe._id, recipe.externalId);

        res.status(200).json({
            success: true,
            recipe: {
                ...recipe.toObject(),
                isFavorite: newFavoriteStatus
            }
        });
    } catch (error) {
        console.error('Error toggling favorite:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// POST /api/recipes - Create a new recipe
router.post('/', async (req, res) => {
    try {
        // If a recipe with the same externalId already exists, update it instead
        if (req.body.externalId) {
            const existingRecipe = await Recipe.findOne({ externalId: req.body.externalId });

            if (existingRecipe) {
                Object.keys(req.body).forEach(key => {
                    existingRecipe[key] = req.body[key];
                });

                await existingRecipe.save();

                return res.status(200).json({
                    success: true,
                    recipe: existingRecipe,
                    message: 'Recipe updated'
                });
            }
        }

        // Create new recipe
        const recipe = new Recipe(req.body);
        await recipe.save();

        res.status(201).json({
            success: true,
            recipe
        });
    } catch (error) {
        console.error('Error creating recipe:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);

            return res.status(400).json({
                success: false,
                error: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// PUT /api/recipes/:id - Update a recipe
router.put('/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!recipe) {
            return res.status(404).json({
                success: false,
                error: 'Recipe not found'
            });
        }

        res.status(200).json({
            success: true,
            recipe
        });
    } catch (error) {
        console.error('Error updating recipe:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);

            return res.status(400).json({
                success: false,
                error: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// DELETE /api/recipes/:id - Delete a recipe
router.delete('/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findByIdAndDelete(req.params.id);

        if (!recipe) {
            return res.status(404).json({
                success: false,
                error: 'Recipe not found'
            });
        }

        // Also remove this recipe from all users' favorites
        await User.updateMany(
            { 'favorites.recipeId': req.params.id },
            { $pull: { favorites: { recipeId: req.params.id } } }
        );

        res.status(200).json({
            success: true,
            recipe
        });
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

module.exports = router;