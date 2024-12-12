const mongoose = require("mongoose");

// Chat 서비스에서 필요한 최소한의 User 정보만 정의
const UserSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    profileImage: String,
  },
  {
    timestamps: true,
    collection: "users", // 기존 users 컬렉션 사용
  }
);

module.exports = mongoose.model("User", UserSchema);
