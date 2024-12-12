const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: [true, "채팅방 ID는 필수입니다."],
      index: true,
    },
    content: {
      type: String,
      required: function () {
        return this.type !== "file";
      },
      trim: true,
      maxlength: [10000, "메시지는 10000자를 초과할 수 없습니다."],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["text", "system", "ai", "file"],
      default: "text",
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    file: {
      type: String,
      default: "",
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ room: 1, timestamp: -1 });
MessageSchema.index({ sender: 1, timestamp: -1 });

module.exports = mongoose.model("Message", MessageSchema);
