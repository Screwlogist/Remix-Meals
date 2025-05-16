// public/js/auth.js

/**
 * Utility functions for handling authentication in the client-side
 */

// Check if user is logged in by checking for token
function isLoggedIn() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return !!token;
}

// Get current user details
function getCurrentUser() {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

// Get authentication token
function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// Logout user
function logout() {
    // Clear both localStorage and sessionStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');

    // Redirect to landing page
    window.location.href = 'landing.html';
}

// Add auth headers to fetch requests
async function authFetch(url, options = {}) {
    const token = getToken();

    if (!token) {
        throw new Error('No authentication token found');
    }

    // Create headers object if it doesn't exist
    if (!options.headers) {
        options.headers = {};
    }

    // Add authorization header
    options.headers.Authorization = `Bearer ${token}`;

    try {
        const response = await fetch(url, options);

        // If unauthorized (token expired or invalid), logout
        if (response.status === 401) {
            logout();
            throw new Error('Session expired. Please login again.');
        }

        return response;
    } catch (error) {
        console.error('Auth fetch error:', error);
        throw error;
    }
}

// Redirect if not logged in - use this on protected pages
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Update UI based on auth state
function updateAuthUI() {
    const authButtons = document.querySelector('.auth-buttons');
    if (!authButtons) return;

    if (isLoggedIn()) {
        const user = getCurrentUser();
        const username = user ? user.name : 'User';

        authButtons.innerHTML = `
      <span class="user-greeting">Hello, ${username}</span>
      <button id="logout-btn" class="auth-btn logout-btn">
        <i class="material-icons">logout</i>
        Logout
      </button>
    `;

        // Add logout event listener
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    } else {
        authButtons.innerHTML = `
      <a href="login.html" class="auth-btn login-btn">
        <i class="material-icons">login</i>
        Login
      </a>
      <a href="register.html" class="auth-btn signup-btn">
        <i class="material-icons">person_add</i>
        Sign Up
      </a>
    `;
    }
}