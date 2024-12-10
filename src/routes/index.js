const express = require('express');
const chatRoutes = require('./chatRoutes');
const messageRoutes = require('./messageRoutes');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

// Health check endpoint
router.use('/health', healthRoutes);

// API routes
router.use('/chat', chatRoutes);
router.use('/messages', messageRoutes);

module.exports = router;