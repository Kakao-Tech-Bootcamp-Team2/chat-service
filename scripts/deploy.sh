#!/bin/bash

# Chat Service 배포 스크립트

# 스크립트 실행 중 오류 발생시 즉시 중단
set -e

# 환경 변수 파일 로드
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# 현재 시간을 기반으로 배포 버전 생성
DEPLOY_VERSION=$(date +%Y%m%d_%H%M%S)
echo "Starting deployment version: $DEPLOY_VERSION"

# 로그 디렉토리 생성
DEPLOY_LOG="./logs/deploy_${DEPLOY_VERSION}.log"
mkdir -p logs

# 의존성 설치
echo "Installing dependencies..."
npm install --production >> "$DEPLOY_LOG" 2>&1

# 린트 검사
echo "Running lint check..."
npm run lint >> "$DEPLOY_LOG" 2>&1

# 테스트 실행
echo "Running tests..."
npm test >> "$DEPLOY_LOG" 2>&1

# 빌드 프로세스 (필요한 경우)
echo "Building application..."
npm run build >> "$DEPLOY_LOG" 2>&1

# PM2 프로세스 관리
if pm2 list | grep -q "chat-service"; then
    echo "Restarting chat-service..."
    pm2 restart chat-service --update-env >> "$DEPLOY_LOG" 2>&1
else
    echo "Starting chat-service..."
    pm2 start npm --name "chat-service" -- start >> "$DEPLOY_LOG" 2>&1
fi

# 헬스 체크
echo "Performing health check..."
MAX_RETRIES=5
RETRY_COUNT=0
HEALTH_CHECK_URL="http://localhost:${PORT:-5002}/api/v1/health"

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s "$HEALTH_CHECK_URL" | grep -q "ok"; then
        echo "Deployment successful!"
        echo "Chat Service is running on port ${PORT:-5002}"
        exit 0
    fi
    
    echo "Health check failed, retrying in 5 seconds..."
    sleep 5
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

echo "Error: Deployment failed - service is not healthy"
exit 1