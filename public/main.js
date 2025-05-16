// API URLs
const BASE_API_URL = '/api';
const MEAL_DB_API = {
    SEARCH: 'https://www.themealdb.com/api/json/v1/1/search.php?s=',
    RANDOM: 'https://www.themealdb.com/api/json/v1/1/random.php',
    LOOKUP: 'https://www.themealdb.com/api/json/v1/1/lookup.php?i='
};

// DOM elements
const searchForm = document.getElementById('search-form');
const ingredientsChips = document.getElementById('ingredients-chips');
const ingredientsHidden = document.getElementById('ingredients-hidden');
const resultsGrid = document.getElementById('results-grid');
const messageArea = document.getElementById('message-area');
const randomButton = document.getElementById('random-button');
const modal = document.getElementById('recipe-modal');
const modalContent = document.getElementById('recipe-details-content');
const modalCloseBtn = document.getElementById('modal-close-btn');
const favoritesButton = document.getElementById('favorites-button');
const preloader = document.getElementById('preloader');

// Initialize Materialize components
document.addEventListener('DOMContentLoaded', function() {
    // Initialize chips with autocomplete
    const chipsInstance = M.Chips.init(ingredientsChips, {
        placeholder: 'Enter ingredients (press Enter after each)',
        secondaryPlaceholder: '+ Add another ingredient',
        onChipAdd: () => updateHiddenInput(),
        onChipDelete: () => updateHiddenInput(),
        autocompleteOptions: {
            data: {
                'chicken': null,
                'beef': null,
                'pork': null,
                'rice': null,
                'pasta': null,
                'tomato': null,
                'onion': null,
                'garlic': null,
                'carrot': null,
                'potato': null,
                'bell pepper': null,
                'cheese': null,
                'mushroom': null,
                'spinach': null,
                'broccoli': null
            },
            limit: 5,
            minLength: 1
        }
    });

    // Function to update hidden input with chips values
    function updateHiddenInput() {
        const chipsData = M.Chips.getInstance(ingredientsChips).chipsData;
        const ingredients = chipsData.map(chip => chip.tag.trim().toLowerCase());
        ingredientsHidden.value = ingredients.join(',');
    }

    // Initialize Materialize tooltips and other components
    let elems = document.querySelectorAll('.tooltipped');
    let tooltips = M.Tooltip.init(elems, {});

    // Add animation to recipe items when they appear
    const animateResults = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate__animated', 'animate__fadeInUp');
                observer.unobserve(entry.target);
            }
        });
    };

    // Create IntersectionObserver to detect when recipe items come into view
    const observer = new IntersectionObserver(animateResults, { threshold: 0.1 });

    // Observe grid for dynamic content
    if (resultsGrid) {
        observer.observe(resultsGrid);
    }
});

// Event listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const ingredients = ingredientsHidden.value;

    if (!ingredients) {
        showMessage('Please enter at least one ingredient', true);
        return;
    }

    // Show preloader
    if (preloader) {
        preloader.style.display = 'block';
    }

    searchRecipesMulti(ingredients);
});

randomButton.addEventListener('click', getRandomRecipe);
modalCloseBtn.addEventListener('click', closeModal);
favoritesButton.addEventListener('click', getFavoriteRecipes);

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
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
async function searchRecipesMulti(ingredients) {
    // Display ingredients in a readable format
    const ingredientsList = ingredients.split(',').join(', ');
    showMessage(`Searching for recipes with: ${ingredientsList}...`, false, true);
    resultsGrid.innerHTML = '';

    try {
        // Call the multi-ingredient search endpoint
        const data = await fetchFromApi(`/recipes/search-multi?ingredients=${encodeURIComponent(ingredients)}`);

        clearMessage();

        // Hide preloader after results are received
        if (preloader) {
            preloader.style.display = 'none';
        }

        if ((data.recipes && data.recipes.length > 0) || (data.meals && data.meals.length > 0)) {
            const recipes = data.recipes || data.meals;
            displayRecipes(recipes);
        } else {
            showMessage(`No recipes found with those ingredients. Try using fewer ingredients or different combinations.`, true);
        }
    } catch (error) {
        // Hide preloader on error
        if (preloader) {
            preloader.style.display = 'none';
        }
        showMessage('Something went wrong. Please try again.', true);
    }
}

