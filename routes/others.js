const express = require("express");
const router = express.Router();
const othersController = require("../controllers/others");

router.get("/contact", othersController.contactPage);
router.post("/contact", othersController.contact);
router.post("/api/contact", othersController.contactAPI);
router.post("/subscribe", othersController.subscribe);
router.get("/careers", othersController.carriers);

module.exports = router;
