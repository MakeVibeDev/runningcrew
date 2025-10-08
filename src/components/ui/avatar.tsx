"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: { class: "w-8 h-8 text-xs", size: 32 },
  md: { class: "w-12 h-12 text-sm", size: 48 },
  lg: { class: "w-16 h-16 text-base", size: 64 },
  xl: { class: "w-24 h-24 text-xl", size: 96 },
};

export function Avatar({ src, alt, size = "md", className = "" }: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const { class: sizeClass, size: imageSize } = sizeMap[size];

  // 이미지가 없거나 로딩 실패한 경우 fallback
  if (!src || hasError) {
    const initial = alt.charAt(0).toUpperCase();
    return (
      <div
        className={`${sizeClass} ${className} flex items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-semibold text-white`}
      >
        {initial}
      </div>
    );
  }

  return (
    <div className={`${sizeClass} ${className} relative overflow-hidden rounded-full`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${imageSize}px`}
        onError={() => setHasError(true)}
        className="object-cover"
      />
    </div>
  );
}
