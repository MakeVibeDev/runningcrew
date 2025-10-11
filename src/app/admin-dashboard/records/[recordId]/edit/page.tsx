"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

// 시간 포맷 함수들
function formatSecondsToHhMmSs(totalSeconds: number | string) {
  const seconds = typeof totalSeconds === "string" ? parseInt(totalSeconds, 10) : totalSeconds;
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const hrs = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const mins = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length > 3) return null;

  // Allow partial input during typing
  if (parts.some((part) => !/^[0-9]*$/.test(part))) return null;

  // Pad parts to 2 digits for parsing
  const paddedParts = parts.map((part) => part.padStart(2, "0"));
  const [h, m, s] =
    paddedParts.length === 3
      ? paddedParts
      : paddedParts.length === 2
      ? ["00", paddedParts[0], paddedParts[1]]
      : ["00", "00", paddedParts[0]];

  const hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  const seconds = parseInt(s, 10);
  if ([hours, minutes, seconds].some((n) => Number.isNaN(n))) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function formatSecondsToPace(value: number | string) {
  const seconds = typeof value === "string" ? parseInt(value, 10) : value;
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(1, "0");
  const secs = Math.round(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function parsePaceInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length !== 2) return null;
  const [minStr, secStr] = parts;
  if (!/^[0-9]+$/.test(minStr) || !/^[0-9]{2}$/.test(secStr)) return null;
  const minutes = parseInt(minStr, 10);
  const seconds = parseInt(secStr, 10);
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
  return minutes * 60 + seconds;
}

type Record = {
  id: string;
  recorded_at: string;
  distance_km: number;
  duration_seconds: number;
  pace_seconds_per_km: number | null;
  visibility: string;
  notes: string | null;
  image_path: string | null;
  profile: {
    display_name: string | null;
  } | null;
};

