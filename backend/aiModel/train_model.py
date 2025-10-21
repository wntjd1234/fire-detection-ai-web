from ultralytics import YOLO
import os

# 현재 파일 기준 fire.yaml 경로 자동 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
data_yaml_path = os.path.join(BASE_DIR, 'fire.yaml')

# YOLO 모델 로드
model = YOLO('yolov8m.pt')

if __name__ == '__main__':
    # 학습 실행을 if __name__ == '__main__': 블록 안에 넣습니다.
    model.train(
        data=data_yaml_path,
        epochs=50,
        imgsz=640,
        batch=8,
        workers=1,
        lr0=0.001,
        patience=10,
        augment=True,
        name='fire_detection_yolov8v2',
        device='0'
    )

    print("✅ 학습 완료되었습니다.")