const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

// Create Express app
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/recipefinder', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('MongoDB Connected');
    checkAdminStatus(); 
})
.catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
});

// Middleware
app.use(express.json());
app.use(cookieParser());

// Define routes BEFORE static files
// Root route - serve the landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'landing.html'));
});

// API Routes
app.use('/api/recipes', require('./routes/recipeRoutes'));
app.use('/api/users', require('./routes/userRoutes-clean.js')); // Add user routes
app.use('/api/admin', require('./routes/adminRoutes')); // Add admin routes

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all route
app.use((req, res, next) => {
    // If it's an API route that wasn't handled
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found'
        });
    }

    // For all other routes, serve the main HTML file
    if (!req.path.includes('.')) {
        return res.sendFile(path.join(__dirname, '../public', 'index.html'));
    }

    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Server Error'
    });
});

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    process.exit(1);
});



// const User = require('./models/User');
// const bcrypt = require('bcryptjs');

// async function createAdmin() {
//     try {
//         const existingAdmin = await User.findOne({ email: 'admin@example.com' });
//         if (existingAdmin) {
//             console.log('✅ Admin already exists');
//             return;
//         }

//         const admin = new User({
//             name: 'admin',
//             email: 'admin@example.com',
//             password: 'admin123',  // 👈 Plain text on purpose!
//             isAdmin: true
//         });

//         await admin.save();  // 👈 Triggers pre-save hook to hash password
//         console.log('✅ Admin created with auto-hashed password');
//     } catch (err) {
//         console.error('❌ Error creating admin:', err.message);
//     }
// }

const User = require('./models/User');

async function checkAdminStatus() {
  const adminExists = await User.findOne({ isAdmin: true });

  if (adminExists) {
    console.log('✅ Admin exists: ' + adminExists.name);
  } else {
    console.log('⚠️ No admin user found. The first registered user will become the admin.');
  }
}
