const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const redis = require('../../src/config/redis');

let mongoServer;

// 테스트 전역 설정
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// 각 테스트 후 정리
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

// 모든 테스트 완료 후 정리
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  await redis.closeAll();
}); 