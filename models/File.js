const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    filename: {
      type: String,
      required: [true, "저장된 파일명은 필수입니다."],
    },
    mimetype: {
      type: String,
      required: [true, "파일 타입은 필수입니다."],
    },
    size: {
      type: Number,
      required: [true, "파일 크기는 필수입니다."],
    },
    url: {
      type: String,
      required: [true, "파일 URL은 필수입니다."],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        // 클라이언트에 필요한 필드만 반환
        return {
          _id: ret._id,
          filename: ret.filename,
          originalname: ret.originalname,
          mimetype: ret.mimetype,
          size: ret.size,
          url: ret.url,
        };
      },
    },
  }
);

// 인덱스 추가
FileSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("File2", FileSchema);
