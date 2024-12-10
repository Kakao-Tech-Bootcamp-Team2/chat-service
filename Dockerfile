# 베이스 이미지 설정
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /usr/src/app

# 필요한 패키지 설치
RUN apk add --no-cache curl tzdata

# 타임존 설정
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 헬스체크를 위한 대기 스크립트 복사 (먼저 복사)
COPY scripts/wait-for-it.sh /usr/local/bin/wait-for-it
RUN chmod +x /usr/local/bin/wait-for-it

# 앱 종속성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 필요한 디렉토리 생성
RUN mkdir -p logs uploads temp

# 권한 설정
RUN chown -R node:node /usr/src/app
USER node

# 포트 설정
EXPOSE 5002

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5002/api/v1/health || exit 1

# 실행 명령
CMD ["npm", "start"]