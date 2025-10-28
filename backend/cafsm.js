const express = require('express');
const path = require('path');
const passport = require('passport');
const passportConfig = require('./passport');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// 💡 DB 연결 로직이 담긴 파일입니다.
const { sequelize } = require('./models');

const authRouter = require('./routes/auth');
const introductionRouter = require('./routes/introduction');

dotenv.config();
passportConfig();

const app = express();
app.set('port', process.env.PORT || 5000);

// 데이터베이스 연결 및 동기화
sequelize.sync({ force: false })
    .then(() => console.log('데이터베이스 연결 성공'))
    .catch(err => console.error('데이터베이스 연결 오류:', err));

const allowedOrigins = [
    'http://localhost:5000',
    'http://localhost:3000',
    'https://cafsm.shop' // Netlify 배포 도메인
];

const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // 인증 정보(쿠키) 허용
    optionsSuccessStatus: 204
};

// 모든 라우터에 CORS 미들웨어 적용
app.use(cors(corsOptions));

app.use(
    morgan('dev'),
    express.static(path.join(__dirname, '../frontend/public')),
    // 💡 비디오 업로드를 위해 Body Parser의 크기 제한을 늘립니다. (최대 50MB)
    express.json({ limit: '50mb' }), 
    express.urlencoded({ limit: '50mb', extended: false }), 
    cookieParser(process.env.SECRET),
    session({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' 
                ? true 
                : false,
        },
        name: 'session-cookie'
    })
);

app.use(passport.initialize());
app.use(passport.session());

// --- 라우터 설정 ---

// 💡 /upload 경로는 정적 파일 제공 경로이므로 모든 라우터보다 먼저 배치하는 것이 좋습니다.
app.use('/upload', express.static(path.join(__dirname, 'upload')));

// API 라우터
app.use('/auth', authRouter);
app.use('/introduction', introductionRouter); // 👈 404 오류 해결을 위해 이 경로가 올바른지 다시 한번 확인!

// SPA 라우팅 (정적 파일 제공)
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/public', 'index.html')); });
app.get('/user', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/public', 'user.html')); });


app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기 중');
});
