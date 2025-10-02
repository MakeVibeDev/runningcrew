"use client";

import Image from "next/image";

const kakaoIcon = "/kakao/kakao_login.png";
const KAKAO_BUTTON_WIDTH = 91;
const KAKAO_BUTTON_HEIGHT = 22;
const SCALE = 0.7;

export function KakaoLoginButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center disabled:opacity-60"
      aria-label="카카오로 로그인"
      style={{ width: KAKAO_BUTTON_WIDTH * SCALE, height: KAKAO_BUTTON_HEIGHT * SCALE }}
    >
      <Image
        src={kakaoIcon}
        alt="카카오 로그인 버튼"
        width={KAKAO_BUTTON_WIDTH * SCALE}
        height={KAKAO_BUTTON_HEIGHT * SCALE}
        priority
      />
    </button>
  );
}
