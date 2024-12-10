module.exports = {
    env: {
      node: true,
      es2021: true,
      jest: true
    },
    extends: [
      'eslint:recommended',
      'plugin:node/recommended',
      'plugin:security/recommended',
      'plugin:prettier/recommended'
    ],
    plugins: ['node', 'security', 'prettier'],
    parserOptions: {
      ecmaVersion: 2021
    },
    rules: {
      // 오류 방지
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      
      // 비동기 처리
      'no-return-await': 'error',
      'require-await': 'error',
      
      // 보안
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      
      // 코드 스타일
      'prettier/prettier': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      
      // Node.js 특화
      'node/exports-style': ['error', 'module.exports'],
      'node/file-extension-in-import': ['error', 'always'],
      'node/prefer-global/buffer': ['error', 'always'],
      'node/prefer-global/console': ['error', 'always'],
      'node/prefer-global/process': ['error', 'always'],
      'node/prefer-promises/dns': 'error',
      'node/prefer-promises/fs': 'error',
      
      // 에러 처리
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      
      // 성능
      'no-await-in-loop': 'warn',
      
      // 접근성
      'max-len': ['error', { 
        code: 100,
        ignoreComments: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true
      }],
      'max-lines-per-function': ['warn', { 
        max: 50,
        skipBlankLines: true,
        skipComments: true
      }],
      'complexity': ['warn', 10]
    },
    overrides: [
      {
        files: ['tests/**/*.js'],
        env: {
          jest: true
        },
        rules: {
          'node/no-unpublished-require': 'off',
          'max-lines-per-function': 'off'
        }
      }
    ],
    settings: {
      node: {
        tryExtensions: ['.js', '.json', '.node']
      }
    }
  };