const express = require("express");
const router = express.Router();
const { isLoggedIn, isAdmin } = require("../middleware");
const categoryController = require("../controllers/category");

// Category Management Routes
router.get("/categories", isLoggedIn, isAdmin, categoryController.getAllCategories);
router.get("/categories/new", isLoggedIn, isAdmin, categoryController.renderCreateCategoryForm);
router.post("/categories", isLoggedIn, isAdmin, categoryController.createCategory);
router.get("/categories/:id/edit", isLoggedIn, isAdmin, categoryController.renderEditCategoryForm);
router.put("/categories/:id", isLoggedIn, isAdmin, categoryController.updateCategory);
router.delete("/categories/:id", isLoggedIn, isAdmin, categoryController.deleteCategory);
router.patch("/categories/:id/toggle-status", isLoggedIn, isAdmin, categoryController.toggleCategoryStatus);

// API Routes (for dropdowns)
router.get("/api/categories", categoryController.getCategoriesForDropdown);

module.exports = router;