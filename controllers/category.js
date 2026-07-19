const CourseCategory = require("../models/courseCategory");
const Course = require("../models/cources");

// ============ CATEGORY MANAGEMENT ============

// Get all categories
module.exports.getAllCategories = async (req, res) => {
  try {
    const categories = await CourseCategory.find()
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Get course count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const courseCount = await Course.countDocuments({
          category: category._id,
          isActive: true,
        });
        return { ...category, courseCount };
      })
    );

    res.render("admin/categories.ejs", {
      categories: categoriesWithCount,
      moment: require("moment"),
    });
  } catch (error) {
    console.error("Get categories error:", error);
    req.flash("error", "Failed to load categories");
    res.redirect("/admin/dashboard");
  }
};

// Render create category form
module.exports.renderCreateCategoryForm = (req, res) => {
  res.render("admin/createCategory.ejs", { category: {} });
};

// Create new category
module.exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon, color, displayOrder, isActive } = req.body;

    // Check if category already exists
    const existingCategory = await CourseCategory.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      req.flash("error", "Category with this name already exists");
      return res.redirect("/admin/categories/new");
    }

    const category = new CourseCategory({
      name,
      description,
      icon: icon || "fa-shield-alt",
      color: color || "blue",
      displayOrder: Number(displayOrder) || 0,
      isActive: isActive === "on",
      createdBy: req.user._id,
    });

    await category.save();

    req.flash("success", `Category "${name}" created successfully`);
    res.redirect("/admin/categories");
  } catch (error) {
    console.error("Create category error:", error);
    req.flash("error", "Failed to create category");
    res.redirect("/admin/categories/new");
  }
};

// Render edit category form
module.exports.renderEditCategoryForm = async (req, res) => {
  try {
    const category = await CourseCategory.findById(req.params.id);
    if (!category) {
      req.flash("error", "Category not found");
      return res.redirect("/admin/categories");
    }
    res.render("admin/editCategory.ejs", { category });
  } catch (error) {
    console.error("Edit category error:", error);
    req.flash("error", "Failed to load category");
    res.redirect("/admin/categories");
  }
};

// Update category
module.exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, displayOrder, isActive } = req.body;

    const category = await CourseCategory.findById(id);
    if (!category) {
      req.flash("error", "Category not found");
      return res.redirect("/admin/categories");
    }

    // Check if name already exists (excluding current category)
    const existingCategory = await CourseCategory.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      _id: { $ne: id },
    });

    if (existingCategory) {
      req.flash("error", "Category with this name already exists");
      return res.redirect(`/admin/categories/${id}/edit`);
    }

    category.name = name;
    category.description = description || "";
    category.icon = icon || "fa-shield-alt";
    category.color = color || "blue";
    category.displayOrder = Number(displayOrder) || 0;
    category.isActive = isActive === "on";

    await category.save();

    req.flash("success", `Category "${name}" updated successfully`);
    res.redirect("/admin/categories");
  } catch (error) {
    console.error("Update category error:", error);
    req.flash("error", "Failed to update category");
    res.redirect(`/admin/categories/${req.params.id}/edit`);
  }
};

// Delete category
module.exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has courses
    const courseCount = await Course.countDocuments({ category: id });
    if (courseCount > 0) {
      req.flash(
        "error",
        `Cannot delete category. It is being used by ${courseCount} course(s). Please reassign or delete those courses first.`
      );
      return res.redirect("/admin/categories");
    }

    const category = await CourseCategory.findByIdAndDelete(id);
    if (!category) {
      req.flash("error", "Category not found");
      return res.redirect("/admin/categories");
    }

    req.flash("success", `Category "${category.name}" deleted successfully`);
    res.redirect("/admin/categories");
  } catch (error) {
    console.error("Delete category error:", error);
    req.flash("error", "Failed to delete category");
    res.redirect("/admin/categories");
  }
};

// Toggle category active status
module.exports.toggleCategoryStatus = async (req, res) => {
  try {
    const category = await CourseCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    category.isActive = !category.isActive;
    await category.save();

    res.json({
      success: true,
      isActive: category.isActive,
      message: `Category ${category.isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    console.error("Toggle category error:", error);
    res.status(500).json({ success: false, message: "Failed to toggle category status" });
  }
};

// Get categories for dropdown (API)
module.exports.getCategoriesForDropdown = async (req, res) => {
  try {
    const categories = await CourseCategory.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .select("_id name icon color")
      .lean();

    res.json({ success: true, categories });
  } catch (error) {
    console.error("Get categories dropdown error:", error);
    res.status(500).json({ success: false, message: "Failed to load categories" });
  }
};