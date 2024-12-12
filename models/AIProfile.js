const mongoose = require("mongoose");

const AIProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  personality: {
    type: String,
    default: "친절하고 도움이 되는 어시스턴트",
  },
  settings: {
    language: {
      type: String,
      default: "ko",
    },
    responseLength: {
      type: String,
      enum: ["short", "medium", "long"],
      default: "medium",
    },
    tone: {
      type: String,
      enum: ["professional", "casual", "friendly"],
      default: "friendly",
    },
  },
  lastInteraction: {
    type: Date,
    default: Date.now,
  },
});

// 인덱스 생성
AIProfileSchema.index({ user: 1 }, { unique: true });
AIProfileSchema.index({ lastInteraction: -1 });

module.exports = mongoose.model("AIProfile", AIProfileSchema);
