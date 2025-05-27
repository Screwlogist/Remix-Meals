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
    console.log('🚀 DOM Content Loaded - Initializing...');
    console.log('📋 Search form element:', searchForm);
    console.log('🍟 Ingredients chips element:', ingredientsChips);
    console.log('📝 Ingredients hidden element:', ingredientsHidden);
    console.log('📊 Results grid element:', resultsGrid);

    // Initialize chips with autocomplete
    const chipsInstance = M.Chips.init(ingredientsChips, {
        placeholder: 'Enter ingredients (press Enter after each)',
        secondaryPlaceholder: '+ Add another ingredient',
        onChipAdd: () => {
            console.log('➕ Chip added');
            updateHiddenInput();
        },
        onChipDelete: () => {
            console.log('➖ Chip deleted');
            updateHiddenInput();
        },
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

    console.log('🍟 Chips initialized:', chipsInstance);

    // Function to update hidden input with chips values
    function updateHiddenInput() {
        console.log('🔄 updateHiddenInput called');
        const chipsInstance = M.Chips.getInstance(ingredientsChips);
        console.log('🍟 Chips instance in update:', chipsInstance);

        if (chipsInstance) {
            const chipsData = chipsInstance.chipsData;
            console.log('🍟 Chips data in update:', chipsData);
            const ingredients = chipsData.map(chip => chip.tag.trim().toLowerCase());
            console.log('🥬 Processed ingredients:', ingredients);
            ingredientsHidden.value = ingredients.join(',');
            console.log('📝 Hidden input updated to:', ingredientsHidden.value);
        } else {
            console.log('❌ No chips instance found in updateHiddenInput');
        }
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
    console.log('🎯 Search form submitted!');
    e.preventDefault();

    // Clear any existing content first (including favorites)
    resultsGrid.innerHTML = '';
    clearMessage();

    const ingredients = ingredientsHidden.value;
    console.log('🥬 Ingredients from hidden input:', ingredients);
    console.log('🥬 Hidden input element:', ingredientsHidden);

    // Also check the chips directly
    if (ingredientsChips) {
        const chipsInstance = M.Chips.getInstance(ingredientsChips);
        console.log('🍟 Chips instance:', chipsInstance);
        if (chipsInstance) {
            console.log('🍟 Chips data:', chipsInstance.chipsData);
        }
    }

    if (!ingredients) {
        console.log('❌ No ingredients found!');
        showMessage('Please enter at least one ingredient', true);
        return;
    }

    console.log('✅ Ingredients valid, starting search...');

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

// API functions with authentication headers
async function fetchFromApi(endpoint, options = {}) {
    try {
        // Add authentication headers if user is logged in
        const token = getToken();
        if (token) {
            options.headers = {
                ...(options.headers || {}),
                'Authorization': `Bearer ${token}`
            };
        }

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
    console.log('🔍 searchRecipesMulti called with ingredients:', ingredients);

    // Clear any existing content (including favorites display)
    resultsGrid.innerHTML = '';
    clearMessage();

    // Display ingredients in a readable format
    const ingredientsList = ingredients.split(',').join(', ');
    showMessage(`Searching for recipes with: ${ingredientsList}...`, false, true);

    try {
        console.log('📡 Making API call to:', `/recipes/search-multi?ingredients=${encodeURIComponent(ingredients)}`);

        // Call the multi-ingredient search endpoint
        const data = await fetchFromApi(`/recipes/search-multi?ingredients=${encodeURIComponent(ingredients)}`);

        console.log('📦 API Response received:', data);

        clearMessage();

        // Hide preloader after results are received
        if (preloader) {
            preloader.style.display = 'none';
        }

        if ((data.recipes && data.recipes.length > 0) || (data.meals && data.meals.length > 0)) {
            const recipes = data.recipes || data.meals;
            console.log('✅ Displaying recipes:', recipes.length, 'recipes found');
            displayRecipes(recipes);
        } else {
            console.log('❌ No recipes found');
            showMessage(`No recipes found with those ingredients. Try using fewer ingredients or different combinations.`, true);
        }
    } catch (error) {
        console.error('❌ Search error:', error);
        // Hide preloader on error
        if (preloader) {
            preloader.style.display = 'none';
        }
        showMessage('Something went wrong. Please try again.', true);
    }
}

async function getRandomRecipe() {
    // Clear any existing content (including favorites display)
    resultsGrid.innerHTML = '';
    clearMessage();

    showMessage('Fetching a random recipe...', false, true);

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

// Enhanced getFavoriteRecipes function with better display
async function getFavoriteRecipes() {
    // Check if user is logged in
    if (!isLoggedIn()) {
        showMessage('Please log in to view your favorite recipes.', true);
        return;
    }

    // Show loading state
    showFavoritesLoading();

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
            displayFavoritesWithHeader(data.recipes);
        } else {
            showEmptyFavoritesState();
        }
    } catch (error) {
        // Hide preloader on error
        if (preloader) {
            preloader.style.display = 'none';
        }

        // Check if it's an authentication error
        if (error.message.includes('401')) {
            showMessage('Please log in to view your favorite recipes.', true);
        } else {
            showMessage('Failed to load favorite recipes. Please try again.', true);
        }
    }
}

// Show loading state for favorites
function showFavoritesLoading() {
    resultsGrid.innerHTML = `
        <div class="favorites-loading">
            <div class="favorites-loading-spinner"></div>
            <p>Loading your favorite recipes...</p>
        </div>
    `;
}

// Display favorites with header and stats
function displayFavoritesWithHeader(recipes) {
    if (!recipes || recipes.length === 0) {
        showEmptyFavoritesState();
        return;
    }

    // Calculate stats
    const stats = calculateFavoritesStats(recipes);

    // Create the favorites display HTML
    resultsGrid.innerHTML = `
        <!-- Favorites Header -->
        <div class="favorites-header animate__animated animate__fadeIn">
            <h2>
                <i class="material-icons">favorite</i>
                My Favorite Recipes
            </h2>
            <p>Your personally curated collection of ${recipes.length} delicious recipe${recipes.length > 1 ? 's' : ''}</p>
        </div>

        <!-- Favorites Stats -->
        <div class="favorites-stats animate__animated animate__fadeInUp">
            <div class="stat-item">
                <span class="stat-number">${stats.total}</span>
                <div class="stat-label">Total Favorites</div>
            </div>
            <div class="stat-item">
                <span class="stat-number">${stats.recent}</span>
                <div class="stat-label">Added This Week</div>
            </div>
            <div class="stat-item">
                <span class="stat-number">${stats.cuisines}</span>
                <div class="stat-label">Different Cuisines</div>
            </div>
            <div class="stat-item">
                <span class="stat-number">${stats.categories}</span>
                <div class="stat-label">Recipe Categories</div>
            </div>
        </div>

        <!-- Favorites Grid -->
        <div class="favorites-grid">
            ${recipes.map((recipe, index) => createFavoriteRecipeCard(recipe, index)).join('')}
        </div>
    `;

    // Add smooth scroll to favorites section
    resultsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Calculate favorites statistics
function calculateFavoritesStats(recipes) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentAdditions = recipes.filter(recipe => {
        const addedDate = new Date(recipe.addedAt);
        return addedDate >= oneWeekAgo;
    }).length;

    const cuisines = new Set(recipes.map(recipe => recipe.cuisine).filter(cuisine => cuisine));
    const categories = new Set(recipes.map(recipe => recipe.category).filter(category => category));

    return {
        total: recipes.length,
        recent: recentAdditions,
        cuisines: cuisines.size,
        categories: categories.size
    };
}

// Create individual favorite recipe card
function createFavoriteRecipeCard(recipe, index) {
    const id = recipe._id || recipe.idMeal;
    const name = recipe.name || recipe.strMeal;
    const image = recipe.image || recipe.strMealThumb;
    const category = recipe.category || recipe.strCategory;
    const cuisine = recipe.cuisine || recipe.strArea;
    const addedDate = recipe.addedAt ? formatFavoriteDate(recipe.addedAt) : 'Recently added';

    // Create tags array
    const tags = [];
    if (category) tags.push(category);
    if (cuisine && cuisine !== category) tags.push(cuisine);

    return `
        <div class="favorite-recipe-card animate__animated animate__fadeInUp" 
             style="animation-delay: ${index * 0.1}s" 
             data-recipe-id="${id}">
            <div class="favorite-badge">
                <i class="material-icons">favorite</i>
            </div>
            <img src="${image}" 
                 alt="${name}" 
                 class="favorite-recipe-image"
                 onerror="this.src='https://via.placeholder.com/300x200/4caf50/white?text=Recipe'"
                 loading="lazy">
            <div class="favorite-recipe-content">
                <h3 class="favorite-recipe-title">${name}</h3>
                <div class="favorite-recipe-meta">
                    ${tags.map(tag => `<span class="favorite-recipe-tag">${tag}</span>`).join('')}
                </div>
                <div class="favorite-recipe-date">
                    <i class="material-icons" style="font-size: 1rem;">schedule</i>
                    Added ${addedDate}
                </div>
                <div class="favorite-recipe-actions">
                    <button class="favorite-action-btn favorite-btn-view" 
                            onclick="viewFavoriteRecipe('${id}')">
                        <i class="material-icons">visibility</i>
                        View Recipe
                    </button>
                    <button class="favorite-action-btn favorite-btn-remove" 
                            onclick="removeFavoriteRecipe('${id}')">
                        <i class="material-icons">delete</i>
                        Remove
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Show empty state when no favorites
function showEmptyFavoritesState() {
    resultsGrid.innerHTML = `
        <div class="favorites-empty animate__animated animate__fadeIn">
            <i class="material-icons favorites-empty-icon">favorite_border</i>
            <h3>No Favorite Recipes Yet</h3>
            <p>Start exploring recipes and click the heart icon to add them to your favorites!</p>
            <button class="favorites-empty-btn" onclick="clearMessage(); resultsGrid.innerHTML = '';">
                <i class="material-icons">search</i>
                Start Exploring Recipes
            </button>
        </div>
    `;
}

// View favorite recipe (opens the recipe modal)
function viewFavoriteRecipe(recipeId) {
    getRecipeDetails(recipeId);
}

// Remove recipe from favorites
async function removeFavoriteRecipe(recipeId) {
    try {
        // Show loading state on the remove button
        const removeBtn = document.querySelector(`[data-recipe-id="${recipeId}"] .favorite-btn-remove`);
        if (removeBtn) {
            removeBtn.innerHTML = '<i class="material-icons">hourglass_empty</i> Removing...';
            removeBtn.disabled = true;
        }

        const response = await fetchFromApi(`/recipes/${recipeId}/favorite`, {
            method: 'PUT'
        });

        if (response.success) {
            showMessage('Recipe removed from favorites!', false);

            // Remove the card with animation
            const recipeCard = document.querySelector(`[data-recipe-id="${recipeId}"]`);
            if (recipeCard) {
                recipeCard.classList.add('animate__animated', 'animate__fadeOut');
                setTimeout(() => {
                    // Reload favorites to update stats and grid
                    getFavoriteRecipes();
                }, 500);
            }
        } else {
            throw new Error('Failed to remove from favorites');
        }
    } catch (error) {
        console.error('Error removing from favorites:', error);
        showMessage('Failed to remove recipe from favorites. Please try again.', true);

        // Reset the button
        const removeBtn = document.querySelector(`[data-recipe-id="${recipeId}"] .favorite-btn-remove`);
        if (removeBtn) {
            removeBtn.innerHTML = '<i class="material-icons">delete</i> Remove';
            removeBtn.disabled = false;
        }
    }
}

// Format date for favorites display
function formatFavoriteDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        return 'today';
    } else if (diffDays === 2) {
        return 'yesterday';
    } else if (diffDays <= 7) {
        return `${diffDays - 1} days ago`;
    } else if (diffDays <= 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
            displayRecipeDetailsModern(recipe);
        } else {
            modalContent.innerHTML = '<p class="message error animate__animated animate__shakeX">Could not load recipe details.</p>';
        }
    } catch (error) {
        modalContent.innerHTML = '<p class="message error animate__animated animate__shakeX">Failed to load recipe details. Check your connection or try again.</p>';
    }
}

// Enhanced modern recipe details display function with new layout
function displayRecipeDetailsModern(recipe) {
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
    const isFavorite = recipe.isFavorite || false;

    let ingredients = [];

    if (recipe.ingredients) {
        // Our database format
        ingredients = recipe.ingredients.map(ing => ({
            name: ing.name,
            measure: ing.measure || ''
        }));
    } else {
        // MealDB format
        for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`strIngredient${i}`]?.trim();
            const measure = recipe[`strMeasure${i}`]?.trim();

            if (ingredient) {
                ingredients.push({
                    name: ingredient,
                    measure: measure || ''
                });
            } else {
                break;
            }
        }
    }

    // Create enhanced tags HTML
    const tags = [];
    if (category) tags.push({ text: category, type: 'category' });
    if (cuisine && cuisine !== category) tags.push({ text: cuisine, type: 'cuisine' });

    const tagsHTML = tags.length > 0
        ? `<div class="recipe-tags-container">
             ${tags.map(tag => `<span class="recipe-tag ${tag.type}-tag animate__animated animate__bounceIn">${tag.text}</span>`).join('')}
           </div>`
        : '';

    // Generate ingredients HTML with checkboxes
    const ingredientsHTML = ingredients.map((ing, index) => `
        <li class="ingredient-item">
            <label class="ingredient-checkbox">
                <input type="checkbox" id="ingredient-${index}" />
                <span class="checkmark"></span>
                <span class="ingredient-text">
                    ${ing.measure ? `<span class="ingredient-measure">${ing.measure}</span> ` : ''}${ing.name}
                </span>
            </label>
        </li>
    `).join('');

    // Favorite button (only if user is logged in)
    let favoriteButton = '';
    if (isLoggedIn()) {
        favoriteButton = `
            <button class="favorite-button animate__animated animate__pulse" id="favorite-btn" 
                    data-id="${id}" data-mealdb="${isMealDb}" data-favorite="${isFavorite}">
                <i class="material-icons">${isFavorite ? 'favorite' : 'favorite_border'}</i>
                ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </button>
        `;
    }

    modalContent.innerHTML = `
        <div class="recipe-modal-content">
            <!-- Recipe Header -->
            <div class="recipe-header">
                <div class="recipe-title-section">
                    <h2 class="recipe-title animate__animated animate__fadeInDown">${name}</h2>
                    ${tagsHTML}
                </div>
                ${favoriteButton}
            </div>
            
            <!-- Image and Ingredients Side by Side -->
            <div class="recipe-image-ingredients-container">
                <!-- Recipe Image - Left Side -->
                <div class="recipe-image-section animate__animated animate__fadeInLeft">
                    <img src="${image}" alt="${name}" class="recipe-image" 
                         onerror="this.src='https://via.placeholder.com/600x400/4caf50/white?text=Recipe+Image'">
                </div>
                
                <!-- Ingredients - Right Side -->
                <div class="recipe-ingredients-section animate__animated animate__fadeInRight">
                    <div class="ingredients-header">
                        <h3 class="ingredients-title">
                            <i class="material-icons">restaurant_menu</i>
                            Ingredients
                        </h3>
                        <div class="ingredients-progress">
                            <span class="progress-count" id="checked-count">0</span> of ${ingredients.length} ready
                        </div>
                    </div>
                    <ul class="ingredients-list">
                        ${ingredientsHTML}
                    </ul>
                </div>
            </div>
            
            <!-- Instructions and Side Content -->
            <div class="recipe-content-grid">
                <div class="recipe-main-content">
                    <!-- Instructions Section -->
                    <div class="recipe-section">
                        <h3 class="section-title">
                            <i class="material-icons">assignment</i>
                            Instructions
                        </h3>
                        <div class="instructions-content">
                            <p>${instructions ? instructions.replace(/\r?\n/g, "<br>") : "Instructions not available."}</p>
                        </div>
                    </div>
                </div>
                
                <div class="recipe-side-content">
                    ${videoUrl ? `
                        <div class="recipe-section">
                            <h3 class="section-title">
                                <i class="material-icons">play_circle_filled</i>
                                Video Tutorial
                            </h3>
                            <div class="video-actions">
                                <a class="action-btn video-btn" href="${videoUrl}" target="_blank">
                                    <i class="material-icons">play_arrow</i>
                                    Watch on YouTube
                                </a>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${sourceUrl ? `
                        <div class="recipe-section">
                            <h3 class="section-title">
                                <i class="material-icons">link</i>
                                Original Source
                            </h3>
                            <div class="source-actions">
                                <a class="action-btn source-btn" href="${sourceUrl}" target="_blank">
                                    <i class="material-icons">open_in_new</i>
                                    View Original Recipe
                                </a>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    // Add event listener for favorite button if it exists
    const favoriteBtn = document.getElementById('favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const recipeId = btn.dataset.id;
            const isMealDb = btn.dataset.mealdb === 'true';

            // Enhanced button animation
            btn.classList.add('animate__animated', 'animate__heartBeat');

            // Disable button while processing
            btn.disabled = true;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="material-icons">hourglass_empty</i> Updating...';

            await toggleFavorite(recipeId, isMealDb);

            // Re-enable button
            btn.disabled = false;

            // Remove animation class after it completes
            setTimeout(() => {
                btn.classList.remove('animate__heartBeat');
            }, 1000);
        });
    }

    // Add event listeners for ingredient checkboxes
    const checkboxes = document.querySelectorAll('.ingredient-checkbox input[type="checkbox"]');
    const checkedCountElement = document.getElementById('checked-count');

    if (checkboxes.length > 0 && checkedCountElement) {
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateIngredientProgress);
        });
    }

    function updateIngredientProgress() {
        const checkedBoxes = document.querySelectorAll('.ingredient-checkbox input[type="checkbox"]:checked');
        const checkedCount = checkedBoxes.length;

        if (checkedCountElement) {
            checkedCountElement.textContent = checkedCount;
        }

        // Add visual feedback for completed ingredients
        checkboxes.forEach(checkbox => {
            const ingredientItem = checkbox.closest('.ingredient-item');
            if (checkbox.checked) {
                ingredientItem.classList.add('completed');
            } else {
                ingredientItem.classList.remove('completed');
            }
        });

        // Show completion message when all ingredients are checked
        if (checkedCount === checkboxes.length && checkedCount > 0) {
            showMessage('All ingredients checked! Ready to cook! 🍳', false);
            setTimeout(clearMessage, 3000);
        }
    }
}

