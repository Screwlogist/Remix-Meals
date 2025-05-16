// server/middleware/admin.js

module.exports = function (req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Access denied: Admins only'
        });
    }
    next();
};
