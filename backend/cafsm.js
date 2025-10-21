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

sequelize.sync({ force: false })
    .then(() => console.log('데이터베이스 연결 성공'))
    .catch(err => console.error(err));
app.use(
    morgan('dev'),
    cors({
      origin: ['https://cafsm.shop','http://localhost:5000'], // 허용 도메인
      credentials: true
    }),
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