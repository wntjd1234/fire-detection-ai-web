// models/index.js 파일 내용

const Sequelize = require('sequelize');
const User = require('./user');

const env = process.env.NODE_ENV || 'development';
// DB 설정 파일을 로드합니다. (로컬 환경에서만 사용됨)
const config = require('../config/config')[env]; 

const db = {};

let sequelize;

// 1. Render 환경 변수 (DATABASE_URL)가 존재하는 경우 (Render 배포 환경)
if (process.env.DATABASE_URL) {
    // 💡 Render의 DATABASE_URL을 사용합니다.
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres', // Render에서 PostgreSQL을 사용하는 경우
        // 로컬에서 MySQL/MariaDB 등을 썼다면 해당 다이얼렉트로 변경
        
        dialectOptions: {
            // Render PostgreSQL 연결 시 SSL 옵션은 필수적입니다.
            ssl: { 
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false, // 배포 환경에서는 쿼리 로그를 끕니다.
    });
} 
// 2. 환경 변수가 없고 config가 존재하는 경우 (로컬 환경)
else {
    // 💡 기존 로컬 설정을 사용합니다.
    sequelize = new Sequelize(config.database, config.username, config.password, config);
}

db.sequelize = sequelize;
db.User = User;

User.init(sequelize);
// 다른 모델도 여기에 추가 (예: Post.init(sequelize); db.Post = Post;)

module.exports = db;
