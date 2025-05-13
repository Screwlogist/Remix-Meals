// server/routes/recipeRoutes.js
const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const https = require('https');

// Helper function to fetch from TheMealDB API
function fetchFromMealDb(endpoint) {
    return new Promise((resolve, reject) => {
        https.get(`https://www.themealdb.com/api/json/v1/1/${endpoint}`, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (e) {
                    reject(e);
                }
            });

        }).on('error', (err) => {
            reject(err);
        });
    });
}

// GET /api/recipes - Get all recipes with pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const recipes = await Recipe.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Recipe.countDocuments();

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

// GET /api/recipes/search - Search recipes by query
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a search query'
            });
        }

        // First search in our database
        let recipes = [];

        if (query.length >= 2) {
            recipes = await Recipe.find(
                { $text: { $search: query } },
                // Add relevance score
                { score: { $meta: "textScore" } }
            )
                .sort({ score: { $meta: "textScore" } })
                .limit(12);
        } else {
            // For very short queries, use regex instead
            recipes = await Recipe.find({
                $or: [
                    { name: new RegExp(query, 'i') },
                    { category: new RegExp(query, 'i') },
                    { cuisine: new RegExp(query, 'i') },
                    { 'ingredients.name': new RegExp(query, 'i') }
                ]
            }).limit(12);
        }

        // If we have enough recipes in our database, return them
        if (recipes.length >= 5) {
            return res.status(200).json({
                success: true,
                count: recipes.length,
                recipes
            });
        }

        // If we don't have enough recipes, try to fetch from external API (TheMealDB)
        try {
            const mealDbData = await fetchFromMealDb(`search.php?s=${query}`);

            if (mealDbData.meals && mealDbData.meals.length > 0) {
                // For each MealDB result, check if we already have it in our database
                const mealDbRecipes = mealDbData.meals;
                const existingExternalIds = await Recipe.find({
                    externalId: { $in: mealDbRecipes.map(meal => meal.idMeal) }
                }).select('externalId');

                const existingIds = new Set(existingExternalIds.map(recipe => recipe.externalId));

                // Filter out recipes we already have
                const newMealDbRecipes = mealDbRecipes.filter(meal => !existingIds.has(meal.idMeal));

                // Return combined results (our DB + external)
                return res.status(200).json({
                    success: true,
                    count: recipes.length + mealDbRecipes.length,
                    recipes: [...recipes, ...mealDbRecipes]
                });
            }
        } catch (mealDbError) {
            console.error('MealDB API Error:', mealDbError);
            // If MealDB fails, just return what we have from our database
        }

        // If we got here, either MealDB had no additional results or failed
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

// GET /api/recipes/random - Get a random recipe
router.get('/random', async (req, res) => {
    try {
        // Count total number of recipes
        const count = await Recipe.countDocuments();

        // If we have recipes in our database, get a random one
        if (count > 0) {
            const random = Math.floor(Math.random() * count);
            const recipe = await Recipe.findOne().skip(random);

            return res.status(200).json({
                success: true,
                recipe
            });
        }

        // If no recipes in our database, get from MealDB
        try {
            const mealDbData = await fetchFromMealDb('random.php');

            if (mealDbData.meals && mealDbData.meals.length > 0) {
                return res.status(200).json({
                    success: true,
                    meals: mealDbData.meals
                });
            } else {
                return res.status(404).json({
                    success: false,
                    error: 'No recipes found'
                });
            }
        } catch (mealDbError) {
            console.error('MealDB API Error:', mealDbError);
            return res.status(500).json({
                success: false,
                error: 'Error fetching from external API'
            });
        }
    } catch (error) {
        console.error('Error getting random recipe:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// GET /api/recipes/favorites - Get favorite recipes
router.get('/favorites', async (req, res) => {
    try {
        const recipes = await Recipe.find({ isFavorite: true })
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            count: recipes.length,
            recipes
        });
    } catch (error) {
        console.error('Error getting favorite recipes:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// GET /api/recipes/external/:id - Get recipe by external ID (MealDB)
router.get('/external/:id', async (req, res) => {
    try {
        // First check if we have it in our database
        const recipe = await Recipe.findOne({ externalId: req.params.id });

        if (recipe) {
            return res.status(200).json({
                success: true,
                recipe
            });
        }

        // If not in our database, fetch from MealDB
        try {
            const mealDbData = await fetchFromMealDb(`lookup.php?i=${req.params.id}`);

            if (mealDbData.meals && mealDbData.meals.length > 0) {
                return res.status(200).json({
                    success: true,
                    meals: mealDbData.meals
                });
            } else {
                return res.status(404).json({
                    success: false,
                    error: 'Recipe not found in external API'
                });
            }
        } catch (mealDbError) {
            console.error('MealDB API Error:', mealDbError);
            return res.status(500).json({
                success: false,
                error: 'Error fetching from external API'
            });
        }
    } catch (error) {
        console.error('Error getting recipe by external ID:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// GET /api/recipes/:id - Get recipe by ID
router.get('/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);

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
        console.error('Error getting recipe by ID:', error);

        // Check if error is due to invalid ID format
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

// POST /api/recipes - Create a new recipe
router.post('/', async (req, res) => {
    try {
        // If a recipe with the same externalId already exists, update it instead
        if (req.body.externalId) {
            const existingRecipe = await Recipe.findOne({ externalId: req.body.externalId });

            if (existingRecipe) {
                // Update the existing recipe
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

// PUT /api/recipes/:id/favorite - Toggle favorite status
router.put('/:id/favorite', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);

        if (!recipe) {
            return res.status(404).json({
                success: false,
                error: 'Recipe not found'
            });
        }

        recipe.isFavorite = !recipe.isFavorite;
        await recipe.save();

        res.status(200).json({
            success: true,
            recipe
        });
    } catch (error) {
        console.error('Error toggling favorite:', error);
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