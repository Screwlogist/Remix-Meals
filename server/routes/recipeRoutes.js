// server/routes/recipeRoutes.js - Complete version with all required endpoints
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

// Simple test route
router.get('/test', (req, res) => {
    res.json({ message: 'Recipe routes working!' });
});

// GET /api/recipes/count - Get total recipe count (for admin dashboard)
router.get('/count', async (req, res) => {
    try {
        const count = await Recipe.countDocuments();

        res.json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Error getting recipe count:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// GET /api/recipes/search-multi - Search recipes by multiple ingredients (for main search)
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
        console.log('🔍 Searching for recipes with ALL ingredients:', ingredients);

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

        // Search for recipes containing ALL ingredients (strict search)
        const query = {
            $and: ingredients.map(ingredient => ({
                'ingredients.name': { $regex: ingredient, $options: 'i' }
            }))
        };

        console.log('🔍 MongoDB query:', JSON.stringify(query, null, 2));

        let recipes = await Recipe.find(query).limit(50);
        console.log(`✅ Found ${recipes.length} recipes with ALL ingredients`);

        // If no exact matches found, try partial matches but prioritize recipes with more matching ingredients
        if (recipes.length === 0) {
            console.log('🔍 No exact matches found, trying partial matches...');

            // Create aggregation pipeline to find recipes with most matching ingredients
            const aggregationPipeline = [
                {
                    $addFields: {
                        matchCount: {
                            $size: {
                                $filter: {
                                    input: '$ingredients',
                                    cond: {
                                        $or: ingredients.map(ingredient => ({
                                            $regexMatch: {
                                                input: { $toLower: '$this.name' },
                                                regex: ingredient,
                                                options: 'i'
                                            }
                                        }))
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        matchCount: { $gte: Math.max(1, Math.floor(ingredients.length * 0.6)) } // At least 60% of ingredients
                    }
                },
                {
                    $sort: { matchCount: -1, createdAt: -1 } // Sort by match count descending
                },
                {
                    $limit: 20
                }
            ];

            recipes = await Recipe.aggregate(aggregationPipeline);
            console.log(`📊 Found ${recipes.length} recipes with partial matches`);
        }

        // Add favorite status if user is authenticated
        if (user) {
            recipes = addFavoriteStatus(recipes, user);
        }

        // Log some debug info
        if (recipes.length > 0) {
            console.log('🍳 Sample recipe ingredients:');
            recipes.slice(0, 2).forEach((recipe, index) => {
                const recipeIngredients = recipe.ingredients?.map(ing => ing.name).join(', ') || 'No ingredients';
                console.log(`  ${index + 1}. ${recipe.name}: ${recipeIngredients}`);
            });
        }

        return res.status(200).json({
            success: true,
            count: recipes.length,
            searchedIngredients: ingredients,
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

// GET /api/recipes/:id - Get recipe by ID (must be after specific routes)
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

// GET /api/recipes - Get all recipes with pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

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

        // Get recipes with pagination
        let recipes = await Recipe.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination info
        const total = await Recipe.countDocuments();

        // Add favorite status if user is authenticated
        if (user) {
            recipes = addFavoriteStatus(recipes, user);
        }

        res.json({
            success: true,
            count: recipes.length,        // Number of recipes returned in this request
            totalCount: total,            // Total number of recipes in database
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

module.exports = router;