"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

interface Mission {
  id: string;
  title: string;
  crew: {
    name: string;
    logo_image_url: string | null;
  } | null;
}

interface ShareRankingsButtonProps {
  missionTitle: string;
  mission: Mission;
}

export function ShareRankingsButton({ missionTitle, mission }: ShareRankingsButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShare = async () => {
    try {
      setIsGenerating(true);

      // 순위 목록 영역을 찾기
      const rankingsContainer = document.querySelector('main[data-rankings]');
      if (!rankingsContainer) {
        alert('순위 목록을 찾을 수 없습니다.');
        return;
      }

      // 테마 확인
      const isDark = document.documentElement.classList.contains('dark');

      // Canvas 생성
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        alert('Canvas를 생성할 수 없습니다.');
        return;
      }

      // 캔버스 크기 설정 (고해상도) - 헤더 추가를 위해 높이 증가
      const scale = 2;
      const width = 640; // 고정 너비
      const headerHeight = 120; // 헤더 높이
      const footerHeight = 60; // 푸터 높이
      const cardHeight = 120; // 각 카드 높이
      const cardSpacing = 12; // 카드 간격
      const padding = 24; // 좌우 여백

      // 순위 카드 개수 확인
      const rankingCards = rankingsContainer.querySelectorAll('[data-ranking-card]');
      const totalHeight = headerHeight + (rankingCards.length * (cardHeight + cardSpacing)) + padding * 2 + footerHeight;

      canvas.width = width * scale;
      canvas.height = totalHeight * scale;
      ctx.scale(scale, scale);

      // 배경색 설정
      ctx.fillStyle = isDark ? '#0a0a0a' : '#f4f4f5';
      ctx.fillRect(0, 0, width, totalHeight);

      // ===== 헤더 그리기 =====
      let currentY = padding;

      // 크루 로고 (있으면) - Rounded Square
      if (mission.crew?.logo_image_url) {
        try {
          const logo = new Image();
          logo.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            logo.onload = resolve;
            logo.onerror = reject;
            logo.src = mission.crew!.logo_image_url!;
          });

          ctx.save();
          // Rounded rectangle path
          const logoSize = 60;
          const logoRadius = 8;
          ctx.beginPath();
          ctx.moveTo(padding + logoRadius, currentY);
          ctx.lineTo(padding + logoSize - logoRadius, currentY);
          ctx.quadraticCurveTo(padding + logoSize, currentY, padding + logoSize, currentY + logoRadius);
          ctx.lineTo(padding + logoSize, currentY + logoSize - logoRadius);
          ctx.quadraticCurveTo(padding + logoSize, currentY + logoSize, padding + logoSize - logoRadius, currentY + logoSize);
          ctx.lineTo(padding + logoRadius, currentY + logoSize);
          ctx.quadraticCurveTo(padding, currentY + logoSize, padding, currentY + logoSize - logoRadius);
          ctx.lineTo(padding, currentY + logoRadius);
          ctx.quadraticCurveTo(padding, currentY, padding + logoRadius, currentY);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(logo, padding, currentY, logoSize, logoSize);
          ctx.restore();
        } catch (e) {
          // 로고 로드 실패시 기본 사각형 표시
          ctx.fillStyle = isDark ? '#27272a' : '#e4e4e7';
          ctx.beginPath();
          const logoSize = 60;
          const logoRadius = 8;
          ctx.moveTo(padding + logoRadius, currentY);
          ctx.lineTo(padding + logoSize - logoRadius, currentY);
          ctx.quadraticCurveTo(padding + logoSize, currentY, padding + logoSize, currentY + logoRadius);
          ctx.lineTo(padding + logoSize, currentY + logoSize - logoRadius);
          ctx.quadraticCurveTo(padding + logoSize, currentY + logoSize, padding + logoSize - logoRadius, currentY + logoSize);
          ctx.lineTo(padding + logoRadius, currentY + logoSize);
          ctx.quadraticCurveTo(padding, currentY + logoSize, padding, currentY + logoSize - logoRadius);
          ctx.lineTo(padding, currentY + logoRadius);
          ctx.quadraticCurveTo(padding, currentY, padding + logoRadius, currentY);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 미션 제목과 크루 이름
      ctx.fillStyle = isDark ? '#fafafa' : '#0a0a0a';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'left';
      const titleX = mission.crew?.logo_image_url ? padding + 80 : padding;
      ctx.fillText(mission.title, titleX, currentY + 28);

      if (mission.crew) {
        ctx.fillStyle = isDark ? '#a1a1aa' : '#71717a';
        ctx.font = '14px sans-serif';
        ctx.fillText(mission.crew.name, titleX, currentY + 52);
      }

      // 현재 날짜와 시간
      const now = new Date();
      const dateStr = now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).replace(/\. /g, '-').replace('.', '');
      const timeStr = now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      ctx.fillStyle = isDark ? '#71717a' : '#a1a1aa';
      ctx.font = 'bold 12px sans-serif'; // bold 추가
      ctx.textAlign = 'right';
      ctx.fillText(`${dateStr} ${timeStr} 기준`, width - padding, currentY + 40);

      // 구분선
      currentY += 80;
      ctx.strokeStyle = isDark ? '#27272a' : '#e4e4e7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, currentY);
      ctx.lineTo(width - padding, currentY);
      ctx.stroke();

      currentY += 40; // 헤더와 첫 카드 사이 여백

      // ===== 순위 카드들을 순회하며 그리기 =====
      for (const card of Array.from(rankingCards)) {
        const cardEl = card as HTMLElement;

        // 각 카드의 데이터 추출
        const rankEl = cardEl.querySelector('[data-rank]');
        const nameEl = cardEl.querySelector('[data-name]');
        const distanceEl = cardEl.querySelector('[data-distance]');
        const durationEl = cardEl.querySelector('[data-duration]');
        const paceEl = cardEl.querySelector('[data-pace]');
        const avatarEl = cardEl.querySelector('[data-avatar]') as HTMLImageElement;

        if (!rankEl || !nameEl || !distanceEl || !durationEl || !paceEl) continue;

        const rank = parseInt(rankEl.textContent || '0');
        const name = nameEl.textContent || '';
        const distance = distanceEl.textContent || '';
        const duration = durationEl.textContent || '';
        const pace = paceEl.textContent || '';

        // 카드 배경 그리기 (좌우 여백 적용)
        const cardX = padding;
        const cardW = width - padding * 2;

        ctx.fillStyle = isDark ? '#09090b' : '#ffffff';
        ctx.fillRect(cardX, currentY, cardW, cardHeight);

        // 카드 테두리
        ctx.strokeStyle = isDark ? '#27272a' : '#e4e4e7';
        ctx.lineWidth = 1;
        ctx.strokeRect(cardX, currentY, cardW, cardHeight);

        // 순위 배지 (왼쪽 상단)
        let badgeColor = isDark ? '#fafafa' : '#0a0a0a';
        if (rank === 1) badgeColor = '#eab308';
        else if (rank === 2) badgeColor = '#9ca3af';
        else if (rank === 3) badgeColor = '#b45309';

        ctx.fillStyle = badgeColor;
        ctx.fillRect(cardX, currentY, 36, 36);
        ctx.fillStyle = rank <= 3 ? '#ffffff' : (isDark ? '#0a0a0a' : '#ffffff');
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rank.toString(), cardX + 18, currentY + 18);

        // 아바타 (원형) - 순위 배지 옆
        const avatarX = cardX + 52;
        const avatarY = currentY + 16;

        if (avatarEl && avatarEl.src) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = avatarEl.src;
            });

            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + 28, avatarY + 28, 28, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, avatarX, avatarY, 56, 56);
            ctx.restore();
          } catch (e) {
            // 이미지 로드 실패시 이니셜 표시
            ctx.fillStyle = isDark ? '#27272a' : '#f4f4f5';
            ctx.beginPath();
            ctx.arc(avatarX + 28, avatarY + 28, 28, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = isDark ? '#71717a' : '#71717a';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(name.charAt(0).toUpperCase(), avatarX + 28, avatarY + 34);
          }
        }

        // 이름
        ctx.fillStyle = isDark ? '#fafafa' : '#0a0a0a';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(name, avatarX + 70, currentY + 38);

        // 통계 (3개 열)
        const statY = currentY + 75;
        const statSpacing = (cardW - 48) / 3;

        // 총 거리
        const distX = cardX + 24;
        ctx.fillStyle = isDark ? '#71717a' : '#a1a1aa';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('총 거리', distX, statY);
        ctx.fillStyle = isDark ? '#fafafa' : '#0a0a0a';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(distance, distX, statY + 20);

        // 총 시간
        const timeX = cardX + statSpacing + 24;
        ctx.fillStyle = isDark ? '#71717a' : '#a1a1aa';
        ctx.font = '11px sans-serif';
        ctx.fillText('총 시간', timeX, statY);
        ctx.fillStyle = isDark ? '#fafafa' : '#0a0a0a';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(duration, timeX, statY + 20);

        // 평균 페이스
        const paceX = cardX + statSpacing * 2 + 24;
        ctx.fillStyle = isDark ? '#71717a' : '#a1a1aa';
        ctx.font = '11px sans-serif';
        ctx.fillText('평균 페이스', paceX, statY);
        ctx.fillStyle = isDark ? '#fafafa' : '#0a0a0a';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(pace, paceX, statY + 20);

        // 다음 카드를 위해 Y 위치 업데이트
        currentY += cardHeight + cardSpacing;
      }

      // ===== 푸터 그리기 =====
      currentY += padding; // 마지막 카드와 푸터 사이 여백

      // 구분선
      ctx.strokeStyle = isDark ? '#27272a' : '#e4e4e7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, currentY);
      ctx.lineTo(width - padding, currentY);
      ctx.stroke();

      currentY += 15;

      // RunningCrew 로고 이미지
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          logoImg.src = '/logo2.png';
        });

        const logoHeight = 30;
        const logoWidth = logoHeight; // 정사각형 비율 유지
        ctx.drawImage(logoImg, width / 2 - logoWidth / 2, currentY, logoWidth, logoHeight);
        currentY += logoHeight + 8;
      } catch (e) {
        // 로고 로드 실패시 텍스트로 대체
        ctx.fillStyle = isDark ? '#fafafa' : '#0a0a0a';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RunningCrew', width / 2, currentY + 15);
        currentY += 23;
      }

      // 도메인 주소
      ctx.fillStyle = isDark ? '#71717a' : '#a1a1aa';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('runningcrew.io', width / 2, currentY);

      // 캔버스를 blob으로 변환하여 다운로드
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('이미지 생성에 실패했습니다.');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `${missionTitle}-순위-${timestamp}.png`;
        link.href = url;
        link.click();

        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('이미지 생성 중 오류:', error);
      alert('이미지 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isGenerating}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Share2 className="h-4 w-4" />
      {isGenerating ? '이미지 생성 중...' : '순위 공유하기'}
    </button>
  );
}
