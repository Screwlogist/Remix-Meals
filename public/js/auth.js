/**
 * Utility functions for handling authentication in the client-side
 */

// ✅ Check if user is logged in
function isLoggedIn() {
    return !!getToken();
}

// ✅ Get the currently logged-in user's info from localStorage/sessionStorage
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

// ✅ Get stored token
function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// ✅ Clear auth info and logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = 'landing.html';
}

// ✅ Fetch with token (for secure APIs)
async function authFetch(url, options = {}) {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    options.headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const response = await fetch(url, options);

    if (response.status === 401 || response.status === 403) {
        logout(); // Auto-logout if token is invalid
        throw new Error('Unauthorized');
    }

    return response;
}

// ✅ Optional: Redirect to login if not authenticated
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ✅ Optional: Update top navigation with login/logout or greeting
function updateAuthUI() {
    const authButtons = document.querySelector('.auth-buttons');
    if (!authButtons) return;

    if (isLoggedIn()) {
        const user = getCurrentUser();
        const username = user?.name || 'User';

        authButtons.innerHTML = `
            <span class="user-greeting">Hello, ${username}</span>
            <button id="logout-btn" class="btn red">Logout</button>
        `;

        document.getElementById('logout-btn').addEventListener('click', logout);
    } else {
        authButtons.innerHTML = `
            <a href="login.html" class="btn green">Login</a>
            <a href="register.html" class="btn blue">Sign Up</a>
        `;
    }
}

function getLoggedInUser() {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
}
// ✅ Optional: Check if user is admin