async function getRandomRecipe() {
    showMessage('Fetching a random recipe...', false, true);
    resultsGrid.innerHTML = '';

    // Show preloader
    if (preloader) {
        preloader.style.display = 'block';
    }

    try {
        const data = await fetchFromApi('/recipes/random');

        clearMessage();

        // Hide preloader after results are received
        if (preloader) {
            preloader.style.display = 'none';
        }

        if ((data.recipe) || (data.meals && data.meals.length > 0)) {
            const recipes = data.recipe ? [data.recipe] : data.meals;
            displayRecipes(recipes);
        } else {
            showMessage('Could not fetch a random recipe. Please try again.', true);
        }
    } catch (error) {
        // Hide preloader on error
        if (preloader) {
            preloader.style.display = 'none';
        }
        showMessage('Failed to fetch a random recipe. Please check your connection and try again.', true);
    }
}

async function getFavoriteRecipes() {
    showMessage('Loading your favorite recipes...', false, true);
    resultsGrid.innerHTML = '';

    // Show preloader
    if (preloader) {
        preloader.style.display = 'block';
    }

    try {
        const data = await fetchFromApi('/recipes/favorites');

        clearMessage();

        // Hide preloader after results are received
        if (preloader) {
            preloader.style.display = 'none';
        }

        if (data.recipes && data.recipes.length > 0) {
            displayRecipes(data.recipes);
        } else {
            showMessage('You have no favorite recipes yet.', false);
        }
    } catch (error) {
        // Hide preloader on error
        if (preloader) {
            preloader.style.display = 'none';
        }
        showMessage('Failed to load favorite recipes. Please try again.', true);
    }
}

async function getRecipeDetails(id) {
    modalContent.innerHTML = '<div class="progress"><div class="indeterminate"></div></div><p class="message loading">Loading details...</p>';
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
            modalContent.innerHTML = '<p class="message error animate__animated animate__shakeX">Could not load recipe details.</p>';
        }
    } catch (error) {
        modalContent.innerHTML = '<p class="message error animate__animated animate__shakeX">Failed to load recipe details. Check your connection or try again.</p>';
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

            // Add animation
            favoriteBtn.classList.add('animate__animated');
            favoriteBtn.classList.add(recipe.isFavorite ? 'animate__heartBeat' : 'animate__bounceIn');

            // Remove animation class after it completes
            setTimeout(() => {
                favoriteBtn.classList.remove('animate__heartBeat', 'animate__bounceIn');
            }, 1000);
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

    recipes.forEach((recipe, index) => {
        // Handle both our database format and MealDB format
        const id = recipe._id || recipe.idMeal;
        const name = recipe.name || recipe.strMeal;
        const image = recipe.image || recipe.strMealThumb;
        const isMealDb = !!recipe.idMeal;

        const recipeDiv = document.createElement('div');
        recipeDiv.classList.add('recipe-item');
        recipeDiv.dataset.id = id;
        recipeDiv.dataset.mealdb = isMealDb;

        // Add animation delay based on index for staggered effect
        recipeDiv.style.animationDelay = `${index * 0.1}s`;
        recipeDiv.classList.add('animate__animated', 'animate__fadeInUp');

        recipeDiv.innerHTML = `
          <div class="card hoverable">
            <div class="card-image">
              <img src="${image}" alt="${name}" loading="lazy">
              <span class="card-title">${name}</span>
              ${recipe.isFavorite ? '<span class="favorite-badge pulse"><i class="material-icons">favorite</i></span>' : ''}
            </div>
            <div class="card-content">
              <p>${generateRandomDescription()}</p>
            </div>
            <div class="card-action">
              <a href="#" class="view-recipe">View Recipe</a>
            </div>
          </div>
        `;

        recipeDiv.addEventListener('click', () => {
            getRecipeDetails(id);
        });

        resultsGrid.appendChild(recipeDiv);
    });

    // Initialize Materialize components for the new elements
    M.AutoInit();
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
            `<li class="collection-item">${ing.measure ? `${ing.measure} ` : ""}${ing.name}</li>`
        );
    } else {
        // MealDB format
        for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`strIngredient${i}`]?.trim();
            const measure = recipe[`strMeasure${i}`]?.trim();

            if (ingredient) {
                ingredients.push(`<li class="collection-item">${measure ? `${measure} ` : ""}${ingredient}</li>`);
            } else {
                break;
            }
        }
    }

    const categoryHTML = category ? `<div class="chip">${category}</div>` : "";
    const cuisineHTML = cuisine ? `<div class="chip">${cuisine}</div>` : "";

    const ingredientsHTML = ingredients.length
        ? `<h3 class="animate__animated animate__fadeInLeft">Ingredients</h3>
           <ul class="collection animate__animated animate__fadeInUp" style="animation-delay: 0.2s">
             ${ingredients.join("")}
           </ul>`
        : "";

    const instructionsHTML = `
        <h3 class="animate__animated animate__fadeInLeft" style="animation-delay: 0.3s">Instructions</h3>
        <div class="card-panel animate__animated animate__fadeInUp" style="animation-delay: 0.4s">
            <p>${instructions ? instructions.replace(/\r?\n/g, "<br>") : "Instructions not available."}</p>
        </div>
    `;

    const youtubeHTML = videoUrl
        ? `<h3 class="animate__animated animate__fadeInLeft" style="animation-delay: 0.5s">Video Recipe</h3>
           <div class="video-wrapper animate__animated animate__fadeInUp" style="animation-delay: 0.6s">
             <a class="waves-effect waves-light btn red" href="${videoUrl}" target="_blank">
               <i class="material-icons left">play_circle_filled</i>Watch on YouTube
             </a>
           </div>`
        : "";

    const sourceHTML = sourceUrl
        ? `<div class="source-wrapper animate__animated animate__fadeInUp" style="animation-delay: 0.7s">
             <a class="waves-effect waves-light btn blue" href="${sourceUrl}" target="_blank">
               <i class="material-icons left">open_in_new</i>View Original Source
             </a>
           </div>`
        : "";

    const favoriteButton = `
        <button id="favorite-btn" class="favorite-button animate__animated animate__heartBeat" 
                data-id="${id}" data-mealdb="${isMealDb}" data-favorite="${isFavorite}">
            ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </button>
    `;

    modalContent.innerHTML = `
        <div class="row">
            <div class="col s12">
                <h2 class="animate__animated animate__fadeInDown">${name}</h2>
                <div class="tags-container">
                    ${categoryHTML} ${cuisineHTML}
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col s12 m6">
                <img src="${image}" alt="${name}" class="responsive-img animate__animated animate__fadeInLeft z-depth-2 hoverable">
                ${favoriteButton}
            </div>
            <div class="col s12 m6">
                ${ingredientsHTML}
            </div>
        </div>
        
        <div class="row">
            <div class="col s12">
                ${instructionsHTML}
            </div>
        </div>
        
        <div class="row">
            <div class="col s12">
                ${youtubeHTML}
                ${sourceHTML}
            </div>
        </div>
    `;

    // Add event listener for favorite button
    const favoriteBtn = document.getElementById('favorite-btn');
    favoriteBtn.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const recipeId = btn.dataset.id;
        const isMealDb = btn.dataset.mealdb === 'true';

        // Add button animation
        btn.classList.add('animate__animated', 'animate__rubberBand');

        // Disable button while processing
        btn.disabled = true;
        btn.textContent = 'Updating...';

        await toggleFavorite(recipeId, isMealDb);

        // Re-enable button
        btn.disabled = false;

        // Remove animation class after it completes
        setTimeout(() => {
            btn.classList.remove('animate__rubberBand');
        }, 1000);
    });
}

