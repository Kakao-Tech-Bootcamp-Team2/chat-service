const express = require('express');
const Joi = require('joi');
const { chatController } = require('../controllers');
const { auth, validator } = require('../middlewares');
const { schemas } = require('../utils/validator');

const router = express.Router();

// 메시지 전송
router.post(
  '/:roomId/messages',
  auth.requireAuth,
  validator.body(schemas.message),
  chatController.sendMessage
);

// 메시지에 리액션 추가
router.post(
  '/messages/:messageId/reactions',
  auth.requireAuth,
  validator.body(schemas.reaction),
  chatController.addReaction
);

// 메시지 리액션 제거
router.delete(
  '/messages/:messageId/reactions/:reaction',
  auth.requireAuth,
  chatController.removeReaction
);

// 메시지 읽음 처리
router.post(
  '/:roomId/read',
  auth.requireAuth,
  validator.body(schemas.messageRead),
  chatController.markAsRead
);

module.exports = router;