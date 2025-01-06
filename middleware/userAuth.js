const User = require('../models/userSchema');

const isLogin = async (req, res, next) => {
    try {
        if (req.session.userId) {
            return res.redirect("/");
        }
        next();
    } catch (error) {
        console.error("User login middleware error:", error);
        res.status(500).render("error", { message: "Server error occurred" });
    }
};

const isLoggedIn = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            return res.redirect("/login");
        }

        const user = await User.findById(req.session.userId);
        if (!user || user.isBlocked) {
            req.session.destroy((err) => {
                if (err) {
                    console.error("Session destruction error:", err);
                }
                return res.redirect("/login?error=Your account has been blocked. Please contact support.");
            });
            return;
        }

        next();
    } catch (error) {
        console.error("User auth middleware error:", error);
        res.status(500).render("error", { message: "Server error occurred" });
    }
};

const isBlocked = async (req, res, next) => {
    try {
        if (req.session.isBlocked) {
            req.session.destroy();
            return res.redirect("/login?blocked=true");
        }
        next();
    } catch (error) {
        console.error("User block check error:", error);
        res.status(500).render("error", { message: "Server error occurred" });
    }
};

module.exports = {
    isLogin,
    isLoggedIn,
    isBlocked
};
