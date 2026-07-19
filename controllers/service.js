const User = require("../models/user");
const Course = require("../models/cources");
const Blog = require("../models/blog");
const { all } = require("axios");

module.exports.index = async (req, res) => {
	res.render("services/index.ejs");
}

