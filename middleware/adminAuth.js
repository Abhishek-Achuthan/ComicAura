const isadminLogin = async (req, res, next) => {
    try {
        if (req.session.admin) {
            return res.redirect("/admin/user");
        }
        next();
    } catch (error) {
        console.error("Admin login middleware error:", error);
        res.status(500).render("adminError", { message: "Server error occurred" });
    }
};

const isAdmin = async (req, res, next) => {
  console.log(req.session)
    try {
        if (req.session.admin) {
            return next();
        }
        res.redirect("/admin");
    } catch (error) {
        console.error("Admin auth middleware error:", error);
        res.status(500).render("adminError", { message: "Server error occurred" });
    }
};

module.exports = {
    isadminLogin,
    isAdmin
};