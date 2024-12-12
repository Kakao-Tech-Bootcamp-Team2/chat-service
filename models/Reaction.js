const mongoose = require("mongoose");

const ReactionSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    required: true,
    index: true,
  },
  emoji: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// 복합 인덱스 생성
ReactionSchema.index({ messageId: 1, user: 1, emoji: 1 }, { unique: true });

module.exports = mongoose.model("Reaction", ReactionSchema);
