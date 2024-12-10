const { chatController } = require('../../../src/controllers');
const { Message } = require('../../../src/models');
const chatService = require('../../../src/services/chatService');
const eventBus = require('../../../src/utils/eventBus');

// Mocking
jest.mock('../../../src/utils/eventBus');
jest.mock('../../../src/services/chatService');
jest.mock('../../../src/models/Message');

describe('Chat Controller Test', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Request mock
    mockReq = {
      params: { roomId: 'room123' },
      body: { content: 'Test message' },
      user: { id: 'user123' }
    };

    // Response mock
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Next function mock
    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();

    // Setup chatService mock implementations
    chatService.validateRoomAccess.mockResolvedValue(true);
    chatService.sendMessage.mockResolvedValue({
      _id: 'message123',
      roomId: 'room123',
      content: 'Test message',
      sender: { id: 'user123' },
      createdAt: new Date()
    });
  });

  it('should successfully send a message', async () => {
    await chatController.sendMessage(mockReq, mockRes, mockNext);
    
    expect(chatService.validateRoomAccess).toHaveBeenCalledWith('room123', 'user123');
    expect(chatService.sendMessage).toHaveBeenCalledWith({
      roomId: 'room123',
      userId: 'user123',
      content: 'Test message',
      type: 'text',
      mentions: []
    });
    
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        _id: expect.any(String),
        content: 'Test message'
      })
    });
  });

  it('should handle message sending error', async () => {
    const error = new Error('Message sending failed');
    chatService.sendMessage.mockRejectedValue(error);
    
    await chatController.sendMessage(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(error);
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('should validate required fields', async () => {
    mockReq.body.content = null;
    
    await chatController.sendMessage(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(
      expect.any(Error)
    );
  });
});