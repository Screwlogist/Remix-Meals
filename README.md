# RemixMeals 🍽️



**Transform Your Leftovers Into Amazing Meals**

RemixMeals is a web application that helps users reduce food waste and save money by creating delicious recipes from ingredients they already have. Simply enter what's in your fridge and discover new meal ideas!

![RemixMeals Banner](https://images.unsplash.com/photo-1543353071-10c8ba85a904?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80)

## 🌟 Features

### 🔍 **Smart Recipe Search**
- **Multi-ingredient search**: Find recipes using multiple ingredients you have at home
- **Intelligent matching**: AI-powered algorithm finds recipes with the best ingredient matches
- **Flexible search**: Get results even with partial ingredient matches

### 👤 **User Management**
- **User registration and authentication**: Secure account creation and login
- **Personal favorites**: Save and manage your favorite recipes
- **Profile management**: Update your account information

### 🎲 **Recipe Discovery**
- **Random recipes**: Discover new meals with our random recipe generator
- **Detailed recipe views**: Complete instructions, ingredients, and cooking videos
- **External recipe integration**: Access to thousands of recipes from TheMealDB API

### 👨‍💼 **Admin Dashboard**
- **User management**: Create, edit, and manage user accounts
- **Recipe management**: Add, edit, and delete recipes
- **Analytics dashboard**: View platform statistics and user engagement
- **Admin-only access**: Secure administrative features

### 📱 **Modern UI/UX**
- **Responsive design**: Works seamlessly on desktop, tablet, and mobile
- **Interactive elements**: Smooth animations and user-friendly interface
- **Real-time updates**: Live search results and instant feedback
- **Material Design**: Clean, modern interface following Material Design principles

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Screwlogist/Remix-Meals.git
   cd remix-meals
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Return to root directory
   cd ..
   ```

3. **Set up MongoDB**
   ```bash
   # Start MongoDB service (varies by OS)
   # Windows:
   net start MongoDB
   
   # macOS (with Homebrew):
   brew services start mongodb-community
   
   # Linux (systemd):
   sudo systemctl start mongod
   ```

4. **Configure environment variables** (Optional)
   Create a `.env` file in the server directory:
   ```env
   JWT_SECRET=your_jwt_secret_key_here
   MONGODB_URI=mongodb://localhost:27017/recipefinder
   PORT=5000
   ```

5. **Import recipe data** (Optional)
   ```bash
   cd server
   node importMealDb.js
   ```
   This will populate your database with recipes from TheMealDB API.

6. **Start the application**
   ```bash
   cd server
   npm start
   ```

7. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

## 📁 Project Structure

```
remix-meals/
├── public/                     # Frontend files
│   ├── admin.html             # Admin dashboard
│   ├── index.html             # Main application
│   ├── landing.html           # Landing page
│   ├── login.html             # User login
│   ├── register.html          # User registration
│   ├── manage-users.html      # User management (admin)
│   ├── manage-recipes.html    # Recipe management (admin)
│   ├── main.js               # Main application logic
│   ├── style.css             # Stylesheets
│   └── js/
│       ├── auth.js           # Authentication utilities
│       └── admin.js          # Admin functionality
├── server/                    # Backend server
│   ├── models/               # Database models
│   │   ├── User.js          # User model
│   │   └── Recipe.js        # Recipe model
│   ├── routes/              # API routes
│   │   ├── userRoutes.js    # User authentication routes
│   │   ├── recipeRoutes.js  # Recipe API routes
│   │   └── adminRoutes.js   # Admin management routes
│   ├── middleware/          # Custom middleware
│   │   ├── auth.js         # Authentication middleware
│   │   └── admin.js        # Admin authorization middleware
│   ├── server.js           # Main server file
│   ├── importMealDb.js     # Recipe import utility
│   ├── migration.js        # Database migration utility
│   └── package.json        # Server dependencies
└── README.md               # Project documentation
```



