module.exports = {
    EVENTS: {
      MESSAGE: {
        CREATED: 'message.created',
        UPDATED: 'message.updated',
        DELETED: 'message.deleted',
        REACTION_ADDED: 'message.reaction_added',
        REACTION_REMOVED: 'message.reaction_removed'
      },
      MENTION: {
        CREATED: 'mention.created',
        READ: 'mention.read'
      },
      NOTIFICATION: {
        MESSAGE: 'notification.message',
        MENTION: 'notification.mention',
        REACTION: 'notification.reaction'
      }
    },
    
    MESSAGE_TYPES: {
      TEXT: 'text',
      IMAGE: 'file',
      FILE: 'file',
      SYSTEM: 'system'
    },
  
    CACHE_KEYS: {
      ROOM_MESSAGES: 'room:{roomId}:messages:{page}',
      USER_MENTIONS: 'user:{userId}:mentions',
      MESSAGE_REACTIONS: 'message:{messageId}:reactions'
    },
  
    LIMITS: {
      MESSAGE_LENGTH: 10000,
      FILE_SIZE: 10 * 1024 * 1024, // 10MB
      MENTIONS_PER_MESSAGE: 50,
      MESSAGES_PER_PAGE: 50,
      CACHE_TTL: 300 // 5 minutes
    }
  };