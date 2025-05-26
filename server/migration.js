// migration.js - Run this script once to migrate your database
const mongoose = require('mongoose');
const Recipe = require('./models/Recipe');
const User = require('./models/User');

async function runMigration() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/recipefinder', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Connected to MongoDB for migration...');

        // 1. Remove the isFavorite field from all existing recipes
        console.log('Removing global isFavorite field from recipes...');
        await Recipe.updateMany({}, { $unset: { isFavorite: "" } });
        console.log('✅ Removed isFavorite field from all recipes');

        // 2. Add favorites array to existing users who don't have it
        console.log('Adding favorites array to existing users...');
        await User.updateMany(
            { favorites: { $exists: false } },
            { $set: { favorites: [] } }
        );
        console.log('✅ Added favorites array to existing users');

        // 3. If you had any favorite recipes marked globally, you might want to
        // assign them to a specific user or create a default admin user
        // This is optional based on your needs

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
}

// Run the migration
runMigration();