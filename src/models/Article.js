const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    summary: String,
    content: { type: String, required: true },
    imageUrl: String,
    publishedAt: { type: Date, default: Date.now },
    eventType: {
      type: String,
      enum: ["transfer", "match", "club", "rumors", "update"],
    },
    tags: [String],
    isTrending: { type: Boolean, default: false },
    score: Number,
    source: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Article", articleSchema);
