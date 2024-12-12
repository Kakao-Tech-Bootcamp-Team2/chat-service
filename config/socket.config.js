// chat-service/config/socket.config.js

module.exports = {
  // 소켓 연결 설정
  connectionConfig: {
    cors: {
      origin: [
        "https://bootcampchat-fe.run.goorm.site",
        "http://localhost:3000",
        "https://localhost:3000",
        "http://0.0.0.0:3000",
        "https://0.0.0.0:3000",
      ],
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-auth-token",
        "x-session-id",
      ],
    },
  },

  // 메시지 처리 설정
  messageConfig: {
    BATCH_SIZE: 30, // 한 번에 로드할 메시지 수
    LOAD_DELAY: 300, // 메시지 로드 딜레이 (ms)
    MAX_RETRIES: 3, // 최대 재시도 횟수
    MESSAGE_LOAD_TIMEOUT: 10000, // 메시지 로드 타임아웃 (10초)
    RETRY_DELAY: 2000, // 재시도 간격 (2초)
    DUPLICATE_LOGIN_TIMEOUT: 10000, // 중복 로그인 타임아웃 (10초)
  },

  // 이벤트 이름 정의
  events: {
    // 연결 관련
    CONNECTION: "connection",
    DISCONNECT: "disconnect",

    // 채팅방 관련
    JOIN_ROOM: "join_room",
    LEAVE_ROOM: "leave_room",

    // 메시지 관련
    NEW_MESSAGE: "new_message",
    MESSAGE_RECEIVED: "message_received",
    MESSAGE_READ: "message_read",
    LOAD_MESSAGES: "load_messages",

    // 리액션 관련
    ADD_REACTION: "add_reaction",
    REMOVE_REACTION: "remove_reaction",

    // AI 관련
    AI_MESSAGE_START: "aiMessageStart",
    AI_MESSAGE_CHUNK: "aiMessageChunk",
    AI_MESSAGE_COMPLETE: "aiMessageComplete",
    AI_MESSAGE_ERROR: "aiMessageError",

    // 상태 관련
    USER_TYPING: "user_typing",
    USER_STOP_TYPING: "user_stop_typing",
    USER_ONLINE: "user_online",
    USER_OFFLINE: "user_offline",
  },

  // Redis 채널 이름 정의
  redisChannels: {
    MESSAGE_QUEUE: "chat:message:queue",
    NOTIFICATION: "chat:notification",
    USER_STATUS: "chat:user:status",
  },
};