function generateRandomDescription() {
    const descriptions = [
        "A delicious way to use your ingredients!",
        "Perfect for a quick and tasty meal.",
        "Wow your family with this flavorful dish.",
        "A chef's favorite choice!",
        "Simple to make with amazing results.",
        "A crowd-pleasing recipe everyone will love.",
        "Transform leftovers into gourmet meals.",
        "Healthy, tasty, and easy to prepare."
    ];

    return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function showMessage(message, isError = false, isLoading = false) {
    messageArea.textContent = message;
    messageArea.className = "message";

    if (isError) messageArea.classList.add("error");
    if (isLoading) messageArea.classList.add("loading");

    // Add animation
    messageArea.classList.add('animate__animated');
    messageArea.classList.add(isError ? 'animate__shakeX' : 'animate__fadeIn');

    // Remove animation class after it completes
    setTimeout(() => {
        messageArea.classList.remove('animate__shakeX', 'animate__fadeIn');
    }, 1000);
}

function clearMessage() {
    messageArea.textContent = "";
    messageArea.className = "message";
}

function showModal() {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    // Add animation class
    const modalContentElement = document.querySelector('.modal-content');
    modalContentElement.classList.add('animate__animated', 'animate__zoomIn');
}

function closeModal() {
    const modalContentElement = document.querySelector('.modal-content');
    modalContentElement.classList.remove('animate__zoomIn');
    modalContentElement.classList.add('animate__zoomOut');

    // Wait for animation to complete before hiding
    setTimeout(() => {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
        modalContentElement.classList.remove('animate__zoomOut');
    }, 500);
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