const { auth } = require('../../../src/middlewares');
const eventBus = require('../../../src/utils/eventBus');

jest.mock('../../../src/utils/eventBus');

describe('Auth Middleware Test', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {
        authorization: 'Bearer test-token'
      }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should authenticate valid token', async () => {
    eventBus.request.mockResolvedValueOnce({
      success: true,
      user: { id: 'user123' }
    });

    await auth.requireAuth(mockReq, mockRes, mockNext);
    
    expect(mockReq.user).toBeDefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should reject invalid token', async () => {
    eventBus.request.mockResolvedValueOnce({
      success: false
    });

    await auth.requireAuth(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String)
      })
    );
  });
}); 