export default function EditRecordPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.recordId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [record, setRecord] = useState<Record | null>(null);
  const [error, setError] = useState("");
  const [showFullImage, setShowFullImage] = useState(false);

  // 폼 상태
  const [recordedAt, setRecordedAt] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [durationInput, setDurationInput] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [paceInput, setPaceInput] = useState("");
  const [paceSecondsPerKm, setPaceSecondsPerKm] = useState(0);
  const [visibility, setVisibility] = useState("public");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // 세션 확인 및 기록 로드
    const init = async () => {
      try {
        const sessionResponse = await fetch("/api/admin/session");
        const sessionData = await sessionResponse.json();

        if (!sessionData.authenticated) {
          router.push("/admin-login");
          return;
        }

        // 기록 로드
        const recordResponse = await fetch(`/api/admin/records/${recordId}`);
        const recordData = await recordResponse.json();

        if (!recordResponse.ok) {
          setError(recordData.error || "기록을 불러오지 못했습니다.");
          setLoading(false);
          return;
        }

        setRecord(recordData);

        // 이미지 경로 디버깅
        console.log("Record data:", recordData);
        console.log("Image path:", recordData.image_path);

        // 폼 초기화
        const date = new Date(recordData.recorded_at);
        setRecordedAt(date.toISOString().slice(0, 16));
        setDistanceKm(recordData.distance_km.toString());
        setDurationSeconds(recordData.duration_seconds);
        setDurationInput(formatSecondsToHhMmSs(recordData.duration_seconds));

        // 페이스 초기화
        if (recordData.pace_seconds_per_km) {
          setPaceSecondsPerKm(recordData.pace_seconds_per_km);
          setPaceInput(formatSecondsToPace(recordData.pace_seconds_per_km));
        }

        setVisibility(recordData.visibility);
        setNotes(recordData.notes || "");

        setLoading(false);
      } catch (err) {
        console.error("초기화 오류:", err);
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    };

    init();
  }, [recordId, router]);

  // 거리와 시간이 변경되면 페이스 자동 계산
  useEffect(() => {
    if (!distanceKm || !durationSeconds) {
      setPaceSecondsPerKm(0);
      setPaceInput("");
      return;
    }
    const distanceValue = parseFloat(distanceKm);
    const durationValue = durationSeconds;
    if (!distanceValue || Number.isNaN(durationValue) || distanceValue <= 0 || durationValue <= 0) {
      setPaceSecondsPerKm(0);
      setPaceInput("");
      return;
    }
    const pace = Math.round(durationValue / distanceValue);
    setPaceSecondsPerKm(pace);
    setPaceInput(formatSecondsToPace(pace));
  }, [distanceKm, durationSeconds]);

  const handleDurationChange = (value: string) => {
    setDurationInput(value);
  };

  const handleDurationBlur = () => {
    const parsed = parseDurationInput(durationInput);
    if (parsed === null) {
      setDurationSeconds(0);
      return;
    }
    setDurationSeconds(parsed);
    setDurationInput(formatSecondsToHhMmSs(parsed));
  };

  const handlePaceChange = (value: string) => {
    setPaceInput(value);
  };

  const handlePaceBlur = () => {
    const parsed = parsePaceInput(paceInput);
    if (parsed === null) {
      setPaceSecondsPerKm(0);
      return;
    }
    setPaceSecondsPerKm(parsed);
    setPaceInput(formatSecondsToPace(parsed));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const distance = parseFloat(distanceKm);

      const response = await fetch(`/api/admin/records/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recorded_at: new Date(recordedAt).toISOString(),
          distance_km: distance,
          duration_seconds: durationSeconds,
          pace_seconds_per_km: paceSecondsPerKm || null,
          visibility,
          notes: notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "수정에 실패했습니다.");
        setSubmitting(false);
        return;
      }

      router.push("/admin-dashboard/records");
    } catch (err) {
      console.error("수정 오류:", err);
      setError("서버 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말로 이 기록을 삭제하시겠습니까?")) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/records/${recordId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "삭제에 실패했습니다.");
        setSubmitting(false);
        return;
      }

      router.push("/admin-dashboard/records");
    } catch (err) {
      console.error("삭제 오류:", err);
      setError("서버 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg text-red-500">기록을 찾을 수 없습니다.</div>
          <button
            onClick={() => router.push("/admin-dashboard/records")}
            className="rounded-lg bg-muted px-4 py-2 text-sm"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* 헤더 */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">📝 기록 수정</h1>
            <button
              onClick={() => router.push("/admin-dashboard/records")}
              className="rounded-lg bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80"
            >
              ← 목록으로
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              {record.profile?.display_name || "알 수 없음"} 님의 기록
            </h2>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* 이미지 표시 */}
          {record.image_path && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">
                업로드된 이미지
              </label>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={record.image_path}
                  alt="기록 이미지"
                  className="w-full cursor-pointer rounded-lg border border-border object-cover transition-opacity hover:opacity-90"
                  style={{ maxHeight: "400px" }}
                  onClick={() => setShowFullImage(true)}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  클릭하면 전체 화면으로 볼 수 있습니다
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium">
                기록 일시
              </label>
              <input
                type="datetime-local"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                거리 (km)
              </label>
              <input
                type="number"
                step="0.01"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                시간
              </label>
              <input
                type="text"
                value={durationInput}
                onChange={(e) => handleDurationChange(e.target.value)}
                onBlur={handleDurationBlur}
                placeholder="예: 01:12:34"
                required
                className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                시:분:초 형식으로 입력하세요 (예: 01:12:34)
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                평균 페이스 (분:초/km)
              </label>
              <input
                type="text"
                value={paceInput}
                onChange={(e) => handlePaceChange(e.target.value)}
                onBlur={handlePaceBlur}
                placeholder="예: 5:20"
                className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                거리와 시간을 입력하면 자동으로 계산됩니다
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                공개 설정
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="public">공개</option>
                <option value="private">비공개</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                메모
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-orange-500 px-4 py-3 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="rounded-lg bg-red-500 px-6 py-3 font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* 전체화면 이미지 모달 */}
      {showFullImage && record.image_path && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-h-full max-w-full">
            {/* 닫기 버튼 */}
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute -right-4 -top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-100"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={record.image_path}
              alt="기록 이미지 전체보기"
              className="max-h-[90vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
