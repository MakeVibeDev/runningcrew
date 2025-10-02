import os
import time
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import hashlib

class OnlineRunningScreenshotCollector:
    """온라인에서 러닝 스크린샷 수집"""
    
    def __init__(self, output_dir="collected_screenshots"):
        self.output_dir = output_dir
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        # 수집 가능한 소스
        self.sources = {
            'instagram_hashtags': [
                '#러닝기록',
                '#스트라바',
                '#나이키런클럽',
                '#삼성헬스',
                '#가민러닝',
                '#러닝스타그램'
            ],
            'reddit_subs': [
                'r/running',
                'r/Strava',
                'r/GarminWatches',
                'r/AppleWatchFitness'
            ],
            'blog_keywords': [
                '스트라바 후기',
                'NRC 러닝 기록',
                '가민 운동 기록',
                '애플워치 러닝'
            ]
        }
    
    def collect_from_instagram_api(self):
        """Instagram 공개 게시물에서 수집 (API 사용)"""
        # 실제로는 Instagram Basic Display API 사용
        # 여기서는 예시 URL들
        
        instagram_urls = [
            # 공개 게시물 URL들 (실제 사용시 교체)
            "https://www.instagram.com/p/ABC123/",
            "https://www.instagram.com/p/DEF456/",
        ]
        
        collected = []
        for url in instagram_urls:
            # 실제로는 API로 이미지 URL 추출
            collected.append({
                'url': url,
                'source': 'instagram',
                'type': 'running_screenshot'
            })
        
        return collected
    
    def collect_from_reddit(self):
        """Reddit 공개 게시물에서 수집"""
        reddit_base = "https://www.reddit.com"
        image_urls = []
        
        for sub in self.sources['reddit_subs']:
            url = f"{reddit_base}/{sub}/top/?t=month"
            
            try:
                response = self.session.get(url + ".json")
                if response.status_code == 200:
                    data = response.json()
                    posts = data.get('data', {}).get('children', [])
                    
                    for post in posts:
                        post_data = post.get('data', {})
                        # 이미지 포스트 찾기
                        if post_data.get('post_hint') == 'image':
                            image_url = post_data.get('url', '')
                            if any(keyword in post_data.get('title', '').lower() 
                                   for keyword in ['strava', 'running', 'run', '러닝']):
                                image_urls.append({
                                    'url': image_url,
                                    'title': post_data.get('title'),
                                    'source': sub
                                })
                
                time.sleep(2)  # Rate limiting
                
            except Exception as e:
                print(f"Reddit 수집 오류 ({sub}): {e}")
        
        return image_urls
    
    def collect_from_blogs_selenium(self):
        """블로그에서 Selenium으로 스크린샷 수집"""
        # 주의: Chrome Driver 필요
        
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')
        driver = webdriver.Chrome(options=options)
        
        blog_screenshots = []
        
        # 네이버 블로그 검색
        for keyword in self.sources['blog_keywords']:
            search_url = f"https://search.naver.com/search.naver?where=blog&query={keyword}"
            
            try:
                driver.get(search_url)
                time.sleep(2)
                
                # 이미지 요소 찾기
                images = driver.find_elements(By.CSS_SELECTOR, "img[src*='postfiles']")
                
                for img in images[:5]:  # 각 키워드당 5개까지
                    img_url = img.get_attribute('src')
                    if img_url:
                        blog_screenshots.append({
                            'url': img_url,
                            'keyword': keyword,
                            'source': 'naver_blog'
                        })
                
            except Exception as e:
                print(f"블로그 수집 오류: {e}")
        
        driver.quit()
        return blog_screenshots
    
    def download_and_organize(self, image_data):
        """이미지 다운로드 및 정리"""
        
        for item in image_data:
            url = item.get('url')
            if not url:
                continue
            
            try:
                # URL에서 파일명 생성
                url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
                
                # 앱 유형 추정 (URL이나 제목에서)
                app_name = self.detect_app_from_context(item)
                
                # 파일명 생성
                filename = f"{app_name}_{url_hash}.jpg"
                filepath = os.path.join(self.output_dir, app_name, filename)
                
                # 디렉토리 생성
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                
                # 다운로드
                response = self.session.get(url, timeout=10)
                if response.status_code == 200:
                    with open(filepath, 'wb') as f:
                        f.write(response.content)
                    print(f"다운로드 완료: {filename}")
                
                time.sleep(1)  # 서버 부하 방지
                
            except Exception as e:
                print(f"다운로드 실패: {e}")
    
    def detect_app_from_context(self, item):
        """컨텍스트에서 앱 유형 추정"""
        context = f"{item.get('title', '')} {item.get('keyword', '')} {item.get('source', '')}".lower()
        
        if 'strava' in context or '스트라바' in context:
            return 'strava'
        elif 'nike' in context or 'nrc' in context or '나이키' in context:
            return 'nrc'
        elif 'samsung' in context or '삼성' in context or 'health' in context:
            return 'samsung_health'
        elif 'garmin' in context or '가민' in context:
            return 'garmin'
        elif 'apple' in context or '애플' in context:
            return 'apple_watch'
        else:
            return 'unknown'
    
    def run_collection(self):
        """전체 수집 프로세스 실행"""
        print("온라인 러닝 스크린샷 수집 시작...")
        
        all_images = []
        
        # 1. Instagram 수집 (실제로는 API 필요)
        print("\n1. Instagram 수집 중...")
        # instagram_images = self.collect_from_instagram_api()
        # all_images.extend(instagram_images)
        
        # 2. Reddit 수집
        print("\n2. Reddit 수집 중...")
        reddit_images = self.collect_from_reddit()
        all_images.extend(reddit_images)
        print(f"  - Reddit에서 {len(reddit_images)}개 발견")
        
        # 3. 블로그 수집 (Selenium 필요)
        # print("\n3. 블로그 수집 중...")
        # blog_images = self.collect_from_blogs_selenium()
        # all_images.extend(blog_images)
        
        # 4. 다운로드 및 정리
        print(f"\n총 {len(all_images)}개 이미지 다운로드 시작...")
        self.download_and_organize(all_images)
        
        print("\n수집 완료!")
        return len(all_images)

# 빠른 수집을 위한 직접 URL 리스트
def get_quick_urls():
    """즉시 사용 가능한 URL 리스트"""
    return [
        # Unsplash 피트니스 이미지 (무료)
        {
            'url': 'https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee',
            'title': 'running app screenshot',
            'source': 'unsplash'
        },
        # 더 많은 URL 추가...
    ]

# 사용 예시
if __name__ == "__main__":
    collector = OnlineRunningScreenshotCollector()
    
    print("러닝 스크린샷 온라인 수집기")
    print("="*50)
    print("1. Reddit에서 수집")
    print("2. 빠른 URL 리스트 사용")
    print("3. 전체 자동 수집")
    
    choice = input("\n선택 (1-3): ")
    
    if choice == '1':
        images = collector.collect_from_reddit()
        print(f"\nReddit에서 {len(images)}개 이미지 URL 수집")
        collector.download_and_organize(images)
    
    elif choice == '2':
        quick_urls = get_quick_urls()
        collector.download_and_organize(quick_urls)
    
    elif choice == '3':
        collector.run_collection()