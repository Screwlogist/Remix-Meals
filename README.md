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

## 🔐 Admin Access

### 👤 Who is the Admin?
The **first user who registers** on the platform is automatically assigned the **admin role**. This user has elevated permissions compared to regular users.

### 🛠 What Can the Admin Do?
Once logged in, the admin has access to a dedicated dashboard with the following capabilities:

- ✅ **Manage Users**
  - View a list of all registered users
  - Promote or demote user roles
  - Delete user accounts

- ✅ **Manage Recipes**
  - View all recipes in the database
  - Add new recipes
  - Edit or delete existing recipes

- ✅ **View System Stats**
  - View total number of users and recipes
  - Get visual confirmation through toast notifications after each action

### 🔓 How to Access the Admin Dashboard
1. Register a new account (the **first registered user** becomes the admin).
2. Log in with your registered email and password.
3. If you are an admin, you will automatically gain access to the **admin dashboard**.
4. Use the navigation to manage users and recipes or view system stats.

> ⚠️ Note: All admin routes are protected using JWT authentication and admin middleware to prevent unauthorized access.

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

## 🛠️ Technology Stack

### **Frontend**
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Flexbox and Grid
- **JavaScript (ES6+)** - Dynamic functionality
- **Materialize CSS** - UI component framework
- **Material Icons** - Icon library
- **Animate.css** - CSS animations

### **Backend**
- **Node.js** - Server runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### **Authentication & Security**
- **JWT (JSON Web Tokens)** - Secure authentication
- **bcryptjs** - Password hashing
- **Cookie Parser** - Cookie handling

### **External APIs**
- **TheMealDB API** - Recipe data source

## 🔧 API Endpoints

### **Authentication Routes**
```
POST /api/users/register    # Register new user
POST /api/users/login       # User login
GET  /api/users/me          # Get current user info
```

### **Recipe Routes**
```
GET  /api/recipes                    # Get all recipes (paginated)
GET  /api/recipes/search-multi       # Multi-ingredient search
GET  /api/recipes/random             # Get random recipe
GET  /api/recipes/favorites          # Get user's favorite recipes
GET  /api/recipes/:id                # Get recipe by ID
PUT  /api/recipes/:id/favorite       # Toggle favorite status
```

## 👥 User Roles

### **Regular Users**
- Search for recipes by ingredients
- View detailed recipe information
- Save favorite recipes
- Access personal recipe collection

## 🧪 Testing

The application includes comprehensive manual testing coverage:

### **Frontend Testing**
- User interface responsiveness across devices
- Form validation and error handling
- Navigation and routing functionality
- Authentication flow testing

### **Backend Testing**
- API endpoint functionality
- Database operations (CRUD)
- Authentication and authorization
- Error handling and validation

### **Integration Testing**
- Frontend-backend communication
- User authentication flow
- Recipe search and management
- Admin functionality

## 🚀 Deployment

### **Local Development**
1. Follow the installation steps above
2. Start MongoDB service
3. Run `npm start` in the server directory
4. Access at `http://localhost:5000`

### **Production Deployment**
1. Set up production MongoDB instance
2. Configure environment variables
3. Build and deploy to your hosting platform
4. Update database connection strings
5. Import recipe data using the import script

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### **Team Members**
- **Dhananjay** - Frontend Developer & UI/UX Designer
- **Likith** - Backend Developer & Database Architect  
- **Utkarsh** - Full Stack Developer & DevOps Lead

## 📝 License

This project is part of an academic assignment for SIT725 - Applied Software Engineering.

## 🙏 Acknowledgments

- **TheMealDB** for providing the recipe API
- **Materialize CSS** for the UI framework
- **MongoDB** for the database solution
- **Express.js** community for excellent documentation

---

**RemixMeals** - Turning leftovers into delicious meals, one ingredient at a time! 🍽️✨


