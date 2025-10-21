const express = require('express');
const path = require('path');
const passport = require('passport');
const passportConfig = require('./passport');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const authRouter = require('./routes/auth');
const introductionRouter = require('./routes/introduction');

const { sequelize } = require('./models');

dotenv.config();
passportConfig();

const app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'html');

//sequelize.sync({ force: false })
//    .then(() => console.log('데이터베이스 연결 성공'))
//   .catch(err => console.error(err));

const allowedOrigins = [
  'http://localhost:5000', // 개발 환경 테스트를 위한 로컬 주소
  'https://cafsm.shop' //  Netlify 도메인
];

const corsOptions = {
  origin: (origin, callback) => {
    // origin이 allowedOrigins 배열에 있거나, origin이 없는 요청(예: Postman/브라우저 자체)인 경우 허용
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true); // 허용
    } else {
      callback(new Error('Not allowed by CORS')); // 거부
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // 허용할 HTTP 메서드
  credentials: true, // 쿠키 등 인증 정보를 포함한 요청 허용 여부
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
        secret: process.env.SECRET,
        cookie: {
            httpOnly: true,
            secure: false
        },
        name: 'session-cookie'
    })
);



app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRouter);
app.get('/', (req, res) => {res.sendFile(path.join(__dirname, '../frontend/public', 'index.html'));});
app.get('/user', (req, res) => {res.sendFile(path.join(__dirname, '../frontend/public', 'user.html'));});
app.use('/upload', express.static(path.join(__dirname, 'upload')));
app.use('/introduction', introductionRouter);

app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 대기 중');
});
