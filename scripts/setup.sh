#!/bin/bash

# Chat Service 초기 설정 스크립트

# 스크립트 실행 중 오류 발생시 즉시 중단
set -e

echo "Starting Chat Service setup..."

# 필요한 디렉토리 생성
echo "Creating required directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p temp

# 환경 변수 파일 설정
if [ ! -f .env ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    
    # 랜덤 값들 생성 및 설정
    echo "Generating random values for sensitive data..."
    sed -i "s/mongodb_password/$(openssl rand -base64 12)/g" .env
    sed -i "s/redis_password/$(openssl rand -base64 12)/g" .env
    sed -i "s/rabbitmq_password/$(openssl rand -base64 12)/g" .env
fi

# 의존성 설치
echo "Installing dependencies..."
npm install

# Git hooks 설정
echo "Setting up Git hooks..."
if [ -d .git ]; then
    # pre-commit hook 설정
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
npm run lint
npm run test
EOF
    chmod +x .git/hooks/pre-commit
fi

# 데이터베이스 설정
echo "Setting up database..."
if command -v mongosh &> /dev/null; then
    # MongoDB 인덱스 생성
    echo "Creating MongoDB indexes..."
    node << EOF
    const { Message, MessageReaction, MessageMention } = require('./src/models');
    async function createIndexes() {
        await Message.createIndexes();
        await MessageReaction.createIndexes();
        await MessageMention.createIndexes();
        console.log('Indexes created successfully');
        process.exit(0);
    }
    createIndexes().catch(console.error);
EOF
else
    echo "Warning: MongoDB shell not found. Please install MongoDB tools."
fi

# 개발 환경 설정
if [ "$NODE_ENV" = "development" ]; then
    echo "Setting up development environment..."
    
    # nodemon 설치
    npm install -g nodemon
    
    # 개발용 설정
    echo "Setting up development configuration..."
    # 여기에 개발 환경 특정 설정 추가
fi

# 권한 설정
echo "Setting up permissions..."
chmod -R 755 scripts
chmod -R 644 logs
chmod -R 644 .env

echo "
Setup completed successfully!

To start the service:
- Development: npm run dev
- Production: npm start

For more information, check the README.md file.
"

# 설정 완료 후 상태 체크
echo "Checking setup status..."
SETUP_OK=true

# 필요한 디렉토리 존재 확인
for dir in "logs" "uploads" "temp"; do
    if [ ! -d "$dir" ]; then
        echo "Error: Directory $dir not created"
        SETUP_OK=false
    fi
done

# 필요한 파일 존재 확인
for file in ".env" "package.json" "package-lock.json"; do
    if [ ! -f "$file" ]; then
        echo "Error: File $file not found"
        SETUP_OK=false
    fi
done

# 최종 상태 출력
if [ "$SETUP_OK" = true ]; then
    echo "Setup completed successfully!"
else
    echo "Setup completed with some warnings. Please check the logs above."
fi