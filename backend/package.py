import subprocess
import sys

# 자동 패키지 설치 함수
def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# ultralytics 설치 시도
try:
    from ultralytics import YOLO
except ImportError:
    install('ultralytics')
    from ultralytics import YOLO