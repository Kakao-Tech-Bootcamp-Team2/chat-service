const mongoose = require('mongoose');
const { Message } = require('../../../src/models');

describe('Message Model Test', () => {
  const mockMessage = {
    roomId: 'room123',
    sender: {
      id: 'user123',
      name: 'Test User'
    },
    content: 'Hello, World!',
    type: 'text'
  };

  it('should create & save message successfully', async () => {
    const validMessage = new Message(mockMessage);
    const savedMessage = await validMessage.save();
    
    expect(savedMessage._id).toBeDefined();
    expect(savedMessage.content).toBe(mockMessage.content);
    expect(savedMessage.sender.id).toBe(mockMessage.sender.id);
  });

  it('should fail to save message without required fields', async () => {
    const messageWithoutRequired = new Message({ content: 'Test' });
    let err;
    
    try {
      await messageWithoutRequired.save();
    } catch (error) {
      err = error;
    }
    
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
  });

  it('should successfully mark message as read', async () => {
    const message = new Message(mockMessage);
    await message.save();
    
    await message.markAsRead('user456');
    
    expect(message.readBy).toHaveLength(1);
    expect(message.readBy[0].userId).toBe('user456');
  });
}); 