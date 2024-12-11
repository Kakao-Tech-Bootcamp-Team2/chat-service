const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    id: {
      type: String,
      required: true,
      index: true
    },
    _id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    avatar: String
  },
  content: {
    type: String,
    required: function() {
      return !this.file && this.type === 'text';
    },
    maxlength: [10000, '메시지는 10000자를 초과할 수 없습니다.']
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text',
    index: true
  },
  file: {
    id: String,
    name: String,
    type: String,
    size: Number,
    url: String,
    thumbnailUrl: String,
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    }
  },
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'MessageMention'
  }],
  reactions: [{
    type: Schema.Types.ObjectId,
    ref: 'MessageReaction'
  }],
  readBy: [{
    userId: {
      type: String,
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    clientMessageId: String,
    replyTo: {
      messageId: String,
      content: String
    }
  },
  streaming: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sending'
  }
}, {
  timestamps: true
});

// 인덱스 설정
MessageSchema.index({ roomId: 1, createdAt: -1 });
MessageSchema.index({ roomId: 1, sender: 1 });
MessageSchema.index({ 'readBy.userId': 1, 'readBy.readAt': 1 });
MessageSchema.index({ content: 'text' });
MessageSchema.index({ roomId: 1, status: 1 });
MessageSchema.index({ clientMessageId: 1 }, { sparse: true });

// 가상 필드
MessageSchema.virtual('isRead').get(function() {
  return this.readBy && this.readBy.length > 0;
});

// 메서드
MessageSchema.methods.markAsRead = async function(userId) {
  if (!this.readBy.some(read => read.userId === userId)) {
    this.readBy.push({ userId, readAt: new Date() });
    await this.save();
  }
  return this;
};

MessageSchema.methods.edit = async function(newContent) {
  if (this.content !== newContent) {
    this.editHistory.push({
      content: this.content,
      editedAt: new Date()
    });
    this.content = newContent;
    this.isEdited = true;
    await this.save();
  }
  return this;
};

// 스태틱 메서드
MessageSchema.statics.findByRoom = function(roomId, options = {}) {
  const query = { roomId, isDeleted: false };
  const { limit = 50, before, after } = options;

  if (before) {
    query.createdAt = { $lt: before };
  } else if (after) {
    query.createdAt = { $gt: after };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('mentions')
    .populate('reactions');
};

module.exports = mongoose.model('Message', MessageSchema);