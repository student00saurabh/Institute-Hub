const express = require("express");
const router = express.Router();
const { isLoggedIn, isAdmin, saveRedirectUrl } = require("../middleware");
const serviceController = require("../controllers/service");

router.get("/", serviceController.index);

module.exports = router;