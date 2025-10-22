const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// const { exec } = require('child_process'); // <--- 기존의 Python 실행 로직 제거됨
const nodemailer = require('nodemailer');
const router = express.Router();
require('dotenv').config();

// ----------------------------------------------------------------------
// 1. 설정 및 초기화
// ----------------------------------------------------------------------

// 임시 업로드 경로
const uploadDir = path.join(__dirname, '../upload');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer 설정: 클라이언트에서 전송된 단일 'frame' 파일을 임시 저장
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, uploadDir);
    },
    filename(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      // 파일명을 고유하게 설정
      cb(null, `detected_frame_${uniqueSuffix}.jpg`); 
    }
  })
});

// Nodemailer 설정 (Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL,       // 발신자 Gmail 주소 (Render 환경 변수)
    pass: process.env.ALERT_EMAIL_PASS   // Gmail 앱 비밀번호 (Render 환경 변수)
  }
});

// ----------------------------------------------------------------------
// 2. 핵심 함수: 이메일 전송
// ----------------------------------------------------------------------

// 화재 감지 시 이메일 전송 함수
async function sendFireAlertEmail(framePath, cctvId) {
  try {
    // 수신자 이메일을 환경 변수에서 가져오도록 설정
    const receiverEmail = process.env.RECEIVER_EMAIL || 'wntjd010616@gmail.com'; 

    const mailOptions = {
      from: `"AI 산불 감지 시스템" <${process.env.ALERT_EMAIL}>`,
      to: receiverEmail, 
      subject: `[긴급] CCTV ${cctvId} 산불 감지 알림`,
      text: `CCTV ${cctvId}에서 AI 시스템이 산불을 감지했습니다. 첨부된 이미지를 확인해주세요.`,
      attachments: [
        {
          filename: path.basename(framePath),
          path: framePath
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`CCTV ${cctvId} 알림 이메일 전송 완료: 수신자 ${receiverEmail}`);
    return true;
  } catch (error) {
    console.error('이메일 전송 실패:', error);
    return false;
  }
}

// ----------------------------------------------------------------------
// 3. API 라우터 (Notification Gateway)
// ----------------------------------------------------------------------

// 핵심 라우터: 클라이언트가 보낸 단일 화재 프레임을 받아 이메일 알림을 보냅니다.
// 이전에 '/frame'으로 사용되었지만, 이제 주력 알림 API로 사용됩니다.
router.post('/frame', upload.single('frame'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: '프레임 파일이 업로드되지 않았습니다.' });
  }

  // 클라이언트 HTML에서 전송한 CCTV ID를 req.body.cctvId에서 가져옴
  const cctvId = req.body.cctvId || 'Unknown'; 
  const framePath = req.file.path;

  console.log(`CCTV ${cctvId} 프레임 수신 완료. 이메일 전송 시작...`);

  try {
    const emailSuccess = await sendFireAlertEmail(framePath, cctvId);

    // 임시 파일 삭제 (Render 공간 확보에 필수)
    fs.unlink(framePath, (err) => {
      if (err) console.error('임시 프레임 파일 삭제 실패:', err);
    });
    
    if (emailSuccess) {
        res.json({ success: true, message: '화재 알림 이메일 전송 완료' });
    } else {
        res.status(500).json({ success: false, error: '이메일 전송 실패 (서버 설정 확인)' });
    }

  } catch (error) {
    console.error('알림 처리 중 예상치 못한 오류:', error);
    res.status(500).json({ success: false, error: '서버 내부 오류 발생' });
  }
});

// **주의: 기존의 '/uploadAndAnalyze' 라우터는 제거되었습니다.**

module.exports = router;
