const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageReactionSchema = new Schema({
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
    index: true
  },
  reaction: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  userName: String
}, {
  timestamps: true
});

// 복합 인덱스
MessageReactionSchema.index({ messageId: 1, userId: 1, reaction: 1 }, { unique: true });

// 스태틱 메서드
MessageReactionSchema.statics.toggleReaction = async function(messageId, userId, reaction) {
  const existing = await this.findOne({ messageId, userId, reaction });
  
  if (existing) {
    await existing.remove();
    return null;
  } else {
    return await this.create({ messageId, userId, reaction });
  }
};

module.exports = mongoose.model('MessageReaction', MessageReactionSchema);