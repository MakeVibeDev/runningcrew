# OCR 학습용 데이터셋 가이드 (v1)

이 디렉터리는 러닝 기록 OCR 파이프라인을 위한 YOLOv8 학습 데이터를 관리하기 위한 기본 구조입니다. 실제 이미지는 기밀/용량 이슈로 레포에 포함하지 않고, 필요한 경우 Supabase Storage 혹은 별도 공유 드라이브에 업로드한 뒤 동기화 스크립트로 불러오는 방식을 권장합니다.

## 1. 폴더 구조
```
docs/datasets/ocr_v1/
├─ README.md                 # 작업 가이드
├─ data.template.yaml        # YOLO 학습 설정 템플릿
├─ images/                   # 원본 이미지 (train/val/test)
│  ├─ train/
│  ├─ val/
│  └─ test/
├─ labels/                   # YOLO bbox 라벨 (동일 파일명 .txt)
│  ├─ train/
│  ├─ val/
│  └─ test/
└─ meta/
   ├─ dataset-metadata.template.csv  # 수집 메타데이터 템플릿
   └─ ...
```

## 2. 클래스 정의 제안
| class_id | 클래스명    | 설명                                      |
| -------- | ----------- | ----------------------------------------- |
| 0        | `stat_card` | 거리/시간 등 핵심 지표 카드               |
| 1        | `metrics`   | 세부 지표 블록 (심박, 페이스 등 텍스트)   |
| 2        | `map`       | 지도·그래프 등의 OCR 제외 영역            |

- 클래스는 프로젝트 상황에 맞게 조정 가능하나, Edge Function 파이프라인에서 동일한 이름을 사용할 예정이라면 변경 시 `docs/specs/record-form.md` 업데이트도 함께 진행하세요.

## 3. 파일 네이밍 규칙
- 이미지: `device_app_theme_lang_001.jpg`
  - 예: `galaxy_watch_nrc_dark_ko_001.jpg`
- 라벨: 이미지와 동일한 파일명에 `.txt` 확장자를 사용 (`galaxy_watch_nrc_dark_ko_001.txt`).
- 메타데이터: CSV/JSON에서 이미지 파일명을 기준 키로 사용합니다.

## 4. 메타데이터 기록
- `meta/dataset-metadata.template.csv` 파일을 복사하여 실제 데이터를 관리하세요.
- 필드 설명:
  - `file_name`: 이미지 파일명(확장자 포함)
  - `device`: 촬영 기기/워치 종류
  - `app`: 사용 앱(예: NRC, Strava)
  - `theme`: 라이트/다크 등 테마
  - `language`: UI 언어 코드 (ko, en 등)
  - `capture_mode`: 스크린샷/사진 등 수집 방식
  - `sensitive_masked`: 민감 정보 마스킹 여부 (true/false)
  - `notes`: 특이사항 메모

## 5. 라벨링 가이드 (YOLO txt)
- 한 줄에 하나의 바운딩 박스를 기록합니다: `class_id center_x center_y width height`
- 모든 값은 0~1 사이의 **정규화된 값**이어야 합니다.
- 예시:
  ```
  0 0.512 0.438 0.765 0.382
  1 0.503 0.712 0.684 0.241
  ```
- 툴 추천: Roboflow Annotate, CVAT, Label Studio (모두 YOLO export 지원)
- 라벨링 완료 후 툴에서 지원하는 프리뷰 기능으로 박스 위치를 육안으로 검수하세요.

## 6. 데이터 분할 비율 권장
- Train 70% / Val 20% / Test 10%
- 새로운 이미지 추가 시 분할 비율이 크게 깨지지 않도록 기존 세트를 재활용하거나, 분할 스크립트를 실행해 균형을 맞추세요.

## 7. 학습 실행 템플릿
- `data.template.yaml`을 복사하여 `data.yaml`로 저장 후 경로를 실제 데이터 위치에 맞춰 수정합니다.
- ultralytics CLI 예시:
  ```bash
  pip install ultralytics
  yolo detect train data=docs/datasets/ocr_v1/data.yaml model=yolov8n.pt epochs=100 imgsz=960
  ```
- 학습 후 `runs/detect/train` 결과에서 `val_batch0_pred.jpg` 등을 확인해 라벨이 제대로 반영됐는지 검증하세요.

## 8. 버전 관리 & 추적
- 대용량 이미지 파일은 Git LFS나 외부 스토리지를 사용하는 것을 권장합니다.
- 이미지 교체·삭제 시 `meta` CSV를 먼저 업데이트하고, 변경 내역을 `docs/specs/ocr-pipeline.md` 등 연관 문서에 남겨두면 파이프라인 추적이 용이합니다.

작업 중 이 가이드에 추가할 내용이 생기면 PR에 함께 반영해주세요.
