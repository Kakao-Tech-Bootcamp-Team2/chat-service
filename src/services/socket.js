import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  async connect(options = {}) {
    try {
      if (this.socket?.connected) {
        return this.socket;
      }

      const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
      
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        ...options
      });

      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          console.log('Socket connected successfully');
          resolve(this.socket);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          reject(error);
        });

        // 5초 타임아웃
        setTimeout(() => {
          if (!this.socket.connected) {
            reject(new Error('Socket connection timeout'));
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Socket connection failed:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 소켓 상태 확인
  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService(); 