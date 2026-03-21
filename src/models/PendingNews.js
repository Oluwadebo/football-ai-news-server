const mongoose = require("mongoose");

const pendingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  source: String,
  score: Number,
  discoveredAt: { type: Date, default: Date.now },
  status: {
    type: String,
    default: "discovered",
    enum: ["discovered", "processed", "rejected"],
  },
});

module.exports = mongoose.model("PendingNews", pendingSchema);
