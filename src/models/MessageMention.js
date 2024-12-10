const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageMentionSchema = new Schema({
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
    index: true
  },
  mentionedUserId: {
    type: String,
    required: true,
    index: true
  },
  mentionedUserName: String,
  mentionedBy: {
    userId: {
      type: String,
      required: true
    },
    userName: String
  },
  roomId: {
    type: String,
    required: true,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// 인덱스
MessageMentionSchema.index({ mentionedUserId: 1, createdAt: -1 });
MessageMentionSchema.index({ roomId: 1, mentionedUserId: 1 });

// 스태틱 메서드
MessageMentionSchema.statics.getUserMentions = function(userId, options = {}) {
  const { limit = 20, page = 1 } = options;
  
  return this.find({ 
    mentionedUserId: userId,
    isRead: false 
  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('messageId');
};

MessageMentionSchema.statics.markAsRead = function(userId, messageIds) {
  return this.updateMany(
    {
      mentionedUserId: userId,
      messageId: { $in: messageIds }
    },
    { isRead: true }
  );
};

module.exports = mongoose.model('MessageMention', MessageMentionSchema);