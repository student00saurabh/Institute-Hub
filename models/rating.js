const { boolean } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//System rating schema for the Application feed back.
const ratingSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: "Cources",
  },
  yourPosition: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  ratting: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Ratting", ratingSchema);
