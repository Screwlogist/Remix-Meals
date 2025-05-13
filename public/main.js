// public/main.js - Enhanced version

// API URLs
const BASE_API_URL = '/api';
const MEAL_DB_API = {
    SEARCH: 'https://www.themealdb.com/api/json/v1/1/search.php?s=',
    RANDOM: 'https://www.themealdb.com/api/json/v1/1/random.php',
    LOOKUP: 'https://www.themealdb.com/api/json/v1/1/lookup.php?i='
};

// DOM elements
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const resultsGrid = document.getElementById('results-grid');
const messageArea = document.getElementById('message-area');
const randomButton = document.getElementById('random-button');
const modal = document.getElementById('recipe-modal');
const modalContent = document.getElementById('recipe-details-content');
const modalCloseBtn = document.getElementById('modal-close-btn');
const favoritesButton = document.getElementById('favorites-button');

// Event listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchTerm = searchInput.value.trim();

    if (searchTerm) {
        searchRecipes(searchTerm);
    } else {
        showMessage('Please enter a search term', true);
    }
});

randomButton.addEventListener('click', getRandomRecipe);
modalCloseBtn.addEventListener('click', closeModal);
favoritesButton.addEventListener('click', getFavoriteRecipes);

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Any initialization code can go here
});

// API functions
async function fetchFromApi(endpoint, options = {}) {
    try {
        const response = await fetch(`${BASE_API_URL}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Recipe operations
async function searchRecipes(query) {
    showMessage(`Searching for "${query}"...`, false, true);
    resultsGrid.innerHTML = '';

    try {
        // Try our backend first
        const data = await fetchFromApi(`/recipes/search?q=${query}`);

        clearMessage();

        if ((data.recipes && data.recipes.length > 0) || (data.meals && data.meals.length > 0)) {
            const recipes = data.recipes || data.meals;
            displayRecipes(recipes);
        } else {
            showMessage(`No recipes found for "${query}"`, true);
        }
    } catch (error) {
        showMessage('Something went wrong. Please try again.', true);
    }
}

async function getRandomRecipe() {
    showMessage('Fetching a random recipe...', false, true);
    resultsGrid.innerHTML = '';

    try {
        const data = await fetchFromApi('/recipes/random');

        clearMessage();

        if ((data.recipe) || (data.meals && data.meals.length > 0)) {
            const recipes = data.recipe ? [data.recipe] : data.meals;
            displayRecipes(recipes);
        } else {
            showMessage('Could not fetch a random recipe. Please try again.', true);
        }
    } catch (error) {
        showMessage('Failed to fetch a random recipe. Please check your connection and try again.', true);
    }
}

async function getFavoriteRecipes() {
    showMessage('Loading your favorite recipes...', false, true);
    resultsGrid.innerHTML = '';

    try {
        const data = await fetchFromApi('/recipes/favorites');

        clearMessage();

        if (data.recipes && data.recipes.length > 0) {
            displayRecipes(data.recipes);
        } else {
            showMessage('You have no favorite recipes yet.', false);
        }
    } catch (error) {
        showMessage('Failed to load favorite recipes. Please try again.', true);
    }
}

async function getRecipeDetails(id) {
    modalContent.innerHTML = '<p class="message loading">Loading details...</p>';
    showModal();

    try {
        // Determine if this is a MongoDB ID or MealDB ID
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
        const endpoint = isMongoId ? `/recipes/${id}` : `/recipes/external/${id}`;

        const data = await fetchFromApi(endpoint);

        if ((data.recipe) || (data.meals && data.meals.length > 0)) {
            const recipe = data.recipe || data.meals[0];
            displayRecipeDetails(recipe);
        } else {
            modalContent.innerHTML = '<p class="message error">Could not load recipe details.</p>';
        }
    } catch (error) {
        modalContent.innerHTML = '<p class="message error">Failed to load recipe details. Check your connection or try again.</p>';
    }
}

async function toggleFavorite(recipeId, isMealDb = false) {
    try {
        let recipe;

        if (isMealDb) {
            // This is a MealDB recipe, so we need to save it to our database first
            const mealDbUrl = `${MEAL_DB_API.LOOKUP}${recipeId}`;
            const mealDbResponse = await fetch(mealDbUrl);
            const mealData = await mealDbResponse.json();

            if (!mealData.meals || !mealData.meals.length) {
                throw new Error('Recipe not found');
            }

            const mealDbRecipe = mealData.meals[0];

            // Save to our database
            const saveResponse = await fetchFromApi('/recipes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transformMealDbToOurFormat(mealDbRecipe))
            });

            recipe = saveResponse.recipe;
        } else {
            // This is already in our database, just toggle favorite
            const response = await fetchFromApi(`/recipes/${recipeId}/favorite`, {
                method: 'PUT'
            });

            recipe = response.recipe;
        }

        // Update the favorite button in the modal
        const favoriteBtn = document.getElementById('favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.textContent = recipe.isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
            favoriteBtn.dataset.favorite = recipe.isFavorite ? 'true' : 'false';
            favoriteBtn.dataset.id = recipe._id;
            favoriteBtn.dataset.mealdb = 'false';
        }

        return recipe;
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showMessage('Failed to update favorites. Please try again.', true);
    }
}

// Helper functions
function displayRecipes(recipes) {
    if (!recipes || recipes.length === 0) {
        showMessage('No recipes to display');
        return;
    }

    resultsGrid.innerHTML = '';

    recipes.forEach((recipe) => {
        // Handle both our database format and MealDB format
        const id = recipe._id || recipe.idMeal;
        const name = recipe.name || recipe.strMeal;
        const image = recipe.image || recipe.strMealThumb;
        const isMealDb = !!recipe.idMeal;

        const recipeDiv = document.createElement('div');
        recipeDiv.classList.add('recipe-item');
        recipeDiv.dataset.id = id;
        recipeDiv.dataset.mealdb = isMealDb;

        recipeDiv.innerHTML = `
      <img src="${image}" alt="${name}" loading="lazy">
      <h3>${name}</h3>
      ${recipe.isFavorite ? '<span class="favorite-badge"><i class="material-icons">favorite</i></span>' : ''}
    `;

        recipeDiv.addEventListener('click', () => {
            getRecipeDetails(id);
        });

        resultsGrid.appendChild(recipeDiv);
    });
}

function displayRecipeDetails(recipe) {
    // Handle both our database format and MealDB format
    const id = recipe._id || recipe.idMeal;
    const name = recipe.name || recipe.strMeal;
    const image = recipe.image || recipe.strMealThumb;
    const instructions = recipe.instructions || recipe.strInstructions;
    const category = recipe.category || recipe.strCategory;
    const cuisine = recipe.cuisine || recipe.strArea;
    const videoUrl = recipe.videoUrl || recipe.strYoutube;
    const sourceUrl = recipe.sourceUrl || recipe.strSource;
    const isMealDb = !!recipe.idMeal;
    const isFavorite = !!recipe.isFavorite;

    let ingredients = [];

    if (recipe.ingredients) {
        // Our database format
        ingredients = recipe.ingredients.map(ing =>
            `<li>${ing.measure ? `${ing.measure} ` : ""}${ing.name}</li>`
        );
    } else {
        // MealDB format
        for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`strIngredient${i}`]?.trim();
            const measure = recipe[`strMeasure${i}`]?.trim();

            if (ingredient) {
                ingredients.push(`<li>${measure ? `${measure} ` : ""}${ingredient}</li>`);
            } else {
                break;
            }
        }
    }

    const categoryHTML = category ? `<h3>Category: ${category}</h3>` : "";
    const cuisineHTML = cuisine ? `<h3>Area: ${cuisine}</h3>` : "";
    const ingredientsHTML = ingredients.length
        ? `<h3>Ingredients</h3><ul>${ingredients.join("")}</ul>`
        : "";
    const instructionsHTML = `<h3>Instructions</h3><p>${
        instructions
            ? instructions.replace(/\r?\n/g, "<br>")
            : "Instructions not available."
    }</p>`;
    const youtubeHTML = videoUrl
        ? `<h3>Video Recipe</h3><div class="video-wrapper"><a href="${videoUrl}" target="_blank">Watch on YouTube</a><div>`
        : "";
    const sourceHTML = sourceUrl
        ? `<div class="source-wrapper"><a href="${sourceUrl}" target="_blank">View Original Source</a></div>`
        : "";

    const favoriteButton = `
    <button id="favorite-btn" class="favorite-button" data-id="${id}" data-mealdb="${isMealDb}" data-favorite="${isFavorite}">
      ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
    </button>
  `;

    modalContent.innerHTML = `
    <h2>${name}</h2>
    <img src="${image}" alt="${name}">
    ${favoriteButton}
    ${categoryHTML}
    ${cuisineHTML}
    ${ingredientsHTML}
    ${instructionsHTML}
    ${youtubeHTML}
    ${sourceHTML}
  `;

    // Add event listener for favorite button
    const favoriteBtn = document.getElementById('favorite-btn');
    favoriteBtn.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const recipeId = btn.dataset.id;
        const isMealDb = btn.dataset.mealdb === 'true';

        // Disable button while processing
        btn.disabled = true;
        btn.textContent = 'Updating...';

        await toggleFavorite(recipeId, isMealDb);

        // Re-enable button
        btn.disabled = false;
    });
}

function showMessage(message, isError = false, isLoading = false) {
    messageArea.textContent = message;
    messageArea.className = "message";

    if (isError) messageArea.classList.add("error");
    if (isLoading) messageArea.classList.add("loading");
}

function clearMessage() {
    messageArea.textContent = "";
    messageArea.className = "message";
}

function showModal() {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
}

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
        externalId: mealDbRecipe.idMeal,
        isFavorite: true // Assume we're saving as favorite
    };
}