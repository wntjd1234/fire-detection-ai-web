import os
import cv2
from ultralytics import YOLO
import sys

# -----------------------------
# 🔹 기본 설정
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ✅ 업로드 폴더 경로 (Node.js의 uploadDir과 일치시킴)
UPLOAD_DIR = os.path.join(BASE_DIR, '../web/upload')
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# ✅ 프레임 저장 경로
FRAME_PATH = os.path.join(UPLOAD_DIR, 'frame.jpg')

# ✅ 학습된 산불 감지 모델 경로
model_path = os.path.join(BASE_DIR, 'runs/detect/fire_detection_yolov8/weights/best.pt')

try:
    model = YOLO(model_path)
    print(f"✅ AI 모델 로드 성공: {model_path}")
except Exception as e:
    print(f"❌ 모델 로드 실패: {e}", file=sys.stderr)
    sys.exit(1)

# -----------------------------
# 🔹 메인 함수: 영상 분석
# -----------------------------
def analyze_video(input_video, output_video):
    if not os.path.exists(input_video):
        print(f"❌ 영상 파일이 존재하지 않음: {input_video}", file=sys.stderr)
        return False

    cap = cv2.VideoCapture(input_video)
    if not cap.isOpened():
        print(f"❌ 영상 파일을 열 수 없음: {input_video}", file=sys.stderr)
        return False

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    fourcc = cv2.VideoWriter_fourcc(*'avc1')
    out = cv2.VideoWriter(output_video, fourcc, fps, (width, height))
    if not out.isOpened():
        print("⚠️ avc1 코덱 실패 → XVID로 재시도", file=sys.stderr)
        fourcc = cv2.VideoWriter_fourcc(*'XVID')
        out = cv2.VideoWriter(output_video, fourcc, fps, (width, height))
    if not out.isOpened():
        print("❌ 결과 영상 저장 실패 (코덱 오류)", file=sys.stderr)
        cap.release()
        return False

    print(f"🎬 분석 시작! 입력: {input_video} → 출력: {output_video}")
    fire_detected = False  # 🔥 화재 감지 여부 플래그

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, conf=0.15, verbose=False)
        annotated_frame = results[0].plot()

        # 🔥 화재 탐지 여부 판단
        for r in results:
            for box in r.boxes:
                class_id = int(box.cls[0])
                class_name = r.names[class_id]
                if class_name.lower() == "fire":
                    fire_detected = True
                    # 📸 화재 감지 시 현재 프레임을 저장
                    cv2.imwrite(FRAME_PATH, annotated_frame)
                    print(f"🔥 화재 프레임 저장됨: {FRAME_PATH}")

        out.write(annotated_frame)

    cap.release()
    out.release()
    cv2.destroyAllWindows()

    if fire_detected:
        print("🔥 화재 감지 완료")
    else:
        print("✅ 화재 감지되지 않음")

    return fire_detected


if __name__ == '__main__':
    if len(sys.argv) > 2:
        input_path = sys.argv[1]
        output_path = sys.argv[2]
        success = analyze_video(input_path, output_path)
        sys.exit(0 if success else 1)
    else:
        print("사용법: python detectVideo.py <입력_영상_경로> <출력_영상_경로>", file=sys.stderr)
        sys.exit(1)
