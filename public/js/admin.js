// Ensure admin is logged in
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (!user || !user.isAdmin) {
    alert("Admins only!");
    window.location.href = 'login.html';
    return;
  }

  fetchUsers();
  fetchRecipes();
});

// Authenticated fetch
async function authFetch(url, options = {}) {
  const token = getToken();
  options.headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    logout();
    throw new Error("Not authorized");
  }
  return res;
}

// Fetch & display users
async function fetchUsers() {
  const res = await authFetch('/api/admin/users');
  const data = await res.json();
  const list = document.getElementById('user-list');
  list.innerHTML = '';

  data.users.forEach(user => {
    const li = document.createElement('li');
    li.classList.add('collection-item');
    li.textContent = `${user.name} (${user.email}) ${user.isAdmin ? '[Admin]' : ''}`;
    const delBtn = document.createElement('button');
    delBtn.className = 'btn red';
    delBtn.innerText = 'Delete';
    delBtn.onclick = () => deleteUser(user._id);
    li.appendChild(delBtn);
    list.appendChild(li);
    const editBtn = document.createElement('button');
    editBtn.className = 'btn green';
    editBtn.innerText = 'Edit';
    editBtn.onclick = () => loadUser(user);
    li.appendChild(editBtn);
    list.appendChild(li);
  });
}

// Delete a user
async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user?')) return;

  try {
    const res = await authFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Failed to delete user');
    } else {
      fetchUsers(); // Refresh user list
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert('An error occurred while deleting the user.');
  }
}

document.getElementById('user-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const id = document.getElementById('user-id').value;
  const name = document.getElementById('user-name').value;
  const email = document.getElementById('user-email').value;
  const password = document.getElementById('user-password').value;
  const isAdmin = document.getElementById('user-is-admin').checked;

  const userData = { name, email, isAdmin };
  if (password) userData.password = password;

  try {
    const url = id ? `/api/admin/users/${id}` : '/api/admin/users';
    const method = id ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      body: JSON.stringify(userData)
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to save user');

    alert(id ? 'User updated' : 'User added');
    fetchUsers();
    this.reset();
  } catch (err) {
    console.error('User form error:', err);
    alert('Error saving user');
  }
});


// Fetch & display recipes
async function fetchRecipes() {
  const res = await authFetch('/api/recipes');
  const data = await res.json();
  const list = document.getElementById('recipe-list');
  list.innerHTML = '';

  data.recipes.forEach(recipe => {
    const li = document.createElement('li');
    li.classList.add('collection-item');
    li.textContent = recipe.name;
    const delBtn = document.createElement('button');
    delBtn.className = 'btn red';
    delBtn.innerText = 'Delete';
    delBtn.onclick = () => deleteRecipe(recipe._id);
    li.appendChild(delBtn);
    list.appendChild(li);
    const editBtn = document.createElement('button');
    editBtn.className = 'btn green';
    editBtn.innerText = 'Edit';
    editBtn.onclick = () => loadRecipe(recipe);
    li.appendChild(editBtn);
    list.appendChild(li);
  });
}

// Delete a recipe
async function deleteRecipe(id) {
  if (!confirm('Delete this recipe?')) return;
  await authFetch(`/api/admin/recipes/${id}`, { method: 'DELETE' });
  fetchRecipes();
}

// Logout
function logout() {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = 'landing.html';
}

function loadUser(user) {
  document.getElementById('user-id').value = user._id;
  document.getElementById('user-name').value = user.name;
  document.getElementById('user-email').value = user.email;
  document.getElementById('user-password').value = ''; // Do not pre-fill passwords
  document.getElementById('user-is-admin').checked = user.isAdmin;
}

document.getElementById('recipe-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const id = document.getElementById('recipe-id').value;
  const name = document.getElementById('recipe-name').value;
  const category = document.getElementById('recipe-category').value;
  const cuisine = document.getElementById('recipe-cuisine').value;
  const instructions = document.getElementById('recipe-instructions').value;
  const image = document.getElementById('recipe-image').value;
  const ingredientsRaw = document.getElementById('recipe-ingredients').value;

  const ingredients = ingredientsRaw.split(',').map(i => ({
    name: i.trim(),
    measure: '' // you can add input for measure if needed
  }));

  const recipeData = {
    name,
    category,
    cuisine,
    instructions,
    image,
    ingredients
  };

  try {
    const url = id ? `/api/admin/recipes/${id}` : '/api/admin/recipes';
    const method = id ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      body: JSON.stringify(recipeData)
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to save recipe');

    alert(id ? 'Recipe updated' : 'Recipe added');
    fetchRecipes();
    this.reset();
  } catch (err) {
    console.error('Recipe form error:', err);
    alert('Error saving recipe');
  }
});

function loadRecipe(recipe) {
  document.getElementById('recipe-id').value = recipe._id;
  document.getElementById('recipe-name').value = recipe.name;
  document.getElementById('recipe-category').value = recipe.category || '';
  document.getElementById('recipe-cuisine').value = recipe.cuisine || '';
  document.getElementById('recipe-instructions').value = recipe.instructions || '';
  document.getElementById('recipe-image').value = recipe.image || '';
  document.getElementById('recipe-ingredients').value = (recipe.ingredients || []).map(i => i.name).join(', ');
}