// NEW: Enhanced ingredient toggle with better animations and sound feedback
function toggleIngredientEnhanced(element, index) {
    const checkbox = element.querySelector('.ingredient-checkbox');
    const item = element;

    // Add ripple effect
    createRippleEffect(element);

    if (checkbox.classList.contains('checked')) {
        checkbox.classList.remove('checked');
        item.classList.remove('checked');
        item.classList.add('animate__animated', 'animate__bounceIn');
    } else {
        checkbox.classList.add('checked');
        item.classList.add('checked');
        item.classList.add('animate__animated', 'animate__pulse');

        // Celebration animation for completing ingredient
        setTimeout(() => {
            checkbox.classList.add('animate__animated', 'animate__tada');
        }, 100);
    }

    // Clean up animation classes
    setTimeout(() => {
        item.classList.remove('animate__bounceIn', 'animate__pulse');
        checkbox.classList.remove('animate__tada');
    }, 1000);

    // Update progress
    updateIngredientProgress();
}

// NEW: Create ripple effect for ingredient clicks
function createRippleEffect(element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: 50%;
        top: 50%;
        background: radial-gradient(circle, rgba(76, 175, 80, 0.3) 0%, transparent 70%);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
        z-index: 1;
    `;

    element.style.position = 'relative';
    element.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 600);

    // Add ripple animation CSS if not already added
    if (!document.getElementById('ripple-styles')) {
        const style = document.createElement('style');
        style.id = 'ripple-styles';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: translate(-50%, -50%) scale(2);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// NEW: Update ingredient progress indicator
function updateIngredientProgress() {
    const allIngredients = document.querySelectorAll('.ingredient-item');
    const checkedIngredients = document.querySelectorAll('.ingredient-item.checked');
    const progress = allIngredients.length > 0 ? (checkedIngredients.length / allIngredients.length) * 100 : 0;

    // Update or create progress indicator
    let progressIndicator = document.querySelector('.ingredient-progress');

    if (!progressIndicator) {
        progressIndicator = document.createElement('div');
        progressIndicator.className = 'ingredient-progress';
        progressIndicator.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text">
                <span class="progress-count">${checkedIngredients.length}</span> of 
                <span class="progress-total">${allIngredients.length}</span> ingredients ready
            </div>
        `;

        const ingredientsSection = document.querySelector('.ingredients-section');
        if (ingredientsSection) {
            ingredientsSection.appendChild(progressIndicator);
        }

        // Add progress bar styles
        if (!document.getElementById('progress-styles')) {
            const style = document.createElement('style');
            style.id = 'progress-styles';
            style.textContent = `
                .ingredient-progress {
                    margin-top: 20px;
                    padding: 15px;
                    background: linear-gradient(135deg, rgba(76, 175, 80, 0.05), rgba(255, 152, 0, 0.05));
                    border-radius: 10px;
                    border: 1px solid rgba(76, 175, 80, 0.1);
                }
                .progress-bar {
                    height: 8px;
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 10px;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
                    transition: width 0.3s ease;
                    border-radius: 4px;
                }
                .progress-text {
                    text-align: center;
                    font-size: 0.9rem;
                    color: var(--text-dark);
                    font-weight: 500;
                }
                .progress-count {
                    font-weight: 700;
                    color: var(--primary-color);
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Update progress
    const progressFill = progressIndicator.querySelector('.progress-fill');
    const progressCount = progressIndicator.querySelector('.progress-count');

    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }

    if (progressCount) {
        progressCount.textContent = checkedIngredients.length;
    }

    // Add completion celebration
    if (progress === 100 && allIngredients.length > 0) {
        setTimeout(() => {
            progressIndicator.classList.add('animate__animated', 'animate__pulse');
            progressIndicator.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(255, 152, 0, 0.1))';
        }, 300);
    }
}

async function toggleFavorite(recipeId, isMealDb = false) {
    console.log('=== TOGGLE FAVORITE START ===');
    console.log('Recipe ID:', recipeId);
    console.log('Is MealDB:', isMealDb);

    // Check if user is logged in
    if (!isLoggedIn()) {
        console.log('❌ User not logged in');
        showMessage('Please log in to add recipes to your favorites.', true);
        return;
    }

    console.log('✅ User is logged in');

    // Get current button state
    const favoriteBtn = document.getElementById('favorite-btn');
    if (favoriteBtn) {
        console.log('📍 BEFORE API CALL:');
        console.log('  - Button text:', favoriteBtn.textContent);
        console.log('  - Button data-favorite:', favoriteBtn.dataset.favorite);
        console.log('  - Button expects to:', favoriteBtn.dataset.favorite === 'true' ? 'REMOVE from favorites' : 'ADD to favorites');
    }

    try {
        console.log('🚀 Making API call...');
        console.log('  - URL:', `/recipes/${recipeId}/favorite`);
        console.log('  - Method: PUT');

        const response = await fetchFromApi(`/recipes/${recipeId}/favorite`, {
            method: 'PUT'
        });

        console.log('📦 API Response received:');
        console.log('  - Success:', response.success);
        console.log('  - Recipe object:', response.recipe);
        console.log('  - Recipe isFavorite:', response.recipe?.isFavorite);

        const recipe = response.recipe;

        if (!recipe) {
            console.log('❌ No recipe in response');
            return;
        }

        // Update the favorite button in the modal
        if (favoriteBtn) {
            console.log('📍 UPDATING BUTTON:');
            console.log('  - Recipe isFavorite from server:', recipe.isFavorite);

            const newButtonText = recipe.isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
            const newDataFavorite = recipe.isFavorite ? 'true' : 'false';
            const newIcon = recipe.isFavorite ? 'favorite' : 'favorite_border';

            console.log('  - Setting button text to:', newButtonText);
            console.log('  - Setting data-favorite to:', newDataFavorite);

            favoriteBtn.innerHTML = `<i class="material-icons">${newIcon}</i> ${newButtonText}`;
            favoriteBtn.dataset.favorite = newDataFavorite;

            console.log('📍 AFTER UPDATE:');
            console.log('  - Button text now:', favoriteBtn.textContent);
            console.log('  - Button data-favorite now:', favoriteBtn.dataset.favorite);
        }

        // Show success message
        const message = recipe.isFavorite ? 'Added to favorites!' : 'Removed from favorites!';
        console.log('💬 Showing message:', message);
        showMessage(message, false);
        setTimeout(clearMessage, 2000);

        console.log('=== TOGGLE FAVORITE SUCCESS ===');
        return recipe;
    } catch (error) {
        console.log('=== TOGGLE FAVORITE ERROR ===');
        console.error('Error details:', error);

        if (error.message.includes('401')) {
            showMessage('Please log in to manage your favorites.', true);
        } else {
            showMessage('Failed to update favorites. Please try again.', true);
        }
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
        const isFavorite = recipe.isFavorite || false;

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
              ${isFavorite ? '<span class="favorite-badge pulse"><i class="material-icons">favorite</i></span>' : ''}
            </div>
            <div class="card-content">
              <h3>${name}</h3>
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
    const isFavorite = recipe.isFavorite || false;

    let ingredients = [];

    if (recipe.ingredients) {
        // Our database format
        ingredients = recipe.ingredients.map((ing, index) =>
            `<li class="ingredient-item">
                <label class="ingredient-checkbox">
                    <input type="checkbox" id="ingredient-${index}" />
                    <span class="checkmark"></span>
                    <span class="ingredient-text">${ing.measure ? `${ing.measure} ` : ""}${ing.name}</span>
                </label>
            </li>`
        );
    } else {
        // MealDB format
        let ingredientIndex = 0;
        for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`strIngredient${i}`]?.trim();
            const measure = recipe[`strMeasure${i}`]?.trim();

            if (ingredient) {
                ingredients.push(
                    `<li class="ingredient-item">
                        <label class="ingredient-checkbox">
                            <input type="checkbox" id="ingredient-${ingredientIndex}" />
                            <span class="checkmark"></span>
                            <span class="ingredient-text">${measure ? `${measure} ` : ""}${ingredient}</span>
                        </label>
                    </li>`
                );
                ingredientIndex++;
            } else {
                break;
            }
        }
    }

    // Create tags
    const tags = [];
    if (category) tags.push(`<span class="recipe-tag category-tag">${category}</span>`);
    if (cuisine && cuisine !== category) tags.push(`<span class="recipe-tag cuisine-tag">${cuisine}</span>`);

    const tagsHTML = tags.length > 0 ? `<div class="recipe-tags">${tags.join('')}</div>` : '';

    const ingredientsHTML = ingredients.length
        ? `<div class="recipe-section">
             <h3 class="section-title">
                <i class="material-icons">list</i>
                Ingredients
                <span class="ingredients-progress">(<span id="checked-count">0</span>/${ingredients.length})</span>
             </h3>
             <ul class="ingredients-list">
               ${ingredients.join("")}
             </ul>
           </div>`
        : "";

    const instructionsHTML = `
        <div class="recipe-section">
            <h3 class="section-title">
                <i class="material-icons">assignment</i>
                Instructions
            </h3>
            <div class="instructions-content">
                <p>${instructions ? instructions.replace(/\r?\n/g, "<br>") : "Instructions not available."}</p>
            </div>
        </div>
    `;

    const videoHTML = videoUrl
        ? `<div class="recipe-section">
             <h3 class="section-title">
                <i class="material-icons">play_circle_filled</i>
                Video Tutorial
             </h3>
             <div class="video-actions">
               <a class="action-btn video-btn" href="${videoUrl}" target="_blank">
                 <i class="material-icons">play_arrow</i>
                 Watch on YouTube
               </a>
             </div>
           </div>`
        : "";

    const sourceHTML = sourceUrl
        ? `<div class="recipe-section">
             <h3 class="section-title">
                <i class="material-icons">link</i>
                Original Source
             </h3>
             <div class="source-actions">
               <a class="action-btn source-btn" href="${sourceUrl}" target="_blank">
                 <i class="material-icons">open_in_new</i>
                 View Original Recipe
               </a>
             </div>
           </div>`
        : "";

    // Only show favorite button if user is logged in
    let favoriteButton = '';
    if (isLoggedIn()) {
        favoriteButton = `
            <button id="favorite-btn" class="favorite-button animate__animated animate__heartBeat" 
                    data-id="${id}" data-mealdb="${isMealDb}" data-favorite="${isFavorite}">
                <i class="material-icons">${isFavorite ? 'favorite' : 'favorite_border'}</i>
                ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </button>
        `;
    }

    modalContent.innerHTML = `
        <div class="recipe-modal-content">
            <!-- Recipe Header -->
            <div class="recipe-header">
                <div class="recipe-title-section">
                    <h2 class="recipe-title animate__animated animate__fadeInDown">${name}</h2>
                    ${tagsHTML}
                </div>
                ${favoriteButton}
            </div>
            
            <!-- Recipe Image -->
            <div class="recipe-image-section animate__animated animate__fadeInLeft">
                <img src="${image}" alt="${name}" class="recipe-image" onerror="this.src='https://via.placeholder.com/600x400/4caf50/white?text=Recipe+Image'">
            </div>
            
            <!-- Recipe Content Grid -->
            <div class="recipe-content-grid">
                <div class="recipe-main-content">
                    ${ingredientsHTML}
                    ${instructionsHTML}
                </div>
                
                <div class="recipe-side-content">
                    ${videoHTML}
                    ${sourceHTML}
                </div>
            </div>
        </div>
    `;

    // Add event listener for favorite button if it exists
    const favoriteBtn = document.getElementById('favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const recipeId = btn.dataset.id;
            const isMealDb = btn.dataset.mealdb === 'true';

            // Add button animation
            btn.classList.add('animate__animated', 'animate__rubberBand');

            // Disable button while processing
            btn.disabled = true;
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="material-icons">hourglass_empty</i> Updating...';

            await toggleFavorite(recipeId, isMealDb);

            // Re-enable button
            btn.disabled = false;

            // Remove animation class after it completes
            setTimeout(() => {
                btn.classList.remove('animate__rubberBand');
            }, 1000);
        });
    }

    // Add event listeners for ingredient checkboxes
    const checkboxes = document.querySelectorAll('.ingredient-checkbox input[type="checkbox"]');
    const checkedCountElement = document.getElementById('checked-count');

    if (checkboxes.length > 0 && checkedCountElement) {
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateIngredientProgress);
        });
    }

    function updateIngredientProgress() {
        const checkedBoxes = document.querySelectorAll('.ingredient-checkbox input[type="checkbox"]:checked');
        const checkedCount = checkedBoxes.length;

        if (checkedCountElement) {
            checkedCountElement.textContent = checkedCount;
        }

        // Add visual feedback for completed ingredients
        checkboxes.forEach(checkbox => {
            const ingredientItem = checkbox.closest('.ingredient-item');
            if (checkbox.checked) {
                ingredientItem.classList.add('completed');
            } else {
                ingredientItem.classList.remove('completed');
            }
        });

        // Show completion message when all ingredients are checked
        if (checkedCount === checkboxes.length && checkedCount > 0) {
            showMessage('All ingredients checked! Ready to cook! 🍳', false);
            setTimeout(clearMessage, 3000);
        }
    }
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
        externalId: mealDbRecipe.idMeal
    };
}

// Helper function to get token from auth.js
function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// Helper function to check if user is logged in
function isLoggedIn() {
    return !!getToken();
}