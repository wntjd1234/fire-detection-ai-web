from ultralytics import YOLO
import os

# YOLOv8 사전학습 모델 로드
model = YOLO('yolov8n.pt')  # 또는 yolov8s.pt, yolov8m.pt

# fire.yaml 경로 설정 (현재 스크립트 기준 상대경로 또는 절대경로)
data_yaml_path = 'fire.yaml'

# 모델 학습 시작
model.train(
    data=data_yaml_path,
    epochs=50,
    imgsz=640,
    batch=8,
    name='fire_detection_yolov8'
)

print("✅ 학습 완료되었습니다.")