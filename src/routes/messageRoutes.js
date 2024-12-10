const express = require('express');
const { messageController } = require('../controllers');
const { auth, validator, rateLimit } = require('../middlewares');
const { schemas } = require('../utils/validator');
const Joi = require('joi');

const router = express.Router();

// 단일 메시지 조회
router.get(
  '/:messageId',
  auth.requireAuth,
  messageController.getMessage
);

// 채팅방 메시지 목록 조회
router.get(
  '/room/:roomId',
  auth.requireAuth,
  validator.query(schemas.messageQuery),
  messageController.getMessages
);

// 메시지 수정
router.put(
  '/:messageId',
  auth.requireAuth,
  validator.body(schemas.messageUpdate),
  messageController.updateMessage
);

// 메시지 삭제
router.delete(
  '/:messageId',
  auth.requireAuth,
  messageController.deleteMessage
);

// 메시지 검색
router.get(
  '/search/room/:roomId',
  auth.requireAuth,
  validator.query(Joi.object({
    query: Joi.string().required(),
    type: Joi.string().valid('text', 'image', 'file'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  messageController.searchMessages
);

// 멘션된 메시지 조회
router.get(
  '/mentions',
  auth.requireAuth,
  validator.query(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  messageController.getMentions
);

// 읽지 않은 메시지 수 조회
router.get(
  '/unread/room/:roomId',
  auth.requireAuth,
  messageController.getUnreadCount
);

module.exports = router;