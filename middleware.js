const ExpressError = require("./utils/ExpressError.js");
const User = require("./models/user");
const { blogsSchema } = require("./schema.js");

const READONLY_ADMIN_EMAIL = "test@test.com";

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "you are not logedin!");
    return res.redirect("/login");
  }
  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isOwner = async (req, res, next) => {
  let { id } = req.params;
  let msg = await Message.findById(id).populate("sender");
  if (!msg.sender.equals(res.locals.currUser)) {
    req.flash("error", "You can't delete this message!");
    return res.redirect(`/inbox`);
  }
  next();
};

module.exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    if (req.xhr || req.originalUrl.startsWith("/api")) {
      return res.status(403).json({
        success: false,
        message: "Access denied."
      });
    }

    req.flash("warning", "You do not have permission to access this page.");
    return res.redirect("/");
  }

  const isReadOnlyAdmin =
    req.user.email === READONLY_ADMIN_EMAIL;

  if (isReadOnlyAdmin && req.method !== "GET") {
    const message = "This is a Read-Only Admin account. Modification is not allowed.";

    if (req.xhr || req.originalUrl.startsWith("/api")) {
      return res.status(403).json({
        success: false,
        message
      });
    }

    req.flash("warning", message);
    return res.redirect(req.get("Referrer") || "/admin");
  }

  next();
};

module.exports.isVerified = async (req, res, next) => {
  const { email } = req.body; // 👍 extract only email

  const user = await User.findOne({ email });
  if (!user) {
    req.flash("error", "User not found.");
    return res.redirect("/login");
  }

  if (!user.isVerified) {
    req.flash("error", "Please verify your email first.");
    return res.redirect(`/verify-email?email=${email}`);
  }

  next();
};

module.exports.validateBlog = (req, res, next) => {
  let { error } = blogsSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};
