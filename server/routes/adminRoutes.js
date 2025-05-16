const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Recipe = require('../models/Recipe');

const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Protect all admin routes
// router.use(auth, admin);

//
// 🧑 USER ROUTES
//

// Get all users (excluding password)
router.get('/users', async (req, res) => {
    console.log("✅ /api/admin/users hit");
  const users = await User.find().select('-password');
  res.json({ success: true, users });
});

// POST /api/admin/users — Create new user
router.post('/users', async (req, res) => {
  const { name, email, password, isAdmin } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ success: false, error: 'Email already exists' });

  const user = new User({ name, email, password, isAdmin });
  await user.save();

  res.status(201).json({ success: true, user });
});

// PUT /api/admin/users/:id — Update user
router.put('/users/:id', async (req, res) => {
  const updates = req.body;

  // Hash new password if provided
  if (updates.password) {
    const bcrypt = require('bcryptjs');
    updates.password = await bcrypt.hash(updates.password, 10);
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  res.json({ success: true, user });
});

// Delete user by ID
router.delete('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  if (user.isAdmin) {
    return res.status(403).json({ success: false, error: 'Cannot delete an admin account' });
  }

  await user.deleteOne();

  res.json({ success: true, message: 'User deleted successfully' });
});


//
// 🍲 RECIPE ROUTES
//

// Add new recipe
router.post('/recipes', async (req, res) => {
  const recipe = new Recipe(req.body);
  await recipe.save();
  res.status(201).json({ success: true, recipe });
});

// Update recipe
router.put('/recipes/:id', async (req, res) => {
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!recipe) {
    return res.status(404).json({ success: false, error: 'Recipe not found' });
  }
  res.json({ success: true, recipe });
});

// Delete recipe
router.delete('/recipes/:id', async (req, res) => {
  const recipe = await Recipe.findByIdAndDelete(req.params.id);
  if (!recipe) {
    return res.status(404).json({ success: false, error: 'Recipe not found' });
  }
  res.json({ success: true, recipe });
});

router.post('/recipes', async (req, res) => {
  try {
    const recipe = new Recipe(req.body);
    await recipe.save();
    res.status(201).json({ success: true, recipe });
  } catch (err) {
    console.error('Create recipe error:', err);
    res.status(500).json({ success: false, error: 'Failed to create recipe' });
  }
});

router.put('/recipes/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!recipe) return res.status(404).json({ success: false, error: 'Recipe not found' });
    res.json({ success: true, recipe });
  } catch (err) {
    console.error('Update recipe error:', err);
    res.status(500).json({ success: false, error: 'Failed to update recipe' });
  }
});

module.exports = router;

