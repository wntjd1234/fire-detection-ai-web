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
// 이 파일 내부에서 process.env.DATABASE_URL을 사용하여 Render DB에 연결하고 sequelize 인스턴스를 가져와야 합니다.
const { sequelize } = require('./models');

const authRouter = require('./routes/auth');
const introductionRouter = require('./routes/introduction');

dotenv.config();
passportConfig();

const app = express();
app.set('port', process.env.PORT || 5000);

// 데이터베이스 연결 및 동기화 (Render DB 연결 정보를 환경 변수를 통해 사용)
sequelize.sync({ force: false })
    .then(() => console.log('데이터베이스 연결 성공'))
    .catch(err => console.error('데이터베이스 연결 오류:', err));

const allowedOrigins = [
    'http://localhost:5000',
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
    express.json(),
    express.urlencoded({ extended: false }),
    cookieParser(process.env.SECRET),
    session({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            // 💡 배포 환경(HTTPS)에서는 secure: true로 설정해야 합니다.
            secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' 
                ? true 
                : false,
            // secure: true, // 위처럼 환경에 따라 다르게 설정하는 것이 가장 좋습니다.
        },
        name: 'session-cookie'
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRouter);
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/public', 'index.html')); });
app.get('/user', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/public', 'user.html')); });
app.use('/upload', express.static(path.join(__dirname, 'upload')));
app.use('/introduction', introductionRouter);

app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기 중');
});
