const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    originalname: {
      type: String,
      required: [true, "원본 파일명은 필수입니다."],
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
    key: {
      type: String,
      required: [true, "S3 키는 필수입니다."],
    },
    url: {
      type: String,
      required: [true, "파일 URL은 필수입니다."],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    uploadId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "uploading", "completed", "failed"],
      default: "pending",
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// 인덱스 추가
FileSchema.index({ uploadId: 1 });
FileSchema.index({ user: 1, createdAt: -1 });
FileSchema.index({ status: 1 });

// 가상 필드: 파일 확장자
FileSchema.virtual("extension").get(function () {
  return this.originalname.split(".").pop().toLowerCase();
});

// 파일 상태 업데이트 메서드
FileSchema.methods.updateStatus = async function (status) {
  this.status = status;
  return this.save();
};

// 파일 URL 생성 메서드
FileSchema.methods.generateUrl = function () {
  return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${this.key}`;
};

module.exports = mongoose.model("File", FileSchema);
