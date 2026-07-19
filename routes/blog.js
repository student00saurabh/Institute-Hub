const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isAdmin, validateBlog } = require("../middleware.js");
const blogsController = require("../controllers/blog.js");

const multer = require("multer");

const { cloudinary, storage } = require("../Cloudconfig.js");
const upload = multer({ storage });

//blogs home route
router
  .route("/")
  .get(wrapAsync(blogsController.index))
  .post(
    isLoggedIn,
    isAdmin,
    upload.single("image"),
    validateBlog,
    wrapAsync(blogsController.createBlog),
  );

//create a blog
router.get("/new", isLoggedIn, isAdmin, blogsController.renderNewForm);


// Get Saved Blogs
router.get(
  "/saved",
  isLoggedIn,
  wrapAsync(blogsController.getSavedBlogs)
);

router
  .route("/:id")
  .get(wrapAsync(blogsController.showBlog))
  .put(
    isLoggedIn,
    isAdmin,
    upload.single("image"),
    validateBlog,
    wrapAsync(blogsController.updateBlog),
  )
  .patch(isLoggedIn, isAdmin, wrapAsync(blogsController.activateBlog))
  .delete(isLoggedIn, isAdmin, wrapAsync(blogsController.destroyBlog));

//Edit Route
router.get(
  "/:id/edit",
  isLoggedIn,
  isAdmin,
  wrapAsync(blogsController.renderEditForm),
);

router.get(
  "/:id/views",
  isLoggedIn,
  isAdmin,
  wrapAsync(blogsController.renderViewrsPage),
);

router.post("/:id/comments", isLoggedIn, wrapAsync(blogsController.addComment));

router.delete(
  "/:id/comments/:comment",
  isLoggedIn,
  wrapAsync(blogsController.deleteComment),
);

router.post(
  "/:id/like",
  isLoggedIn,
  wrapAsync(blogsController.toggleLike),
);

// Save/Unsave Blog
router.post(
  "/:id/save",
  isLoggedIn,
  wrapAsync(blogsController.toggleSaveBlog)
);

// Check if blog is saved
router.get(
  "/:id/saved-status",
  isLoggedIn,
  wrapAsync(blogsController.checkSavedStatus)
);

module.exports = router;
