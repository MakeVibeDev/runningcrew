import requests
import os
import time
from PIL import Image
from io import BytesIO
import hashlib
from datetime import datetime
import json

class SmartWatchScreenshotCollector:
    def __init__(self, output_dir="smartwatch_screenshots"):
        self.output_dir = output_dir
        self.create_directories()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.log_file = os.path.join(output_dir, 'collection_log.txt')
        
    def create_directories(self):
        """필요한 디렉토리 구조 생성"""
        categories = [
            'galaxy_watch', 'apple_watch', 'garmin', 
            'strava', 'nrc', 'samsung_health'
        ]
        themes = ['light', 'dark']
        languages = ['ko', 'en']
        
        for category in categories:
            for theme in themes:
                for lang in languages:
                    path = os.path.join(self.output_dir, category, theme, lang)
                    os.makedirs(path, exist_ok=True)
    
    def log_message(self, message):
        """로그 메시지 기록"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"
        print(log_entry.strip())
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry)
    
    def download_image(self, url, save_path):
        """이미지 다운로드 및 리사이즈"""
        try:
            response = self.session.get(url, timeout=10, stream=True)
            response.raise_for_status()
            
            # Content-Type 확인
            content_type = response.headers.get('content-type', '')
            if 'image' not in content_type:
                self.log_message(f"이미지가 아닙니다: {url}")
                return False
            
            # 이미지 열기
            img = Image.open(BytesIO(response.content))
            
            # RGBA를 RGB로 변환 (필요한 경우)
            if img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1])
                img = background
            
            # 긴 변 기준 1280px 이하로 리사이즈
            max_size = 1280
            if img.width > max_size or img.height > max_size:
                img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # 640px 이하인 경우 스킵
            if img.width < 640 and img.height < 640:
                self.log_message(f"이미지가 너무 작습니다 ({img.width}x{img.height}): {url}")
                return False
            
            # 저장
            img.save(save_path, 'JPEG', quality=95, optimize=True)
            self.log_message(f"저장 완료: {save_path} ({img.width}x{img.height})")
            return True
            
        except Exception as e:
            self.log_message(f"다운로드 실패 ({url}): {str(e)}")
            return False
    
    def get_filename_from_url(self, url, category, theme, lang, index=0):
        """URL에서 파일명 생성"""
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        filename = f"{category}_{theme}_{lang}_{index:03d}_{url_hash}.jpg"
        return filename
    
    def collect_from_public_sources(self):
        """
        공개적으로 사용 가능한 소스에서 이미지 수집
        주의: 실제 URL을 사용하기 전에 저작권을 확인하세요!
        """
        
        # 예시 이미지 소스 (실제 사용시 적절한 URL로 교체)
        # 여기서는 구조만 보여드립니다
        sample_sources = {
            'galaxy_watch': {
                'light': {
                    'ko': [
                        # 예: "https://example.com/galaxy-watch-ko-light-1.jpg",
                        # 삼성 공식 홈페이지나 프레스킷의 이미지 URL
                    ],
                    'en': [
                        # 영어 버전 URL들
                    ]
                },
                'dark': {
                    'ko': [
                        # 다크 테마 한국어 URL들
                    ],
                    'en': [
                        # 다크 테마 영어 URL들
                    ]
                }
            },
            'apple_watch': {
                'light': {
                    'ko': [],
                    'en': []
                },
                'dark': {
                    'ko': [],
                    'en': []
                }
            },
            # 다른 카테고리들...
        }
        
        total_downloaded = 0
        failed_downloads = 0
        
        self.log_message("이미지 수집 시작")
        
        for category, themes in sample_sources.items():
            for theme, languages in themes.items():
                for lang, urls in languages.items():
                    for index, url in enumerate(urls):
                        filename = self.get_filename_from_url(url, category, theme, lang, index)
                        save_path = os.path.join(
                            self.output_dir, category, theme, lang, filename
                        )
                        
                        if not os.path.exists(save_path):
                            if self.download_image(url, save_path):
                                total_downloaded += 1
                            else:
                                failed_downloads += 1
                            
                            # 서버 부하 방지를 위한 딜레이
                            time.sleep(1)
                        else:
                            self.log_message(f"이미 존재함: {save_path}")
        
        self.log_message(f"수집 완료: 성공 {total_downloaded}, 실패 {failed_downloads}")
        return total_downloaded, failed_downloads
    
    def collect_from_urls_file(self, urls_file_path):
        """
        텍스트 파일에서 URL 읽어서 수집
        파일 형식:
        category,theme,lang,url
        galaxy_watch,light,ko,https://example.com/image1.jpg
        """
        if not os.path.exists(urls_file_path):
            self.log_message(f"파일을 찾을 수 없습니다: {urls_file_path}")
            return
        
        total_downloaded = 0
        failed_downloads = 0
        
        with open(urls_file_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                try:
                    parts = line.split(',', 3)
                    if len(parts) != 4:
                        self.log_message(f"잘못된 형식 (줄 {line_num}): {line}")
                        continue
                    
                    category, theme, lang, url = parts
                    filename = self.get_filename_from_url(url, category, theme, lang, line_num)
                    save_path = os.path.join(
                        self.output_dir, category.strip(), theme.strip(), 
                        lang.strip(), filename
                    )
                    
                    # 디렉토리 생성 (필요한 경우)
                    os.makedirs(os.path.dirname(save_path), exist_ok=True)
                    
                    if not os.path.exists(save_path):
                        if self.download_image(url.strip(), save_path):
                            total_downloaded += 1
                        else:
                            failed_downloads += 1
                        time.sleep(1)
                    
                except Exception as e:
                    self.log_message(f"오류 (줄 {line_num}): {str(e)}")
                    failed_downloads += 1
        
        self.log_message(f"파일 기반 수집 완료: 성공 {total_downloaded}, 실패 {failed_downloads}")
    
    def generate_dataset_info(self):
        """수집된 데이터셋 정보 생성"""
        total_images = 0
        info = {}
        
        for root, dirs, files in os.walk(self.output_dir):
            if files:
                image_files = [f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
                if image_files:
                    category = os.path.relpath(root, self.output_dir)
                    info[category] = len(image_files)
                    total_images += len(image_files)
        
        # 데이터셋 정보 JSON 파일 생성
        dataset_info = {
            'total_images': total_images,
            'categories': info,
            'created_at': datetime.now().isoformat()
        }
        
        with open(os.path.join(self.output_dir, 'dataset_info.json'), 'w', encoding='utf-8') as f:
            json.dump(dataset_info, f, indent=2, ensure_ascii=False)
        
        # 텍스트 파일로도 생성
        with open(os.path.join(self.output_dir, 'dataset_info.txt'), 'w', encoding='utf-8') as f:
            f.write(f"스마트워치 스크린샷 데이터셋 정보\n")
            f.write(f"생성 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"{'='*50}\n\n")
            f.write(f"총 이미지 수: {total_images}\n\n")
            f.write("카테고리별 이미지 수:\n")
            for category, count in sorted(info.items()):
                f.write(f"  {category}: {count}개\n")
        
        print(f"\n{'='*50}")
        print(f"데이터셋 요약:")
        print(f"총 이미지 수: {total_images}")
        print(f"상세 정보는 {self.output_dir}/dataset_info.json 파일을 확인하세요.")
        print(f"{'='*50}\n")

# ========== 실제 사용 예시 ==========

if __name__ == "__main__":
    # 수집기 인스턴스 생성
    collector = SmartWatchScreenshotCollector("my_smartwatch_dataset")
    
    print("스마트워치 스크린샷 수집기")
    print("="*50)
    print("1. URL 파일에서 수집")
    print("2. 하드코딩된 URL에서 수집")
    print("3. 데이터셋 정보 생성")
    print("4. 종료")
    print("="*50)
    
    choice = input("선택하세요 (1-4): ")
    
    if choice == '1':
        # URL 파일 예시 생성
        sample_urls_file = "urls_to_collect.txt"
        if not os.path.exists(sample_urls_file):
            with open(sample_urls_file, 'w', encoding='utf-8') as f:
                f.write("# 형식: category,theme,lang,url\n")
                f.write("# galaxy_watch,light,ko,https://example.com/image1.jpg\n")
                f.write("# apple_watch,dark,en,https://example.com/image2.jpg\n")
            print(f"\n예시 파일 '{sample_urls_file}'이 생성되었습니다.")
            print("이 파일에 수집할 이미지 URL을 추가한 후 다시 실행하세요.")
        else:
            collector.collect_from_urls_file(sample_urls_file)
    
    elif choice == '2':
        print("\n하드코딩된 URL에서 수집을 시작합니다...")
        print("(실제 URL이 없어서 동작하지 않습니다. sample_sources에 URL을 추가하세요)")
        collector.collect_from_public_sources()
    
    elif choice == '3':
        collector.generate_dataset_info()
    
    elif choice == '4':
        print("프로그램을 종료합니다.")
    
    else:
        print("잘못된 선택입니다.")