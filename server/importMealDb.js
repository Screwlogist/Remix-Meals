// importMealDb.js - Run this script to import all MealDB recipes
const mongoose = require('mongoose');
const https = require('https');
const Recipe = require('./models/Recipe');

// Helper function to fetch from MealDB API
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

// Helper function to transform MealDB recipe to our format
function transformMealDbToOurFormat(mealDbRecipe) {
    // Extract ingredients
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = mealDbRecipe[`strIngredient${i}`]?.trim();
        const measure = mealDbRecipe[`strMeasure${i}`]?.trim();

        if (ingredient) {
            ingredients.push({
                name: ingredient,
                measure: measure || ''
            });
        }
    }

    // Create our DB format
    return {
        name: mealDbRecipe.strMeal,
        image: mealDbRecipe.strMealThumb,
        category: mealDbRecipe.strCategory,
        cuisine: mealDbRecipe.strArea,
        instructions: mealDbRecipe.strInstructions,
        videoUrl: mealDbRecipe.strYoutube,
        sourceUrl: mealDbRecipe.strSource,
        ingredients,
        externalId: mealDbRecipe.idMeal
    };
}

// Add delay between API calls to avoid rate limiting
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function importAllMealDbRecipes() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/recipefinder', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Connected to MongoDB');

        // Step 1: Get all categories to understand the scope
        console.log('\n📋 Fetching all categories...');
        const categoriesData = await fetchFromMealDb('categories.php');
        const categories = categoriesData.categories || [];
        console.log(`Found ${categories.length} categories:`, categories.map(c => c.strCategory).join(', '));

        // Step 2: Get all areas/cuisines
        console.log('\n🌍 Fetching all areas...');
        const areasData = await fetchFromMealDb('list.php?a=list');
        const areas = areasData.meals || [];
        console.log(`Found ${areas.length} areas:`, areas.map(a => a.strArea).join(', '));

        // Step 3: Get recipes by searching through the alphabet
        console.log('\n🔤 Fetching recipes by first letter...');
        const allRecipes = new Map(); // Use Map to avoid duplicates
        let totalFetched = 0;

        // Search by first letter (a-z)
        for (let i = 97; i <= 122; i++) {
            const letter = String.fromCharCode(i);
            console.log(`  📖 Searching recipes starting with '${letter}'...`);

            try {
                const searchData = await fetchFromMealDb(`search.php?f=${letter}`);
                const recipes = searchData.meals || [];

                recipes.forEach(recipe => {
                    if (!allRecipes.has(recipe.idMeal)) {
                        allRecipes.set(recipe.idMeal, recipe);
                        totalFetched++;
                    }
                });

                console.log(`    Found ${recipes.length} recipes (Total unique: ${totalFetched})`);

                // Add delay to be nice to the API
                await delay(100);
            } catch (error) {
                console.log(`    ⚠️ Error searching for '${letter}':`, error.message);
            }
        }

        // Step 4: Also get recipes by category to catch any missed
        console.log('\n📂 Fetching recipes by category...');
        for (const category of categories) {
            console.log(`  📂 Fetching recipes from category: ${category.strCategory}`);

            try {
                const categoryData = await fetchFromMealDb(`filter.php?c=${category.strCategory}`);
                const categoryRecipes = categoryData.meals || [];

                let newInCategory = 0;
                for (const recipe of categoryRecipes) {
                    if (!allRecipes.has(recipe.idMeal)) {
                        // Get full recipe details
                        const fullRecipeData = await fetchFromMealDb(`lookup.php?i=${recipe.idMeal}`);
                        if (fullRecipeData.meals && fullRecipeData.meals.length > 0) {
                            allRecipes.set(recipe.idMeal, fullRecipeData.meals[0]);
                            totalFetched++;
                            newInCategory++;
                        }
                        await delay(50); // Small delay for detail fetches
                    }
                }

                console.log(`    Found ${categoryRecipes.length} recipes, ${newInCategory} new (Total unique: ${totalFetched})`);
                await delay(200);
            } catch (error) {
                console.log(`    ⚠️ Error fetching category '${category.strCategory}':`, error.message);
            }
        }

        console.log(`\n🎯 Total unique recipes found: ${totalFetched}`);

        // Step 5: Check existing recipes in our database
        console.log('\n🔍 Checking existing recipes in database...');
        const existingRecipes = await Recipe.find({ externalId: { $exists: true } }).select('externalId');
        const existingIds = new Set(existingRecipes.map(r => r.externalId));
        console.log(`Found ${existingIds.size} existing recipes in database`);

        // Filter out existing recipes
        const newRecipes = Array.from(allRecipes.values()).filter(recipe => !existingIds.has(recipe.idMeal));
        console.log(`${newRecipes.length} new recipes to import`);

        if (newRecipes.length === 0) {
            console.log('✅ All recipes are already imported!');
            return;
        }

        // Step 6: Transform and save recipes in batches
        console.log('\n💾 Importing recipes to database...');
        const batchSize = 50;
        let imported = 0;
        let failed = 0;

        for (let i = 0; i < newRecipes.length; i += batchSize) {
            const batch = newRecipes.slice(i, i + batchSize);
            console.log(`  📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(newRecipes.length / batchSize)} (${batch.length} recipes)`);

            const recipesToInsert = batch.map(mealDbRecipe => {
                try {
                    return transformMealDbToOurFormat(mealDbRecipe);
                } catch (error) {
                    console.log(`    ⚠️ Error transforming recipe ${mealDbRecipe.idMeal}:`, error.message);
                    failed++;
                    return null;
                }
            }).filter(recipe => recipe !== null);

            try {
                if (recipesToInsert.length > 0) {
                    await Recipe.insertMany(recipesToInsert, { ordered: false });
                    imported += recipesToInsert.length;
                    console.log(`    ✅ Imported ${recipesToInsert.length} recipes`);
                }
            } catch (error) {
                // Handle duplicate key errors and other issues
                if (error.code === 11000) {
                    console.log(`    ⚠️ Some recipes already exist (duplicate key error)`);
                    imported += recipesToInsert.length; // Count as imported since they exist
                } else {
                    console.log(`    ❌ Batch import error:`, error.message);
                    failed += recipesToInsert.length;
                }
            }

            // Add delay between batches
            await delay(100);
        }

        // Step 7: Summary
        console.log('\n🎉 Import Summary:');
        console.log(`  📊 Total recipes found: ${totalFetched}`);
        console.log(`  📊 Already existed: ${existingIds.size}`);
        console.log(`  📊 New recipes imported: ${imported}`);
        console.log(`  📊 Failed imports: ${failed}`);

        // Verify final count
        const finalCount = await Recipe.countDocuments();
        console.log(`  📊 Total recipes in database: ${finalCount}`);

        console.log('\n✅ Import completed successfully!');

    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
}

// Run the import
console.log('🚀 Starting MealDB import...');
console.log('This will take several minutes due to API rate limiting...');
importAllMealDbRecipes();