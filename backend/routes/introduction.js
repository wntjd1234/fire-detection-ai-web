const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');
const router = express.Router();
require('dotenv').config();

// ✅ 업로드 저장 경로
const uploadDir = path.join(__dirname, '../../web/upload');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ multer 설정
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, uploadDir);
    },
    filename(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const originalFilename = file.originalname.split('.')[0];
      const filename = uniqueSuffix + '_' + originalFilename + '.webm';
      cb(null, filename);
    }
  })
});

// ✅ Nodemailer 설정 (Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL,       // 📧 발신자 Gmail 주소
    pass: process.env.ALERT_EMAIL_PASS   // 🔑 Gmail 앱 비밀번호
  }
});

// ✅ 화재 감지 시 이메일 전송 함수
async function sendFireAlertEmail(framePath) {
  try {
    if (!fs.existsSync(framePath)) {
      console.warn('⚠️ frame.jpg 파일이 존재하지 않아 이메일을 전송하지 않습니다.');
      return;
    }

    const mailOptions = {
      from: `"🔥 AI 산불 감지 시스템" <${process.env.ALERT_EMAIL}>`,
      to: 'wntjd010616@gmail.com', // 🔔 수신자 이메일 (필요 시 DB나 .env로 관리)
      subject: '[긴급] 산불 감지 알림',
      text: 'AI 시스템이 산불을 감지했습니다. 첨부된 이미지를 확인해주세요.',
      attachments: [
        {
          filename: 'fire_frame.jpg',
          path: framePath
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log('📨 이메일 전송 완료 (화재 프레임 첨부됨)');
  } catch (error) {
    console.error('❌ 이메일 전송 실패:', error);
  }
}

// ✅ 프레임 단일 분석 API (선택적)
router.post('/frame', upload.single('frame'), (req, res) => {
  const framePath = path.join(uploadDir, 'frame.jpg');
  const scriptPath = path.join(__dirname, '../../aiModel/detect_frame.py');
  const cmd = `python "${scriptPath}"`;

  exec(cmd, async (err, stdout, stderr) => {
    if (err) {
      console.error('AI 감지 실패:', stderr);
      return res.status(500).json({ error: 'AI 감지 실패' });
    }

    const fireDetected = stdout.includes('fire');

    if (fireDetected) {
      console.log('🔥 실시간 프레임에서 산불 감지됨!');
      await sendFireAlertEmail(framePath);
    }

    res.json({ fireDetected });
  });
});

// ✅ 업로드 + AI 감지 통합 API
router.post('/uploadAndAnalyze', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: '영상 파일이 업로드되지 않았습니다.' });
  }

  const uploadedFilename = req.file.filename;
  const inputWebMPath = path.join(uploadDir, uploadedFilename);
  const inputMP4Path = path.join(uploadDir, uploadedFilename.replace('.webm', '.mp4'));
  const detectedMP4Path = path.join(uploadDir, 'detected_' + uploadedFilename.replace('.webm', '.mp4'));
  const framePath = path.join(uploadDir, 'frame.jpg'); // 🔥 detectVideo.py가 생성할 화재 프레임

  console.log('📤 영상 업로드 완료:', uploadedFilename);

  // 1️⃣ WebM → MP4 변환
  const ffmpegCmd = `ffmpeg -i "${inputWebMPath}" -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" -y "${inputMP4Path}"`;
  console.log('🎬 FFmpeg 변환 시작...');

  exec(ffmpegCmd, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ FFmpeg 변환 실패:', stderr);
      fs.unlinkSync(inputWebMPath);
      return res.status(500).json({ success: false, error: `FFmpeg 변환 실패: ${stderr}` });
    }

    console.log('✅ FFmpeg 변환 완료!');
    fs.unlinkSync(inputWebMPath);

    // 2️⃣ AI 분석
    const detectScript = path.join(__dirname, '../../aiModel/detectVideo.py');
    const aiCmd = `python "${detectScript}" "${inputMP4Path}" "${detectedMP4Path}"`;

    console.log('🤖 AI 분석 시작...');
    exec(aiCmd, { cwd: path.join(__dirname, '../../aiModel') }, async (aiError, aiStdout, aiStderr) => {
      fs.unlinkSync(inputMP4Path); // 중간 파일 삭제

      if (aiError) {
        console.error('❌ AI 감지 실패:', aiStderr);
        return res.status(500).json({ success: false, error: `AI 감지 실패: ${aiStderr}` });
      }

      console.log(`[Python stdout]: ${aiStdout}`);

      // 🔥 화재 감지 프레임 확인 및 이메일 전송
      if (fs.existsSync(framePath)) {
        console.log('🔥 산불 감지! 이메일 알림 전송 중...');
        await sendFireAlertEmail(framePath);
      } else {
        console.log('✅ 화재 프레임 없음 (안전)');
      }

      // 3️⃣ 결과 영상 응답
      if (fs.existsSync(detectedMP4Path)) {
        console.log('✅ AI 분석 완료!');
        res.json({ success: true, resultPath: `/upload/${path.basename(detectedMP4Path)}` });
      } else {
        console.error('❌ 결과 파일 생성 실패:', detectedMP4Path);
        res.status(500).json({ success: false, error: '결과 파일이 생성되지 않았습니다.' });
      }
    });
  });
});

module.exports = router;
